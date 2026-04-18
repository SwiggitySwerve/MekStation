/**
 * Vehicle Armor Calculations
 *
 * Handles armor weight computation, per-location max enforcement, and
 * BAR (Barrier Armor Rating) support for support vehicles.
 *
 * Rules:
 * - Per-location max = 2 × internal structure at that location
 * - Combat vehicle armor types: Standard (16pts/t), FF (17.92pts/t), etc.
 * - Support vehicles use BAR 1-10 table for points-per-ton
 * - Body location can only receive armor on support vehicles with BAR >= 6
 */

import {
  ArmorTypeEnum,
  getArmorDefinition,
} from "@/types/construction/ArmorType";
import { ceilToHalfTon } from "@/utils/physical/weightUtils";
import {
  computeVehicleMaxArmorByLocation,
  computeVehicleStructurePoints,
} from "./structure";

// =============================================================================
// BAR Armor Table (TechManual support vehicle rules)
// =============================================================================

/**
 * Points per ton for each BAR rating level.
 * BAR 10 = same as Standard armor (16 pts/t).
 */
const BAR_POINTS_PER_TON: Record<number, number> = {
  1: 2,
  2: 4,
  3: 6,
  4: 8,
  5: 10,
  6: 12,
  7: 14,
  8: 16,
  9: 16,
  10: 16,
};

/**
 * Get armor points per ton for a BAR rating (support vehicles)
 */
export function getBarPointsPerTon(barRating: number): number {
  const clamped = Math.max(1, Math.min(10, Math.round(barRating)));
  return BAR_POINTS_PER_TON[clamped] ?? 16;
}

// =============================================================================
// Armor Weight Calculation
// =============================================================================

/**
 * Compute armor weight from total armor points and armor type
 *
 * For standard vehicles: weight = ceil(points / pointsPerTon / 0.5) × 0.5
 */
export function computeVehicleArmorWeight(
  totalArmorPoints: number,
  armorType: ArmorTypeEnum,
): number {
  const def = getArmorDefinition(armorType);
  const pointsPerTon = def?.pointsPerTon ?? 16;
  return ceilToHalfTon(totalArmorPoints / pointsPerTon);
}

/**
 * Compute armor weight for a support vehicle using BAR rating
 */
export function computeSupportVehicleArmorWeight(
  totalArmorPoints: number,
  barRating: number,
): number {
  const pointsPerTon = getBarPointsPerTon(barRating);
  return ceilToHalfTon(totalArmorPoints / pointsPerTon);
}

/**
 * Compute total available armor points from tonnage and armor type
 */
export function computeVehicleArmorPoints(
  armorTonnage: number,
  armorType: ArmorTypeEnum,
): number {
  const def = getArmorDefinition(armorType);
  const pointsPerTon = def?.pointsPerTon ?? 16;
  return Math.floor(armorTonnage * pointsPerTon);
}

// =============================================================================
// Per-Location Armor Validation
// =============================================================================

export interface ArmorLocationViolation {
  ruleId: string;
  location: string;
  allocated: number;
  maximum: number;
  message: string;
}

/**
 * Validate per-location armor does not exceed 2× structure
 *
 * Returns list of VAL-VEHICLE-ARMOR-LOC violations.
 */
export function validateVehicleArmorLocations(
  tonnage: number,
  allocation: Record<string, number>,
  hasTurret: boolean,
  isVTOL: boolean,
): ArmorLocationViolation[] {
  const violations: ArmorLocationViolation[] = [];
  const maxByLocation = computeVehicleMaxArmorByLocation(tonnage);

  const locationMap: Record<string, number> = {
    Front: maxByLocation.front,
    Left: maxByLocation.left,
    Right: maxByLocation.right,
    Rear: maxByLocation.rear,
    Turret: hasTurret ? maxByLocation.turret : 0,
    Rotor: isVTOL ? maxByLocation.rotor : 0,
  };

  for (const [location, maximum] of Object.entries(locationMap)) {
    const allocated = allocation[location] ?? 0;
    if (allocated > maximum) {
      violations.push({
        ruleId: "VAL-VEHICLE-ARMOR-LOC",
        location,
        allocated,
        maximum,
        message: `${location} armor ${allocated} exceeds maximum ${maximum}`,
      });
    }
  }

  return violations;
}

/**
 * Clamp a single location's armor to its legal maximum
 */
export function clampLocationArmor(
  tonnage: number,
  location: string,
  points: number,
  hasTurret: boolean,
  isVTOL: boolean,
): number {
  const maxByLocation = computeVehicleMaxArmorByLocation(tonnage);
  const locationMap: Record<string, number> = {
    Front: maxByLocation.front,
    Left: maxByLocation.left,
    Right: maxByLocation.right,
    Rear: maxByLocation.rear,
    Turret: hasTurret ? maxByLocation.turret : 0,
    Rotor: isVTOL ? maxByLocation.rotor : 0,
    Body: 0,
  };
  const max = locationMap[location] ?? 0;
  return Math.max(0, Math.min(points, max));
}

/**
 * Get max armor points for a specific location
 *
 * Delegates to computeVehicleStructurePoints for the canonical 2× rule.
 */
export function getVehicleLocationMaxArmor(
  tonnage: number,
  location: string,
  hasTurret: boolean,
  isVTOL: boolean,
): number {
  return clampLocationArmor(
    tonnage,
    location,
    Number.MAX_SAFE_INTEGER,
    hasTurret,
    isVTOL,
  );
}
