/**
 * Vehicle Engine Calculations
 *
 * Computes engine weight, validates engine rating, and enforces motion-type
 * engine exclusions per BattleTech TechManual rules for combat vehicles.
 *
 * Key rules:
 * - Engine rating subtracts suspension, then rounds upward to five
 * - Max engine rating for vehicles: 400
 * - Hover/VTOL/WiGE cannot use ICE engines
 * - ICE engine weight multiplier: 2.0 × fusion base weight
 * - Fusion/fission installed shielding: 1.5 × rounded engine weight
 * - Fission minimum before shielding: 5 tons
 * - Hover minimum installed engine weight: 20% of vehicle tonnage
 * - Fuel Cell multiplier: 1.2 × fusion base weight
 */

import {
  EngineType,
  getEngineDefinition,
} from '@/types/construction/EngineType';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { ceilToHalfTon } from '@/utils/physical/weightUtils';

import { getBaseEngineWeight } from '../engineCalculations';
import suspensionTable from './suspension.json';

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
 * Engine types considered non-fusion for engine classification and motion
 * restrictions. Power-amplifier requirements are decided separately by
 * requiresPowerAmplifiers; fission is exempt there.
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

/** A single table is consumed by this owner and the Python BLK adapter. */
interface SuspensionRule {
  tiers: number[][];
  stepTons?: number;
  stepFactor?: number;
  navalExtension?: boolean;
}
const suspensionRules: Readonly<
  Partial<Record<GroundMotionType, SuspensionRule>>
> = suspensionTable;

/** MegaMek 48fcb2f64a1b Tank.java:1678-1773; combat vehicles only. */
export function computeSuspensionFactor(
  tonnage: number,
  motionType: GroundMotionType,
): number {
  const rule = suspensionRules[motionType];
  if (!rule) return 0;
  for (const [maximum, factor] of rule.tiers) {
    if (tonnage <= maximum) return factor;
  }
  const [maximum, factor] = rule.tiers[rule.tiers.length - 1];
  // Preserve the upstream naval extension literally, including its remainder.
  if (rule.navalExtension) {
    const navalFactor = Math.ceil(tonnage / 10);
    return navalFactor + (navalFactor % 5);
  }
  return rule.stepTons !== undefined && rule.stepFactor !== undefined
    ? factor + rule.stepFactor * Math.ceil((tonnage - maximum) / rule.stepTons)
    : factor;
}

/**
 * Combat engine rating; BLKTankFile.java:155-162 at the same pinned revision.
 * Fractional tonnage is truncated for propulsion, but not suspension lookup.
 * Tank callers with an explicit absent engine pass engineLess independently
 * of trailer identity. The current store EngineType cannot represent absence.
 */
export function computeEngineRating(
  tonnage: number,
  cruiseMP: number,
  motionType: GroundMotionType = GroundMotionType.TRACKED,
  engineLess = false,
): number {
  if (cruiseMP === 0 && engineLess) return 0;
  const required =
    Math.trunc(tonnage) * cruiseMP -
    computeSuspensionFactor(tonnage, motionType);
  return Math.ceil(Math.max(10, required) / 5) * 5;
}

/** Legacy support derivation is retained, not a support construction claim. */
export function computeStoredVehicleEngineRating(
  tonnage: number,
  cruiseMP: number,
  motionType: GroundMotionType,
  supportVehicle: boolean,
  engineLess = false,
): number {
  return supportVehicle
    ? tonnage * cruiseMP
    : computeEngineRating(tonnage, cruiseMP, motionType, engineLess);
}

/** Inverse movement derivation for the rating editor; rounding can admit surplus. */
export function computeCruiseMPFromRating(
  tonnage: number,
  rating: number,
  motionType: GroundMotionType,
  supportVehicle: boolean,
): number {
  if (rating === 0) return 0;
  return Math.floor(
    (rating +
      (supportVehicle ? 0 : computeSuspensionFactor(tonnage, motionType))) /
      (supportVehicle ? tonnage : Math.trunc(tonnage)),
  );
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
 * Context for installed combat-vehicle engine weight (not support vehicles).
 */
export interface CombatVehicleEngineContext {
  readonly tonnage: number;
  readonly motionType: GroundMotionType;
}

/**
 * Compute installed engine weight for a combat vehicle.
 *
 * Round the modified engine weight before shielding, then round again.
 * Support vehicles use a different engine formula and rounding standard.
 * @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md
 * Source: MegaMek 48fcb2f64a1b Engine.getWeightEngine (Engine.java:396-450).
 */
export function computeVehicleEngineWeight(
  rating: number,
  engineType: EngineType | null,
  context: CombatVehicleEngineContext,
): number {
  // Explicit absence bypasses installed-engine tables, shielding and minima.
  if (engineType === null) return 0;
  // The engine table has entries only at multiples of 5 (minimum 10); a
  // rating in between is looked up at the next entry up.
  const baseWeight = getBaseEngineWeight(
    Math.max(10, Math.ceil(rating / 5) * 5),
  );
  const def = getEngineDefinition(engineType);
  if (!def) return baseWeight;
  const modifiedWeight = baseWeight * def.weightMultiplier;
  const unshieldedWeight = ceilToHalfTon(
    engineType === EngineType.FISSION
      ? Math.max(5, modifiedWeight)
      : modifiedWeight,
  );
  const installedWeight = ceilToHalfTon(
    def.isFusion || engineType === EngineType.FISSION
      ? unshieldedWeight * 1.5
      : unshieldedWeight,
  );
  return context.motionType === GroundMotionType.HOVER
    ? Math.max(installedWeight, ceilToHalfTon(context.tonnage / 5))
    : installedWeight;
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
  engineType: EngineType | null,
  motionType: GroundMotionType,
): VehicleEngineValidationResult {
  const errors: Array<{ ruleId: string; message: string }> = [];
  const warnings: string[] = [];

  const engineRating = computeEngineRating(
    tonnage,
    cruiseMP,
    motionType,
    engineType === null,
  );
  const engineWeight = computeVehicleEngineWeight(engineRating, engineType, {
    tonnage,
    motionType,
  });
  const flankMP = computeFlankMP(cruiseMP);

  if (engineType === null && cruiseMP > 0) {
    errors.push({
      ruleId: 'VAL-VEHICLE-ENGINE',
      message: 'An absent engine (NONE) cannot provide positive cruise MP',
    });
  }

  // Rule: engine rating must not exceed 400 for combat vehicles
  if (engineRating > VEHICLE_MAX_ENGINE_RATING) {
    errors.push({
      ruleId: 'VAL-VEHICLE-ENGINE',
      message: `Engine rating ${engineRating} exceeds maximum ${VEHICLE_MAX_ENGINE_RATING}`,
    });
  }

  // Rule: fusion engine required for certain motion types
  if (
    engineType !== null &&
    requiresFusionEngine(motionType) &&
    !isVehicleFusionEngine(engineType)
  ) {
    errors.push({
      ruleId: 'VAL-VEHICLE-ENGINE',
      message: `${motionType} vehicles require a Fusion, XL, Light, or Fuel Cell engine — ${engineType} is not permitted`,
    });
  }

  // Warning: cruise MP of 1 is legal but very slow
  if (cruiseMP < 2) {
    warnings.push('Cruise MP of 1 is legal but results in a very slow vehicle');
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
