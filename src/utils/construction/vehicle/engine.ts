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
  ENGINE_DEFINITIONS,
  EngineType,
  VehicleOnlyEngineType,
  type VehicleEngineType,
} from '@/types/construction/EngineType';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { ceilToHalfTon } from '@/utils/physical/weightUtils';

import { getBaseEngineWeight } from '../engineCalculations';
import supportEngine from './supportEngine.json';
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
 * restrictions (MegaMek 48fcb2f6 Engine.isFusion, Engine.java:361-365).
 * Power-amplifier requirements are decided separately by
 * requiresPowerAmplifiers; fission is exempt there.
 */
export const NON_FUSION_ENGINE_TYPES: ReadonlySet<VehicleEngineType> = new Set([
  EngineType.ICE,
  EngineType.FUEL_CELL,
  EngineType.FISSION,
  VehicleOnlyEngineType.NONE,
  VehicleOnlyEngineType.STEAM,
  VehicleOnlyEngineType.BATTERY,
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
export function isVehicleFusionEngine(engineType: VehicleEngineType): boolean {
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
 * of trailer identity; the store holds that absence as VehicleOnlyEngineType.NONE.
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

/** Effective support rating: Java Engine.getRating(Entity), not stored sentinel 0. */
export function computeStoredVehicleEngineRating(
  tonnage: number,
  cruiseMP: number,
  motionType: GroundMotionType,
  supportVehicle: boolean,
  engineLess = false,
): number {
  return supportVehicle
    ? Math.min(supportEngine.maxRating, tonnage * cruiseMP)
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
 * Compute unmodified flank MP from cruise MP.
 *
 * MegaMek 48fcb2f64a1b Entity.java:4004-4016; Tank.java:1570-1575.
 * Boosters, damage and scenario movement modifiers are separate rules.
 */
export function computeFlankMP(cruiseMP: number): number {
  return Math.ceil(cruiseMP * 1.5);
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
  engineType: VehicleEngineType | null,
  context: CombatVehicleEngineContext,
): number {
  // Explicit absence bypasses installed-engine tables, shielding and minima.
  if (engineType === null || engineType === VehicleOnlyEngineType.NONE)
    return 0;
  // The engine table has entries only at multiples of 5 (minimum 10); a
  // rating in between is looked up at the next entry up.
  const baseWeight = getBaseEngineWeight(
    Math.max(10, Math.ceil(rating / 5) * 5),
  );
  // Steam and battery have no case in Java's switch: unmodified, unshielded.
  const def = ENGINE_DEFINITIONS.find((entry) => entry.type === engineType);
  const modifiedWeight = baseWeight * (def?.weightMultiplier ?? 1);
  const unshieldedWeight = ceilToHalfTon(
    engineType === EngineType.FISSION
      ? Math.max(5, modifiedWeight)
      : modifiedWeight,
  );
  const installedWeight = ceilToHalfTon(
    def?.isFusion || engineType === EngineType.FISSION
      ? unshieldedWeight * 1.5
      : unshieldedWeight,
  );
  return context.motionType === GroundMotionType.HOVER
    ? Math.max(installedWeight, ceilToHalfTon(context.tonnage / 5))
    : installedWeight;
}

/** Engine.SV_ENGINE_RATINGS by TechRating index A-F (Engine.java:118-181). */
const SUPPORT_ENGINE_MULTIPLIERS: Readonly<
  Partial<Record<VehicleEngineType, readonly number[]>>
> = {
  [EngineType.ICE]: [0, 3, 2, 1.5, 1.3, 1],
  [EngineType.STANDARD]: [0, 0, 1.5, 1, 0.75, 0.5],
  [EngineType.FUEL_CELL]: [0, 0, 1.2, 1, 0.9, 0.7],
  [EngineType.FISSION]: [0, 0, 1.75, 1.5, 1.4, 1.3],
  [VehicleOnlyEngineType.NONE]: [0, 0, 0, 0, 0, 0],
  [VehicleOnlyEngineType.STEAM]: [4, 3.5, 3, 2.8, 2.6, 2.5],
  [VehicleOnlyEngineType.BATTERY]: [0, 0, 1.5, 1.2, 1, 0.8],
};

/**
 * Small, medium and large getBaseEngineValue: SupportTank.java:328-389 and
 * SupportVTOL.java:122-131 (not SVType's table, which Engine does not read).
 */
const SUPPORT_BASE_ENGINE_VALUES: Readonly<
  Partial<Record<GroundMotionType, readonly number[]>>
> = {
  [GroundMotionType.HOVER]: [0.0025, 0.004, 0.008],
  [GroundMotionType.NAVAL]: [0.004, 0.007, 0.007],
  [GroundMotionType.HYDROFOIL]: [0.004, 0.007, 0.007],
  [GroundMotionType.SUBMARINE]: [0.004, 0.007, 0.007],
  [GroundMotionType.TRACKED]: [0.006, 0.013, 0.025],
  [GroundMotionType.WHEELED]: [0.0025, 0.0075, 0.015],
  [GroundMotionType.WIGE]: [0.003, 0.005, 0.006],
  [GroundMotionType.RAIL]: [0.003, 0.004, 0.005],
  [GroundMotionType.MAGLEV]: [0.003, 0.004, 0.005],
  [GroundMotionType.VTOL]: [0.002, 0.0025, 0.004],
};

/**
 * Heaviest medium support vehicle (EntityWeightClass.java:80-97). Heavier ones
 * are LargeSupportTank, or SuperHeavy VTOLs above 30 t (VTOL.java:729-731).
 */
const SUPPORT_MEDIUM_MAX_TONS: Readonly<
  Partial<Record<GroundMotionType, number>>
> = {
  [GroundMotionType.WHEELED]: 80,
  [GroundMotionType.TRACKED]: 100,
  [GroundMotionType.HOVER]: 50,
  [GroundMotionType.VTOL]: 30,
  [GroundMotionType.WIGE]: 80,
  [GroundMotionType.RAIL]: 300,
  [GroundMotionType.MAGLEV]: 300,
};

/** D: MegaMekLab's new support vehicle (SVMainUI.java:307); engine follows. */
export const DEFAULT_SUPPORT_ENGINE_TECH_RATING = 3;

export interface SupportVehicleEngineContext extends CombatVehicleEngineContext {
  readonly cruiseMP: number;
  /** TechRating index, A = 0 to F = 5; omitted means the default D. */
  readonly engineTechRating?: number;
}

/**
 * Support-vehicle engine weight: Engine.getWeightEngine's support branch
 * (Engine.java:396-404, getWeight :453-474), rounded by RoundWeight.SV_ENGINE
 * (RoundWeight.java:70-76). Engines without a support multiplier fail
 * isValidEngine and fall through to the combat formula, as in Java.
 */
export function computeSupportVehicleEngineWeight(
  rating: number,
  engineType: VehicleEngineType,
  context: SupportVehicleEngineContext,
): number {
  const multipliers = SUPPORT_ENGINE_MULTIPLIERS[engineType];
  if (!multipliers)
    return computeVehicleEngineWeight(rating, engineType, context);
  const { tonnage, motionType } = context;
  const techRating =
    context.engineTechRating ?? DEFAULT_SUPPORT_ENGINE_TECH_RATING;
  const small = tonnage < 5;
  const large = tonnage > (SUPPORT_MEDIUM_MAX_TONS[motionType] ?? Infinity);
  const train =
    motionType === GroundMotionType.RAIL ||
    motionType === GroundMotionType.MAGLEV;
  const mp = train ? Math.max(0, context.cruiseMP - 2) : context.cruiseMP;
  const baseValue =
    SUPPORT_BASE_ENGINE_VALUES[motionType]?.[small ? 0 : large ? 2 : 1] ?? 0;
  let weight = baseValue * (4 + mp * mp) * multipliers[techRating] * tonnage;
  if (engineType === EngineType.STANDARD && techRating >= 3) {
    weight = Math.max(weight, 0.25);
  } else if (
    engineType === EngineType.STANDARD ||
    engineType === EngineType.FISSION
  ) {
    weight = Math.max(weight, 5);
  }
  if (motionType === GroundMotionType.HOVER) {
    weight = Math.max(weight, tonnage * 0.2);
  }
  // Small support vehicles use the kilogram standard; others truncate to the
  // gram, then take the nearest half ton.
  return small
    ? Math.round(weight * 1000) / 1000
    : Math.round((Math.round(weight * 1e6) / 1e6) * 2) / 2;
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
  engineType: VehicleEngineType | null,
  motionType: GroundMotionType,
): VehicleEngineValidationResult {
  const errors: Array<{ ruleId: string; message: string }> = [];
  const warnings: string[] = [];
  const engineLess =
    engineType === null || engineType === VehicleOnlyEngineType.NONE;

  const engineRating = computeEngineRating(
    tonnage,
    cruiseMP,
    motionType,
    engineLess,
  );
  const engineWeight = computeVehicleEngineWeight(engineRating, engineType, {
    tonnage,
    motionType,
  });
  const flankMP = computeFlankMP(cruiseMP);

  if (engineLess && cruiseMP > 0) {
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
    !engineLess &&
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
