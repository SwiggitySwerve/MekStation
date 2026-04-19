/**
 * Anti-Mech Leg Attack (Simplified)
 *
 * Anti-mech-trained infantry platoons adjacent to a mech may declare a leg
 * attack. This is a simplified version of the BA leg-attack rule:
 *
 *   - Roll 2d6 + platoon piloting vs mech piloting + 4
 *   - Success: target leg takes `survivingTroopers × 2` damage
 *   - Failure: platoon takes 1d6 damage distributed as casualties
 *
 * Only platoons with `hasAntiMechTraining === true` may declare the attack.
 * Motorized platoons are excluded at the construction layer (see
 * `ANTI_MECH_ELIGIBLE_MOTIVES`), so this module doesn't re-check motive.
 *
 * @spec openspec/changes/add-infantry-combat-behavior/tasks.md §9
 *       (Anti-Mech Leg / Swarm (Simplified))
 */

import type { IInfantryCombatState } from './state';

import { defaultD6Roller, type D6Roller } from '../diceTypes';
import {
  InfantryEventType,
  type IAntiMechLegAttackEvent,
  type InfantryEvent,
} from './events';

// ============================================================================
// Constants
// ============================================================================

/** Base difficulty added to the mech's piloting TN per TW §anti-mech. */
export const MECH_PILOTING_LEG_ATTACK_BONUS = 4;

/** Damage per surviving trooper on a successful leg attack. */
export const LEG_ATTACK_DAMAGE_PER_TROOPER = 2;

// ============================================================================
// Input / result
// ============================================================================

export interface IDeclareLegAttackParams {
  readonly unitId: string;
  readonly targetUnitId: string;
  readonly state: IInfantryCombatState;
  /** Platoon's piloting / anti-mech skill (lower is better, added as bonus). */
  readonly platoonPiloting: number;
  /** Target mech's piloting skill (higher = harder to hit). */
  readonly mechPiloting: number;
  readonly diceRoller?: D6Roller;
}

export type LegAttackDenyReason =
  | 'no_training'
  | 'pinned'
  | 'routed'
  | 'destroyed'
  | 'already_committed';

export type ILegAttackResult =
  | {
      readonly declared: true;
      readonly state: IInfantryCombatState;
      readonly success: boolean;
      readonly rollTotal: number;
      readonly targetNumber: number;
      /** Damage dealt to the target leg (0 on failure). */
      readonly damage: number;
      /** Counter-casualties taken by the platoon on failure (0 on success). */
      readonly counterCasualties: number;
      readonly events: readonly InfantryEvent[];
    }
  | {
      readonly declared: false;
      readonly state: IInfantryCombatState;
      readonly reason: LegAttackDenyReason;
      readonly events: readonly InfantryEvent[];
    };

// ============================================================================
// Denial predicate
// ============================================================================

export function legAttackDenyReason(
  state: IInfantryCombatState,
): LegAttackDenyReason | null {
  if (!state.hasAntiMechTraining) return 'no_training';
  if (state.destroyed || state.survivingTroopers <= 0) return 'destroyed';
  if (state.routed) return 'routed';
  if (state.pinned) return 'pinned';
  if (state.antiMechCommitted) return 'already_committed';
  return null;
}

// ============================================================================
// Resolver
// ============================================================================

/**
 * Declare + resolve a leg attack in one call. Rolls 2d6 + platoonPiloting,
 * compares to `mechPiloting + 4`. On success, returns the damage to apply to
 * the target's target leg; on failure, applies counter-casualties to the
 * platoon internally and returns the casualty count.
 */
export function declareLegAttack(
  params: IDeclareLegAttackParams,
): ILegAttackResult {
  const events: InfantryEvent[] = [];
  const { unitId, targetUnitId, platoonPiloting, mechPiloting } = params;
  const roller = params.diceRoller ?? defaultD6Roller;

  const deny = legAttackDenyReason(params.state);
  if (deny !== null) {
    return {
      declared: false,
      state: params.state,
      reason: deny,
      events,
    };
  }

  let state: IInfantryCombatState = {
    ...params.state,
    antiMechCommitted: true,
  };

  const die1 = roller();
  const die2 = roller();
  const rollTotal = die1 + die2 + platoonPiloting;
  const targetNumber = mechPiloting + MECH_PILOTING_LEG_ATTACK_BONUS;
  const success = rollTotal >= targetNumber;

  let damage = 0;
  let counterCasualties = 0;

  if (success) {
    damage = state.survivingTroopers * LEG_ATTACK_DAMAGE_PER_TROOPER;
  } else {
    // Failure: platoon takes 1d6 damage distributed as casualties.
    const counterDamage = roller();
    counterCasualties = Math.min(state.survivingTroopers, counterDamage);
    const newSurviving = state.survivingTroopers - counterCasualties;
    state = { ...state, survivingTroopers: newSurviving };
    if (newSurviving <= 0) {
      state = {
        ...state,
        survivingTroopers: 0,
        destroyed: true,
        fieldGunOperational: false,
      };
    }
  }

  const ev: IAntiMechLegAttackEvent = {
    type: InfantryEventType.ANTI_MECH_LEG_ATTACK,
    unitId,
    targetUnitId,
    rollTotal,
    targetNumber,
    success,
    damage,
    counterCasualties,
  };
  events.push(ev);

  return {
    declared: true,
    state,
    success,
    rollTotal,
    targetNumber,
    damage,
    counterCasualties,
    events,
  };
}

/**
 * Clear the `antiMechCommitted` flag at turn end so the platoon may declare
 * another attack next turn.
 */
export function clearAntiMechCommitted(
  state: IInfantryCombatState,
): IInfantryCombatState {
  if (!state.antiMechCommitted) return state;
  return { ...state, antiMechCommitted: false };
}
