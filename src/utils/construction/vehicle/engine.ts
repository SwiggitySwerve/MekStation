/**
 * Vehicle Engine Calculations
 *
 * Computes engine weight, validates engine rating, and enforces motion-type
 * engine exclusions per BattleTech TechManual rules for combat vehicles.
 *
 * Key rules:
 * - Engine rating = tonnage × cruiseMP
 * - Max engine rating for vehicles: 400
 * - Hover/VTOL/WiGE cannot use ICE engines
 * - ICE engine weight multiplier: 2.0 × fusion base weight
 * - XL weight multiplier: 0.5 × fusion base weight (rounded to half-ton)
 * - Fuel Cell multiplier: 1.2 × fusion base weight
 */

import {
  EngineType,
  getEngineDefinition,
} from "@/types/construction/EngineType";
import { GroundMotionType } from "@/types/unit/BaseUnitInterfaces";
import { ceilToHalfTon } from "@/utils/physical/weightUtils";
import { getBaseEngineWeight } from "../engineCalculations";

// Maximum engine rating for combat vehicles (TechManual rule)
export const VEHICLE_MAX_ENGINE_RATING = 400;

/**
 * Motion types that require fusion-based engines (cannot use ICE)
 */
const FUSION_REQUIRED_MOTION_TYPES: ReadonlySet<GroundMotionType> = new Set([
  GroundMotionType.HOVER,
  GroundMotionType.VTOL,
  GroundMotionType.WIGE,
  GroundMotionType.HYDROFOIL,
]);

/**
 * Engine types considered non-fusion (require power amps for energy weapons)
 */
export const NON_FUSION_ENGINE_TYPES: ReadonlySet<EngineType> = new Set([
  EngineType.ICE,
  EngineType.FUEL_CELL,
  EngineType.FISSION,
]);

/**
 * Check if a motion type requires a fusion-based engine
 */
export function requiresFusionEngine(motionType: GroundMotionType): boolean {
  return FUSION_REQUIRED_MOTION_TYPES.has(motionType);
}

/**
 * Check if an engine type is fusion-powered
 */
export function isVehicleFusionEngine(engineType: EngineType): boolean {
  return !NON_FUSION_ENGINE_TYPES.has(engineType);
}

/**
 * Compute engine rating from tonnage and cruise MP
 *
 * rating = tonnage × cruiseMP (no rounding needed — both are integers)
 */
export function computeEngineRating(tonnage: number, cruiseMP: number): number {
  return tonnage * cruiseMP;
}

/**
 * Compute flank MP from cruise MP
 *
 * flankMP = floor(cruiseMP × 1.5)
 */
export function computeFlankMP(cruiseMP: number): number {
  return Math.floor(cruiseMP * 1.5);
}

/**
 * Compute engine weight for a vehicle
 *
 * Uses the standard fusion base-weight table then applies the engine-type
 * multiplier. Result is rounded up to the nearest half-ton.
 */
export function computeVehicleEngineWeight(
  rating: number,
  engineType: EngineType,
): number {
  const baseWeight = getBaseEngineWeight(rating);
  const def = getEngineDefinition(engineType);
  if (!def) return baseWeight;
  return ceilToHalfTon(baseWeight * def.weightMultiplier);
}

// =============================================================================
// Validation Result
// =============================================================================

export interface VehicleEngineValidationResult {
  isValid: boolean;
  errors: Array<{ ruleId: string; message: string }>;
  warnings: string[];
  engineRating: number;
  engineWeight: number;
  flankMP: number;
}

/**
 * Validate vehicle engine configuration and return computed values
 *
 * Emits VAL-VEHICLE-ENGINE errors for:
 * - Rating exceeds 400
 * - ICE/Fission on Hover/VTOL/WiGE/Hydrofoil
 */
export function validateVehicleEngine(
  tonnage: number,
  cruiseMP: number,
  engineType: EngineType,
  motionType: GroundMotionType,
): VehicleEngineValidationResult {
  const errors: Array<{ ruleId: string; message: string }> = [];
  const warnings: string[] = [];

  const engineRating = computeEngineRating(tonnage, cruiseMP);
  const engineWeight = computeVehicleEngineWeight(engineRating, engineType);
  const flankMP = computeFlankMP(cruiseMP);

  // Rule: engine rating must not exceed 400 for combat vehicles
  if (engineRating > VEHICLE_MAX_ENGINE_RATING) {
    errors.push({
      ruleId: "VAL-VEHICLE-ENGINE",
      message: `Engine rating ${engineRating} exceeds maximum ${VEHICLE_MAX_ENGINE_RATING}`,
    });
  }

  // Rule: fusion engine required for certain motion types
  if (requiresFusionEngine(motionType) && !isVehicleFusionEngine(engineType)) {
    errors.push({
      ruleId: "VAL-VEHICLE-ENGINE",
      message: `${motionType} vehicles require a Fusion, XL, Light, or Fuel Cell engine — ${engineType} is not permitted`,
    });
  }

  // Warning: cruise MP of 1 is legal but very slow
  if (cruiseMP < 2) {
    warnings.push("Cruise MP of 1 is legal but results in a very slow vehicle");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    engineRating,
    engineWeight,
    flankMP,
  };
}
