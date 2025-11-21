import { EditableUnit } from '../types/editor';
import { ArmorType } from './armorTypes';

type ArmorWeightSource = Pick<ArmorType, 'pointsPerTon'>;
import { getMaxArmorPointsForLocation } from './internalStructureTable';

// Maximum armor formulas based on official BattleTech internal structure table
export const ARMOR_MAX_FORMULAS = {
  head: () => 9, // Always 9 for head
  centerTorso: (tonnage: number) => getMaxArmorPointsForLocation(tonnage, 'CT'),
  leftTorso: (tonnage: number) => getMaxArmorPointsForLocation(tonnage, 'LT'),
  rightTorso: (tonnage: number) => getMaxArmorPointsForLocation(tonnage, 'RT'),
  leftArm: (tonnage: number) => getMaxArmorPointsForLocation(tonnage, 'LA'),
  rightArm: (tonnage: number) => getMaxArmorPointsForLocation(tonnage, 'RA'),
  leftLeg: (tonnage: number) => getMaxArmorPointsForLocation(tonnage, 'LL'),
  rightLeg: (tonnage: number) => getMaxArmorPointsForLocation(tonnage, 'RL'),
  // Special locations for non-biped mechs
  centerLeg: (tonnage: number) => getMaxArmorPointsForLocation(tonnage, 'LL'), // Use leg as reference for tripods
};

// Get maximum armor points for a location
export function getMaxArmorForLocation(location: string, tonnage: number): number {
  const formula = ARMOR_MAX_FORMULAS[location as keyof typeof ARMOR_MAX_FORMULAS];
  return formula ? formula(tonnage) : 0;
}

// Calculate total armor weight based on points and armor type
export function calculateArmorWeight(totalPoints: number, armorType: ArmorWeightSource): number {
  return Math.ceil(totalPoints / armorType.pointsPerTon);
}

// Get armor efficiency (points per ton for different armor types)
export function getArmorEfficiency(armorType: string): number {
  const efficiencies: { [key: string]: number } = {
    'standard': 16,
    'ferro_fibrous': 17.92, // 12% more efficient
    'ferro_fibrous_clan': 17.92,
    'light_ferro_fibrous': 16.96, // 6% more efficient
    'heavy_ferro_fibrous': 19.2, // 20% more efficient
    'stealth': 16,
    'reactive': 14.4, // 10% less efficient
    'reflective': 12.8, // 20% less efficient
    'hardened': 8, // 50% less efficient
  };
  return efficiencies[armorType] || 16;
}

// Auto-allocation patterns
export interface AllocationPattern {
  name: string;
  description: string;
  allocate: (maxPoints: { [location: string]: number }) => { [location: string]: { front: number; rear?: number } };
}

export const ALLOCATION_PATTERNS: AllocationPattern[] = [
  {
    name: 'Maximum Protection',
    description: 'Allocates maximum armor to all locations',
    allocate: (maxPoints) => {
      const result: { [location: string]: { front: number; rear?: number } } = {};
      
      Object.entries(maxPoints).forEach(([location, max]) => {
        if (['centerTorso', 'leftTorso', 'rightTorso'].includes(location)) {
          // Torsos have rear armor - typically 50/50 split
          const front = Math.ceil(max * 0.667); // 2/3 front
          const rear = Math.floor(max * 0.333); // 1/3 rear
          result[location] = { front, rear };
        } else {
          result[location] = { front: max };
        }
      });
      
      return result;
    }
  },
  {
    name: 'Balanced Front/Rear',
    description: 'Balances armor between front and rear for torsos',
    allocate: (maxPoints) => {
      const result: { [location: string]: { front: number; rear?: number } } = {};
      
      Object.entries(maxPoints).forEach(([location, max]) => {
        if (['centerTorso', 'leftTorso', 'rightTorso'].includes(location)) {
          const front = Math.ceil(max * 0.6);
          const rear = Math.floor(max * 0.4);
          result[location] = { front, rear };
        } else {
          result[location] = { front: max };
        }
      });
      
      return result;
    }
  },
  {
    name: 'Striker Pattern',
    description: 'Light armor focused on speed - minimum rear armor',
    allocate: (maxPoints) => {
      const result: { [location: string]: { front: number; rear?: number } } = {};
      
      Object.entries(maxPoints).forEach(([location, max]) => {
        if (location === 'head') {
          result[location] = { front: Math.min(6, max) }; // Light head armor
        } else if (['centerTorso', 'leftTorso', 'rightTorso'].includes(location)) {
          const front = Math.ceil(max * 0.5);
          const rear = Math.floor(max * 0.15); // Minimal rear
          result[location] = { front, rear };
        } else {
          result[location] = { front: Math.ceil(max * 0.6) }; // 60% of max
        }
      });
      
      return result;
    }
  },
  {
    name: 'Brawler Pattern',
    description: 'Heavy armor for close combat',
    allocate: (maxPoints) => {
      const result: { [location: string]: { front: number; rear?: number } } = {};
      
      Object.entries(maxPoints).forEach(([location, max]) => {
        if (location === 'head') {
          result[location] = { front: max }; // Max head armor
        } else if (['centerTorso', 'leftTorso', 'rightTorso'].includes(location)) {
          const front = Math.ceil(max * 0.7);
          const rear = Math.floor(max * 0.3);
          result[location] = { front, rear };
        } else {
          result[location] = { front: Math.ceil(max * 0.9) }; // 90% of max
        }
      });
      
      return result;
    }
  },
  {
    name: 'Sniper Pattern',
    description: 'Front-heavy armor for long-range combat',
    allocate: (maxPoints) => {
      const result: { [location: string]: { front: number; rear?: number } } = {};
      
      Object.entries(maxPoints).forEach(([location, max]) => {
        if (['centerTorso', 'leftTorso', 'rightTorso'].includes(location)) {
          const front = Math.ceil(max * 0.8); // 80% front
          const rear = Math.floor(max * 0.2); // 20% rear
          result[location] = { front, rear };
        } else {
          result[location] = { front: Math.ceil(max * 0.7) };
        }
      });
      
      return result;
    }
  }
];

