/**
 * Fall Mechanics
 * Implements BattleTech fall damage, fall direction,
 * prone state management, and pilot damage from falls.
 *
 * @spec openspec/changes/full-combat-parity/specs/fall-mechanics/spec.md
 */

import { CombatLocation, FiringArc } from '@/types/gameplay';
import { Facing } from '@/types/gameplay';

import { D6Roller, rollD6, determineHitLocation } from './hitLocation';

// =============================================================================
// Types
// =============================================================================

export interface IFallDamageCluster {
  readonly damage: number;
  readonly location: CombatLocation;
}

export interface IFallResult {
  readonly totalDamage: number;
  readonly clusters: readonly IFallDamageCluster[];
  readonly fallDirection: FallDirection;
  readonly newFacing: Facing;
  readonly pilotDamage: number;
}

export type FallDirection = 'front' | 'right' | 'rear' | 'left';

// =============================================================================
// Fall Direction
// =============================================================================

/**
 * D6 roll to fall direction mapping:
 * 1 = forward, 2-3 = right, 4 = rear, 5-6 = left
 *
 * Note: per spec, 0-indexed: 0=front, 1-2=right, 3=rear, 4-5=left
 * We use 1d6 (1-6) and map: 1=front, 2-3=right, 4=rear, 5-6=left
 */
const FALL_DIRECTION_TABLE: Record<number, FallDirection> = {
  1: 'front',
  2: 'right',
  3: 'right',
  4: 'rear',
  5: 'left',
  6: 'left',
};

export function determineFallDirection(diceRoller?: D6Roller): {
  direction: FallDirection;
  roll: number;
} {
  const roll = rollD6(diceRoller);
  return {
    direction: FALL_DIRECTION_TABLE[roll],
    roll,
  };
}

/**
 * Map fall direction to a firing arc for hit location table selection.
 */
function fallDirectionToArc(direction: FallDirection): FiringArc {
  switch (direction) {
    case 'front':
      return FiringArc.Front;
    case 'right':
      return FiringArc.Right;
    case 'rear':
      return FiringArc.Rear;
    case 'left':
      return FiringArc.Left;
  }
}

/**
 * Determine new facing based on current facing and fall direction.
 * The unit's facing changes to match the fall direction relative to current facing.
 */
export function getNewFacingFromFall(
  currentFacing: Facing,
  direction: FallDirection,
): Facing {
  const directionOffset: Record<FallDirection, number> = {
    front: 0,
    right: 1,
    rear: 3,
    left: 5,
  };
  return ((currentFacing + directionOffset[direction]) % 6) as Facing;
}

// =============================================================================
// Fall Damage Calculation
// =============================================================================

/**
 * Calculate total fall damage.
 * Formula: ceil(weight / 10) * (fallHeight + 1)
 *
 * @param tonnage - Mech weight in tons
 * @param fallHeight - Height fallen (0 = standing fall, 1+ = elevation fall)
 */
export function calculateFallDamage(
  tonnage: number,
  fallHeight: number = 0,
): number {
  return Math.ceil(tonnage / 10) * (fallHeight + 1);
}

/**
 * Split total damage into 5-point clusters.
 * Each cluster is applied to a separate hit location.
 *
 * Example: 18 damage = [5, 5, 5, 3]
 */
export function splitIntoClusters(totalDamage: number): readonly number[] {
  const clusters: number[] = [];
  let remaining = totalDamage;

  while (remaining > 0) {
    const clusterSize = Math.min(5, remaining);
    clusters.push(clusterSize);
    remaining -= clusterSize;
  }

  return clusters;
}

/**
 * Apply fall damage as 5-point clusters to random hit locations.
 * Each cluster is rolled on the hit location table for the fall direction.
 */
export function applyFallDamage(
  tonnage: number,
  fallHeight: number,
  fallDirection: FallDirection,
  diceRoller?: D6Roller,
): readonly IFallDamageCluster[] {
  const totalDamage = calculateFallDamage(tonnage, fallHeight);
  const clusterSizes = splitIntoClusters(totalDamage);
  const arc = fallDirectionToArc(fallDirection);

  return clusterSizes.map((damage) => {
    const hitResult = determineHitLocation(arc, diceRoller);
    return {
      damage,
      location: hitResult.location,
    };
  });
}

// =============================================================================
// Full Fall Resolution
// =============================================================================

/**
 * Resolve a complete fall sequence:
 * 1. Determine fall direction (D6)
 * 2. Calculate fall damage (ceil(weight/10) * (height+1))
 * 3. Apply damage in 5-point clusters to random locations
 * 4. Apply 1 point pilot damage
 * 5. Determine new facing
 *
 * @param tonnage - Mech weight in tons
 * @param currentFacing - Current unit facing
 * @param fallHeight - Height of fall (0 for standing fall)
 * @param diceRoller - Injectable dice roller
 */
export function resolveFall(
  tonnage: number,
  currentFacing: Facing,
  fallHeight: number = 0,
  diceRoller?: D6Roller,
): IFallResult {
  const { direction } = determineFallDirection(diceRoller);
  const totalDamage = calculateFallDamage(tonnage, fallHeight);
  const clusters = applyFallDamage(tonnage, fallHeight, direction, diceRoller);
  const newFacing = getNewFacingFromFall(currentFacing, direction);

  return {
    totalDamage,
    clusters,
    fallDirection: direction,
    newFacing,
    pilotDamage: 1,
  };
}
