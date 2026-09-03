/**
 * Target half of the coordinated outcome-correction saga (seam 17.2-b).
 *
 * There is no cross-database transaction. The saga row lives on the
 * MATCH STORE file; the candidate, replay, consequence batch, replacement
 * receipt, and campaign manifest live on the CAMPAIGN journal file. A
 * process that dies between those connections leaves a durable, named
 * halfway state (candidate id on the saga, or a replacement row without
 * `target-pending`) rather than a silent half-commit.
 *
 * Each step has an idempotency key so a re-run converges:
 * 1. saga (match_id, outcome_id, outcome_version) must be manifest-sealed
 *    (target-pending / completed also pass so a post-success retry can
 *    hit step 2).
 * 2. replacement row (outcome_id, outcome_version) — a hit is the retry
 *    law: same receipt, no writes.
 * 3. correction lease on campaignStreamRef(campaignId) — held-by-other
 *    is retryable, not blocked.
 * 4. minted candidate_branch_id persisted on the saga BEFORE any journal
 *    write. The id is random and not re-derivable; a retry reuses it.
 * 5. replay groups keyed by candidateScopedCommandId.
 * 6. consequence commandId `${candidate}--outcome-correction:${id}:${ver}`;
 *    duplicate-command / command-identity-conflict = already appended.
 * 7. INSERT OR IGNORE on the replacement key.
 * 8. campaign manifest (stream, candidateBranchId) — skip if sealed.
 * 9. saga advances to target-pending. Activation is 16.3 / 17.3;
 *    `completed` is not written here.
 *
 * The accepted inbox row is never updated (21.3: a correction is a new
 * fact). Do not call appendCampaignCombatOutcomeBatch — it is not
 * branch-aware and would answer outcome-version-conflict.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-combat-loop/spec.md
 */

import type Database from 'better-sqlite3';

import type { IEventJournal } from '@/lib/events/journal/EventJournalContract';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';
import type { IRetainedSourceEvent } from '@/lib/campaign/rebuild/CampaignReplacementReplay';
import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';

import type {
  CoordinatedCorrectionSagaState,
  IAcceptedCoordinatedOutcomeCorrection,
  ICoordinatedCorrectionSaga,
} from './CoordinatedOutcomeCorrectionSaga';
import type { ICampaignCombatOutcomeReplacementReceipt } from './CoordinatedOutcomeCorrectionTarget.steps';

import {
  blockCoordinatedCorrection,
  readCoordinatedCorrectionSaga,
  sagaKeyOf,
} from './CoordinatedOutcomeCorrectionSaga';
import {
  acquireTargetCorrectionLease,
  advanceSagaToTargetPending,
  appendReplacementConsequenceBatch,
  insertReplacementReceipt,
  isNonRetryableTargetRefusal,
  isRetryableLeaseRefusal,
  mintTargetCandidateBranch,
  persistSagaCandidateBranchId,
  readReplacementReceipt,
  reasonFromUnknown,
  replayRetainedOntoCandidate,
  sealCampaignImpactIfNeeded,
} from './CoordinatedOutcomeCorrectionTarget.steps';

export {
  CAMPAIGN_COMBAT_OUTCOME_REPLACEMENT_TABLE,
  coordinatedCorrectionConsequenceCommandId,
  migrateCampaignCombatOutcomeReplacement,
  readReplacementReceipt,
  type ICampaignCombatOutcomeReplacementReceipt,
} from './CoordinatedOutcomeCorrectionTarget.steps';

export interface ICoordinatedCorrectionTargetStores {
  readonly journal: IEventJournal<ICampaignJournalEnvelope>;
  readonly campaignDb: Database.Database;
  readonly matchDb: Database.Database;
}

export interface IRecordCoordinatedCorrectionTargetInput {
  readonly campaignId: string;
  readonly retainedEvents: readonly IRetainedSourceEvent[];
  readonly consequenceEvents: readonly ICampaignEvent[];
  readonly expectedPostStateDigest: string;
  readonly actor: string;
  readonly owner: string;
  readonly at: string;
  readonly ttlMs?: number;
  readonly baseRevision?: number;
}

export type RecordCoordinatedCorrectionTargetResult =
  | {
      readonly kind: 'recorded';
      readonly receipt: ICampaignCombatOutcomeReplacementReceipt;
      readonly saga: ICoordinatedCorrectionSaga;
    }
  | {
      readonly kind: 'pending';
      readonly receipt: ICampaignCombatOutcomeReplacementReceipt;
      readonly saga: ICoordinatedCorrectionSaga;
    }
  | {
      readonly kind: 'not-ready';
      readonly state: CoordinatedCorrectionSagaState | null;
      readonly reason?: string;
    }
  | {
      readonly kind: 'blocked';
      readonly reason: string;
      readonly saga: ICoordinatedCorrectionSaga | null;
    };

