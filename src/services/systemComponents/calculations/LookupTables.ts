/**
 * Lookup Tables
 * 
 * Contains all multiplier and modifier tables used in component calculations.
 * These tables are registered with the CalculationEngine.
 */

import { CalculationEngine } from './CalculationEngine'

/**
 * Engine weight multipliers by engine type
 */
export const ENGINE_WEIGHT_MULTIPLIERS: Record<string, number> = {
  'Standard': 1.0,
  'XL (IS)': 0.5,
  'XL (Clan)': 0.5,
  'Light': 0.75,
  'XXL': 0.33,
  'Compact': 1.5,
  'ICE': 2.0,
  'Fuel Cell': 1.5
}

/**
 * Engine critical slots by location
 */
export const ENGINE_SLOTS_CT: Record<string, number> = {
  'Standard': 6,
  'XL (IS)': 6,
  'XL (Clan)': 6,
  'Light': 6,
  'XXL': 6,
  'Compact': 3,
  'ICE': 6,
  'Fuel Cell': 6
}

export const ENGINE_SLOTS_LT: Record<string, number> = {
  'Standard': 0,
  'XL (IS)': 3,
  'XL (Clan)': 2,
  'Light': 2,
  'XXL': 6,
  'Compact': 0,
  'ICE': 0,
  'Fuel Cell': 0
}

export const ENGINE_SLOTS_RT: Record<string, number> = {
  'Standard': 0,
  'XL (IS)': 3,
  'XL (Clan)': 2,
  'Light': 2,
  'XXL': 6,
  'Compact': 0,
  'ICE': 0,
  'Fuel Cell': 0
}

/**
 * Gyro weight multipliers by gyro type
 */
export const GYRO_WEIGHT_MULTIPLIERS: Record<string, number> = {
  'Standard': 1.0,
  'Compact': 1.5,
  'Heavy-Duty': 2.0,
  'XL': 0.5
}

/**
 * Gyro critical slot requirements by gyro type
 */
export const GYRO_SLOT_REQUIREMENTS: Record<string, number> = {
  'Standard': 4,
  'Compact': 2,
  'Heavy-Duty': 4,
  'XL': 6
}

/**
 * Structure weight multipliers by structure type
 */
export const STRUCTURE_WEIGHT_MULTIPLIERS: Record<string, number> = {
  'Standard': 1.0,
  'Endo Steel (IS)': 0.5,
  'Endo Steel (Clan)': 0.5,
  'Composite': 0.5,
  'Reinforced': 2.0,
  'Industrial': 1.5
}

/**
 * Structure critical slot requirements by structure type
 */
export const STRUCTURE_SLOT_REQUIREMENTS: Record<string, number> = {
  'Standard': 0,
  'Endo Steel (IS)': 14,
  'Endo Steel (Clan)': 7,
  'Composite': 0,
  'Reinforced': 0,
  'Industrial': 0
}

/**
 * Armor points per ton by armor type
 */
export const ARMOR_POINTS_PER_TON: Record<string, number> = {
  'Standard': 16,
  'Ferro-Fibrous (IS)': 17.92,
  'Ferro-Fibrous (Clan)': 17.92,
  'Light Ferro-Fibrous': 16.96,
  'Heavy Ferro-Fibrous': 16.64,
  'Stealth': 16,
  'Reactive': 16,
  'Reflective': 16,
  'Hardened': 8
}

/**
 * Armor critical slot requirements by armor type
 */
export const ARMOR_SLOT_REQUIREMENTS: Record<string, number> = {
  'Standard': 0,
  'Ferro-Fibrous (IS)': 14,
  'Ferro-Fibrous (Clan)': 7,
  'Light Ferro-Fibrous': 7,
  'Heavy Ferro-Fibrous': 21,
  'Stealth': 12,
  'Reactive': 14,
  'Reflective': 10,
  'Hardened': 0
}

/**
 * Heat sink slot requirements by heat sink type
 */
export const HEATSINK_SLOT_REQUIREMENTS: Record<string, number> = {
  'Single': 1,
  'Double': 3
}

/**
 * Heat sink dissipation by heat sink type
 */
export const HEATSINK_DISSIPATION: Record<string, number> = {
  'Single': 1,
  'Double': 2
}

/**
 * Jump jet weight per tonnage bracket
 * Key format: "min-max" tonnage range
 */
export const JUMPJET_WEIGHT_BY_TONNAGE: Record<string, number> = {
  '0-55': 0.5,
  '56-85': 1.0,
  '86-200': 2.0
}

/**
 * Register all lookup tables with a CalculationEngine
 */
export function registerAllLookupTables(engine: CalculationEngine): void {
  // Engine tables
  engine.registerTable('ENGINE_WEIGHT_MULTIPLIERS', ENGINE_WEIGHT_MULTIPLIERS)
  engine.registerTable('ENGINE_SLOTS_CT', ENGINE_SLOTS_CT)
  engine.registerTable('ENGINE_SLOTS_LT', ENGINE_SLOTS_LT)
  engine.registerTable('ENGINE_SLOTS_RT', ENGINE_SLOTS_RT)
  
  // Gyro tables
  engine.registerTable('GYRO_WEIGHT_MULTIPLIERS', GYRO_WEIGHT_MULTIPLIERS)
  engine.registerTable('GYRO_SLOT_REQUIREMENTS', GYRO_SLOT_REQUIREMENTS)
  
  // Structure tables
  engine.registerTable('STRUCTURE_WEIGHT_MULTIPLIERS', STRUCTURE_WEIGHT_MULTIPLIERS)
  engine.registerTable('STRUCTURE_SLOT_REQUIREMENTS', STRUCTURE_SLOT_REQUIREMENTS)
  
  // Armor tables
  engine.registerTable('ARMOR_POINTS_PER_TON', ARMOR_POINTS_PER_TON)
  engine.registerTable('ARMOR_SLOT_REQUIREMENTS', ARMOR_SLOT_REQUIREMENTS)
  
  // Heat sink tables
  engine.registerTable('HEATSINK_SLOT_REQUIREMENTS', HEATSINK_SLOT_REQUIREMENTS)
  engine.registerTable('HEATSINK_DISSIPATION', HEATSINK_DISSIPATION)
}

/**
 * Get jump jet weight based on unit tonnage
 */
export function getJumpJetWeight(tonnage: number): number {
  if (tonnage <= 55) return 0.5
  if (tonnage <= 85) return 1.0
  return 2.0
}






