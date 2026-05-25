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
 * Right side: +60 to +120 (60 degrees)
 * Left side: -60 to -120 (60 degrees)
 * Rear arc: strict interior behind the rear/side boundaries
 */
const ARC_HALF_WIDTHS = {
  front: 60,
};

// =============================================================================
// Arc Determination
// =============================================================================

/**
 * Determine which arc a target is in relative to the attacker.
 *
 * Arc-boundary convention:
 *
 * - Front arc: |relativeAngle| <= 60 degrees
 * - Right arc: relativeAngle > 60 and <= 120 degrees
 * - Left arc: relativeAngle < -60 and >= -120 degrees
 * - Rear arc: remaining strict rear interior, |relativeAngle| > 120
 *
 * This mirrors MegaMek `FacingArc`: front owns the front/side boundary
 * (60/300 degrees), side arcs own the rear/side boundaries (120/240
 * degrees), and rear is the strict interior between those boundaries.
 *
 * The function is pure and deterministic: the same `(attacker, target)` pair
 * always returns the same `FiringArc`. A property-based sweep test (see
 * `__tests__/firingArc.test.ts`) verifies that rotating an attacker around a
 * target returns exactly one arc per position with no ambiguity.
 *
 * Same-hex case: any attacker/target sharing a hex resolves to `Front` with
 * `angle: 0`. Upstream (`gameSessionAttackResolution.ts`) rejects the attack
 * with `AttackInvalid { SameHex }` before calling. This branch only matters
 * for non-combat visualization callers (`getArcHexes`).
 *
 * @param attacker Attacker's position with facing
 * @param target Target's coordinate
 * @returns The firing arc the target is in
 */
export function determineArc(
  attacker: IUnitPosition,
  target: IHexCoordinate,
): IArcResult {
  if (hexEquals(attacker.coord, target)) {
    return {
      arc: FiringArc.Front,
      angle: 0,
    };
  }

  const absoluteAngle = hexAngle(attacker.coord, target);
  const facingAngle = facingToAngle(attacker.facing);

  let relativeAngle = absoluteAngle - facingAngle;
  while (relativeAngle > 180) relativeAngle -= 360;
  while (relativeAngle < -180) relativeAngle += 360;

  const absRelative = Math.abs(relativeAngle);

  let arc: FiringArc;
  if (absRelative <= ARC_HALF_WIDTHS.front) {
    arc = FiringArc.Front;
  } else if (relativeAngle > 0 && relativeAngle <= 120) {
    arc = FiringArc.Right;
  } else if (relativeAngle < 0 && relativeAngle >= -120) {
    arc = FiringArc.Left;
  } else {
    arc = FiringArc.Rear;
  }

  return {
    arc,
    angle: absoluteAngle,
  };
}

export function firingArcProjectionLabel(
  arc: FiringArc,
): 'front' | 'left-side' | 'right-side' | 'rear' {
  switch (arc) {
    case FiringArc.Left:
      return 'left-side';
    case FiringArc.Right:
      return 'right-side';
    case FiringArc.Rear:
      return 'rear';
    case FiringArc.Front:
    default:
      return 'front';
  }
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

  for (let q = -maxRange; q <= maxRange; q++) {
    for (let r = -maxRange; r <= maxRange; r++) {
      const target: IHexCoordinate = { q: center.q + q, r: center.r + r };

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
 * Get the immediate hex direction in the strict rear arc.
 */
export function getRearArcDirections(facing: Facing): readonly Facing[] {
  return [((facing + 3) % 6) as Facing];
}

/**
 * Get the left side arc boundary direction.
 */
export function getLeftArcDirection(facing: Facing): Facing {
  return ((facing - 2 + 6) % 6) as Facing;
}

/**
 * Get the right side arc boundary direction.
 */
export function getRightArcDirection(facing: Facing): Facing {
  return ((facing + 2) % 6) as Facing;
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
  if (weaponArc === FiringArc.Front) {
    return targetArc === FiringArc.Front;
  }

  if (weaponArc === FiringArc.Rear) {
    return targetArc === FiringArc.Rear;
  }

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
      return 0;
    case FiringArc.Rear:
      return 0;
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
