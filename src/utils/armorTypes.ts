// Define ArmorType interface
export interface ArmorType {
  id: string;
  name: string;
  pointsPerTon: number;
  criticalSlots: number;
  techBase: 'Inner Sphere' | 'Clan' | 'Both';
  minTechLevel: number;
  costMultiplier: number;
  weightMultiplier?: number;
  hasRearArmor: boolean;
  specialRules?: string[];
}

// Define all armor types with their properties
export const ARMOR_TYPES: ArmorType[] = [
  {
    id: 'standard',
    name: 'Standard',
    pointsPerTon: 16,
    criticalSlots: 0,
    techBase: 'Both',
    minTechLevel: 1,
    costMultiplier: 1.0,
    weightMultiplier: 1.0,
    hasRearArmor: true,
  },
  {
    id: 'ferro_fibrous',
    name: 'Ferro-Fibrous',
    pointsPerTon: 17.6, // 10% more points per MegaMekLab
    criticalSlots: 14,
    techBase: 'Inner Sphere',
    minTechLevel: 2,
    costMultiplier: 2.0,
    weightMultiplier: 1.0,
    hasRearArmor: true,
  },
  {
    id: 'ferro_fibrous_clan',
    name: 'Ferro-Fibrous (Clan)',
    pointsPerTon: 17.6, // 10% more points per MegaMekLab
    criticalSlots: 7,
    techBase: 'Clan',
    minTechLevel: 2,
    costMultiplier: 2.0,
    weightMultiplier: 1.0,
    hasRearArmor: true,
  },
  {
    id: 'light_ferro_fibrous',
    name: 'Light Ferro-Fibrous',
    pointsPerTon: 16.96, // 6% more points
    criticalSlots: 7,
    techBase: 'Inner Sphere',
    minTechLevel: 3,
    costMultiplier: 1.5,
    weightMultiplier: 1.0,
    hasRearArmor: true,
  },
  {
    id: 'heavy_ferro_fibrous',
    name: 'Heavy Ferro-Fibrous',
    pointsPerTon: 18.88, // 18% more points per MegaMekLab
    criticalSlots: 21,
    techBase: 'Inner Sphere',
    minTechLevel: 3,
    costMultiplier: 3.0,
    weightMultiplier: 1.0,
    hasRearArmor: true,
  },
  {
    id: 'stealth',
    name: 'Stealth',
    pointsPerTon: 16,
    criticalSlots: 12,
    techBase: 'Inner Sphere',
    minTechLevel: 3,
    costMultiplier: 5.0,
    weightMultiplier: 1.0,
    hasRearArmor: true,
    specialRules: ['Requires ECM', 'Requires Double Heat Sinks'],
  },
  {
    id: 'reactive',
    name: 'Reactive',
    pointsPerTon: 14.4, // 10% less points per MegaMekLab
    criticalSlots: 14,
    techBase: 'Both',
    minTechLevel: 3,
    costMultiplier: 3.0,
    weightMultiplier: 1.0,
    hasRearArmor: true,
    specialRules: ['Half damage from Ballistic and Missile weapons'],
  },
  {
    id: 'reflective',
    name: 'Reflective',
    pointsPerTon: 16,
    criticalSlots: 10,
    techBase: 'Both',
    minTechLevel: 3,
    costMultiplier: 3.0,
    weightMultiplier: 1.0,
    hasRearArmor: true,
    specialRules: ['Half damage from Energy weapons', 'Double damage from Ballistic weapons'],
  },
  {
    id: 'hardened',
    name: 'Hardened',
    pointsPerTon: 8, // Half points per ton
    criticalSlots: 0,
    techBase: 'Both',
    minTechLevel: 3,
    costMultiplier: 2.0,
    weightMultiplier: 2.0, // Double weight
    hasRearArmor: true,
    specialRules: ['Reduces damage by 1 point per hit', 'No critical hits through armor'],
  },
  {
    id: 'ferro_lamellor',
    name: 'Ferro-Lamellor',
    pointsPerTon: 11.43, // Special calculation
    criticalSlots: 12,
    techBase: 'Both',
    minTechLevel: 3,
    costMultiplier: 4.0,
    weightMultiplier: 1.4, // 40% heavier
    hasRearArmor: true,
    specialRules: ['20% chance to reduce critical hits'],
  },
  {
    id: 'primitive',
    name: 'Primitive',
    pointsPerTon: 10.67, // 2/3 of standard
    criticalSlots: 0,
    techBase: 'Both',
    minTechLevel: 1,
    costMultiplier: 0.5,
    weightMultiplier: 1.5, // 50% heavier
    hasRearArmor: true,
  },
  {
    id: 'commercial',
    name: 'Commercial',
    pointsPerTon: 8, // Half of standard
    criticalSlots: 0,
    techBase: 'Both',
    minTechLevel: 1,
    costMultiplier: 0.25,
    weightMultiplier: 2.0, // Double weight
    hasRearArmor: true,
  },
  {
    id: 'industrial',
    name: 'Industrial',
    pointsPerTon: 10.67, // 2/3 of standard
    criticalSlots: 0,
    techBase: 'Both',
    minTechLevel: 1,
    costMultiplier: 0.3,
    weightMultiplier: 1.5, // 50% heavier
    hasRearArmor: true,
  },
  {
    id: 'heavy_industrial',
    name: 'Heavy Industrial',
    pointsPerTon: 12.8, // 80% of standard
    criticalSlots: 0,
    techBase: 'Both',
    minTechLevel: 1,
    costMultiplier: 0.4,
    weightMultiplier: 1.25, // 25% heavier
    hasRearArmor: true,
  },
];

