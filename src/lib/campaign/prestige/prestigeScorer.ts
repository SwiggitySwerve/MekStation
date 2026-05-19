/**
 * Prestige Scorer — adjust a unit's prestige from a battle signal
 *
 * Pure functions, no IO. `adjustPrestige` raises a unit's bounded prestige
 * score on victories and notable performance and lowers it on heavy damage
 * and crew loss (design D7). The score is clamped to
 * `[PRESTIGE_MIN, PRESTIGE_MAX]` so it can never escape its bounds.
 *
 * `deriveUnitPrestigeSignal` distils an `IUnitCombatDelta` (the per-unit
 * slice of an `ICombatOutcome`) plus the side's win/loss into the
 * deterministic signal the scorer consumes — so prestige updates are a
 * pure function of the battle outcome.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 * @module lib/campaign/prestige/prestigeScorer
 */

import type {
  IUnitPrestige,
  IUnitPrestigeHistoryEntry,
} from '@/types/campaign/Prestige';
import type { IUnitCombatDelta } from '@/types/combat/CombatOutcome';

import {
  PRESTIGE_DEFAULT,
  PRESTIGE_MAX,
  PRESTIGE_MIN,
} from '@/types/campaign/Prestige';
import { UnitFinalStatus } from '@/types/combat/CombatOutcome';

// =============================================================================
// Per-Signal Deltas
// =============================================================================

/** Prestige gained when the unit's side won the battle. */
const VICTORY_DELTA = 8;

/** Prestige lost when the unit's side lost the battle. */
const DEFEAT_DELTA = -5;

/** Additional prestige gained for a notable performance (survived intact). */
const NOTABLE_PERFORMANCE_DELTA = 4;

/** Prestige lost when the unit took heavy damage (crippled). */
const HEAVY_DAMAGE_DELTA = -6;

/** Prestige lost when the unit was destroyed (crew loss). */
const DESTROYED_DELTA = -12;

/** Prestige lost when the unit's pilot was killed. */
const CREW_LOSS_DELTA = -10;

// =============================================================================
// Prestige Signal
// =============================================================================

/**
 * The deterministic, named signal the prestige scorer consumes. Derived
 * from a battle outcome — there is no hidden randomness.
 */
export interface IPrestigeSignal {
  /** Match the signal was derived from. */
  readonly matchId: string;
  /** True when the unit's side won the battle. */
  readonly won: boolean;
  /** True when the unit survived the battle fully intact. */
  readonly intact: boolean;
  /** True when the unit took heavy damage (crippled but not destroyed). */
  readonly heavyDamage: boolean;
  /** True when the unit was destroyed. */
  readonly destroyed: boolean;
  /** True when the unit's pilot was killed or went MIA (crew loss). */
  readonly crewLost: boolean;
  /** ISO-8601 timestamp the outcome was applied. */
  readonly appliedAt: string;
}

/**
 * Distil an `IUnitCombatDelta` plus the side's win/loss into a
 * deterministic `IPrestigeSignal`.
 *
 * @param delta - the per-unit combat delta from an `ICombatOutcome`
 * @param won - whether the unit's side won the battle
 * @param matchId - the originating match id
 * @param appliedAt - ISO-8601 timestamp the outcome is applied
 * @returns the derived prestige signal
 */
export function deriveUnitPrestigeSignal(
  delta: IUnitCombatDelta,
  won: boolean,
  matchId: string,
  appliedAt: string,
): IPrestigeSignal {
  const destroyed =
    delta.destroyed || delta.finalStatus === UnitFinalStatus.Destroyed;
  const heavyDamage =
    !destroyed && delta.finalStatus === UnitFinalStatus.Crippled;
  const intact = !destroyed && delta.finalStatus === UnitFinalStatus.Intact;
  const crewLost = delta.pilotState.killed;

  return {
    matchId,
    won,
    intact,
    heavyDamage,
    destroyed,
    crewLost,
    appliedAt,
  };
}

// =============================================================================
// Score Adjustment
// =============================================================================

/** Clamp a raw score into the bounded prestige range. */
function clampPrestige(raw: number): number {
  return Math.max(PRESTIGE_MIN, Math.min(PRESTIGE_MAX, Math.round(raw)));
}

/**
 * Build the default (pre-first-battle) prestige record for a unit.
 *
 * @param unitId - the unit to seed prestige for
 * @returns a fresh prestige record at `PRESTIGE_DEFAULT` with no history
 */
export function createDefaultUnitPrestige(unitId: string): IUnitPrestige {
  return { unitId, score: PRESTIGE_DEFAULT, history: [] };
}

/**
 * Compute the net signed delta for a prestige signal, plus a short reason.
 *
 * Signals stack additively: a victory in which the unit took heavy damage
 * nets `VICTORY_DELTA + HEAVY_DAMAGE_DELTA`.
 */
function scoreSignal(signal: IPrestigeSignal): {
  readonly delta: number;
  readonly reason: string;
} {
  let delta = 0;
  const reasons: string[] = [];

  if (signal.won) {
    delta += VICTORY_DELTA;
    reasons.push('Victory');
  } else {
    delta += DEFEAT_DELTA;
    reasons.push('Defeat');
  }

  if (signal.intact) {
    delta += NOTABLE_PERFORMANCE_DELTA;
    reasons.push('survived intact');
  }
  if (signal.heavyDamage) {
    delta += HEAVY_DAMAGE_DELTA;
    reasons.push('heavy damage');
  }
  if (signal.destroyed) {
    delta += DESTROYED_DELTA;
    reasons.push('destroyed');
  }
  if (signal.crewLost) {
    delta += CREW_LOSS_DELTA;
    reasons.push('crew loss');
  }

  return { delta, reason: reasons.join(', ') };
}

/**
 * Adjust a unit's prestige from a battle signal.
 *
 * The score is moved by the net signed delta of the signal and clamped to
 * `[PRESTIGE_MIN, PRESTIGE_MAX]`. A history entry recording the delta, the
 * post-clamp score, and the reason is appended. The function is pure — the
 * input prestige record is never mutated.
 *
 * @param prestige - the unit's current prestige record
 * @param signal - the deterministic battle signal
 * @returns a new prestige record with the adjustment applied
 */
export function adjustPrestige(
  prestige: IUnitPrestige,
  signal: IPrestigeSignal,
): IUnitPrestige {
  const { delta, reason } = scoreSignal(signal);
  const scoreAfter = clampPrestige(prestige.score + delta);

  const historyEntry: IUnitPrestigeHistoryEntry = {
    matchId: signal.matchId,
    delta,
    scoreAfter,
    reason,
    appliedAt: signal.appliedAt,
  };

  return {
    unitId: prestige.unitId,
    score: scoreAfter,
    history: [...prestige.history, historyEntry],
  };
}
