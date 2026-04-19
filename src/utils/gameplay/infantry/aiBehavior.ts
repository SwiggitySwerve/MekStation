/**
 * Infantry AI Adaptation Helpers
 *
 * Pure scoring helpers the bot AI uses to adapt to / around infantry. These
 * helpers do NOT drive movement themselves — they expose policy descriptors
 * the `BotPlayer` can consult when scoring targets and moves.
 *
 *  - `shouldAvoidChargeMech(platoon, mech)` — mech adjacent to an anti-mech
 *    trained platoon should avoid the charge (may be legged).
 *  - `coverSeekScore(coverList)` — how desirable a destination hex's cover
 *    composition is from an infantry point of view (bigger = prefer).
 *  - `targetPriorityMultiplier(state)` — multiplier applied to an enemy
 *    platoon's target priority score; pinned/routed units score lower.
 *
 * Note: actual bot routing / target-selection live in the `BotPlayer` layer
 * (`src/simulation/ai/BotPlayer.ts`). This module only provides the data.
 *
 * @spec openspec/changes/add-infantry-combat-behavior/tasks.md §11 (AI Adaptations)
 */

import type { IInfantryCombatState } from './state';

import { InfantryCoverType, sumInfantryCoverModifiers } from './cover';

// ============================================================================
// Charge-avoidance predicate
// ============================================================================

/**
 * True when a mech should avoid charging the given infantry platoon because
 * the platoon is anti-mech-trained and not yet neutralised (pinned/routed
 * platoons don't leg-attack).
 */
export function shouldAvoidChargeMech(platoon: IInfantryCombatState): boolean {
  if (!platoon.hasAntiMechTraining) return false;
  if (platoon.pinned || platoon.routed) return false;
  if (platoon.destroyed || platoon.survivingTroopers <= 0) return false;
  return true;
}

// ============================================================================
// Cover desirability score
// ============================================================================

/**
 * Score how much cover a hex offers an infantry occupant. Same numeric table
 * as `sumInfantryCoverModifiers`, exposed here as a named "desirability"
 * metric for the AI's pathing heuristics.
 */
export function coverSeekScore(covers: readonly InfantryCoverType[]): number {
  return sumInfantryCoverModifiers(covers);
}

// ============================================================================
// Target-priority multiplier
// ============================================================================

/**
 * A multiplier the bot applies to an enemy infantry platoon's target-priority
 * score. Pinned platoons get 0.5× (half priority — they're less threatening);
 * routed platoons get 0× (ignore entirely); healthy platoons get 1×.
 */
export function targetPriorityMultiplier(state: IInfantryCombatState): number {
  if (state.routed || state.destroyed) return 0;
  if (state.pinned) return 0.5;
  return 1;
}
