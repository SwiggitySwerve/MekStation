/**
 * Aerospace AI (Bot) Behavior — 2D simplified
 *
 * Phase 6 / 7 bot heuristics for aerospace units:
 *  - Prefer strafe targets sorted by BV (highest-BV ground unit first)
 *  - Withdraw (fly off the board) when SI ≤ 30% or fuel < 2 turns' worth
 *  - Heat-safe attack cadence (skip the hottest alpha when heat ≥ 9)
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/tasks.md (section 12)
 */

import { AEROSPACE_CONTROL_TN } from './controlRoll';
import { AERO_HEAT_THRUST_PENALTY_THRESHOLD } from './heat';
import { maxHexesPerTurn } from './movement';
import { type IAerospaceCombatState } from './state';

// ============================================================================
// Inputs
// ============================================================================

export interface IGroundTargetRef {
  readonly unitId: string;
  readonly bv: number;
  /** True when the unit is still a valid target (not destroyed / off-map). */
  readonly alive: boolean;
}

export interface IAerospaceBotTurn {
  readonly state: IAerospaceCombatState;
  /** Ground target pool this turn. */
  readonly groundTargets: readonly IGroundTargetRef[];
  /** Weapons the unit could fire this turn. */
  readonly availableWeapons: readonly {
    readonly id: string;
    readonly heat: number;
    readonly expectedDamage: number;
  }[];
}

// ============================================================================
// Decisions
// ============================================================================

export interface IAerospaceBotDecision {
  /** True when the bot should withdraw / fly off-map this turn. */
  readonly shouldWithdraw: boolean;
  /** Why the bot chose (or didn't choose) to withdraw. */
  readonly withdrawReason?: string;
  /** Ranked strafe target list (highest priority first). */
  readonly strafeOrder: readonly IGroundTargetRef[];
  /** Weapons the bot plans to fire this turn (post heat-budget filter). */
  readonly firingPlan: readonly string[];
  /** Predicted heat after firing. */
  readonly predictedHeat: number;
}

// ============================================================================
// Heuristics
// ============================================================================

const WITHDRAW_SI_FRACTION = 0.3;
const WITHDRAW_FUEL_TURN_FLOOR = 2;

/**
 * Should this unit withdraw? Returns `{shouldWithdraw, reason}`.
 */
export function shouldAerospaceWithdraw(state: IAerospaceCombatState): {
  shouldWithdraw: boolean;
  reason?: string;
} {
  if (state.destroyed) {
    return { shouldWithdraw: false, reason: 'already destroyed' };
  }
  if (
    state.maxSI > 0 &&
    state.currentSI / state.maxSI <= WITHDRAW_SI_FRACTION
  ) {
    return { shouldWithdraw: true, reason: 'SI ≤ 30%' };
  }
  const burnPerTurn = Math.max(1, maxHexesPerTurn(state) / 2);
  const turnsOfFuel = state.fuelRemaining / burnPerTurn;
  if (turnsOfFuel < WITHDRAW_FUEL_TURN_FLOOR) {
    return { shouldWithdraw: true, reason: 'fuel < 2 turns' };
  }
  return { shouldWithdraw: false };
}

/**
 * Rank strafe targets. Currently sorts by BV descending and filters out dead /
 * off-board units.
 */
export function rankStrafeTargets(
  pool: readonly IGroundTargetRef[],
): readonly IGroundTargetRef[] {
  return [...pool].filter((t) => t.alive).sort((a, b) => b.bv - a.bv);
}

/**
 * Build a heat-safe firing plan. Starting from the highest-expected-damage
 * weapon, add weapons until projected heat crosses the thrust-penalty
 * threshold. This is the simplest possible "don't overheat" rule.
 */
export function buildAerospaceFiringPlan(
  state: IAerospaceCombatState,
  weapons: IAerospaceBotTurn['availableWeapons'],
): { firingPlan: readonly string[]; predictedHeat: number } {
  const sorted = [...weapons].sort(
    (a, b) => b.expectedDamage - a.expectedDamage,
  );
  const firingPlan: string[] = [];
  let predictedHeat = state.heat;
  const cap = AERO_HEAT_THRUST_PENALTY_THRESHOLD + state.heatSinks;

  for (const w of sorted) {
    if (predictedHeat + w.heat > cap) continue;
    firingPlan.push(w.id);
    predictedHeat += w.heat;
  }

  // Always dissipate this turn's heat sinks in the prediction so the next
  // turn's cap math stays consistent with `resolveAerospaceHeat`.
  predictedHeat = Math.max(0, predictedHeat - state.heatSinks);

  return { firingPlan, predictedHeat };
}

/**
 * Full bot turn decision. Pure, deterministic given inputs.
 */
export function decideAerospaceBotTurn(
  turn: IAerospaceBotTurn,
): IAerospaceBotDecision {
  const withdraw = shouldAerospaceWithdraw(turn.state);
  const strafeOrder = rankStrafeTargets(turn.groundTargets);
  const { firingPlan, predictedHeat } = buildAerospaceFiringPlan(
    turn.state,
    turn.availableWeapons,
  );

  return {
    shouldWithdraw: withdraw.shouldWithdraw,
    withdrawReason: withdraw.reason,
    strafeOrder,
    firingPlan,
    predictedHeat,
  };
}

/**
 * Suggested piloting skill the bot should use for the control-roll TN display.
 * Just a pass-through here — kept as a separate export so callers can swap in
 * scenario-specific skill adjustments later.
 */
export function aerospaceBotPilotSkill(defaultSkill: number): number {
  // Reserved for future adjustments (fatigue, heat, etc.).
  return defaultSkill;
}

export { AEROSPACE_CONTROL_TN };
