/**
 * Vehicle Armor Calculations
 *
 * Handles armor weight computation, per-location max enforcement, and
 * BAR (Barrier Armor Rating) support for support vehicles.
 *
 * Rules:
 * - Per-location max = 2 × internal structure at that location
 * - Combat vehicle armor types: Standard (16pts/t), FF (17.92pts/t), etc.
 * - Support vehicles use the BAR 2-10 weight-per-point table
 * - Body location can only receive armor on support vehicles with BAR >= 6
 */

import {
  ArmorTypeEnum,
  getArmorDefinition,
} from '@/types/construction/ArmorType';
import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { ceilToHalfTon } from '@/utils/physical/weightUtils';

import { computeVehicleMaxArmorByLocation } from './structure';

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
  let total =
    (installed[VehicleLocation.FRONT] || 0) +
    (installed[VehicleLocation.LEFT] || 0) +
    (installed[VehicleLocation.RIGHT] || 0) +
    (installed[VehicleLocation.REAR] || 0);
  if (hasTurret) total += installed[VehicleLocation.TURRET] || 0;
  if (hasSecondaryTurret) total += installed[VehicleLocation.TURRET_2] || 0;
  if (VTOLLocation.ROTOR in installed) {
    total += installed[VTOLLocation.ROTOR] || 0;
  }
  return total;
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

/** Weight to the gram, as `RoundWeight.truncate` (RoundWeight.java:118). */
const toGram = (tons: number): number =>
  Math.round(tons * 1_000_000) / 1_000_000;

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
  const perPoint = BAR_WEIGHT_PER_POINT[bar]?.[armorTechRating] ?? 0;
  if (perPoint === 0) return 0; // Java: (int) NaN
  const step = kilogramStandard ? 1000 : 2;
  const weight = Math.ceil(toGram(allocated * perPoint) * step) / step;
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
        ruleId: 'VAL-VEHICLE-ARMOR-LOC',
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
    // Body is intentionally non-armored on standard combat ground vehicles —
    // the location exists in the data model for support-vehicle BAR rules
    // (Wave 5: support-vehicle customizer surface owns the real BAR-aware
    // rule). For combat vehicles this clamps any user-supplied armor request
    // to 0 to enforce the TechManual restriction without an extra VAL guard.
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

/**
 * Most armor points a combat vehicle (Tank, SuperHeavy, VTOL) may carry in
 * total: `(int)(tonnage * 7 / 2 + 40)` (`TestTank.java:338`).
 */
export function getTankMaxTotalArmor(tonnage: number): number {
  return Math.floor((tonnage * 7) / 2 + 40);
}

/**
 * Armor per ton of weight by motion type (`TestSupportVehicle.maxArmorFactor`,
 * TestSupportVehicle.java:585-617; SVType by movement mode, :146-166). Naval,
 * Submarine and Hydrofoil are the NAVAL type; Maglev is RAIL.
 */
const SUPPORT_ARMOR_PER_TON: Readonly<Record<GroundMotionType, number>> = {
  [GroundMotionType.TRACKED]: 2,
  [GroundMotionType.WHEELED]: 2,
  [GroundMotionType.HOVER]: 1,
  [GroundMotionType.VTOL]: 1,
  [GroundMotionType.WIGE]: 0.5,
  [GroundMotionType.RAIL]: 0.5,
  [GroundMotionType.MAGLEV]: 0.5,
  [GroundMotionType.NAVAL]: 0.334,
  [GroundMotionType.SUBMARINE]: 0.334,
  [GroundMotionType.HYDROFOIL]: 0.334,
};

/** A naval support vehicle over this weight is Large (`EntityWeightClass.java:94-95,371-377`: 300 t). */
const NAVAL_MEDIUM_SUPPORT_MAX_TONS = 300;
const LARGE_NAVAL_SUPPORT_ARMOR_PER_TON = 0.05;

/**
 * Most armor points a support vehicle (SupportTank, LargeSupportTank,
 * SupportVTOL) may carry in total: `4 + (int)(tonnage * factor)`
 * (`TestSupportVehicle.java:585-617`). BAR does not enter the limit.
 */
export function getSupportVehicleMaxTotalArmor(
  motionType: GroundMotionType,
  tonnage: number,
): number {
  const isNaval =
    motionType === GroundMotionType.NAVAL ||
    motionType === GroundMotionType.SUBMARINE ||
    motionType === GroundMotionType.HYDROFOIL;
  const factor =
    isNaval && tonnage > NAVAL_MEDIUM_SUPPORT_MAX_TONS
      ? LARGE_NAVAL_SUPPORT_ARMOR_PER_TON
      : SUPPORT_ARMOR_PER_TON[motionType];
  return 4 + Math.trunc(tonnage * factor);
}
