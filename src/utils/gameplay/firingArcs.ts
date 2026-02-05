/**
 * Firing Arc Calculations
 * Determine firing arcs based on unit facing and target position.
 *
 * @spec openspec/changes/add-hex-grid-system/specs/hex-grid-system/spec.md
 */

import {
  IHexCoordinate,
  IUnitPosition,
  Facing,
  FiringArc,
  IArcResult,
} from '@/types/gameplay';

import { hexAngle, facingToAngle, hexEquals } from './hexMath';

// =============================================================================
// Arc Constants
// =============================================================================

/**
 * Arc boundaries in degrees, relative to facing.
 * Front arc: -60 to +60 (120 degrees centered on facing)
 * Left side: +60 to +120 (60 degrees)
 * Right side: -60 to -120 (60 degrees)
 * Rear arc: +120 to +240 (120 degrees behind)
 */
const ARC_HALF_WIDTHS = {
  front: 60, // +/- 60 degrees from center
  side: 30, // Additional 30 degrees for each side
};

// =============================================================================
// Arc Determination
// =============================================================================

/**
 * Determine which arc a target is in relative to the attacker.
 *
 * @param attacker Attacker's position with facing
 * @param target Target's coordinate
 * @returns The firing arc the target is in
 */
export function determineArc(
  attacker: IUnitPosition,
  target: IHexCoordinate,
): IArcResult {
  // Same hex is always front arc
  if (hexEquals(attacker.coord, target)) {
    return {
      arc: FiringArc.Front,
      angle: 0,
    };
  }

  // Calculate absolute angle from attacker to target
  const absoluteAngle = hexAngle(attacker.coord, target);

  // Get the attacker's facing angle
  const facingAngle = facingToAngle(attacker.facing);

  // Calculate relative angle (target angle relative to facing)
  let relativeAngle = absoluteAngle - facingAngle;

  // Normalize to -180 to +180
  while (relativeAngle > 180) relativeAngle -= 360;
  while (relativeAngle < -180) relativeAngle += 360;

  // Determine arc based on relative angle
  const absRelative = Math.abs(relativeAngle);

  let arc: FiringArc;
  if (absRelative <= ARC_HALF_WIDTHS.front) {
    arc = FiringArc.Front;
  } else if (absRelative >= 180 - ARC_HALF_WIDTHS.front) {
    arc = FiringArc.Rear;
  } else if (relativeAngle > 0) {
    arc = FiringArc.Right;
  } else {
    arc = FiringArc.Left;
  }

  return {
    arc,
    angle: absoluteAngle,
  };
}

/**
 * Get all hexes in a specific arc at a given range.
 * Note: This is approximate and useful for visualization, not exact arc checking.
 */
export function getArcHexes(
  center: IHexCoordinate,
  facing: Facing,
  arc: FiringArc,
  maxRange: number,
): readonly IHexCoordinate[] {
  const position: IUnitPosition = {
    unitId: 'temp',
    coord: center,
    facing,
    prone: false,
  };

  const results: IHexCoordinate[] = [];

  // Check all hexes in range
  for (let q = -maxRange; q <= maxRange; q++) {
    for (let r = -maxRange; r <= maxRange; r++) {
      const target: IHexCoordinate = { q: center.q + q, r: center.r + r };

      // Skip center hex
      if (q === 0 && r === 0) continue;

      const arcResult = determineArc(position, target);
      if (arcResult.arc === arc) {
        results.push(target);
      }
    }
  }

  return results;
}

/**
 * Get hexes in the front arc (3 directions from facing).
 */
export function getFrontArcDirections(facing: Facing): readonly Facing[] {
  return [
    ((facing - 1 + 6) % 6) as Facing,
    facing,
    ((facing + 1) % 6) as Facing,
  ];
}

/**
 * Get hexes in the rear arc (3 directions behind facing).
 */
export function getRearArcDirections(facing: Facing): readonly Facing[] {
  return [
    ((facing + 2) % 6) as Facing,
    ((facing + 3) % 6) as Facing,
    ((facing + 4) % 6) as Facing,
  ];
}

/**
 * Get the left side arc direction.
 */
export function getLeftArcDirection(facing: Facing): Facing {
  return ((facing + 2) % 6) as Facing;
}

/**
 * Get the right side arc direction.
 */
export function getRightArcDirection(facing: Facing): Facing {
  return ((facing - 2 + 6) % 6) as Facing;
}

// =============================================================================
// Weapon Arc Validation
// =============================================================================

/**
 * Check if a weapon can fire at a target based on its mounting arc.
 *
 * @param weaponArc The arc the weapon is mounted in
 * @param targetArc The arc the target is in
 * @returns Whether the weapon can fire at the target
 */
export function canFireFromArc(
  weaponArc: FiringArc,
  targetArc: FiringArc,
): boolean {
  // Front weapons can fire into front arc
  if (weaponArc === FiringArc.Front) {
    return targetArc === FiringArc.Front;
  }

  // Rear weapons can fire into rear arc
  if (weaponArc === FiringArc.Rear) {
    return targetArc === FiringArc.Rear;
  }

  // Side weapons can fire into their respective side arc
  if (weaponArc === FiringArc.Left) {
    return targetArc === FiringArc.Left;
  }

  if (weaponArc === FiringArc.Right) {
    return targetArc === FiringArc.Right;
  }

  return false;
}

/**
 * Get the hit location table modifier based on attack arc.
 * Front attacks use standard table, sides/rear use modified tables.
 */
export function getArcHitModifier(arc: FiringArc): number {
  switch (arc) {
    case FiringArc.Front:
      return 0;
    case FiringArc.Left:
    case FiringArc.Right:
      return 0; // Side arcs use different hit location table, not modifier
    case FiringArc.Rear:
      return 0; // Rear uses rear armor values, not a to-hit modifier
    default:
      return 0;
  }
}

/**
 * Determine if rear armor should be targeted based on attack arc.
 */
export function targetsRearArmor(arc: FiringArc): boolean {
  return arc === FiringArc.Rear;
}
