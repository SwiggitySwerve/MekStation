/**
 * Daily Battle Audit Entry
 *
 * Per `wire-encounter-to-campaign-round-trip` Wave 5 spec task §7: a
 * compact summary of the effects applied by the three battle-effects
 * processors (`postBattleProcessor`, `salvageProcessor`,
 * `repairQueueBuilderProcessor`) during a single day advancement. The
 * entry is surfaced on the campaign dashboard's audit feed so the
 * player can see — at a glance — what their day-advance just did.
 *
 * Each entry is keyed to a single advance-day event. Multiple matches
 * processed on the same day collapse into one entry (matches[] lists
 * each individually). Clicking an entry on the dashboard opens the
 * corresponding match's review page.
 *
 * @module types/campaign/IDailyBattleAuditEntry
 */
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { CombatEndReason } from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import { MissionStatus } from './enums/MissionStatus';
import { isContract, type IMission } from './Mission';

// =============================================================================
// Match Reference
// =============================================================================

/**
 * Lightweight reference to a match processed during a day advance. The
 * dashboard turns each one into a clickable link to
 * `/gameplay/games/<matchId>/review`.
 */
export interface IDailyBattleMatchRef {
  /** Match id — the canonical link target. */
  readonly matchId: string;
  /** Optional contract id when the match was attached to a contract. */
  readonly contractId: string | null;
  /** Brief one-line summary, e.g., "Victory — destruction (2 pilots)". */
  readonly summary: string;
}

// =============================================================================
// Audit Entry
// =============================================================================

/**
 * Single-day rollup of battle-effects work. Persisted on the campaign
 * via the `dailyBattleAudit` extension and aggregated on the dashboard.
 */
export interface IDailyBattleAuditEntry {
  /** ISO date string for the day this entry summarizes (YYYY-MM-DD). */
  readonly date: string;
  /** Number of matches whose outcomes were applied this day. */
  readonly matchesProcessed: number;
  /** Per-match references for clickable navigation. */
  readonly matches: readonly IDailyBattleMatchRef[];
  /** Sum of pilot XP awarded across all applied outcomes. */
  readonly totalXpAwarded: number;
  /** Pilots who took non-fatal wounds this day. */
  readonly pilotsWounded: number;
  /** Pilots killed in action this day. */
  readonly pilotsKia: number;
  /** Pilots missing in action this day. */
  readonly pilotsMia: number;
  /** Total salvage value (C-Bills) secured for the player side. */
  readonly salvageValueSecured: number;
  /** Number of repair tickets created. */
  readonly repairTicketsCreated: number;
  /** Optional list of fulfilled-contract ids closed during this day. */
  readonly contractsClosed: readonly string[];
}

// =============================================================================
// Campaign Extension
// =============================================================================

/**
 * Optional campaign-side ledger for daily audit entries. Like the other
 * Wave-5 extension surfaces (battle queue, salvage, repair) we widen via
 * intersection rather than touching `ICampaign` itself.
 */
export interface IDailyBattleAuditExtensions {
  readonly dailyBattleAudit?: readonly IDailyBattleAuditEntry[];
}

// =============================================================================
// Build Helpers
// =============================================================================

/**
 * Build a per-match reference from an outcome and a pilot count. Pilots
 * count is supplied externally so this stays free of any dependency on
 * the post-battle processor's result shape — keeping `lib/` out of
 * `types/`.
 */
export function buildMatchRef(
  outcome: ICombatOutcome,
  pilotCount: number,
): IDailyBattleMatchRef {
  const winner = outcome.report.winner;
  const won = winner === GameSide.Player;
  const result = winner === 'draw' ? 'Draw' : won ? 'Victory' : 'Defeat';
  const ended = endReasonLabel(outcome.endReason);
  const summary = `${result} — ${ended} (${pilotCount} pilot${pilotCount === 1 ? '' : 's'})`;
  return {
    matchId: outcome.matchId,
    contractId: outcome.contractId ?? null,
    summary,
  };
}

/**
 * Map a `CombatEndReason` to a short user-facing label.
 */
function endReasonLabel(reason: CombatEndReason): string {
  switch (reason) {
    case CombatEndReason.Destruction:
      return 'destruction';
    case CombatEndReason.ObjectiveMet:
      return 'objective met';
    case CombatEndReason.Withdrawal:
      return 'withdrawal';
    case CombatEndReason.Concede:
      return 'concede';
    case CombatEndReason.TurnLimit:
      return 'turn limit';
    case CombatEndReason.Aborted:
      return 'aborted';
    default:
      return 'ended';
  }
}

// =============================================================================
// Helper: filter contracts that flipped to a terminal status today
// =============================================================================

/**
 * Terminal mission statuses we treat as "closed" for audit purposes.
 * Subset of {@link MissionStatus} excluding ACTIVE/PENDING.
 */
const CLOSED_STATUSES: ReadonlySet<MissionStatus> = new Set([
  MissionStatus.SUCCESS,
  MissionStatus.PARTIAL,
  MissionStatus.FAILED,
  MissionStatus.BREACH,
  MissionStatus.CANCELLED,
  MissionStatus.ABORTED,
]);

/**
 * Return the ids of contract missions that ended in a terminal status
 * during the just-applied day. Used by the audit builder to surface
 * "contract closed" rows on the dashboard.
 */
export function findClosedContractIds(
  beforeMissions: ReadonlyMap<string, IMission>,
  afterMissions: ReadonlyMap<string, IMission>,
): readonly string[] {
  const closed: string[] = [];
  for (const [id, mission] of Array.from(afterMissions.entries())) {
    if (!isContract(mission)) continue;
    const previous = beforeMissions.get(id);
    if (!previous || !isContract(previous)) continue;
    if (previous.status === mission.status) continue;
    if (CLOSED_STATUSES.has(mission.status)) {
      closed.push(id);
    }
  }
  return closed;
}