// Validate armor allocation
export function validateArmorAllocation(
  unit: EditableUnit,
  allocation: { [location: string]: { front: number; rear?: number } }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check each location
  Object.entries(allocation).forEach(([location, armor]) => {
    const maxArmor = getMaxArmorForLocation(location, unit.mass);
    const totalLocationArmor = armor.front + (armor.rear || 0);
    
    if (totalLocationArmor > maxArmor) {
      errors.push(`${location}: Total armor (${totalLocationArmor}) exceeds maximum (${maxArmor})`);
    }
    
    if (armor.front < 0 || (armor.rear !== undefined && armor.rear < 0)) {
      errors.push(`${location}: Armor values cannot be negative`);
    }
  });
  
  // Check total weight
  const totalArmorPoints = Object.values(allocation).reduce((total, armor) => {
    return total + armor.front + (armor.rear || 0);
  }, 0);
  
  const armorType = unit.armorAllocation?.head?.type || { name: 'Standard', pointsPerTon: 16 } as ArmorType;
  const armorWeight = calculateArmorWeight(totalArmorPoints, armorType);
  
  // This would need to check against remaining tonnage
  // For now, just return the errors found
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Calculate remaining armor points that can be allocated
export function calculateRemainingArmorPoints(
  unit: EditableUnit,
  currentAllocation: { [location: string]: { front: number; rear?: number } }
): number {
  const armorType = unit.armorAllocation?.head?.type || { name: 'Standard', pointsPerTon: 16 } as ArmorType;
  
  // Calculate current total
  const currentTotal = Object.values(currentAllocation).reduce((total, armor) => {
    return total + armor.front + (armor.rear || 0);
  }, 0);
  
  // Calculate weight used
  const currentWeight = calculateArmorWeight(currentTotal, armorType);
  
  // Get remaining tonnage (simplified - would need full weight calculation)
  const remainingTonnage = unit.mass - currentWeight; // Very simplified
  
  // Calculate how many more points we can add
  const additionalPoints = Math.floor(remainingTonnage * armorType.pointsPerTon);
  
  return Math.max(0, additionalPoints);
}

// Distribute armor points across locations proportionally
export function distributeArmorProportionally(
  totalPoints: number,
  locations: string[],
  tonnage: number,
  pattern: 'equal' | 'proportional' = 'proportional'
): { [location: string]: { front: number; rear?: number } } {
  const result: { [location: string]: { front: number; rear?: number } } = {};
  
  if (pattern === 'equal') {
    const pointsPerLocation = Math.floor(totalPoints / locations.length);
    locations.forEach(location => {
      result[location] = { front: pointsPerLocation };
    });
  } else {
    // Proportional based on max armor
    const maxPoints: { [location: string]: number } = {};
    let totalMax = 0;
    
    locations.forEach(location => {
      const max = getMaxArmorForLocation(location, tonnage);
      maxPoints[location] = max;
      totalMax += max;
    });
    
    // Distribute proportionally
    locations.forEach(location => {
      const proportion = maxPoints[location] / totalMax;
      const locationPoints = Math.floor(totalPoints * proportion);
      
      if (['centerTorso', 'leftTorso', 'rightTorso'].includes(location)) {
        const front = Math.ceil(locationPoints * 0.667);
        const rear = Math.floor(locationPoints * 0.333);
        result[location] = { front, rear };
      } else {
        result[location] = { front: locationPoints };
      }
    });
  }
  
  return result;
}

// Helper to get total armor points from allocation
export function getTotalArmorPoints(allocation: { [location: string]: { front: number; rear?: number } }): number {
  return Object.values(allocation).reduce((total, armor) => {
    return total + armor.front + (armor.rear || 0);
  }, 0);
}

// Helper to check if location has rear armor
export function hasRearArmor(location: string): boolean {
  return ['centerTorso', 'leftTorso', 'rightTorso'].includes(location);
}
