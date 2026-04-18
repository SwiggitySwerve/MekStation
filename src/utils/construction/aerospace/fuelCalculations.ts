/**
 * Aerospace Fuel Calculations
 *
 * Fuel tonnage minimums by sub-type, fuel points per ton by engine type,
 * and burn-rate constants for future combat use.
 *
 * @spec openspec/changes/add-aerospace-construction/specs/aerospace-unit-system/spec.md
 * Requirement: Fuel Tonnage Minimum
 */

import {
  AerospaceEngineType,
  AerospaceSubType,
} from "../../../types/unit/AerospaceInterfaces";

// ============================================================================
// Fuel Minimums by Sub-Type
// ============================================================================

/**
 * Minimum fuel tonnage required per aerospace sub-type.
 * ASF: 5 tons, CF: 2 tons, Small Craft: 20 tons.
 */
export const FUEL_MINIMUM_TONS: Record<AerospaceSubType, number> = {
  [AerospaceSubType.AEROSPACE_FIGHTER]: 5,
  [AerospaceSubType.CONVENTIONAL_FIGHTER]: 2,
  [AerospaceSubType.SMALL_CRAFT]: 20,
};

// ============================================================================
// Fuel Points Per Ton by Engine Type
// ============================================================================

/**
 * Fuel points generated per ton of fuel by engine type.
 * Fusion: 80 pts/ton, ICE: 40 pts/ton, FuelCell: 60 pts/ton.
 * XL and CompactFusion use the same burn rate as standard Fusion.
 */
export const FUEL_POINTS_PER_TON: Record<AerospaceEngineType, number> = {
  [AerospaceEngineType.FUSION]: 80,
  [AerospaceEngineType.XL]: 80,
  [AerospaceEngineType.COMPACT_FUSION]: 80,
  [AerospaceEngineType.ICE]: 40,
  [AerospaceEngineType.FUEL_CELL]: 60,
};

/**
 * Thrust points burned per thrust point used per turn.
 * Stored for future combat use (add-aerospace-combat-behavior).
 * Per TechManual: 1 thrust point costs 1 fuel point per hex of thrust applied.
 */
export const FUEL_BURN_PER_THRUST_POINT = 1;

// ============================================================================
// Calculation Functions
// ============================================================================

/**
 * Compute total fuel points from fuel tonnage and engine type.
 * fuelPoints = fuelTons × pointsPerTon
 */
export function calculateFuelPoints(
  fuelTons: number,
  engineType: AerospaceEngineType,
): number {
  return Math.floor(fuelTons * FUEL_POINTS_PER_TON[engineType]);
}

/**
 * Return the minimum fuel tonnage for a sub-type.
 */
export function minFuelTons(subType: AerospaceSubType): number {
  return FUEL_MINIMUM_TONS[subType];
}
