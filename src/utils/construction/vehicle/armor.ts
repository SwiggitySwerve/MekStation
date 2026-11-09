/**
 * Vehicle Armor Calculations
 *
 * Handles armor weight computation, per-location max enforcement, and
 * BAR (Barrier Armor Rating) support for support vehicles.
 *
 * Rules:
 * - No independent location cap except the VTOL rotor; separate class-total limits
 * - Combat vehicle armor types: Standard (16pts/t), FF (17.92pts/t), etc.
 * - Support vehicles use the BAR 2-10 weight-per-point table
 * - Body is not an armored allocation location
 */

import {
  ArmorTypeEnum,
  getArmorDefinition,
} from '@/types/construction/ArmorType';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import {
  BLK_DUAL_TURRET_ARMOR_LOCATIONS,
  BLK_SUPERHEAVY_ARMOR_LOCATIONS,
  BLK_VTOL_ARMOR_LOCATIONS,
} from '@/types/formats/BlkFormat';
import {
  ceilToHalfTon,
  roundWeightToGrams,
} from '@/utils/physical/weightUtils';

import {
  getMaxVehicleArmor,
  getMaxVehicleArmorForLocation,
  type IVehicleArmorProfile,
} from './armorLimits';

/** TechConstants.isClan:394-398 at MegaMek 48fcb2f64. */
const CLAN_TECH_LEVELS = new Set([2, 6, 8, 10, 12]);

/** Only an absent source tag inherits the chassis side (BLKTankFile:291-298). */
export function resolveVehicleClanArmor(
  armorTechLevel: number | undefined,
  clanChassis: boolean,
): boolean {
  return armorTechLevel === undefined
    ? clanChassis
    : CLAN_TECH_LEVELS.has(armorTechLevel);
}

/** Exclude armor belonging to turrets that are not installed. */
export function getInstalledArmorAllocation<T extends Record<string, number>>(
  allocation: T,
  hasTurret: boolean,
  hasSecondaryTurret: boolean,
): T {
  return {
    ...allocation,
    ...(hasTurret ? {} : { [VehicleLocation.TURRET]: 0 }),
    ...(hasSecondaryTurret ? {} : { [VehicleLocation.TURRET_2]: 0 }),
  };
}

/** Sum installed armor; preserve the legacy default of neither turret. */
export function getTotalVehicleArmor(
  allocation: Record<string, number>,
  hasTurret: boolean = false,
  hasSecondaryTurret: boolean = false,
): number {
  const installed = getInstalledArmorAllocation(
    allocation,
    hasTurret,
    hasSecondaryTurret,
  );
  const locations = new Set([
    ...BLK_DUAL_TURRET_ARMOR_LOCATIONS,
    ...BLK_SUPERHEAVY_ARMOR_LOCATIONS,
    ...BLK_VTOL_ARMOR_LOCATIONS,
  ]);
  return [...locations].reduce(
    (total, location) => total + (installed[location] || 0),
    0,
  );
}

// =============================================================================
// BAR Armor Table (ArmorType.java:1840-2100, TM p.134)
// =============================================================================

/**
 * Tons per armor point of BAR 2-10 support vehicle armor by armor tech rating
 * A-F (index 0-5); 0 where the BAR does not exist at that rating.
 */
const BAR_WEIGHT_PER_POINT: Record<number, readonly number[]> = {
  2: [0.04, 0.025, 0.016, 0.013, 0.012, 0.011],
  3: [0.06, 0.038, 0.024, 0.019, 0.017, 0.016],
  4: [0, 0.05, 0.032, 0.026, 0.023, 0.021],
  5: [0, 0.063, 0.04, 0.032, 0.028, 0.026],
  6: [0, 0, 0.048, 0.038, 0.034, 0.032],
  7: [0, 0, 0.056, 0.045, 0.04, 0.037],
  8: [0, 0, 0, 0.051, 0.045, 0.042],
  9: [0, 0, 0, 0.057, 0.051, 0.047],
  10: [0, 0, 0, 0.063, 0.056, 0.052],
};

export function getSupportVehicleBarRatings(): number[] {
  return Object.keys(BAR_WEIGHT_PER_POINT).map(Number);
}

/**
 * Armor tonnage of BAR support-vehicle armor points: the points' weight by
 * armor tech rating, rounded up to a kilogram (units under 5 t) or a half ton
 * (TestSupportVehicle armor weight; RoundWeight.java).
 */
