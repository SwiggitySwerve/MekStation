/**
 * Retry driver for coordinated outcome correction (seam 17.4).
 *
 * Source, seal, and target are three separately durable steps across
 * two SQLite files. A reconnect or a restarted host re-enters HERE,
 * reads the saga, and skips every step the saga already shows done.
 * That is the retry law made executable: the correction cannot apply
 * twice because a done step is not run again.
 */

import type Database from 'better-sqlite3';

import type { IRetainedSourceEvent } from '@/lib/campaign/rebuild/CampaignReplacementReplay';
import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { IAffectedArtifact } from '@/lib/events/journal/EventHistoryArtifactManifest';
import type { IEventJournal } from '@/lib/events/journal/EventJournalContract';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import type {
  CoordinatedCorrectionSagaState,
  IAcceptedCoordinatedOutcomeCorrection,
  ICoordinatedCorrectionSaga,
} from './CoordinatedOutcomeCorrectionSaga';

import {
  readCoordinatedCorrectionSaga,
  recordCoordinatedCorrectionSource,
  sagaKeyOf,
  sealCoordinatedCorrectionManifest,
} from './CoordinatedOutcomeCorrectionSaga';
import { recordCoordinatedCorrectionTarget } from './CoordinatedOutcomeCorrectionTarget';

export type CoordinatedCorrectionRunStep = 'ran' | 'skipped';

export interface ICoordinatedCorrectionRunStores {
  readonly matchDb: Database.Database;
  readonly campaignDb: Database.Database;
  readonly journalDb: Database.Database;
  readonly journal: IEventJournal<ICampaignJournalEnvelope>;
}

export interface ICoordinatedCorrectionRunInput {
  readonly at: string;
  readonly outcomeJson: string;
  readonly artifacts: readonly IAffectedArtifact[];
  /** MATCH-stream candidate the source seal names. Mint once; retries reuse it. */
  readonly matchCandidateBranchId: string;
  readonly campaignId: string;
  readonly retainedEvents: readonly IRetainedSourceEvent[];
  readonly consequenceEvents: readonly ICampaignEvent[];
  readonly expectedPostStateDigest: string;
  readonly actor: string;
  readonly owner: string;
  readonly ttlMs?: number;
  readonly baseRevision?: number;
}

export interface ICoordinatedCorrectionRunResult {
  readonly saga: ICoordinatedCorrectionSaga | null;
  readonly source: CoordinatedCorrectionRunStep;
  readonly seal: CoordinatedCorrectionRunStep;
  readonly target: CoordinatedCorrectionRunStep;
}

function currentSaga(
  matchDb: Database.Database,
  accepted: IAcceptedCoordinatedOutcomeCorrection,
): ICoordinatedCorrectionSaga | null {
  return readCoordinatedCorrectionSaga(matchDb, sagaKeyOf(accepted));
}

function freezeRun(
  saga: ICoordinatedCorrectionSaga | null,
  source: CoordinatedCorrectionRunStep,
  seal: CoordinatedCorrectionRunStep,
  target: CoordinatedCorrectionRunStep,
): ICoordinatedCorrectionRunResult {
  return Object.freeze({ saga, source, seal, target });
}

/**
 * A saga row means the source transaction already committed.
 * Later states (seal/target/blocked) still skip source.
 */
function sourceAlreadyDone(
  state: CoordinatedCorrectionSagaState | null,
): boolean {
  return state !== null;
}

/** Manifest is on the journal; blocked must not seal. */
function sealAlreadyDone(
  state: CoordinatedCorrectionSagaState | null,
): boolean {
  return (
    state === 'manifest-sealed' ||
    state === 'target-pending' ||
    state === 'completed' ||
    state === 'blocked'
  );
}

/** Target-pending is the 17.2-b receipt. Blocked/completed stay put. */
function targetAlreadyDone(
  state: CoordinatedCorrectionSagaState | null,
): boolean {
  return (
    state === 'target-pending' || state === 'completed' || state === 'blocked'
  );
}

/**
 * Run source → seal → target, skipping any step the saga already
 * shows done. Throws through the 17.4 one-shot crash windows so a
 * retry can resume from the durable halfway state.
 */
export async function runCoordinatedCorrection(
  stores: ICoordinatedCorrectionRunStores,
  accepted: IAcceptedCoordinatedOutcomeCorrection,
  input: ICoordinatedCorrectionRunInput,
): Promise<ICoordinatedCorrectionRunResult> {
  let source: CoordinatedCorrectionRunStep = 'skipped';
  let seal: CoordinatedCorrectionRunStep = 'skipped';
  let target: CoordinatedCorrectionRunStep = 'skipped';

  const before = currentSaga(stores.matchDb, accepted);
  if (!sourceAlreadyDone(before === null ? null : before.state)) {
    const recorded = recordCoordinatedCorrectionSource(
      stores.matchDb,
      accepted,
      { at: input.at, outcomeJson: input.outcomeJson },
    );
    source = 'ran';
    if (recorded.kind === 'refused') {
      return freezeRun(
        currentSaga(stores.matchDb, accepted),
        source,
        seal,
        target,
      );
    }
  }

  const afterSource = currentSaga(stores.matchDb, accepted);
  const afterSourceState = afterSource === null ? null : afterSource.state;
  if (!sealAlreadyDone(afterSourceState)) {
    sealCoordinatedCorrectionManifest(
      { journal: stores.journalDb, matchDb: stores.matchDb },
      { ...accepted, candidateBranchId: input.matchCandidateBranchId },
      input.artifacts,
      input.at,
    );
    seal = 'ran';
  }

  const afterSeal = currentSaga(stores.matchDb, accepted);
  const afterSealState = afterSeal === null ? null : afterSeal.state;
  if (!targetAlreadyDone(afterSealState)) {
    await recordCoordinatedCorrectionTarget(
      {
        journal: stores.journal,
        campaignDb: stores.campaignDb,
        matchDb: stores.matchDb,
      },
      accepted,
      {
        campaignId: input.campaignId,
        retainedEvents: input.retainedEvents,
        consequenceEvents: input.consequenceEvents,
        expectedPostStateDigest: input.expectedPostStateDigest,
        actor: input.actor,
        owner: input.owner,
        at: input.at,
        ...(input.ttlMs === undefined ? {} : { ttlMs: input.ttlMs }),
        ...(input.baseRevision === undefined
          ? {}
          : { baseRevision: input.baseRevision }),
      },
    );
    target = 'ran';
  }

  return freezeRun(currentSaga(stores.matchDb, accepted), source, seal, target);
}
