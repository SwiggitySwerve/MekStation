/**
 * Construction cost constants from TechManual
 * @spec openspec/specs/phase-2-construction/
 */

import { isSuperHeavyTank } from '@/services/conversion/blkVehicleArmorLayout';

// Cockpit costs (C-Bills)
export const COCKPIT_COST_STANDARD = 200000;
export const COCKPIT_COST_SMALL = 175000;
export const COCKPIT_COST_COMMAND_CONSOLE = 500000;

// Structure cost multipliers
export const STRUCTURE_COST_BASE = 400;
export const STRUCTURE_COST_MULTIPLIER_STANDARD = 1.0;
export const STRUCTURE_COST_MULTIPLIER_ENDO_STEEL = 2.0;
export const STRUCTURE_COST_MULTIPLIER_ENDO_COMPOSITE = 1.5;

// Engine cost multipliers
export const ENGINE_COST_BASE = 5000;

// Gyro cost multipliers
export const GYRO_COST_BASE = 300;

// Armor cost multipliers
export const ARMOR_COST_BASE = 10000;
export const ARMOR_COST_MULTIPLIER_STANDARD = 1.0;
export const ARMOR_COST_MULTIPLIER_FERRO_FIBROUS = 2.0;
export const ARMOR_COST_MULTIPLIER_STEALTH = 5.0;
export const ARMOR_COST_MULTIPLIER_REACTIVE = 3.0;
export const ARMOR_COST_MULTIPLIER_REFLECTIVE = 3.0;

// Heat sink costs (C-Bills)
export const HEAT_SINK_COST_SINGLE = 2000;
export const HEAT_SINK_COST_DOUBLE = 6000;

// Heat sink capacity per unit
export const HEAT_SINK_CAPACITY_SINGLE = 1;
export const HEAT_SINK_CAPACITY_DOUBLE = 2;

// Engine heat sink integration
export const ENGINE_INTEGRAL_HEAT_SINK_DIVISOR = 25;

// Construction multiplier for final cost
export const MECH_CONSTRUCTION_MULTIPLIER = 1.25;

// Validation limits
export const ENGINE_RATING_MIN = 10;
export const ENGINE_RATING_MAX = 400;
export const ENGINE_RATING_INCREMENT = 5;
export const HEAT_SINK_MINIMUM = 10;

// Weight calculation
export const STRUCTURE_WEIGHT_PERCENT = 0.1;
export const GYRO_WEIGHT_DIVISOR = 100;
export const COCKPIT_WEIGHT_STANDARD = 3;

// Armor limits
export const HEAD_ARMOR_MAX = 9;
export const ARMOR_TO_STRUCTURE_RATIO = 2;

// Critical slot limits per location
export const CRITICAL_SLOTS = {
  head: 6,
  centerTorso: 12,
  leftTorso: 12,
  rightTorso: 12,
  leftArm: 12,
  rightArm: 12,
  leftLeg: 6,
  rightLeg: 6,
} as const;
export const CRITICAL_SLOTS_DEFAULT = 12;

// =====================================================
// UNIT TONNAGE RANGES - Canonical per-unit-type limits
// Source: TechManual and Total Warfare
// =====================================================

/**
 * BattleMech tonnage range (20-200, step 5)
 * Standard: 20-100, Superheavy: 105-200
 * @spec openspec/specs/superheavy-mech-system/spec.md
 */
export const BATTLEMECH_TONNAGE = { min: 20, max: 200, step: 5 } as const;

/** OmniMech tonnage range (same as BattleMech) */
export const OMNIMECH_TONNAGE = BATTLEMECH_TONNAGE;

/** IndustrialMech tonnage range (10-100, step 5) */
export const INDUSTRIALMECH_TONNAGE = { min: 10, max: 100, step: 5 } as const;

/** ProtoMech tonnage range (2-15) */
export const PROTOMECH_TONNAGE = { min: 2, max: 15, step: 1 } as const;

/**
 * Heaviest combat vehicle MegaMek accepts for a motion type, ordinary or
 * SuperHeavy (`TestTank.maxTonnage`, TestTank.java:132-141). With
 * `getSupportVehicleMaxTonnage` the one owner of vehicle maximum tonnage: the
 * handlers, VAL-VEH-005 and the status bar read these two.
 */
