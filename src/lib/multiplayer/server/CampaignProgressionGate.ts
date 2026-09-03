/**
 * N+1 scenario-launch clauses in front of participant convergence
 * (seam 17.3).
 *
 * `evaluateScenarioLaunch` used to answer convergence only. A campaign
 * whose combat outcome is still being replaced, or whose replacement
 * branch is still a candidate, must not launch the next scenario even
 * when every retained client has caught up. The extra readers live here
 * so `CampaignSyncSession` stays a session, not a journal/saga client.
 *
 * Clause order is load-bearing: a candidate head is a stronger fact
 * than a pending saga, and a pending saga is a stronger fact than an
 * unverifiable manifest. Convergence stays last so existing behind
 * rows keep their meaning once the earlier clauses are satisfied.
 */

import type Database from 'better-sqlite3';

import type {
  EventHistoryBranchStatus,
  IEventHistoryBranch,
  IEventHistoryEffectiveHead,
  IEventHistoryStreamRef,
} from '@/lib/events/journal/EventHistoryBranchContract';

import { campaignStreamRef } from '@/lib/campaign/authority/campaignLaunchHead';
import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

import { DurableMatchStore } from './DurableMatchStore';
import { getDefaultMatchStore } from './getDefaultMatchStore';
import {
  readCoordinatedCorrectionSagaByOutcomeId,
  sagaKeyOf,
  type CoordinatedCorrectionSagaState,
  type ICoordinatedCorrectionSaga,
  type ICoordinatedCorrectionSagaKey,
} from './history/CoordinatedOutcomeCorrectionSaga';

/** Convergence: a retained participant has not applied the live head. */
export const PROGRESSION_BLOCKED_BEHIND = 'participants-behind' as const;

/** A coordinated correction saga for this campaign is not yet completed. */
export const PROGRESSION_BLOCKED_CORRECTION_PENDING =
  'correction-pending' as const;

/**
 * The saga named a replacement branch whose manifest is missing or
 * whose sealed header does not match its rows.
 */
export const PROGRESSION_BLOCKED_REPLACEMENT_UNVERIFIED =
  'replacement-artifacts-unverified' as const;

/**
 * The campaign stream's effective head points at a branch that is not
 * the live (`effective`) status — a candidate still awaiting activation.
 */
export const PROGRESSION_BLOCKED_BRANCH_NOT_ACTIVE =
  'branch-not-active' as const;

/**
 * Domain status for an installed live head. The branch contract has no
 * `active` member; `effective` is that member.
 */
export const PROGRESSION_BRANCH_ACTIVE_STATUS = 'effective' as const;

export interface ICampaignParticipantConvergence {
  readonly participantId: string;
  readonly acknowledgedRevision: number;
}

export type CampaignManifestVerdict =
  | { readonly kind: 'verified' }
  | { readonly kind: 'unverified' };

/**
 * Optional ports the session consults before the retained-map check.
 * Absent readers skip the extra clauses, which is why suites that never
 * inject them stay byte-identical to the convergence-only gate.
 */
export interface ICampaignProgressionReaders {
  readonly readEffectiveHead: (
    stream: IEventHistoryStreamRef,
  ) => IEventHistoryEffectiveHead | null;
  readonly readBranch: (
    stream: IEventHistoryStreamRef,
    branchId: string,
  ) => IEventHistoryBranch | null;
  /**
   * Latest saga for this campaign, or null when none. Indexed by the
   * inbox `outcome_id`: the inbox row does not carry `match_id`.
   */
  readonly readSagaForCampaign: (
    campaignId: string,
  ) => ICoordinatedCorrectionSaga | null;
  readonly readManifestVerdict: (
    stream: IEventHistoryStreamRef,
    branchId: string,
  ) => CampaignManifestVerdict | null;
}

