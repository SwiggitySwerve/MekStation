/**
 * Construction cost constants from TechManual
 * @spec openspec/specs/phase-2-construction/
 */

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

/** BattleMech tonnage range (20-100, step 5) */
export const BATTLEMECH_TONNAGE = { min: 20, max: 100, step: 5 } as const;

/** OmniMech tonnage range (same as BattleMech) */
export const OMNIMECH_TONNAGE = BATTLEMECH_TONNAGE;

/** IndustrialMech tonnage range (10-100, step 5) */
export const INDUSTRIALMECH_TONNAGE = { min: 10, max: 100, step: 5 } as const;

/** ProtoMech tonnage range (2-15) */
export const PROTOMECH_TONNAGE = { min: 2, max: 15, step: 1 } as const;

/** Ground Vehicle tonnage range (1-100) */
export const VEHICLE_TONNAGE = { min: 1, max: 100, step: 1 } as const;

/** VTOL tonnage range (1-30) */
export const VTOL_TONNAGE = { min: 1, max: 30, step: 1 } as const;

/** Support Vehicle tonnage range (1-300) */
export const SUPPORT_VEHICLE_TONNAGE = { min: 1, max: 300, step: 1 } as const;

/** Aerospace Fighter tonnage range (5-100) */
export const AEROSPACE_TONNAGE = { min: 5, max: 100, step: 5 } as const;

/** Conventional Fighter tonnage range (5-50) */
export const CONVENTIONAL_FIGHTER_TONNAGE = { min: 5, max: 50, step: 5 } as const;

/** Small Craft tonnage range (100-200) */
export const SMALL_CRAFT_TONNAGE = { min: 100, max: 200, step: 100 } as const;

/** DropShip tonnage range (200-100,000) */
export const DROPSHIP_TONNAGE = { min: 200, max: 100000, step: 100 } as const;

/** JumpShip tonnage range (50,000-500,000) */
export const JUMPSHIP_TONNAGE = { min: 50000, max: 500000, step: 1000 } as const;

/** WarShip tonnage range (100,000-2,500,000) */
export const WARSHIP_TONNAGE = { min: 100000, max: 2500000, step: 1000 } as const;

/** Space Station tonnage range (5,000-2,500,000) */
export const SPACE_STATION_TONNAGE = { min: 5000, max: 2500000, step: 1000 } as const;

/** Infantry tonnage range (0-10) */
export const INFANTRY_TONNAGE = { min: 0, max: 10, step: 0.5 } as const;

/** Battle Armor tonnage range (0.4-2) */
export const BATTLE_ARMOR_TONNAGE = { min: 0.4, max: 2, step: 0.1 } as const;