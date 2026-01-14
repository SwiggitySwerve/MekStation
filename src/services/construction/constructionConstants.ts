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
