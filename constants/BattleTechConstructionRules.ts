/**
 * BattleTech Construction Rules - Single Source of Truth
 * 
 * This file contains all official BattleTech construction rules from the TechManual.
 * All other files should import from this file rather than defining their own values.
 * 
 * IMPORTANT: Structure points and maximum armor calculations are implemented in
 * utils/internalStructureTable.ts. This file re-exports those functions for convenience.
 * 
 * Reference: BattleTech TechManual, Sarna.net
 * @see docs/battletech/rules_implementation_map.md for detailed rule-to-code mapping
 */

// Re-export authoritative structure and armor functions
export {
  getInternalStructurePoints,
  getTotalInternalStructure,
  getMaxArmorPoints,
  getMaxArmorPointsForLocation,
  getInternalStructureBreakdown,
  isValidTonnage,
  getSupportedTonnages
} from '../utils/internalStructureTable';

// =============================================================================
// ARMOR RULES
// =============================================================================

/**
 * Official armor points per ton for different armor types
 * Source: BattleTech TechManual
 */
export const ARMOR_POINTS_PER_TON = {
  'Standard': 16,
  'Ferro-Fibrous': 17.92,
  'Ferro-Fibrous (Clan)': 17.92,
  'Light Ferro-Fibrous': 16.8,
  'Heavy Ferro-Fibrous': 19.2,
  'Stealth': 16,
  'Reactive': 14,
  'Reflective': 16,
  'Hardened': 8
} as const;

/**
 * Critical slots required for different armor types
 */
export const ARMOR_CRITICAL_SLOTS = {
  'Standard': 0,
  'Ferro-Fibrous': 14,
  'Ferro-Fibrous (Clan)': 7,
  'Light Ferro-Fibrous': 7,
  'Heavy Ferro-Fibrous': 21,
  'Stealth': 12,
  'Reactive': 14,
  'Reflective': 10,
  'Hardened': 0
} as const;

/**
 * Tech base availability for armor types
 */
export const ARMOR_TECH_BASE = {
  'Standard': 'Both',
  'Ferro-Fibrous': 'Inner Sphere',
  'Ferro-Fibrous (Clan)': 'Clan',
  'Light Ferro-Fibrous': 'Inner Sphere',
  'Heavy Ferro-Fibrous': 'Inner Sphere',
  'Stealth': 'Inner Sphere',
  'Reactive': 'Inner Sphere',
  'Reflective': 'Inner Sphere',
  'Hardened': 'Inner Sphere'
} as const;

// =============================================================================
// HEAT SINK RULES
// =============================================================================

/**
 * Calculate engine heat sinks based on engine rating
 * Official Rule: Engine Rating ÷ 25 (rounded down), NO MINIMUM
 * 
 * @param engineRating Engine rating
 * @returns Number of internal heat sinks (no artificial minimum)
 */
export function calculateEngineHeatSinks(engineRating: number): number {
  if (engineRating <= 0) return 0;
  return Math.floor(engineRating / 25);
}

/**
 * Heat sink dissipation rates
 */
export const HEAT_SINK_DISSIPATION = {
  'Single': 1,
  'Double (IS)': 2,
  'Double (Clan)': 2,
  'Compact': 1,
  'Laser': 1
} as const;

/**
 * Critical slots per heat sink type
 */
export const HEAT_SINK_CRITICAL_SLOTS = {
  'Single': 1,
  'Double (IS)': 3,
  'Double (Clan)': 2,
  'Compact': 1,
  'Laser': 1
} as const;

/**
 * Heat sink weight (all types weigh 1 ton)
 */
export const HEAT_SINK_WEIGHT = 1;

/**
 * Minimum heat sink requirements for total mech heat sinks
 * Rule: Minimum = 10 total heat sinks OR number of heat-generating weapons, whichever is higher
 * NOTE: This is different from engine heat sinks which have NO minimum
 */
export function calculateMinimumTotalHeatSinks(heatGeneratingWeapons: number): number {
  return Math.max(10, heatGeneratingWeapons);
}

// =============================================================================
// STRUCTURE RULES
// =============================================================================

/**
 * IMPORTANT: Structure points are NOT calculated as a simple multiplier.
 * Structure points are determined by the official BattleTech internal structure table
 * based on mech tonnage. All structure types (Standard, Endo Steel, etc.) use the
 * same structure point values - only the weight differs.
 * 
 * For structure points, use: getInternalStructurePoints(tonnage) from utils/internalStructureTable.ts
 * For structure weight, use: calculateStructureWeight(tonnage, structureType) below
 * 
 * @see utils/internalStructureTable.ts for the authoritative structure point table
 */

