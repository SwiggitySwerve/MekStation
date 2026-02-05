/**
 * Range Calculations
 * Calculate range between units and determine range brackets.
 *
 * @spec openspec/changes/add-hex-grid-system/specs/hex-grid-system/spec.md
 */

import {
  IHexCoordinate,
  IRangeResult,
  RangeBracket,
  RANGE_BRACKET_DEFINITIONS,
} from '@/types/gameplay';

import { hexDistance } from './hexMath';

// =============================================================================
// Range Bracket Determination
// =============================================================================

/**
 * Determine the range bracket for a given distance.
 */
export function getRangeBracket(distance: number): RangeBracket {
  if (distance <= RANGE_BRACKET_DEFINITIONS[RangeBracket.Short].max) {
    return RangeBracket.Short;
  }
  if (distance <= RANGE_BRACKET_DEFINITIONS[RangeBracket.Medium].max) {
    return RangeBracket.Medium;
  }
  if (distance <= RANGE_BRACKET_DEFINITIONS[RangeBracket.Long].max) {
    return RangeBracket.Long;
  }
  return RangeBracket.Extreme;
}

/**
 * Get the to-hit modifier for a range bracket.
 */
export function getRangeModifier(bracket: RangeBracket): number {
  return RANGE_BRACKET_DEFINITIONS[bracket].modifier;
}

/**
 * Calculate range between two coordinates and return full result.
 */
export function calculateRange(
  from: IHexCoordinate,
  to: IHexCoordinate,
): IRangeResult {
  const distance = hexDistance(from, to);
  const bracket = getRangeBracket(distance);
  const modifier = getRangeModifier(bracket);

  return {
    distance,
    bracket,
    modifier,
  };
}

// =============================================================================
// Weapon Range Checking
// =============================================================================

/**
 * Weapon range profile.
 */
export interface IWeaponRangeProfile {
  /** Short range (brackets 0-3 hexes) */
  readonly short: number;
  /** Medium range (brackets 4-6 hexes, or weapon-specific) */
  readonly medium: number;
  /** Long range (brackets 7-15 hexes, or weapon-specific) */
  readonly long: number;
  /** Extreme range (optional, 16+ hexes) */
  readonly extreme?: number;
  /** Minimum range (some weapons have penalty at close range) */
  readonly minimum?: number;
}

/**
 * Check if a target is within a weapon's maximum range.
 */
export function isInWeaponRange(
  distance: number,
  rangeProfile: IWeaponRangeProfile,
): boolean {
  const maxRange = rangeProfile.extreme ?? rangeProfile.long;
  return distance <= maxRange;
}

/**
 * Get the range bracket for a weapon at a specific distance.
 * Uses weapon-specific ranges rather than standard brackets.
 */
export function getWeaponRangeBracket(
  distance: number,
  rangeProfile: IWeaponRangeProfile,
): RangeBracket {
  if (distance <= rangeProfile.short) {
    return RangeBracket.Short;
  }
  if (distance <= rangeProfile.medium) {
    return RangeBracket.Medium;
  }
  if (distance <= rangeProfile.long) {
    return RangeBracket.Long;
  }
  if (rangeProfile.extreme && distance <= rangeProfile.extreme) {
    return RangeBracket.Extreme;
  }
  return RangeBracket.OutOfRange;
}

/**
 * Calculate the range modifier for a weapon at a specific distance.
 * Uses weapon-specific ranges.
 */
export function getWeaponRangeModifier(
  distance: number,
  rangeProfile: IWeaponRangeProfile,
): number {
  const bracket = getWeaponRangeBracket(distance, rangeProfile);

  if (bracket === RangeBracket.OutOfRange) {
    return Infinity; // Cannot fire
  }

  return getRangeModifier(bracket);
}

/**
 * Get the minimum range penalty for a weapon.
 * Some weapons (like LRMs) have penalties at close range.
 */
export function getMinimumRangePenalty(
  distance: number,
  rangeProfile: IWeaponRangeProfile,
): number {
  const minRange = rangeProfile.minimum ?? 0;

  if (minRange === 0 || distance > minRange) {
    return 0;
  }

  // Penalty is (minimum range - distance + 1)
  // e.g., min range 6, at range 3 = +4 penalty
  return minRange - distance + 1;
}

/**
 * Calculate complete range information for a weapon.
 */
export function calculateWeaponRange(
  from: IHexCoordinate,
  to: IHexCoordinate,
  rangeProfile: IWeaponRangeProfile,
): IRangeResult & { minimumRangePenalty: number; inRange: boolean } {
  const distance = hexDistance(from, to);
  const bracket = getWeaponRangeBracket(distance, rangeProfile);
  const modifier =
    bracket === RangeBracket.OutOfRange ? Infinity : getRangeModifier(bracket);
  const minimumRangePenalty = getMinimumRangePenalty(distance, rangeProfile);
  const inRange = bracket !== RangeBracket.OutOfRange;

  return {
    distance,
    bracket,
    modifier,
    minimumRangePenalty,
    inRange,
  };
}

// =============================================================================
// Line of Sight (Basic)
// =============================================================================

/**
 * Check if there's a clear line of sight between two hexes.
 * Currently a simple check - future will include terrain blocking.
 */
export function hasLineOfSight(
  _from: IHexCoordinate,
  _to: IHexCoordinate,
): boolean {
  // Basic implementation - always true (no terrain blocking)
  // In the future, this would check for intervening terrain
  return true;
}

// =============================================================================
// Range Helpers
// =============================================================================

/**
 * Get the standard range modifier for a distance.
 * Uses standard BattleTech range brackets.
 */
export function getStandardRangeModifier(distance: number): number {
  const bracket = getRangeBracket(distance);
  return getRangeModifier(bracket);
}

/**
 * Check if two positions are adjacent (distance 1).
 */
export function isAdjacent(a: IHexCoordinate, b: IHexCoordinate): boolean {
  return hexDistance(a, b) === 1;
}

/**
 * Get all coordinates at exactly a specific distance.
 */
export function getCoordinatesAtRange(
  center: IHexCoordinate,
  range: number,
): readonly IHexCoordinate[] {
  if (range === 0) {
    return [center];
  }

  const results: IHexCoordinate[] = [];

  // Walk around the ring at the specified range
  for (let q = -range; q <= range; q++) {
    for (
      let r = Math.max(-range, -q - range);
      r <= Math.min(range, -q + range);
      r++
    ) {
      const coord: IHexCoordinate = { q: center.q + q, r: center.r + r };
      if (hexDistance(center, coord) === range) {
        results.push(coord);
      }
    }
  }

  return results;
}

/**
 * Get all coordinates within a maximum range (inclusive).
 */
export function getCoordinatesInRange(
  center: IHexCoordinate,
  maxRange: number,
): readonly IHexCoordinate[] {
  const results: IHexCoordinate[] = [];

  for (let q = -maxRange; q <= maxRange; q++) {
    for (
      let r = Math.max(-maxRange, -q - maxRange);
      r <= Math.min(maxRange, -q + maxRange);
      r++
    ) {
      results.push({ q: center.q + q, r: center.r + r });
    }
  }

  return results;
}
