/**
 * Glider ProtoMech Rules
 *
 * Implements the Glider chassis combat specials:
 *   - Glider flies like a low-altitude unit (0-5 altitude hexes, NOT aerospace).
 *   - Attackers get +1 to-hit against airborne Gliders (the "flight TMM bonus").
 *   - Any structure-exposing damage triggers a piloting roll vs TN 7.
 *   - Failed roll → Glider falls; fall damage = 10 × altitude; altitude resets
 *     to 0; proto takes that damage (direction = Front, direct to Torso).
 *
 * @spec openspec/changes/add-protomech-combat-behavior/specs/combat-resolution/spec.md
 *   #requirement glider-protomech-fall-rule
 * @spec openspec/changes/add-protomech-combat-behavior/tasks.md §8
 */

import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

import type { IProtoMechCombatState } from './state';

import { D6Roller, defaultD6Roller, roll2d6 } from '../diceTypes';
import { ProtoEvent, ProtoEventType } from './events';

// =============================================================================
// To-hit bonus
// =============================================================================

/**
 * +1 to-hit penalty for attacks against an airborne Glider proto.
 * Returns 0 when the target is not a Glider or is grounded (altitude 0).
 */
export function gliderAttackerToHitBonus(state: IProtoMechCombatState): number {
  if (state.chassisType !== ProtoChassis.GLIDER) return 0;
  if ((state.altitude ?? 0) <= 0) return 0;
  return 1;
}

// =============================================================================
// Fall check
// =============================================================================

/**
 * Piloting roll target number for Glider fall checks (TN 7 per spec).
 */
export const GLIDER_FALL_TN = 7;

export interface IGliderFallCheckResult {
  readonly unitId: string;
  readonly dice: readonly [number, number];
  readonly rollTotal: number;
  readonly targetNumber: number;
  readonly passed: boolean;
}

/**
 * Resolve a piloting roll vs TN 7 from a pre-determined 2d6 result.
 */
export function resolveGliderFallCheckFromRoll(
  state: IProtoMechCombatState,
  dice: readonly [number, number],
): IGliderFallCheckResult {
  const [d1, d2] = dice;
  const rollTotal = d1 + d2;
  return {
    unitId: state.unitId,
    dice: [d1, d2],
    rollTotal,
    targetNumber: GLIDER_FALL_TN,
    passed: rollTotal >= GLIDER_FALL_TN,
  };
}

/**
 * Roll 2d6 and resolve a Glider fall check.
 */
export function resolveGliderFallCheck(
  state: IProtoMechCombatState,
  diceRoller: D6Roller = defaultD6Roller,
): IGliderFallCheckResult {
  const rolled = roll2d6(diceRoller);
  return resolveGliderFallCheckFromRoll(state, [
    rolled.dice[0],
    rolled.dice[1],
  ]);
}

// =============================================================================
// Fall application
// =============================================================================

/**
 * Aggregate result of a Glider fall resolution (check + fall damage, if any).
 */
export interface IGliderFallResult {
  readonly state: IProtoMechCombatState;
  readonly check: IGliderFallCheckResult;
  readonly fell: boolean;
  readonly fallDamage: number;
  readonly altitudeAtFall: number;
  readonly events: readonly ProtoEvent[];
}

/**
 * Check whether a Glider fall-check is required for a given hit. Per spec:
 * triggered by any structure-exposing damage while airborne.
 */
export function gliderFallCheckRequired(params: {
  readonly chassisType: ProtoChassis;
  readonly altitude: number | undefined;
  readonly structureExposed: boolean;
}): boolean {
  return (
    params.chassisType === ProtoChassis.GLIDER &&
    (params.altitude ?? 0) > 0 &&
    params.structureExposed
  );
}

/**
 * Perform a Glider fall check + apply fall consequences. If the check passes,
 * no damage is taken and the state is unchanged (apart from emitting a check
 * event). If the check fails:
 *   - A `GliderFall` event is emitted.
 *   - Fall damage = 10 × altitude.
 *   - Altitude resets to 0.
 *
 * The caller is responsible for applying `fallDamage` to the proto (to the
 * Torso, from the Front direction) via the normal damage pipeline — this
 * module only computes + records the fall, it does NOT itself mutate armor
 * or structure.
 */
export function applyGliderFall(
  state: IProtoMechCombatState,
  check: IGliderFallCheckResult,
): IGliderFallResult {
  const events: ProtoEvent[] = [];

  events.push({
    type: ProtoEventType.GLIDER_FALL_CHECK,
    unitId: state.unitId,
    targetNumber: check.targetNumber,
    rollTotal: check.rollTotal,
    dice: check.dice,
    passed: check.passed,
  });

  if (check.passed) {
    return {
      state,
      check,
      fell: false,
      fallDamage: 0,
      altitudeAtFall: state.altitude ?? 0,
      events,
    };
  }

  const altitudeAtFall = state.altitude ?? 0;
  const fallDamage = Math.max(0, altitudeAtFall * 10);

  const next: IProtoMechCombatState = {
    ...state,
    altitude: 0,
  };

  events.push({
    type: ProtoEventType.GLIDER_FALL,
    unitId: state.unitId,
    altitudeAtFall,
    fallDamage,
  });

  return {
    state: next,
    check,
    fell: true,
    fallDamage,
    altitudeAtFall,
    events,
  };
}
