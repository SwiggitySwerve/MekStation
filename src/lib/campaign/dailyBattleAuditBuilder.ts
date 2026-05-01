/**
 * Daily Battle Audit Builder
 *
 * Per `wire-encounter-to-campaign-round-trip` Wave 5 spec task §7:
 * aggregates the effects produced by the three battle-effects processors
 * (`postBattleProcessor`, `salvageProcessor`,
 * `repairQueueBuilderProcessor`) and emits a single
 * `IDailyBattleAuditEntry` for the day. The entry is appended to the
 * campaign's `dailyBattleAudit` ledger so the dashboard's audit feed can
 * surface it without re-walking the events array.
 *
 * The builder is pure: given a before-state, an after-state, the events
 * the pipeline emitted today, and the campaign's current date, it returns
 * the audit entry — no side effects.
 *
 * @module lib/campaign/dailyBattleAuditBuilder
 */
import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  IDailyBattleAuditEntry,
  IDailyBattleMatchRef,
} from '@/types/campaign/IDailyBattleAuditEntry';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import {
  buildMatchRef,
  findClosedContractIds,
} from '@/types/campaign/IDailyBattleAuditEntry';
import { PilotFinalStatus } from '@/types/combat/CombatOutcome';

import type { IDayEvent } from './dayPipeline';
import type { ICampaignWithBattleState } from './processors/postBattleProcessor';

// =============================================================================
// Public API
// =============================================================================

/**
 * Aggregate the day's battle-effects events into a single audit entry.
 *
 * @param params.before - Campaign snapshot BEFORE the day pipeline ran.
 * @param params.after - Campaign snapshot AFTER all processors ran.
 * @param params.appliedOutcomes - Outcomes the post-battle processor
 *   actually drained from the queue (i.e., `recentlyAppliedOutcomes`).
 * @param params.events - The events the pipeline emitted on this day.
 * @param params.date - The campaign date that was processed.
 *
 * @returns A {@link IDailyBattleAuditEntry} or `null` when no battle
 *   effects ran (no matches drained, no salvage emitted, no repair
 *   tickets created). The dashboard skips empty days entirely.
 */
export function buildDailyBattleAuditEntry(params: {
  readonly before: ICampaignWithBattleState;
  readonly after: ICampaignWithBattleState;
  readonly appliedOutcomes: readonly ICombatOutcome[];
  readonly events: readonly IDayEvent[];
  readonly date: Date;
}): IDailyBattleAuditEntry | null {
  const { before, after, appliedOutcomes, events, date } = params;

  if (appliedOutcomes.length === 0) {
    // Nothing was drained — even if salvage/repair fired on a stale
    // queue, we don't emit a per-day card without a match list.
    return null;
  }

  // ---------------------------------------------------------------------
  // Matches + per-match summary
  // ---------------------------------------------------------------------
  const pilotCounts = pilotsTouchedPerOutcome(events);
  const matches: IDailyBattleMatchRef[] = appliedOutcomes.map((outcome) =>
    buildMatchRef(outcome, pilotCounts.get(outcome.matchId) ?? 0),
  );

  // ---------------------------------------------------------------------
  // Pilot tallies — read from outcome deltas (the source of truth) so we
  // don't double-count when the same pilot appears in multiple outcomes.
  // We use a per-pilot last-status convention: the last outcome that
  // touches a pilot wins for status counters (KIA / MIA / Wounded).
  // ---------------------------------------------------------------------
  const pilotStatus = collapsePilotStatuses(appliedOutcomes);
  let pilotsWounded = 0;
  let pilotsKia = 0;
  let pilotsMia = 0;
  for (const status of Array.from(pilotStatus.values())) {
    if (status === PilotFinalStatus.KIA) {
      pilotsKia++;
    } else if (status === PilotFinalStatus.MIA) {
      pilotsMia++;
    } else if (
      status === PilotFinalStatus.Wounded ||
      status === PilotFinalStatus.Unconscious
    ) {
      pilotsWounded++;
    }
  }

  // ---------------------------------------------------------------------
  // XP — diff personnel.totalXpEarned across before/after. Defensive: if
  // a pilot exists only in `after` (newly recruited mid-pipeline, etc.),
  // we treat its delta as zero so we don't surface phantom XP.
  // ---------------------------------------------------------------------
  const totalXpAwarded = computeXpDelta(before, after);

  // ---------------------------------------------------------------------
  // Salvage value — sum across `salvage_allocated` events emitted today.
  // Falls back to 0 when no salvage events fired (skirmish without
  // contract).
  // ---------------------------------------------------------------------
  const salvageValueSecured = sumSalvageValue(events);

  // ---------------------------------------------------------------------
  // Repair tickets — sum across `repair-tickets-created` events.
  // ---------------------------------------------------------------------
  const repairTicketsCreated = sumRepairTickets(events);

  // ---------------------------------------------------------------------
  // Contracts closed — diff missions before/after. Surfaced separately
  // from match outcomes because a contract may close on a non-final
  // turn (e.g., turn-limit draw → PARTIAL).
  // ---------------------------------------------------------------------
  const contractsClosed = findClosedContractIds(
    before.missions,
    after.missions,
  );

  return {
    date: date.toISOString().slice(0, 10),
    matchesProcessed: matches.length,
    matches,
    totalXpAwarded,
    pilotsWounded,
    pilotsKia,
    pilotsMia,
    salvageValueSecured,
    repairTicketsCreated,
    contractsClosed,
  };
}