/**
 * Structure weight multipliers
 */
export const STRUCTURE_WEIGHT_MULTIPLIER = {
  'Standard': 1.0,
  'Endo Steel': 0.5,
  'Endo Steel (Clan)': 0.5,
  'Composite': 0.5,
  'Reinforced': 2.0
} as const;

/**
 * Structure critical slots
 */
export const STRUCTURE_CRITICAL_SLOTS = {
  'Standard': 0,
  'Endo Steel': 14,
  'Endo Steel (Clan)': 7,
  'Composite': 4,
  'Reinforced': 0
} as const;

// =============================================================================
// ENGINE RULES
// =============================================================================

/**
 * Engine weight calculation
 * Different formulas for different engine types
 */
export function calculateEngineWeight(engineRating: number, engineType: string): number {
  if (engineRating <= 0) return 0;
  
  // Base weight calculation
  let baseWeight: number;
  if (engineRating <= 100) {
    baseWeight = Math.ceil(engineRating / 25) * 0.5;
  } else if (engineRating <= 400) {
    baseWeight = Math.ceil(engineRating / 25) * 0.5;
  } else {
    baseWeight = Math.ceil(engineRating / 25) * 0.5;
  }
  
  // Apply engine type multipliers
  switch (engineType) {
    case 'Standard':
      return baseWeight;
    case 'XL':
      return baseWeight * 0.5;
    case 'Light':
      return baseWeight * 0.75;
    case 'Compact':
      return baseWeight * 1.5;
    case 'XXL':
      return baseWeight * 0.33;
    default:
      return baseWeight;
  }
}

/**
 * Engine critical slots
 */
export const ENGINE_CRITICAL_SLOTS = {
  'Standard': 6,
  'XL': 12,
  'Light': 4,
  'Compact': 3,
  'XXL': 20
} as const;

// =============================================================================
// MOVEMENT RULES
// =============================================================================

/**
 * Calculate movement points
 */
export function calculateWalkingMP(engineRating: number, tonnage: number): number {
  if (tonnage <= 0) return 0;
  return Math.floor(engineRating / tonnage);
}

export function calculateRunningMP(walkingMP: number): number {
  return Math.floor(walkingMP * 1.5);
}

// =============================================================================
// WEIGHT LIMITS
// =============================================================================

/**
 * IMPORTANT: This function has been removed as it was incorrect.
 * The formula "tonnage * 2" does NOT account for the head armor cap (9 points).
 * 
 * Use getMaxArmorPoints(tonnage) from utils/internalStructureTable.ts instead.
 * That function correctly implements the 2:1 structure rule with head exception.
 * 
 * @see utils/internalStructureTable.ts for the correct implementation
 */

/**
 * Internal structure weight calculation
 */
export function calculateStructureWeight(tonnage: number, structureType: string): number {
  const baseWeight = tonnage * 0.1; // 10% of tonnage
  const multiplier = STRUCTURE_WEIGHT_MULTIPLIER[structureType as keyof typeof STRUCTURE_WEIGHT_MULTIPLIER] || 1.0;
  return baseWeight * multiplier;
}

/**
 * Calculate armor weight from armor points
 */
export function calculateArmorWeight(armorPoints: number, armorType: string): number {
  const pointsPerTon = ARMOR_POINTS_PER_TON[armorType as keyof typeof ARMOR_POINTS_PER_TON] || 16;
  return armorPoints / pointsPerTon;
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate if armor type is valid
 */
export function isValidArmorType(armorType: string): boolean {
  return armorType in ARMOR_POINTS_PER_TON;
}

/**
 * Validate if structure type is valid
 */
export function isValidStructureType(structureType: string): boolean {
  return structureType in STRUCTURE_WEIGHT_MULTIPLIER;
}

/**
 * Validate if heat sink type is valid
 */
export function isValidHeatSinkType(heatSinkType: string): boolean {
  return heatSinkType in HEAT_SINK_DISSIPATION;
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type ArmorType = keyof typeof ARMOR_POINTS_PER_TON;
export type StructureType = keyof typeof STRUCTURE_WEIGHT_MULTIPLIER;
export type HeatSinkType = keyof typeof HEAT_SINK_DISSIPATION;
export type EngineType = keyof typeof ENGINE_CRITICAL_SLOTS;
export type TechBase = 'Inner Sphere' | 'Clan' | 'Both';