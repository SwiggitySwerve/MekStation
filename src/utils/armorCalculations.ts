/**
 * Armor Calculations Utility
 * Centralized calculations for all armor types using official BattleTech rules
 * 
 * Official BattleTech Rules:
 * - Maximum armor is 2x internal structure for all locations except head (max 9)
 * - Armor efficiency varies by type (Standard: 16 points/ton, Ferro-Fibrous: 17.92, etc.)
 * - Armor weight is calculated as: points / efficiency
 * - Critical slots required vary by armor type
 */

import { ArmorType } from '../types/systemComponents';
import { getInternalStructurePoints, getMaxArmorPoints, getMaxArmorPointsForLocation } from './internalStructureTable';

// Export the standard armor points per ton for backward compatibility
export const ARMOR_POINTS_PER_TON = 16;

export interface ArmorSpecification {
  type: ArmorType;
  pointsPerTon: number;
  criticalSlots: number;
  techBase: 'Inner Sphere' | 'Clan' | 'Both';
  costMultiplier: number;
  description: string;
}

// Armor specifications for all types
export const ARMOR_SPECIFICATIONS: Record<ArmorType, ArmorSpecification> = {
  'Standard': {
    type: 'Standard',
    pointsPerTon: 16,
    criticalSlots: 0,
    techBase: 'Both',
    costMultiplier: 1.0,
    description: 'Standard armor provides 16 points per ton with no critical slots'
  },
  'Ferro-Fibrous': {
    type: 'Ferro-Fibrous',
    pointsPerTon: 17.92, // 12% more than standard
    criticalSlots: 14,
    techBase: 'Inner Sphere',
    costMultiplier: 1.5,
    description: 'Ferro-Fibrous armor provides 17.92 points per ton, requires 14 critical slots'
  },
  'Ferro-Fibrous (Clan)': {
    type: 'Ferro-Fibrous (Clan)',
    pointsPerTon: 17.92, // Official TechManual value (same as IS)
    criticalSlots: 7,
    techBase: 'Clan',
    costMultiplier: 1.3,
    description: 'Clan Ferro-Fibrous armor provides 17.92 points per ton, requires 7 critical slots'
  },
  'Light Ferro-Fibrous': {
    type: 'Light Ferro-Fibrous',
    pointsPerTon: 16.8, // 5% more than standard
    criticalSlots: 7,
    techBase: 'Inner Sphere',
    costMultiplier: 1.2,
    description: 'Light Ferro-Fibrous armor provides 16.8 points per ton, requires 7 critical slots'
  },
  'Heavy Ferro-Fibrous': {
    type: 'Heavy Ferro-Fibrous',
    pointsPerTon: 19.2, // 20% more than standard
    criticalSlots: 21,
    techBase: 'Inner Sphere',
    costMultiplier: 2.0,
    description: 'Heavy Ferro-Fibrous armor provides 19.2 points per ton, requires 21 critical slots'
  },
  'Stealth': {
    type: 'Stealth',
    pointsPerTon: 16, // Same as standard but requires ECM
    criticalSlots: 0,
    techBase: 'Inner Sphere',
    costMultiplier: 3.0,
    description: 'Stealth armor provides 16 points per ton, requires Guardian ECM'
  },
  'Reactive': {
    type: 'Reactive',
    pointsPerTon: 14, // Official TechManual value
    criticalSlots: 0,
    techBase: 'Inner Sphere',
    costMultiplier: 2.5,
    description: 'Reactive armor provides 14 points per ton, provides missile protection'
  },
  'Reflective': {
    type: 'Reflective',
    pointsPerTon: 16, // Official TechManual value (same as standard)
    criticalSlots: 0,
    techBase: 'Inner Sphere',
    costMultiplier: 2.5,
    description: 'Reflective armor provides 16 points per ton, provides energy weapon protection'
  },
  'Hardened': {
    type: 'Hardened',
    pointsPerTon: 8, // 50% of standard
    criticalSlots: 0,
    techBase: 'Inner Sphere',
    costMultiplier: 4.0,
    description: 'Hardened armor provides 8 points per ton, provides double protection'
  }
};

/**
 * Calculate maximum armor points for a tonnage using official BattleTech table
 * @param tonnage Mech tonnage (20-100 tons)
 * @returns Maximum armor points
 */
export function calculateMaxArmorPoints(tonnage: number): number {
  return getMaxArmorPoints(tonnage);
}

/**
 * Calculate maximum armor points for a specific location
 * @param tonnage Mech tonnage (20-100 tons)
 * @param location Location name (HD, CT, LT, RT, LA, RA, LL, RL)
 * @returns Maximum armor points for that location
 */
export function calculateMaxArmorPointsForLocation(tonnage: number, location: string): number {
  return getMaxArmorPointsForLocation(tonnage, location);
}

/**
 * Calculate armor weight from points
 * @param armorPoints Total armor points
 * @param armorType Type of armor
 * @returns Weight in tons
 */
export function calculateArmorWeight(armorPoints: number, armorType: ArmorType): number {
  const spec = ARMOR_SPECIFICATIONS[armorType];
  return armorPoints / spec.pointsPerTon;
}

/**
 * Calculate armor points from weight
 * @param armorWeight Weight in tons
 * @param armorType Type of armor
 * @returns Armor points
 */
export function calculateArmorPoints(armorWeight: number, armorType: ArmorType): number {
  const spec = ARMOR_SPECIFICATIONS[armorType];
  return Math.floor(armorWeight * spec.pointsPerTon);
}

/**
 * Get armor specification
 * @param armorType Type of armor
 * @returns Armor specification
 */
export function getArmorSpecification(armorType: ArmorType): ArmorSpecification {
  return ARMOR_SPECIFICATIONS[armorType];
}

