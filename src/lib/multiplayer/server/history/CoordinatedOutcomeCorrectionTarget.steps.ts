/**
 * Step helpers for the 17.2-b target half. Each helper is keyed so a
 * re-run after a crash on a later step converges instead of minting
 * or appending a second fact.
 */

import type Database from 'better-sqlite3';

import type { IRetainedSourceEvent } from '@/lib/campaign/rebuild/CampaignReplacementReplay';
import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { IEventHistoryCorrectionLease } from '@/lib/events/journal/EventHistoryCorrectionLeaseContract';
import type { IEventJournal } from '@/lib/events/journal/EventJournalContract';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { campaignStreamRef } from '@/lib/campaign/authority/campaignLaunchHead';
import { readCampaignBranchAnchor } from '@/lib/campaign/rebuild/CampaignBranchAnchor';
import { replayCampaignReplacement } from '@/lib/campaign/rebuild/CampaignReplacementReplay';
import { appendCampaignCommandBatch } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import { EventHistoryBranchError } from '@/lib/events/journal/EventHistoryBranchContract';
import { createCorrectionCandidateBranch } from '@/lib/events/journal/EventHistoryCandidateBuild';
import { EventHistoryCorrectionLeaseError } from '@/lib/events/journal/EventHistoryCorrectionLeaseContract';
import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { deriveAndSealCampaignImpact } from '@/lib/interventions/GmCampaignImpactDerivation';

import type { ICoordinatedCorrectionSagaKey } from './CoordinatedOutcomeCorrectionSaga';

import {
  COORDINATED_CORRECTION_SAGA_TABLE,
  migrateCoordinatedCorrectionSaga,
  readCoordinatedCorrectionSaga,
} from './CoordinatedOutcomeCorrectionSaga';

export const CAMPAIGN_COMBAT_OUTCOME_REPLACEMENT_TABLE =
  'campaign_combat_outcome_replacement' as const;

export interface ICampaignCombatOutcomeReplacementReceipt {
  readonly outcomeId: string;
  readonly outcomeVersion: number;
  readonly campaignId: string;
  readonly candidateBranchId: string;
  readonly commandId: string;
  readonly firstStreamRevision: number;
  readonly lastStreamRevision: number;
  readonly recordedAt: string;
}

interface IReplacementRow {
  readonly outcome_id: string;
  readonly outcome_version: number;
  readonly campaign_id: string;
  readonly candidate_branch_id: string;
  readonly command_id: string;
  readonly first_stream_revision: number;
  readonly last_stream_revision: number;
  readonly recorded_at: string;
}

export function migrateCampaignCombatOutcomeReplacement(
  campaignDb: Database.Database,
): void {
  campaignDb.exec(`
    CREATE TABLE IF NOT EXISTS ${CAMPAIGN_COMBAT_OUTCOME_REPLACEMENT_TABLE} (
      outcome_id             TEXT    NOT NULL,
      outcome_version        INTEGER NOT NULL,
      campaign_id            TEXT    NOT NULL,
      candidate_branch_id    TEXT    NOT NULL,
      command_id             TEXT    NOT NULL,
      first_stream_revision  INTEGER NOT NULL,
      last_stream_revision   INTEGER NOT NULL,
      recorded_at            TEXT    NOT NULL,
      PRIMARY KEY (outcome_id, outcome_version)
    );
  `);
}

export function readReplacementReceipt(
  campaignDb: Database.Database,
  outcomeId: string,
  outcomeVersion: number,
): ICampaignCombatOutcomeReplacementReceipt | null {
  migrateCampaignCombatOutcomeReplacement(campaignDb);
  const row = campaignDb
    .prepare(
      `SELECT outcome_id, outcome_version, campaign_id, candidate_branch_id,
              command_id, first_stream_revision, last_stream_revision,
              recorded_at
         FROM ${CAMPAIGN_COMBAT_OUTCOME_REPLACEMENT_TABLE}
        WHERE outcome_id = ? AND outcome_version = ?`,
    )
    .get(outcomeId, outcomeVersion) as IReplacementRow | undefined;
  return row === undefined ? null : receiptOf(row);
}

