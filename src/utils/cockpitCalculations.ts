/**
 * Cockpit Calculations Utility
 * Centralized calculations for all cockpit types
 */

import { CockpitType } from '../types/core';

// Cockpit fixed weights (in tons)
export const COCKPIT_WEIGHTS: Record<CockpitType, number> = {
  'Standard': 3,
  'Small': 2,
  'Command Console': 3,
  'Torso-Mounted Cockpit': 4,
  'Primitive Cockpit': 5
};

// Cockpit critical slot requirements
export const COCKPIT_SLOT_REQUIREMENTS: Record<CockpitType, { head: number; centerTorso: number }> = {
  'Standard': { head: 1, centerTorso: 0 },
  'Small': { head: 1, centerTorso: 0 },
  'Command Console': { head: 2, centerTorso: 0 },
  'Torso-Mounted Cockpit': { head: 0, centerTorso: 1 },
  'Primitive Cockpit': { head: 5, centerTorso: 0 }
};

// Cockpit technology restrictions
export const COCKPIT_TECH_RESTRICTIONS: Record<CockpitType, {
  techBase: ('Inner Sphere' | 'Clan' | 'Both')[];
  rulesLevel: ('Standard' | 'Tournament' | 'Advanced' | 'Experimental')[];
  incompatibleWith?: string[];
}> = {
  'Standard': { 
    techBase: ['Inner Sphere', 'Clan', 'Both'], 
    rulesLevel: ['Standard', 'Tournament', 'Advanced', 'Experimental'] 
  },
  'Small': { 
    techBase: ['Both'], 
    rulesLevel: ['Advanced', 'Experimental'] 
  },
  'Command Console': { 
    techBase: ['Both'], 
    rulesLevel: ['Advanced', 'Experimental'] 
  },
  'Torso-Mounted Cockpit': { 
    techBase: ['Both'], 
    rulesLevel: ['Advanced', 'Experimental'],
    incompatibleWith: ['XL Gyro']
  },
  'Primitive Cockpit': { 
    techBase: ['Both'], 
    rulesLevel: ['Standard', 'Tournament', 'Advanced', 'Experimental'] 
  }
};

// Cockpit special properties
export const COCKPIT_SPECIAL_PROPERTIES: Record<CockpitType, {
  initiativeBonus?: number;
  pilotingModifier?: number;
  ejectionCapable?: boolean;
  lifeSupport?: boolean;
  consciousness?: boolean;
  commandBonus?: number;
}> = {
  'Standard': { 
    ejectionCapable: true, 
    lifeSupport: true 
  },
  'Small': { 
    ejectionCapable: true, 
    lifeSupport: true,
    pilotingModifier: 1  // +1 penalty to piloting
  },
  'Command Console': { 
    ejectionCapable: false,  // No ejection
    lifeSupport: true,
    initiativeBonus: -2,     // -2 to initiative (better)
    commandBonus: 1          // Can coordinate other units
  },
  'Torso-Mounted Cockpit': { 
    ejectionCapable: false,  // No ejection
    lifeSupport: true,
    pilotingModifier: 1      // +1 penalty to piloting
  },
  'Primitive Cockpit': { 
    ejectionCapable: false,  // No ejection
    lifeSupport: true,
    pilotingModifier: 1      // +1 penalty to piloting
  }
};

export interface CockpitCalculationResult {
  weight: number;
  totalSlots: number;
  slotDistribution: {
    head: number;
    centerTorso: number;
  };
  isValid: boolean;
  specialProperties: typeof COCKPIT_SPECIAL_PROPERTIES[CockpitType];
}

/**
 * Get cockpit weight
 */
export function getCockpitWeight(type: CockpitType): number {
  return COCKPIT_WEIGHTS[type];
}

/**
 * Get cockpit total slot requirements
 */
export function getCockpitSlots(type: CockpitType): number {
  const slots = COCKPIT_SLOT_REQUIREMENTS[type];
  return slots.head + slots.centerTorso;
}

/**
 * Get cockpit slot distribution by location
 */
export function getCockpitSlotDistribution(type: CockpitType) {
  return COCKPIT_SLOT_REQUIREMENTS[type];
}

/**
 * Validate cockpit type for tech base and rules level
 */
export function validateCockpitType(
  type: CockpitType,
  techBase: 'Inner Sphere' | 'Clan' | 'Both',
  rulesLevel: string,
  gyroType?: string
): boolean {
  const restrictions = COCKPIT_TECH_RESTRICTIONS[type];
  if (!restrictions) return false;
  
  const validTechBase = restrictions.techBase.includes(techBase) || restrictions.techBase.includes('Both');
  // Type-safe rules level validation
  const validRulesLevels = ['Standard', 'Tournament', 'Advanced', 'Experimental'] as const;
  const safeRulesLevel = (validRulesLevels as readonly string[]).includes(rulesLevel) ? rulesLevel as typeof validRulesLevels[number] : 'Standard';
  const validRulesLevel = restrictions.rulesLevel.includes(safeRulesLevel);
  
  // Check incompatibilities (e.g., Torso-Mounted with XL Gyro)
  let compatible = true;
  if (restrictions.incompatibleWith && gyroType) {
    compatible = !restrictions.incompatibleWith.includes(gyroType);
  }
  
  return validTechBase && validRulesLevel && compatible;
}

/**
 * Get special properties for cockpit type
 */
export function getCockpitSpecialProperties(type: CockpitType) {
  return COCKPIT_SPECIAL_PROPERTIES[type] || {};
}

/**
 * Check if cockpit requires additional equipment
 */
export function getCockpitRequirements(type: CockpitType): string[] {
  const requirements: string[] = [];
  
  // Command Console requires communication equipment
  if (type === 'Command Console') {
    requirements.push('Communication Equipment');
  }
  
  // Interface cockpit requires neural interface
  // if (type === 'Interface') {
  //   requirements.push('Neural Interface');
  // }
  
  return requirements;
}

/**
 * Check if cockpit supports CASE
 */
export function supportsCASE(type: CockpitType): boolean {
  // Only cockpits with ejection systems support CASE
  const properties = COCKPIT_SPECIAL_PROPERTIES[type];
  return properties?.ejectionCapable || false;
}

/**
 * Get all cockpit calculations
 */
export function getCockpitCalculations(type: CockpitType): CockpitCalculationResult {
  return {
    weight: getCockpitWeight(type),
    totalSlots: getCockpitSlots(type),
    slotDistribution: getCockpitSlotDistribution(type),
    isValid: true,
    specialProperties: getCockpitSpecialProperties(type)
  };
}

/**
 * Get cockpit components that occupy fixed slots
 */
export function getCockpitComponents(type: CockpitType): string[] {
  const components: string[] = [];
  
  // All cockpits include basic components
  // if (type !== 'Interface') {
    components.push('Life Support');
  // }
  components.push('Sensors');
  components.push('Cockpit');
  
  // Command Console adds extra command equipment
  if (type === 'Command Console') {
    components.push('Command Console');
  }
  
  return components;
}