/**
 * Calculate armor efficiency percentage
 * @param allocatedPoints Points actually allocated
 * @param maxPoints Maximum possible points
 * @returns Efficiency percentage (0-100)
 */
export function calculateArmorEfficiency(allocatedPoints: number, maxPoints: number): number {
  if (maxPoints === 0) return 0;
  return Math.min(100, (allocatedPoints / maxPoints) * 100);
}

/**
 * Validate armor allocation
 * @param tonnage Mech tonnage
 * @param armorAllocation Armor allocation by location
 * @param armorType Type of armor
 * @returns Validation result
 */
export function validateArmorAllocation(
  tonnage: number,
  armorAllocation: Record<string, { front: number; rear?: number }>,
  armorType: ArmorType
): {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
  totalPoints: number;
  maxPoints: number;
  efficiency: number;
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  let totalPoints = 0;
  const locationViolations: string[] = [];
  
  // Check each location
  for (const [location, armor] of Object.entries(armorAllocation)) {
    const front = armor.front || 0;
    const rear = armor.rear || 0;
    const total = front + rear;
    
    totalPoints += total;
    
    const maxForLocation = calculateMaxArmorPointsForLocation(tonnage, location);
    
    if (total > maxForLocation) {
      locationViolations.push(`${location}: ${total} > ${maxForLocation}`);
    }
    
    // Check for invalid rear armor on head, arms, legs
    if ((location === 'HD' || location.includes('ARM') || location.includes('LEG')) && rear > 0) {
      issues.push(`${location} should not have rear armor`);
    }
  }
  
  const maxPoints = calculateMaxArmorPoints(tonnage);
  const efficiency = calculateArmorEfficiency(totalPoints, maxPoints);
  
  // Check total armor
  if (totalPoints > maxPoints) {
    issues.push(`Total armor (${totalPoints}) exceeds maximum (${maxPoints})`);
  }
  
  // Check location violations
  if (locationViolations.length > 0) {
    issues.push(`Location violations: ${locationViolations.join(', ')}`);
  }
  
  // Generate recommendations
  if (efficiency < 50) {
    recommendations.push('Consider adding more armor for better protection');
  } else if (efficiency > 90) {
    recommendations.push('Armor allocation is very high - consider weight savings');
  }
  
  if (tonnage >= 60 && armorType === 'Standard') {
    recommendations.push('Consider upgrading to Ferro-Fibrous armor for better efficiency');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    recommendations,
    totalPoints,
    maxPoints,
    efficiency
  };
}

/**
 * Calculate optimal armor allocation
 * @param tonnage Mech tonnage
 * @param armorType Type of armor
 * @param targetEfficiency Target efficiency percentage (default 80%)
 * @returns Suggested armor allocation
 */
export function calculateOptimalArmorAllocation(
  tonnage: number,
  armorType: ArmorType,
  targetEfficiency: number = 80
): Record<string, { front: number; rear: number }> {
  const maxPoints = calculateMaxArmorPoints(tonnage);
  const targetPoints = Math.floor(maxPoints * (targetEfficiency / 100));
  
  const structure = getInternalStructurePoints(tonnage);
  const allocation: Record<string, { front: number; rear: number }> = {};
  
  // Distribute armor proportionally based on internal structure
  const totalStructure = structure.HD + structure.CT + structure.LT + structure.RT + 
                        structure.LA + structure.RA + structure.LL + structure.RL;
  
  // Head gets 9 points max
  allocation.HD = { front: 9, rear: 0 };
  
  // Distribute remaining points proportionally
  const remainingPoints = targetPoints - 9;
  const remainingStructure = totalStructure - structure.HD;
  
  const locations = [
    { key: 'CT', structure: structure.CT, hasRear: true },
    { key: 'LT', structure: structure.LT, hasRear: true },
    { key: 'RT', structure: structure.RT, hasRear: true },
    { key: 'LA', structure: structure.LA, hasRear: false },
    { key: 'RA', structure: structure.RA, hasRear: false },
    { key: 'LL', structure: structure.LL, hasRear: false },
    { key: 'RL', structure: structure.RL, hasRear: false }
  ];
  
  for (const location of locations) {
    const proportion = location.structure / remainingStructure;
    const points = Math.floor(remainingPoints * proportion);
    
    if (location.hasRear) {
      // 70% front, 30% rear for torsos
      allocation[location.key] = {
        front: Math.floor(points * 0.7),
        rear: Math.floor(points * 0.3)
      };
    } else {
      // 100% front for arms and legs
      allocation[location.key] = {
        front: points,
        rear: 0
      };
    }
  }
  
  return allocation;
}

/**
 * Get armor type recommendations
 * @param tonnage Mech tonnage
 * @param currentArmorType Current armor type
 * @param techBase Tech base (Inner Sphere/Clan)
 * @returns Array of recommendations
 */
export function getArmorTypeRecommendations(
  tonnage: number,
  currentArmorType: ArmorType,
  techBase: 'Inner Sphere' | 'Clan'
): string[] {
  const recommendations: string[] = [];
  
  if (tonnage >= 60 && currentArmorType === 'Standard') {
    if (techBase === 'Clan') {
      recommendations.push('Consider Clan Ferro-Fibrous armor for better efficiency');
    } else {
      recommendations.push('Consider Ferro-Fibrous armor for better efficiency');
    }
  }
  
  if (tonnage >= 80 && currentArmorType === 'Standard') {
    recommendations.push('Heavy units benefit significantly from advanced armor types');
  }
  
  if (currentArmorType === 'Ferro-Fibrous' && techBase === 'Clan') {
    recommendations.push('Consider upgrading to Clan Ferro-Fibrous for better efficiency');
  }
  
  return recommendations;
}