function receiptOf(
  row: IReplacementRow,
): ICampaignCombatOutcomeReplacementReceipt {
  return Object.freeze({
    outcomeId: row.outcome_id,
    outcomeVersion: row.outcome_version,
    campaignId: row.campaign_id,
    candidateBranchId: row.candidate_branch_id,
    commandId: row.command_id,
    firstStreamRevision: row.first_stream_revision,
    lastStreamRevision: row.last_stream_revision,
    recordedAt: row.recorded_at,
  });
}

export function coordinatedCorrectionConsequenceCommandId(
  candidateBranchId: string,
  outcomeId: string,
  outcomeVersion: number,
): string {
  return `${candidateBranchId}--outcome-correction:${outcomeId}:${outcomeVersion}`;
}

export function isRetryableLeaseRefusal(error: unknown): boolean {
  return error instanceof EventHistoryCorrectionLeaseError;
}

export function isNonRetryableTargetRefusal(error: unknown): boolean {
  return error instanceof EventHistoryBranchError;
}

export function reasonFromUnknown(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Persist the minted id on the MATCH STORE. The mint is on the
 * campaign file; this UPDATE is a second durability step. `IS NULL`
 * keeps a retry from replacing the first random id.
 */
export function persistSagaCandidateBranchId(
  matchDb: Database.Database,
  key: ICoordinatedCorrectionSagaKey,
  candidateBranchId: string,
  at: string,
): void {
  migrateCoordinatedCorrectionSaga(matchDb);
  matchDb
    .prepare(
      `UPDATE ${COORDINATED_CORRECTION_SAGA_TABLE}
          SET candidate_branch_id = ?,
              updated_at = ?
        WHERE match_id = ? AND outcome_id = ? AND outcome_version = ?
          AND candidate_branch_id IS NULL`,
    )
    .run(candidateBranchId, at, key.matchId, key.outcomeId, key.outcomeVersion);
}

export function acquireTargetCorrectionLease(
  campaignDb: Database.Database,
  input: {
    readonly campaignId: string;
    readonly owner: string;
    readonly actor: string;
    readonly at: string;
    readonly ttlMs: number;
  },
): IEventHistoryCorrectionLease {
  const stream = campaignStreamRef(input.campaignId);
  const branches = new SQLiteEventHistoryBranchStore(campaignDb);
  const leases = new SQLiteEventHistoryCorrectionLeaseStore(
    campaignDb,
    branches,
    { nowMs: () => Date.parse(input.at) },
  );
  const effective = branches.requireEffectiveHead(stream);
  const head = readEffectiveStreamHead(campaignDb, branches, stream);
  return leases.acquireCorrectionLease({
    ...stream,
    owner: input.owner,
    actor: input.actor,
    reason: 'coordinated-outcome-correction-target',
    ttlMs: input.ttlMs,
    expectedBranchId: head.branchId,
    expectedRevision: head.revision,
    expectedDigest: head.digest,
    expectedGeneration: effective.effectiveGeneration,
  });
}

export function mintTargetCandidateBranch(
  campaignDb: Database.Database,
  lease: IEventHistoryCorrectionLease,
  input: {
    readonly campaignId: string;
    readonly at: string;
    readonly baseRevision?: number;
  },
): string {
  const stream = campaignStreamRef(input.campaignId);
  const branches = new SQLiteEventHistoryBranchStore(campaignDb);
  const leases = new SQLiteEventHistoryCorrectionLeaseStore(
    campaignDb,
    branches,
    { nowMs: () => Date.parse(input.at) },
  );
  return createCorrectionCandidateBranch(campaignDb, leases, {
    ...stream,
    leaseId: lease.leaseId,
    owner: lease.owner,
    fencingEpoch: lease.fencingEpoch,
    createdAt: input.at,
    ...(input.baseRevision === undefined
      ? {}
      : { baseRevision: input.baseRevision }),
  }).branchId;
}

export async function replayRetainedOntoCandidate(
  journal: IEventJournal<ICampaignJournalEnvelope>,
  campaignDb: Database.Database,
  input: {
    readonly campaignId: string;
    readonly candidateBranchId: string;
    readonly events: readonly IRetainedSourceEvent[];
  },
): Promise<void> {
  await replayCampaignReplacement(journal, campaignDb, input);
}

export async function appendReplacementConsequenceBatch(
  journal: IEventJournal<ICampaignJournalEnvelope>,
  campaignDb: Database.Database,
  input: {
    readonly campaignId: string;
    readonly candidateBranchId: string;
    readonly outcomeId: string;
    readonly outcomeVersion: number;
    readonly events: readonly ICampaignEvent[];
    readonly expectedPostStateDigest: string;
  },
): Promise<{
  readonly commandId: string;
  readonly firstStreamRevision: number;
  readonly lastStreamRevision: number;
}> {
  const commandId = coordinatedCorrectionConsequenceCommandId(
    input.candidateBranchId,
    input.outcomeId,
    input.outcomeVersion,
  );
  const anchor = readCampaignBranchAnchor(
    campaignDb,
    input.campaignId,
    input.candidateBranchId,
  );
  const result = await appendCampaignCommandBatch(journal, {
    campaignId: input.campaignId,
    commandId,
    events: input.events,
    expectedPostStateDigest: input.expectedPostStateDigest,
    branchId: input.candidateBranchId,
    expectedRevision: anchor.revision,
  });
  if (result.kind === 'committed') {
    return Object.freeze({
      commandId,
      firstStreamRevision: result.receipt.firstStreamRevision,
      lastStreamRevision: result.receipt.lastStreamRevision,
    });
  }
  // Same command id: the prior attempt already appended. Continue.
  if (
    result.kind === 'duplicate-command' ||
    result.kind === 'command-identity-conflict'
  ) {
    const prior = await journal.getCommandReceipt(commandId);
    if (prior === null) {
      throw new Error(
        `Consequence command '${commandId}' reported duplicate but has no receipt`,
      );
    }
    return Object.freeze({
      commandId,
      firstStreamRevision: prior.firstStreamRevision,
      lastStreamRevision: prior.lastStreamRevision,
    });
  }
  throw new Error(`Replacement consequence batch refused: ${result.kind}`);
}

export function insertReplacementReceipt(
  campaignDb: Database.Database,
  receipt: ICampaignCombatOutcomeReplacementReceipt,
): ICampaignCombatOutcomeReplacementReceipt {
  migrateCampaignCombatOutcomeReplacement(campaignDb);
  campaignDb
    .prepare(
      `INSERT OR IGNORE INTO ${CAMPAIGN_COMBAT_OUTCOME_REPLACEMENT_TABLE} (
         outcome_id, outcome_version, campaign_id, candidate_branch_id,
         command_id, first_stream_revision, last_stream_revision, recorded_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      receipt.outcomeId,
      receipt.outcomeVersion,
      receipt.campaignId,
      receipt.candidateBranchId,
      receipt.commandId,
      receipt.firstStreamRevision,
      receipt.lastStreamRevision,
      receipt.recordedAt,
    );
  const stored = readReplacementReceipt(
    campaignDb,
    receipt.outcomeId,
    receipt.outcomeVersion,
  );
  if (stored === null) {
    throw new Error('replacement receipt missing after insert');
  }
  return stored;
}

export async function sealCampaignImpactIfNeeded(
  campaignDb: Database.Database,
  journal: IEventJournal<ICampaignJournalEnvelope>,
  input: {
    readonly campaignId: string;
    readonly candidateBranchId: string;
    readonly at: string;
  },
): Promise<void> {
  const stream = campaignStreamRef(input.campaignId);
  const manifests = new SQLiteEventHistoryArtifactManifestStore(campaignDb);
  if (
    manifests.readArtifactManifest(stream, input.candidateBranchId) !== null
  ) {
    return;
  }
  const branch = new SQLiteEventHistoryBranchStore(campaignDb).requireBranch(
    stream,
    input.candidateBranchId,
  );
  await deriveAndSealCampaignImpact(campaignDb, journal, {
    stream,
    candidateBranchId: input.candidateBranchId,
    cutoffRevision: branch.baseRevision,
    derivedAt: input.at,
  });
}

export function advanceSagaToTargetPending(
  matchDb: Database.Database,
  key: ICoordinatedCorrectionSagaKey,
  at: string,
): void {
  matchDb
    .prepare(
      `UPDATE ${COORDINATED_CORRECTION_SAGA_TABLE}
          SET state = 'target-pending',
              target_recorded_at = ?,
              updated_at = ?
        WHERE match_id = ? AND outcome_id = ? AND outcome_version = ?
          AND state = 'manifest-sealed'`,
    )
    .run(at, at, key.matchId, key.outcomeId, key.outcomeVersion);
  if (readCoordinatedCorrectionSaga(matchDb, key) === null) {
    throw new Error(
      'coordinated-correction saga row missing after target advance',
    );
  }
}