export function getTankMaxTonnage(
  motionType: string | undefined,
  superHeavy: boolean,
): number {
  switch ((motionType ?? '').toLowerCase()) {
    case 'wheeled':
    case 'wige':
    case 'glider': // EntityMovementMode.parseFromString alias of WiGE
      return superHeavy ? 160 : 80;
    case 'hover':
      return superHeavy ? 100 : 50;
    case 'vtol':
      return superHeavy ? 60 : 30;
    case 'naval':
    case 'submarine':
      return superHeavy ? 555 : 300;
    case 'hydrofoil':
      return 100; // not eligible for SuperHeavy
    default:
      return superHeavy ? 200 : 100;
  }
}

/**
 * Heaviest support vehicle for a motion type: `SVType.maxTonnage`
 * (TestSupportVehicle.java:87-107), SVType by movement mode (:146-166).
 * Airship and fixed-wing are not ground motion types here.
 */
export function getSupportVehicleMaxTonnage(
  motionType: string | undefined,
): number {
  switch ((motionType ?? '').toLowerCase()) {
    case 'wheeled':
      return 160;
    case 'hover':
      return 100;
    case 'vtol':
      return 60;
    case 'wige':
    case 'glider':
      return 240;
    case 'naval':
    case 'submarine':
    case 'hydrofoil':
      return 300;
    case 'rail':
    case 'maglev':
      return 600;
    default:
      return 200; // TRACKED
  }
}

/**
 * Heaviest vehicle of a motion type, for callers that know only the weight. A
 * combat vehicle may reach the SuperHeavy limit when MegaMek's loader builds a
 * SuperHeavyTank for that motion type at some weight (`isSuperHeavyTank`,
 * BLKTankFile.java:94-123; any VTOL over 30 t, VTOL.java:729). Rail, Maglev
 * and Hydrofoil tanks never load as SuperHeavy, so they keep the ordinary limit.
 */
export function getVehicleMaxTonnage(
  motionType: string | undefined,
  support: boolean,
): number {
  if (support) return getSupportVehicleMaxTonnage(motionType);
  const canBeSuperHeavy =
    (motionType ?? '').toLowerCase() === 'vtol' ||
    isSuperHeavyTank(motionType, Number.POSITIVE_INFINITY);
  return getTankMaxTonnage(motionType, canBeSuperHeavy);
}

/**
 * Lightest vehicle: 1 t for a combat vehicle. A support vehicle has no 1 t
 * floor in `TestSupportVehicle` (the corpus holds 18 valid ones under 1 t, down
 * to the 0.04 t HTE Micro-Copter); weights are kept to the kilogram
 * (`TestSupportVehicle.ceilWeight`, :756-765), so 0.001 t is the least a
 * positive weight can be.
 */
export function getVehicleMinTonnage(support: boolean): number {
  return support ? 0.001 : 1;
}

/**
 * VTOL tonnage range (1-60). A VTOL over 30 t is SuperHeavy (VTOL.java:729)
 * and may reach 60 t.
 */
export const VTOL_TONNAGE = {
  min: 1,
  max: getTankMaxTonnage('VTOL', true),
  step: 1,
} as const;

/** Aerospace Fighter tonnage range (5-100) */
export const AEROSPACE_TONNAGE = { min: 5, max: 100, step: 5 } as const;

/** Conventional Fighter tonnage range (5-50) */
export const CONVENTIONAL_FIGHTER_TONNAGE = {
  min: 5,
  max: 50,
  step: 5,
} as const;

/** Small Craft tonnage range (100-200) */
export const SMALL_CRAFT_TONNAGE = { min: 100, max: 200, step: 100 } as const;

/** DropShip tonnage range (200-100,000) */
export const DROPSHIP_TONNAGE = { min: 200, max: 100000, step: 100 } as const;

/** JumpShip tonnage range (50,000-500,000) */
export const JUMPSHIP_TONNAGE = {
  min: 50000,
  max: 500000,
  step: 1000,
} as const;

/** WarShip tonnage range (100,000-2,500,000) */
export const WARSHIP_TONNAGE = {
  min: 100000,
  max: 2500000,
  step: 1000,
} as const;

/** Space Station tonnage range (5,000-2,500,000) */
export const SPACE_STATION_TONNAGE = {
  min: 5000,
  max: 2500000,
  step: 1000,
} as const;

/** Infantry tonnage range (0-10) */
export const INFANTRY_TONNAGE = { min: 0, max: 10, step: 0.5 } as const;

/** Battle Armor tonnage range (0.4-2) */
export const BATTLE_ARMOR_TONNAGE = { min: 0.4, max: 2, step: 0.1 } as const;