// =============================================================================
// Append helper for callers
// =============================================================================

/**
 * Append a freshly-built audit entry to the campaign's
 * `dailyBattleAudit` ledger. Returns the campaign as-is when `entry` is
 * null (no battle effects today) so callers can chain it.
 */
export function appendDailyBattleAuditEntry(
  campaign: ICampaign,
  entry: IDailyBattleAuditEntry | null,
): ICampaign {
  if (!entry) return campaign;
  const ledger =
    (
      campaign as ICampaign & {
        dailyBattleAudit?: readonly IDailyBattleAuditEntry[];
      }
    ).dailyBattleAudit ?? [];
  return {
    ...campaign,
    dailyBattleAudit: [...ledger, entry],
  } as ICampaign;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Walk `post_battle_applied` events and extract per-match pilot counts.
 * Used to populate the match summary line.
 */
function pilotsTouchedPerOutcome(
  events: readonly IDayEvent[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const e of events) {
    if (e.type !== 'post_battle_applied') continue;
    const data = e.data ?? {};
    const matchId = data.matchId;
    const pilotsUpdated = data.pilotsUpdated;
    if (typeof matchId !== 'string' || !Array.isArray(pilotsUpdated)) continue;
    counts.set(matchId, pilotsUpdated.length);
  }
  return counts;
}

/**
 * Collapse pilot final-statuses across all applied outcomes. The last
 * outcome that touches a pilot wins — multi-match days where the same
 * pilot fought twice end up with the more recent state.
 */
function collapsePilotStatuses(
  outcomes: readonly ICombatOutcome[],
): Map<string, PilotFinalStatus> {
  const out = new Map<string, PilotFinalStatus>();
  for (const outcome of outcomes) {
    for (const delta of outcome.unitDeltas) {
      out.set(delta.unitId, delta.pilotState.finalStatus);
    }
  }
  return out;
}

/**
 * Diff personnel.totalXpEarned across before/after. Negative deltas
 * (XP being spent) are clamped to zero — this entry summarizes XP
 * AWARDED, not net XP.
 */
function computeXpDelta(
  before: ICampaignWithBattleState,
  after: ICampaignWithBattleState,
): number {
  let delta = 0;
  for (const [id, afterPerson] of Array.from(after.personnel.entries())) {
    const beforePerson = before.personnel.get(id);
    if (!beforePerson) continue;
    const earnedDelta =
      (afterPerson.totalXpEarned ?? 0) - (beforePerson.totalXpEarned ?? 0);
    if (earnedDelta > 0) {
      delta += earnedDelta;
    }
  }
  return delta;
}

/**
 * Sum the `mercenaryValue` carried by every `salvage_allocated` event.
 * This is the C-Bills value secured for the player side; the employer
 * value is intentionally excluded.
 */
function sumSalvageValue(events: readonly IDayEvent[]): number {
  let total = 0;
  for (const e of events) {
    if (e.type !== 'salvage_allocated') continue;
    const data = e.data ?? {};
    const value = data.mercenaryValue;
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      total += value;
    }
  }
  return total;
}

/**
 * Sum `ticketCount` across every `repair-tickets-created` event.
 */
function sumRepairTickets(events: readonly IDayEvent[]): number {
  let total = 0;
  for (const e of events) {
    if (e.type !== 'repair-tickets-created') continue;
    const data = e.data ?? {};
    const count = data.ticketCount;
    if (typeof count === 'number' && Number.isFinite(count) && count > 0) {
      total += count;
    }
  }
  return total;
}
