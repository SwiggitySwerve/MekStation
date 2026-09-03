/**
 * Session-free N+1 launch gate for POST launch-authority (seam 17.3-b).
 *
 * `evaluateScenarioLaunch` lives on `CampaignSyncSession` and reads the
 * in-memory retained map. This door must not acquire a host entry, so
 * the three durable clauses stay on `evaluateCampaignProgressionClauses`
 * and convergence reads `campaign_participant_cursor.acked_sequence`.
 *
 * LAW 62: this module is imported only by the server route. It does not
 * import `campaignProgressionReaders.durable`; the route binds that.
 */

import type Database from 'better-sqlite3';

import type { EventHistoryBranchStatus } from '@/lib/events/journal/EventHistoryBranchContract';
import type { IActiveBranchHead } from '@/lib/events/journal/EventHistoryExpectedHead';
import type {
  CampaignProgressionGate,
  CampaignProgressionRefusal,
  ICampaignParticipantConvergence,
  ICampaignProgressionReaders,
} from '@/lib/multiplayer/server/CampaignProgressionGate';
import type {
  CoordinatedCorrectionSagaState,
  ICoordinatedCorrectionSagaKey,
} from '@/lib/multiplayer/server/history/CoordinatedOutcomeCorrectionSaga';

import { EXPECTED_HEAD_RESYNC_ACTION } from '@/lib/events/journal/EventHistoryExpectedHead';
import {
  evaluateCampaignProgressionClauses,
  formatCampaignProgressionRefusalReason,
  PROGRESSION_BLOCKED_BEHIND,
  PROGRESSION_BLOCKED_BRANCH_NOT_ACTIVE,
  PROGRESSION_BLOCKED_CORRECTION_PENDING,
  PROGRESSION_BLOCKED_REPLACEMENT_UNVERIFIED,
} from '@/lib/multiplayer/server/CampaignProgressionGate';
import { listActiveCampaignSessionParticipants } from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

/** Same Error-frame code the AdvanceDay socket path already sends. */
export const CAMPAIGN_LAUNCH_NOT_CONVERGED = 'CAMPAIGN_NOT_CONVERGED' as const;

const ABSENT_READERS = Symbol('absent-launch-progression-readers');

type ReadersOverride =
  | ICampaignProgressionReaders
  | typeof ABSENT_READERS
  | undefined;

let readersOverride: ReadersOverride;

interface ILaunchRefusalBase {
  readonly kind: 'refused';
  readonly code: typeof CAMPAIGN_LAUNCH_NOT_CONVERGED;
  readonly reason: string;
  readonly activeHead: IActiveBranchHead;
  readonly resyncAction: typeof EXPECTED_HEAD_RESYNC_ACTION;
  readonly requiredRevision: number;
  readonly behind: readonly ICampaignParticipantConvergence[];
}

export type CampaignLaunchProgressionRefusalBody =
  | (ILaunchRefusalBase & {
      readonly clause: typeof PROGRESSION_BLOCKED_BEHIND;
    })
  | (ILaunchRefusalBase & {
      readonly clause: typeof PROGRESSION_BLOCKED_CORRECTION_PENDING;
      readonly sagaKey: ICoordinatedCorrectionSagaKey;
      readonly state: CoordinatedCorrectionSagaState;
    })
  | (ILaunchRefusalBase & {
      readonly clause: typeof PROGRESSION_BLOCKED_REPLACEMENT_UNVERIFIED;
      readonly branchId: string;
    })
  | (ILaunchRefusalBase & {
      readonly clause: typeof PROGRESSION_BLOCKED_BRANCH_NOT_ACTIVE;
      readonly branchId: string;
      readonly status: EventHistoryBranchStatus;
    });

/**
 * Install in-memory readers, force the absent-port skip, or restore
 * production. WHY: candidate/saga rows reuse the CampaignSyncSession
 * fixtures without opening a match store, and the absent-readers pin
 * must skip clauses 1-3 the same way 17.3 does.
 */
export function _setCampaignLaunchProgressionReadersForTests(
  readers: ICampaignProgressionReaders | null | undefined,
): void {
  if (readers === undefined) {
    readersOverride = undefined;
    return;
  }
  if (readers === null) {
    readersOverride = ABSENT_READERS;
    return;
  }
  readersOverride = readers;
}

/**
 * Production readers, a suite override, or undefined (skip 1-3).
 * WHY: the route supplies `createDurableCampaignProgressionReaders`
 * so this file never imports the durable module.
 */
export function resolveCampaignLaunchProgressionReaders(
  production: () => ICampaignProgressionReaders,
): ICampaignProgressionReaders | undefined {
  if (readersOverride === ABSENT_READERS) return undefined;
  if (readersOverride !== undefined) return readersOverride;
  return production();
}

