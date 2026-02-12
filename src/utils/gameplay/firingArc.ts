/**
 * Firing Arc Calculation
 *
 * @spec openspec/changes/full-combat-parity/specs/firing-arc-calculation/spec.md
 */

import { IHexCoordinate, Facing, FiringArc } from '@/types/gameplay';

import { determineArc } from './firingArcs';

// =============================================================================
// Core Firing Arc Calculation
// =============================================================================

/**
 * Which arc the attacker is in relative to the target's facing.
 * Selects the correct hit location table column (front/left/right/rear).
 */
export function calculateFiringArc(
  attackerPos: IHexCoordinate,
  targetPos: IHexCoordinate,
  targetFacing: Facing,
  torsoTwist?: 'left' | 'right',
): FiringArc {
  const targetAsUnit = {
    unitId: '_target',
    coord: targetPos,
    facing: torsoTwist
      ? getTwistedFacing(targetFacing, torsoTwist)
      : targetFacing,
    prone: false,
  };

  return determineArc(targetAsUnit, attackerPos).arc;
}

// =============================================================================
// Torso Twist Support
// =============================================================================

/**
 * Effective facing when torso twist is applied.
 * Shifts center of front arc by 1 hex-side (60°) in twist direction.
 */
export function getTwistedFacing(
  facing: Facing,
  twist: 'left' | 'right',
): Facing {
  // Left: +1 (clockwise), Right: -1 (counter-clockwise) mod 6
  return twist === 'left'
    ? (((facing + 1) % 6) as Facing)
    : (((facing - 1 + 6) % 6) as Facing);
}