interface ICampaignProgressionRefusalBase {
  readonly ok: false;
  readonly requiredRevision: number;
  /**
   * On every refusal so existing `if (!gate.ok) gate.behind` rows keep
   * compiling. Empty when the reason is not convergence.
   */
  readonly behind: readonly ICampaignParticipantConvergence[];
}

export type CampaignProgressionGate =
  | { readonly ok: true; readonly requiredRevision: number }
  | (ICampaignProgressionRefusalBase & {
      readonly reason: typeof PROGRESSION_BLOCKED_BEHIND;
    })
  | (ICampaignProgressionRefusalBase & {
      readonly reason: typeof PROGRESSION_BLOCKED_CORRECTION_PENDING;
      readonly sagaKey: ICoordinatedCorrectionSagaKey;
      readonly state: CoordinatedCorrectionSagaState;
    })
  | (ICampaignProgressionRefusalBase & {
      readonly reason: typeof PROGRESSION_BLOCKED_REPLACEMENT_UNVERIFIED;
      readonly branchId: string;
    })
  | (ICampaignProgressionRefusalBase & {
      readonly reason: typeof PROGRESSION_BLOCKED_BRANCH_NOT_ACTIVE;
      readonly branchId: string;
      readonly status: EventHistoryBranchStatus;
    });

export type CampaignProgressionRefusal = Exclude<
  CampaignProgressionGate,
  { readonly ok: true }
>;

/**
 * The three N+1 clauses, or null when they do not refuse. Null means
 * "continue to the retained-participant check", not "launch is ok".
 */
export function evaluateCampaignProgressionClauses(input: {
  readonly campaignId: string;
  readonly requiredRevision: number;
  readonly readers: ICampaignProgressionReaders | undefined;
}): CampaignProgressionRefusal | null {
  if (input.readers === undefined) return null;
  const stream = campaignStreamRef(input.campaignId);
  const requiredRevision = input.requiredRevision;

  const head = input.readers.readEffectiveHead(stream);
  const branch =
    head === null ? null : input.readers.readBranch(stream, head.branchId);
  if (branch !== null && branch.status !== PROGRESSION_BRANCH_ACTIVE_STATUS) {
    return {
      ok: false,
      reason: PROGRESSION_BLOCKED_BRANCH_NOT_ACTIVE,
      requiredRevision,
      branchId: branch.branchId,
      status: branch.status,
      behind: [],
    };
  }

  const saga = input.readers.readSagaForCampaign(input.campaignId);
  if (saga !== null && saga.state !== 'completed') {
    return {
      ok: false,
      reason: PROGRESSION_BLOCKED_CORRECTION_PENDING,
      requiredRevision,
      sagaKey: sagaKeyOf(saga),
      state: saga.state,
      behind: [],
    };
  }

  const artifactBranchId = saga?.candidateBranchId;
  if (
    artifactBranchId !== null &&
    artifactBranchId !== undefined &&
    artifactBranchId.length > 0
  ) {
    const verdict = input.readers.readManifestVerdict(stream, artifactBranchId);
    if (verdict !== null && verdict.kind === 'unverified') {
      return {
        ok: false,
        reason: PROGRESSION_BLOCKED_REPLACEMENT_UNVERIFIED,
        requiredRevision,
        branchId: artifactBranchId,
        behind: [],
      };
    }
  }

  return null;
}

/**
 * Same CAMPAIGN_NOT_CONVERGED reason string the behind-case already
 * sends; new reasons reuse that frame with their carried fields.
 */