/**
 * N+1 clauses then durable-cursor convergence.
 * WHY: a function named for scenario launch was only consulted on
 * AdvanceDay; this is the session-free composition the HTTP door needs.
 */
export function evaluateCampaignLaunchProgression(input: {
  readonly campaignId: string;
  readonly sessionId: string | undefined;
  readonly requiredRevision: number;
  readonly readers: ICampaignProgressionReaders | undefined;
}): CampaignProgressionGate {
  const requiredRevision = input.requiredRevision;
  const clauseRefusal = evaluateCampaignProgressionClauses({
    campaignId: input.campaignId,
    requiredRevision,
    readers: input.readers,
  });
  if (clauseRefusal !== null) return clauseRefusal;
  const behind = listParticipantsBehind(
    input.campaignId,
    input.sessionId,
    requiredRevision,
  );
  if (behind.length === 0) return { ok: true, requiredRevision };
  return {
    ok: false,
    reason: PROGRESSION_BLOCKED_BEHIND,
    requiredRevision,
    behind,
  };
}

/**
 * Typed 409 body that mirrors the stale-head refusal and the socket
 * CAMPAIGN_NOT_CONVERGED vocabulary. WHY: the client already relays
 * `kind: 'refused'` with code/reason/activeHead/resyncAction.
 */
export function toCampaignLaunchProgressionRefusal(
  gate: CampaignProgressionRefusal,
  activeHead: IActiveBranchHead,
): CampaignLaunchProgressionRefusalBody {
  const base: ILaunchRefusalBase = {
    kind: 'refused',
    code: CAMPAIGN_LAUNCH_NOT_CONVERGED,
    reason: formatCampaignProgressionRefusalReason(gate),
    activeHead,
    resyncAction: EXPECTED_HEAD_RESYNC_ACTION,
    requiredRevision: gate.requiredRevision,
    behind: gate.behind,
  };
  switch (gate.reason) {
    case PROGRESSION_BLOCKED_BEHIND:
      return { ...base, clause: gate.reason };
    case PROGRESSION_BLOCKED_CORRECTION_PENDING:
      return {
        ...base,
        clause: gate.reason,
        sagaKey: gate.sagaKey,
        state: gate.state,
      };
    case PROGRESSION_BLOCKED_REPLACEMENT_UNVERIFIED:
      return { ...base, clause: gate.reason, branchId: gate.branchId };
    case PROGRESSION_BLOCKED_BRANCH_NOT_ACTIVE:
      return {
        ...base,
        clause: gate.reason,
        branchId: gate.branchId,
        status: gate.status,
      };
  }
}

/**
 * Active session seats whose durable ack is below the launch head.
 * WHY: the retained map is process-local; a missing cursor row is
 * treated as behind (fail closed) so a never-acked seat cannot launch.
 */
function listParticipantsBehind(
  campaignId: string,
  sessionId: string | undefined,
  requiredRevision: number,
): readonly ICampaignParticipantConvergence[] {
  if (sessionId === undefined) return [];
  const db = capabilityDbOrNull();
  if (db === null) return [];
  let roster: readonly { readonly participantId: string }[];
  try {
    roster = listActiveCampaignSessionParticipants(campaignId, sessionId);
  } catch {
    return [];
  }
  const behind: ICampaignParticipantConvergence[] = [];
  for (const seat of roster) {
    const acked = readDurableAckedRevision(db, campaignId, seat.participantId);
    // No cursor row: the seat exists and has never acked. Fail closed.
    const acknowledgedRevision = acked === null ? 0 : acked;
    if (acknowledgedRevision < requiredRevision) {
      behind.push({
        participantId: seat.participantId,
        acknowledgedRevision,
      });
    }
  }
  return behind;
}

/**
 * Highest `acked_sequence` for this participant, or null when no row
 * exists. WHY: `readParticipantDeliveryCursor` is keyed by grant id,
 * which this door does not have; the watermark is per participant.
 */
function readDurableAckedRevision(
  db: Database.Database,
  campaignId: string,
  participantId: string,
): number | null {
  const row = db
    .prepare(
      `SELECT MAX(acked_sequence) AS acked
         FROM campaign_participant_cursor
        WHERE campaign_id = ? AND participant_id = ?`,
    )
    .get(campaignId, participantId) as
    | { readonly acked: number | null }
    | undefined;
  if (row === undefined || row.acked === null) return null;
  return row.acked;
}

/**
 * Campaign-database handle, or null when SQLite is not open.
 * WHY: durable 17.3 readers return null when uninitialized so existing
 * suites stay byte-identical; listing seats must do the same.
 */
function capabilityDbOrNull(): Database.Database | null {
  const service = getSQLiteService();
  if (!service.isInitialized()) return null;
  try {
    return service.getDatabase();
  } catch {
    return null;
  }
}