import { getMaxArmorPoints } from './internalStructureTable';

// Helper functions for armor calculations

/**
 * Calculate armor weight for given armor points and type
 */
export function calculateArmorWeight(
  totalArmorPoints: number,
  armorType: ArmorType
): number {
  const baseWeight = totalArmorPoints / armorType.pointsPerTon;
  const adjustedWeight = baseWeight * (armorType.weightMultiplier || 1.0);
  
  // Round to nearest half ton
  return Math.ceil(adjustedWeight * 2) / 2;
}

/**
 * Calculate maximum armor points for a given tonnage and armor type
 */
export function calculateMaxArmorPoints(
  tonnage: number,
  armorType: ArmorType
): number {
  const maxArmorWeight = tonnage * 0.5; // Max 50% of tonnage can be armor
  const maxPoints = maxArmorWeight * armorType.pointsPerTon / (armorType.weightMultiplier || 1.0);
  
  // Also limited by structure (official rule)
  const structuralMax = getMaxArmorPoints(tonnage);
  return Math.floor(Math.min(maxPoints, structuralMax));
}

/**
 * Get armor type by ID
 */
export function getArmorType(armorTypeId: string): ArmorType {
  return ARMOR_TYPES.find(type => type.id === armorTypeId) || ARMOR_TYPES[0];
}

/**
 * Get available armor types for tech base and level
 */
export function getAvailableArmorTypes(
  techBase: string,
  techLevel: number
): ArmorType[] {
  return ARMOR_TYPES.filter(type => {
    // Check tech base compatibility
    if (type.techBase !== 'Both' && type.techBase !== techBase) {
      return false;
    }
    
    // Check tech level
    if (type.minTechLevel > techLevel) {
      return false;
    }
    
    return true;
  });
}

/**
 * Check if armor type has special requirements
 */
export function checkArmorRequirements(
  armorType: ArmorType,
  unit: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (armorType.id === 'stealth') {
    // Check for ECM
    const hasECM = unit.equipmentPlacements?.some(
      (p: any) => p.equipment.name?.includes('ECM')
    );
    if (!hasECM) {
      errors.push('Stealth armor requires ECM equipment');
    }
    
    // Check for double heat sinks
    if (unit.data?.heat_sinks?.type !== 'double' && unit.data?.heat_sinks?.type !== 'double_clan') {
      errors.push('Stealth armor requires Double Heat Sinks');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate critical slots required for armor
 */
export function calculateArmorCriticalSlots(
  armorType: ArmorType,
  isPatchwork: boolean = false,
  patchworkTypes?: { [location: string]: ArmorType }
): number {
  if (isPatchwork && patchworkTypes) {
    // For patchwork, sum unique armor types' critical requirements
    const uniqueTypes = new Set(Object.values(patchworkTypes).map(t => t.id));
    let totalSlots = 0;
    
    uniqueTypes.forEach(typeId => {
      const type = getArmorType(typeId);
      totalSlots += type.criticalSlots;
    });
    
    return totalSlots;
  }
  
  return armorType.criticalSlots;
}

/**
 * Get armor cost multiplier for Battle Value calculations
 */
export function getArmorBVMultiplier(armorType: ArmorType): number {
  // Special BV multipliers for certain armor types
  const bvMultipliers: { [key: string]: number } = {
    'ferro_fibrous': 1.12,
    'ferro_fibrous_clan': 1.2,
    'light_ferro_fibrous': 1.06,
    'heavy_ferro_fibrous': 1.28,
    'stealth': 2.0,
    'hardened': 2.0,
    'reactive': 1.5,
    'reflective': 1.5,
    'ferro_lamellor': 1.5,
  };
  
  return bvMultipliers[armorType.id] || 1.0;
}
