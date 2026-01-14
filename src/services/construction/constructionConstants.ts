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
