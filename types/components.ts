/**
 * Canonical Component Type Definitions
 * Single source of truth for all mech component types
 * 
 * These are simple string unions that provide type safety and autocomplete
 * while remaining compatible with the rest of the codebase.
 */

// Core component type unions
export type EngineType = 
  | 'Standard' 
  | 'XL'
  | 'XL (IS)'
  | 'XL (Clan)'
  | 'Light' 
  | 'XXL' 
  | 'Compact' 
  | 'ICE' 
  | 'Fuel Cell';

export type GyroType = 
  | 'Standard' 
  | 'XL' 
  | 'Compact' 
  | 'Heavy-Duty';

export type StructureType = 
  | 'Standard' 
  | 'Endo Steel' 
  | 'Endo Steel (Clan)' 
  | 'Composite' 
  | 'Reinforced'
  | 'Industrial';

export type ArmorType = 
  | 'Standard' 
  | 'Ferro-Fibrous' 
  | 'Ferro-Fibrous (Clan)' 
  | 'Light Ferro-Fibrous' 
  | 'Heavy Ferro-Fibrous' 
  | 'Stealth'
  | 'Reactive'
  | 'Reflective'
  | 'Hardened';

export type HeatSinkType = 
  | 'Single' 
  | 'Double' 
  | 'Double (IS)' 
  | 'Double (Clan)'
  | 'Compact'
  | 'Laser';

export type CockpitType = 
  | 'Standard' 
  | 'Small' 
  | 'Command Console' 
  | 'Torso-Mounted' 
  | 'Interface' 
  | 'Primitive';

// Tech base enum
export type TechBase = 'Inner Sphere' | 'Clan';

/**
 * Type guard to check if a value is a valid EngineType
 */
export function isEngineType(value: string): value is EngineType {
  return ['Standard', 'XL', 'XL (IS)', 'XL (Clan)', 'Light', 'XXL', 'Compact', 'ICE', 'Fuel Cell'].includes(value);
}

/**
 * Type guard to check if a value is a valid GyroType
 */
export function isGyroType(value: string): value is GyroType {
  return ['Standard', 'XL', 'Compact', 'Heavy-Duty'].includes(value);
}

/**
 * Type guard to check if a value is a valid StructureType
 */
export function isStructureType(value: string): value is StructureType {
  return ['Standard', 'Endo Steel', 'Endo Steel (Clan)', 'Composite', 'Reinforced', 'Industrial'].includes(value);
}

/**
 * Type guard to check if a value is a valid ArmorType
 */
export function isArmorType(value: string): value is ArmorType {
  return ['Standard', 'Ferro-Fibrous', 'Ferro-Fibrous (Clan)', 'Light Ferro-Fibrous', 'Heavy Ferro-Fibrous', 'Stealth'].includes(value);
}

/**
 * Type guard to check if a value is a valid HeatSinkType
 */
export function isHeatSinkType(value: string): value is HeatSinkType {
  return ['Single', 'Double', 'Double (IS)', 'Double (Clan)'].includes(value);
}

/**
 * Type guard to check if a value is a valid CockpitType
 */
export function isCockpitType(value: string): value is CockpitType {
  return ['Standard', 'Small', 'Command Console', 'Torso-Mounted', 'Interface', 'Primitive'].includes(value);
}

