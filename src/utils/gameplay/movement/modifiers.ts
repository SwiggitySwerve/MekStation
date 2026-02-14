/**
 * Movement Modifiers
 */

import { MovementType } from '@/types/gameplay';

/**
 * Calculate heat generated from movement.
 */
export function calculateMovementHeat(
  movementType: MovementType,
  hexesMoved: number,
): number {
  switch (movementType) {
    case MovementType.Stationary:
      return 0;
    case MovementType.Walk:
      return 1;
    case MovementType.Run:
      return 2;
    case MovementType.Jump:
      return Math.max(hexesMoved, 3);
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
      return 2;
    case MovementType.Jump:
      return 3;
    default:
      return 0;
  }
}
