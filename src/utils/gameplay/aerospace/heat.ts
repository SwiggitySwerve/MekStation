/**
 * Aerospace Heat System
 *
 * Aerospace heat is tracked on a single pool. Dissipation = heat-sink count.
 * Per TW aerospace heat table:
 *   0-8:   no effect
 *   9-14:  −1 thrust (speed penalty this and next turn)
 *   15+:   shutdown check (TN 10 + (heat − 15))
 *   25+:   automatic shutdown
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/tasks.md (section 10)
 */

import { defaultD6Roller, roll2d6, type D6Roller } from '../diceTypes';
import { type IAerospaceCombatState } from './state';

// ============================================================================
// Threshold constants
// ============================================================================

export const AERO_HEAT_THRUST_PENALTY_THRESHOLD = 9;
export const AERO_HEAT_SHUTDOWN_CHECK_THRESHOLD = 15;
export const AERO_HEAT_AUTO_SHUTDOWN_THRESHOLD = 25;

// ============================================================================
// Types
// ============================================================================

export interface IAerospaceHeatEffect {
  /** Effective thrust penalty this turn from heat. */
  readonly thrustPenalty: number;
  /** True when a shutdown check is required. */
  readonly shutdownCheckRequired: boolean;
  /** Shutdown check target number (when applicable). */
  readonly shutdownCheckTN: number;
  /** True when shutdown is automatic (no roll). */
  readonly autoShutdown: boolean;
}

export interface IResolveHeatParams {
  readonly state: IAerospaceCombatState;
  /** Heat generated this turn by weapon fire / engine hits / etc. */
  readonly heatGeneratedThisTurn: number;
  /** Optional d6 roller for shutdown check. */
  readonly diceRoller?: D6Roller;
}

export interface IResolveHeatResult {
  readonly state: IAerospaceCombatState;
  readonly effect: IAerospaceHeatEffect;
  /** True when the shutdown check was performed and failed. */
  readonly shutdownCheckFailed: boolean;
  /** Dice rolled for the shutdown check (if any). */
  readonly shutdownCheckDice?: readonly [number, number];
}

// ============================================================================
// Classify heat → effect
// ============================================================================

export function classifyAerospaceHeat(heat: number): IAerospaceHeatEffect {
  if (heat >= AERO_HEAT_AUTO_SHUTDOWN_THRESHOLD) {
    return {
      thrustPenalty: 2,
      shutdownCheckRequired: false,
      shutdownCheckTN: 0,
      autoShutdown: true,
    };
  }
  if (heat >= AERO_HEAT_SHUTDOWN_CHECK_THRESHOLD) {
    return {
      thrustPenalty: 1,
      shutdownCheckRequired: true,
      shutdownCheckTN: 10 + (heat - AERO_HEAT_SHUTDOWN_CHECK_THRESHOLD),
      autoShutdown: false,
    };
  }
  if (heat >= AERO_HEAT_THRUST_PENALTY_THRESHOLD) {
    return {
      thrustPenalty: 1,
      shutdownCheckRequired: false,
      shutdownCheckTN: 0,
      autoShutdown: false,
    };
  }
  return {
    thrustPenalty: 0,
    shutdownCheckRequired: false,
    shutdownCheckTN: 0,
    autoShutdown: false,
  };
}

// ============================================================================
// End-of-turn heat resolution
// ============================================================================

/**
 * Apply heat generation + dissipation for the turn, then compute penalties.
 * Dissipation = heat-sink count (single heat sinks — doubles sit in the
 * construction layer; aerospace uses TW baseline).
 */
export function resolveAerospaceHeat(
  params: IResolveHeatParams,
): IResolveHeatResult {
  const { state } = params;
  const newHeat = Math.max(
    0,
    state.heat + params.heatGeneratedThisTurn - state.heatSinks,
  );
  const effect = classifyAerospaceHeat(newHeat);

  const roller = params.diceRoller ?? defaultD6Roller;
  let shutdownCheckFailed = false;
  let dice: readonly [number, number] | undefined;

  if (effect.shutdownCheckRequired) {
    const r = roll2d6(roller);
    dice = [r.dice[0], r.dice[1]];
    if (r.total < effect.shutdownCheckTN) {
      shutdownCheckFailed = true;
    }
  }

  const newState: IAerospaceCombatState = {
    ...state,
    heat: newHeat,
    thrustPenalty: state.thrustPenalty + effect.thrustPenalty,
  };

  return {
    state: newState,
    effect,
    shutdownCheckFailed,
    shutdownCheckDice: dice,
  };
}
