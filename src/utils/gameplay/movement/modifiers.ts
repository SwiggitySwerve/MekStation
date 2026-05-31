/**
 * Movement Modifiers
 */

import { MovementType } from '@/types/gameplay';

const STANDARD_EVADE_HEAT = 4;
const STANDARD_SPRINT_HEAT = 3;

/**
 * Calculate heat generated from movement.
 */
export function calculateMovementHeat(
  movementType: MovementType,
  hexesMoved: number,
  partialWingJumpBonus: number = 0,
): number {
  const normalizedPartialWingJumpBonus =
    typeof partialWingJumpBonus === 'number' &&
    Number.isFinite(partialWingJumpBonus)
      ? Math.max(0, Math.floor(partialWingJumpBonus))
      : 0;

  switch (movementType) {
    case MovementType.Stationary:
      return 0;
    case MovementType.Walk:
      return 1;
    case MovementType.Run:
      return 2;
    case MovementType.Sprint:
      return STANDARD_SPRINT_HEAT;
    case MovementType.Evade:
      return STANDARD_EVADE_HEAT;
    case MovementType.Jump:
      return Math.max(hexesMoved - normalizedPartialWingJumpBonus, 3);
    default:
      return 0;
  }
}

/**
 * Calculate Target Movement Modifier based on movement this turn.
 */
export function calculateTMM(
  movementType: MovementType,
  hexesMoved: number,
): number {
  if (movementType === MovementType.Stationary) {
    return 0;
  }

  let tmm = Math.max(1, Math.ceil(hexesMoved / 5));

  if (movementType === MovementType.Jump) {
    tmm += 1;
  }

  return tmm;
}

/**
 * Calculate attacker movement modifier for to-hit rolls.
 */
export function calculateAttackerMovementModifier(
  movementType: MovementType,
): number {
  switch (movementType) {
    case MovementType.Stationary:
      return 0;
    case MovementType.Walk:
      return 1;
    case MovementType.Run:
    case MovementType.Evade:
    case MovementType.Sprint:
      return 2;
    case MovementType.Jump:
      return 3;
    default:
      return 0;
  }
}