export function formatCampaignProgressionRefusalReason(
  gate: CampaignProgressionRefusal,
): string {
  switch (gate.reason) {
    case PROGRESSION_BLOCKED_BEHIND: {
      const behind = gate.behind
        .map((row) => `${row.participantId}:${row.acknowledgedRevision}`)
        .join(',');
      return `participants-behind ${behind}; requiredRevision ${gate.requiredRevision}`;
    }
    case PROGRESSION_BLOCKED_CORRECTION_PENDING:
      return (
        `correction-pending matchId ${gate.sagaKey.matchId} ` +
        `outcomeId ${gate.sagaKey.outcomeId} ` +
        `outcomeVersion ${String(gate.sagaKey.outcomeVersion)} ` +
        `state ${gate.state}; requiredRevision ${gate.requiredRevision}`
      );
    case PROGRESSION_BLOCKED_REPLACEMENT_UNVERIFIED:
      return (
        `replacement-artifacts-unverified branchId ${gate.branchId}; ` +
        `requiredRevision ${gate.requiredRevision}`
      );
    case PROGRESSION_BLOCKED_BRANCH_NOT_ACTIVE:
      return (
        `branch-not-active branchId ${gate.branchId} status ${gate.status}; ` +
        `requiredRevision ${gate.requiredRevision}`
      );
  }
}

/**
 * Production readers. Each call returns null when SQLiteService has not
 * been initialized, so suites that never open a campaign journal keep
 * the convergence-only answer.
 */
export function createDurableCampaignProgressionReaders(): ICampaignProgressionReaders {
  return {
    readEffectiveHead: (stream) => {
      const db = journalDbOrNull();
      if (db === null) return null;
      try {
        return new SQLiteEventHistoryBranchStore(db).readEffectiveHead(stream);
      } catch {
        return null;
      }
    },
    readBranch: (stream, branchId) => {
      const db = journalDbOrNull();
      if (db === null) return null;
      try {
        return new SQLiteEventHistoryBranchStore(db).readBranch(
          stream,
          branchId,
        );
      } catch {
        return null;
      }
    },
    readSagaForCampaign: (campaignId) => readDurableSagaForCampaign(campaignId),
    readManifestVerdict: (stream, branchId) =>
      readDurableManifestVerdict(stream, branchId),
  };
}

function journalDbOrNull(): Database.Database | null {
  const service = getSQLiteService();
  if (!service.isInitialized()) return null;
  try {
    return service.getDatabase();
  } catch {
    return null;
  }
}

function matchStoreDbOrNull(): Database.Database | null {
  const store = getDefaultMatchStore();
  if (!(store instanceof DurableMatchStore)) return null;
  try {
    return store.getDatabase();
  } catch {
    return null;
  }
}

/**
 * Inbox has `outcome_id` and no `match_id`, so the saga is looked up
 * by outcome id on the match-store file (not the journal).
 */
function readDurableSagaForCampaign(
  campaignId: string,
): ICoordinatedCorrectionSaga | null {
  const journal = journalDbOrNull();
  if (journal === null) return null;
  const outcomeId = readLatestInboxOutcomeId(journal, campaignId);
  if (outcomeId === null) return null;
  const matchDb = matchStoreDbOrNull();
  if (matchDb === null) return null;
  return readCoordinatedCorrectionSagaByOutcomeId(matchDb, outcomeId);
}

function readLatestInboxOutcomeId(
  journal: Database.Database,
  campaignId: string,
): string | null {
  try {
    const row = journal
      .prepare(
        `SELECT outcome_id AS outcomeId
           FROM campaign_combat_outcome_inbox
          WHERE campaign_id = ?
          ORDER BY received_at DESC, outcome_version DESC
          LIMIT 1`,
      )
      .get(campaignId) as { readonly outcomeId: string } | undefined;
    return row === undefined ? null : row.outcomeId;
  } catch {
    return null;
  }
}

function readDurableManifestVerdict(
  stream: IEventHistoryStreamRef,
  branchId: string,
): CampaignManifestVerdict | null {
  const db = journalDbOrNull();
  if (db === null) return null;
  try {
    const manifests = new SQLiteEventHistoryArtifactManifestStore(db);
    if (manifests.readArtifactManifest(stream, branchId) === null) {
      return { kind: 'unverified' };
    }
    manifests.verifyArtifactManifest(stream, branchId);
    return { kind: 'verified' };
  } catch {
    // Missing table, missing seal, or digest mismatch: all unverifiable.
    return { kind: 'unverified' };
  }
}