let failAfterCandidatePersistForTests = false;

/** Test-only: crash after the candidate id is on the saga, before replay. */
export function _setFailAfterCandidatePersistForTests(fail: boolean): void {
  failAfterCandidatePersistForTests = fail;
}

function notReady(
  state: CoordinatedCorrectionSagaState | null,
  reason?: string,
): RecordCoordinatedCorrectionTargetResult {
  return Object.freeze(
    reason === undefined
      ? { kind: 'not-ready', state }
      : { kind: 'not-ready', state, reason },
  );
}

function sagaIsReadyForTarget(
  state: CoordinatedCorrectionSagaState,
): boolean {
  return (
    state === 'manifest-sealed' ||
    state === 'target-pending' ||
    state === 'completed'
  );
}

/**
 * Record the campaign replacement receipt and consequence batch, or
 * answer pending / not-ready / blocked. Never claims one transaction
 * across the two SQLite files.
 */
export async function recordCoordinatedCorrectionTarget(
  stores: ICoordinatedCorrectionTargetStores,
  accepted: IAcceptedCoordinatedOutcomeCorrection,
  input: IRecordCoordinatedCorrectionTargetInput,
): Promise<RecordCoordinatedCorrectionTargetResult> {
  const key = sagaKeyOf(accepted);
  const saga = readCoordinatedCorrectionSaga(stores.matchDb, key);
  if (saga === null || !sagaIsReadyForTarget(saga.state)) {
    return notReady(saga === null ? null : saga.state);
  }

  const existing = readReplacementReceipt(
    stores.campaignDb,
    accepted.outcomeId,
    accepted.outcomeVersion,
  );
  if (existing !== null) {
    return Object.freeze({ kind: 'recorded', receipt: existing, saga });
  }

  try {
    let candidateBranchId = saga.candidateBranchId;
    if (candidateBranchId === null || candidateBranchId.length === 0) {
      const lease = acquireTargetCorrectionLease(stores.campaignDb, {
        campaignId: input.campaignId,
        owner: input.owner,
        actor: input.actor,
        at: input.at,
        ttlMs: input.ttlMs ?? 60_000,
      });
      candidateBranchId = mintTargetCandidateBranch(stores.campaignDb, lease, {
        campaignId: input.campaignId,
        at: input.at,
        ...(input.baseRevision === undefined
          ? {}
          : { baseRevision: input.baseRevision }),
      });
      persistSagaCandidateBranchId(
        stores.matchDb,
        key,
        candidateBranchId,
        input.at,
      );
    }

    if (failAfterCandidatePersistForTests) {
      throw new Error('test-crash-after-candidate-persist');
    }

    await replayRetainedOntoCandidate(stores.journal, stores.campaignDb, {
      campaignId: input.campaignId,
      candidateBranchId,
      events: input.retainedEvents,
    });

    const batch = await appendReplacementConsequenceBatch(
      stores.journal,
      stores.campaignDb,
      {
        campaignId: input.campaignId,
        candidateBranchId,
        outcomeId: accepted.outcomeId,
        outcomeVersion: accepted.outcomeVersion,
        events: input.consequenceEvents,
        expectedPostStateDigest: input.expectedPostStateDigest,
      },
    );

    const receipt = insertReplacementReceipt(stores.campaignDb, {
      outcomeId: accepted.outcomeId,
      outcomeVersion: accepted.outcomeVersion,
      campaignId: input.campaignId,
      candidateBranchId,
      commandId: batch.commandId,
      firstStreamRevision: batch.firstStreamRevision,
      lastStreamRevision: batch.lastStreamRevision,
      recordedAt: input.at,
    });

    await sealCampaignImpactIfNeeded(stores.campaignDb, stores.journal, {
      campaignId: input.campaignId,
      candidateBranchId,
      at: input.at,
    });

    advanceSagaToTargetPending(stores.matchDb, key, input.at);
    const next = readCoordinatedCorrectionSaga(stores.matchDb, key);
    if (next === null) {
      throw new Error('coordinated-correction saga row missing after target');
    }
    return Object.freeze({ kind: 'pending', receipt, saga: next });
  } catch (error) {
    if (isRetryableLeaseRefusal(error)) {
      return notReady(saga.state, reasonFromUnknown(error));
    }
    const reason = reasonFromUnknown(error);
    if (isNonRetryableTargetRefusal(error)) {
      blockCoordinatedCorrection(stores.matchDb, key, reason);
    }
    return Object.freeze({
      kind: 'blocked',
      reason,
      saga: readCoordinatedCorrectionSaga(stores.matchDb, key),
    });
  }
}
