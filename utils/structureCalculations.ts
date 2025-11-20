/**
 * Structure Calculations Utility
 * Centralized calculations for all structure types
 */

import { StructureType } from '../types/systemComponents';
import { getMaxArmorPoints } from './internalStructureTable';

// Structure weight multipliers (as percentage of mech tonnage)
export const STRUCTURE_WEIGHT_MULTIPLIERS: Record<StructureType, number> = {
  'Standard': 0.10,
  'Endo Steel': 0.05,
  'Endo Steel (Clan)': 0.05,
  'Composite': 0.05,
  'Reinforced': 0.20,
  'Industrial': 0.20
};

// Structure critical slot requirements
export const STRUCTURE_SLOT_REQUIREMENTS: Record<StructureType, number> = {
  'Standard': 0,
  'Endo Steel': 14,
  'Endo Steel (Clan)': 7,
  'Composite': 0,
  'Reinforced': 0,
  'Industrial': 0
};

// Structure technology restrictions
export const STRUCTURE_TECH_RESTRICTIONS: Record<StructureType, {
  techBase: ('Inner Sphere' | 'Clan' | 'Both')[];
  rulesLevel: ('Standard' | 'Tournament' | 'Advanced' | 'Experimental')[];
}> = {
  'Standard': { techBase: ['Inner Sphere', 'Clan', 'Both'], rulesLevel: ['Standard', 'Tournament', 'Advanced', 'Experimental'] },
  'Endo Steel': { techBase: ['Inner Sphere', 'Both'], rulesLevel: ['Tournament', 'Advanced', 'Experimental'] },
  'Endo Steel (Clan)': { techBase: ['Clan'], rulesLevel: ['Tournament', 'Advanced', 'Experimental'] },
  'Composite': { techBase: ['Both'], rulesLevel: ['Experimental'] },
  'Reinforced': { techBase: ['Both'], rulesLevel: ['Advanced', 'Experimental'] },
  'Industrial': { techBase: ['Both'], rulesLevel: ['Standard', 'Tournament', 'Advanced', 'Experimental'] }
};

export interface StructureCalculationResult {
  weight: number;
  slots: number;
  isValid: boolean;
  maxArmor: number;
}

/**
 * Calculate structure weight based on mech tonnage and structure type
 */
export function calculateStructureWeight(mechTonnage: number, type: StructureType): number {
  const multiplier = STRUCTURE_WEIGHT_MULTIPLIERS[type];
  const weight = mechTonnage * multiplier;
  return Math.ceil(weight * 2) / 2; // Round to nearest 0.5 ton
}

/**
 * Get structure slot requirements
 */
export function getStructureSlots(type: StructureType): number {
  return STRUCTURE_SLOT_REQUIREMENTS[type];
}

/**
 * Calculate maximum armor points based on structure type and tonnage
 * 
 * IMPORTANT: Structure type does NOT affect maximum armor points - only weight differs.
 * All structure types use the same maximum armor calculation (2x structure points, head capped at 9).
 * 
 * @param mechTonnage Mech tonnage (20-100 tons)
 * @param type Structure type (ignored - all types have same max armor)
 * @returns Maximum armor points
 */
export function calculateMaxArmorPoints(mechTonnage: number, type: StructureType): number {
  // Structure type doesn't affect maximum armor points - only weight differs
  // Use authoritative function from internalStructureTable
  return getMaxArmorPoints(mechTonnage);
}

/**
 * Get internal structure points by location using official BattleTech table
 */
export function getInternalStructureByLocation(mechTonnage: number): Record<string, number> {
  // Import and use official BattleTech internal structure table
  const { getInternalStructurePoints: getOfficialStructure } = require('./internalStructureTable');
  const structure = getOfficialStructure(mechTonnage);
  
  return {
    head: structure.HD,
    centerTorso: structure.CT,
    leftTorso: structure.LT,
    rightTorso: structure.RT,
    leftArm: structure.LA,
    rightArm: structure.RA,
    leftLeg: structure.LL,
    rightLeg: structure.RL
  };
}

/**
 * Get total internal structure points for a mech using official BattleTech table
 */
export function getInternalStructurePoints(mechTonnage: number): number {
  // Import and use official BattleTech total calculation
  const { getTotalInternalStructure } = require('./internalStructureTable');
  return getTotalInternalStructure(mechTonnage);
}

/**
 * Validate structure type for tech base and rules level
 */
export function validateStructureType(
  type: StructureType, 
  techBase: 'Inner Sphere' | 'Clan' | 'Both',
  rulesLevel: string
): boolean {
  const restrictions = STRUCTURE_TECH_RESTRICTIONS[type];
  if (!restrictions) return false;
  
  // Check if the tech base is directly allowed
  const validTechBase = restrictions.techBase.includes(techBase);
  // Type-safe rules level validation
  const validRulesLevels = ['Standard', 'Tournament', 'Advanced', 'Experimental'] as const;
  const safeRulesLevel = validRulesLevels.includes(rulesLevel as any) ? rulesLevel as 'Standard' | 'Tournament' | 'Advanced' | 'Experimental' : 'Standard';
  const validRulesLevel = restrictions.rulesLevel.includes(safeRulesLevel);
  
  return validTechBase && validRulesLevel;
}

/**
 * Get all structure calculations
 */
export function getStructureCalculations(
  mechTonnage: number,
  type: StructureType
): StructureCalculationResult {
  return {
    weight: calculateStructureWeight(mechTonnage, type),
    slots: getStructureSlots(type),
    isValid: true, // Could add validation logic here
    maxArmor: calculateMaxArmorPoints(mechTonnage, type)
  };
}