export function getSupportVehicleBarArmorWeight(
  points: number,
  bar: number,
  armorTechRating: number,
  kilogramStandard: boolean,
): number {
  const perPoint = BAR_WEIGHT_PER_POINT[bar]?.[armorTechRating] ?? 0;
  const step = kilogramStandard ? 1000 : 2;
  return (
    Math.ceil((roundWeightToGrams(points * perPoint) / 1_000_000) * step) / step
  );
}

/**
 * Armor points the armor tonnage of a BAR support vehicle buys
 * (`TestEntity.getArmorPoints`, TestEntity.java:1148-1152): the points' weight
 * rounded up to a kilogram (units under 5 t) or a half ton, divided by the
 * weight per point, floored and capped by the armor limit. Division stays in
 * IEEE doubles as in Java, so 6 points of BAR 2 tech B (0.15 t / 0.025) are 5.
 */
export function getSupportVehicleBarArmorPoints(
  allocated: number,
  bar: number,
  armorTechRating: number,
  kilogramStandard: boolean,
  maxPoints: number,
): number {
  const weight = getSupportVehicleBarArmorWeight(
    allocated,
    bar,
    armorTechRating,
    kilogramStandard,
  );
  return computeSupportVehicleBarArmorPointsFromTonnage(
    weight,
    bar,
    armorTechRating,
    maxPoints,
  );
}

/** Preserve the mapper's established armor -> structural -> F fallback. */
export function resolveSupportVehicleArmorTechRating(
  armorTechRating?: number,
  structuralTechRating?: number,
): number {
  return armorTechRating ?? structuralTechRating ?? 5;
}

/** The same BAR table division, for an editor's explicit armor tonnage.
 * TestEntity.java:1148-1152 (48fcb2f6); source API rounding remains above. */
export function computeSupportVehicleBarArmorPointsFromTonnage(
  weight: number,
  bar: number,
  armorTechRating: number,
  maxPoints: number,
): number {
  const perPoint = BAR_WEIGHT_PER_POINT[bar]?.[armorTechRating] ?? 0;
  if (perPoint === 0) return 0; // Java: (int) NaN
  return Math.min(Math.floor(weight / perPoint), maxPoints);
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

/** Check actual location maxima and the separate class-total limit. */
export function validateVehicleArmorLocations(
  tonnage: number,
  allocation: Record<string, number>,
  hasTurret: boolean,
  isVTOL: boolean,
  profile?: IVehicleArmorProfile,
): ArmorLocationViolation[] {
  const context = { ...profile, hasTurret, isVTOL };
  const violations: ArmorLocationViolation[] = [];
  for (const [location, allocated] of Object.entries(allocation)) {
    const maximum = getMaxVehicleArmorForLocation({
      tonnage,
      location,
      profile: context,
    });
    if (maximum !== null && allocated > maximum) {
      violations.push({
        ruleId: 'VAL-VEHICLE-ARMOR-LOC',
        location,
        allocated,
        maximum,
        message: `${location} armor ${allocated} exceeds maximum ${maximum}`,
      });
    }
  }
  const maximum = getMaxVehicleArmor({ tonnage, profile: context });
  const allocated = getTotalVehicleArmor(
    allocation,
    hasTurret,
    context.hasSecondaryTurret,
  );
  if (allocated > maximum)
    violations.push({
      ruleId: 'VAL-VEHICLE-ARMOR-TOTAL',
      location: 'Total',
      allocated,
      maximum,
      message: `Total armor ${allocated} exceeds maximum ${maximum}`,
    });
  return violations;
}

/** Preserve inspectable invalid totals; only actual location limits clamp edits. */
export function clampLocationArmor(
  tonnage: number,
  location: string,
  points: number,
  hasTurret: boolean,
  isVTOL: boolean,
  profile?: IVehicleArmorProfile,
): number {
  const maximum = getVehicleLocationMaxArmor(
    tonnage,
    location,
    hasTurret,
    isVTOL,
    profile,
  );
  return Math.max(0, maximum === null ? points : Math.min(points, maximum));
}

/** Null is an unlimited installed armored location, as in pinned MML. */
export function getVehicleLocationMaxArmor(
  tonnage: number,
  location: string,
  hasTurret: boolean,
  isVTOL: boolean,
  profile?: IVehicleArmorProfile,
): number | null {
  return getMaxVehicleArmorForLocation({
    tonnage,
    location,
    profile: { ...profile, hasTurret, isVTOL },
  });
}

export {
  getTankMaxTotalArmor,
  getSupportVehicleMaxTotalArmor,
} from './armorLimits';
