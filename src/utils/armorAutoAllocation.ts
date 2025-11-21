import { MechLocation, MECH_LOCATIONS } from '../types/editor';

export interface ArmorAllocation {
  location: MechLocation;
  front: number;
  rear: number;
}

export interface AutoAllocationOptions {
  distributeByIS: boolean; // Distribute by internal structure
  maximizeHead: boolean;   // Put max armor on head
  balanceTorsos: boolean;  // Balance front/rear torsos
}

export interface InternalStructurePoints {
  [key: string]: number;
}

// Standard internal structure for different mech weights using official BattleTech table
export const getInternalStructurePoints = (tonnage: number): InternalStructurePoints => {
  // Import official BattleTech internal structure table
  const { getInternalStructurePoints: getOfficialStructure } = require('./internalStructureTable');
  const structure = getOfficialStructure(tonnage);
  
  return {
    [MECH_LOCATIONS.HEAD]: structure.HD,
    [MECH_LOCATIONS.CENTER_TORSO]: structure.CT,
    [MECH_LOCATIONS.LEFT_TORSO]: structure.LT,
    [MECH_LOCATIONS.RIGHT_TORSO]: structure.RT,
    [MECH_LOCATIONS.LEFT_ARM]: structure.LA,
    [MECH_LOCATIONS.RIGHT_ARM]: structure.RA,
    [MECH_LOCATIONS.LEFT_LEG]: structure.LL,
    [MECH_LOCATIONS.RIGHT_LEG]: structure.RL
  };
};

export const getMaxArmorPoints = (tonnage: number): InternalStructurePoints => {
  const is = getInternalStructurePoints(tonnage);
  
  return {
    [MECH_LOCATIONS.HEAD]: 9, // Head always limited to 9
    [MECH_LOCATIONS.CENTER_TORSO]: is[MECH_LOCATIONS.CENTER_TORSO] * 2,
    [MECH_LOCATIONS.LEFT_TORSO]: is[MECH_LOCATIONS.LEFT_TORSO] * 2,
    [MECH_LOCATIONS.RIGHT_TORSO]: is[MECH_LOCATIONS.RIGHT_TORSO] * 2,
    [MECH_LOCATIONS.LEFT_ARM]: is[MECH_LOCATIONS.LEFT_ARM] * 2,
    [MECH_LOCATIONS.RIGHT_ARM]: is[MECH_LOCATIONS.RIGHT_ARM] * 2,
    [MECH_LOCATIONS.LEFT_LEG]: is[MECH_LOCATIONS.LEFT_LEG] * 2,
    [MECH_LOCATIONS.RIGHT_LEG]: is[MECH_LOCATIONS.RIGHT_LEG] * 2
  };
};

/**
 * Auto-allocate armor points following MegaMekLab's algorithm
 * 1. Head gets maximum possible armor (up to 9)
 * 2. Remaining points distributed by internal structure ratio
 * 3. Torso locations get 75% front, 25% rear split
 */
export const autoAllocateArmor = (
  tonnage: number,
  totalArmorPoints: number,
  options: AutoAllocationOptions = {
    distributeByIS: true,
    maximizeHead: true,
    balanceTorsos: true
  }
): ArmorAllocation[] => {
  const internalStructure = getInternalStructurePoints(tonnage);
  const maxArmor = getMaxArmorPoints(tonnage);
  
  let remainingPoints = totalArmorPoints;
  const allocation: ArmorAllocation[] = [];
  
  // Step 1: Maximize head armor first
  const headArmor = options.maximizeHead 
    ? Math.min(maxArmor[MECH_LOCATIONS.HEAD], remainingPoints)
    : 0;
  
  allocation.push({
    location: MECH_LOCATIONS.HEAD,
    front: headArmor,
    rear: 0
  });
  remainingPoints -= headArmor;
  
  // Step 2: Calculate total internal structure for remaining locations
  const remainingLocations = [
    MECH_LOCATIONS.CENTER_TORSO,
    MECH_LOCATIONS.LEFT_TORSO,
    MECH_LOCATIONS.RIGHT_TORSO,
    MECH_LOCATIONS.LEFT_ARM,
    MECH_LOCATIONS.RIGHT_ARM,
    MECH_LOCATIONS.LEFT_LEG,
    MECH_LOCATIONS.RIGHT_LEG
  ];
  
  const totalRemainingIS = remainingLocations.reduce(
    (sum, loc) => sum + internalStructure[loc], 0
  );
  
  // Step 3: Distribute remaining points by IS ratio
  for (const location of remainingLocations) {
    const isRatio = internalStructure[location] / totalRemainingIS;
    const targetArmor = Math.floor(remainingPoints * isRatio);
    const maxLocationArmor = maxArmor[location];
    const actualArmor = Math.min(targetArmor, maxLocationArmor);
    
    // For torso locations, split front/rear if balancing is enabled
    if (options.balanceTorsos && isTorsoLocation(location)) {
      const frontArmor = Math.ceil(actualArmor * 0.75);
      const rearArmor = actualArmor - frontArmor;
      
      allocation.push({
        location,
        front: frontArmor,
        rear: rearArmor
      });
    } else {
      allocation.push({
        location,
        front: actualArmor,
        rear: 0
      });
    }
  }
  
  return allocation;
};

/**
 * Validate armor allocation against construction rules
 */
export const validateArmorAllocation = (
  tonnage: number,
  allocation: ArmorAllocation[]
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const maxArmor = getMaxArmorPoints(tonnage);
  
  let totalArmor = 0;
  
  for (const alloc of allocation) {
    const totalLocationArmor = alloc.front + alloc.rear;
    totalArmor += totalLocationArmor;
    
    // Check maximum armor per location
    if (totalLocationArmor > maxArmor[alloc.location]) {
      errors.push(
        `${alloc.location} armor (${totalLocationArmor}) exceeds maximum (${maxArmor[alloc.location]})`
      );
    }
    
    // Check that non-torso locations don't have rear armor
    if (!isTorsoLocation(alloc.location) && alloc.rear > 0) {
      errors.push(`${alloc.location} cannot have rear armor`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Calculate armor tonnage based on armor type
 */
export const calculateArmorTonnage = (
  totalArmorPoints: number,
  armorType: 'Standard' | 'Ferro-Fibrous' | 'Light Ferro-Fibrous' | 'Heavy Ferro-Fibrous',
  techBase: 'IS' | 'Clan' = 'IS'
): number => {
  const armorPointsPerTon = getArmorPointsPerTon(armorType, techBase);
  return Math.ceil(totalArmorPoints / armorPointsPerTon);
};

export const getArmorPointsPerTon = (
  armorType: string,
  techBase: 'IS' | 'Clan' = 'IS'
): number => {
  const armorValues: Record<string, { IS: number; Clan: number }> = {
    'Standard': { IS: 16, Clan: 16 },
    'Ferro-Fibrous': { IS: 17.92, Clan: 20 },
    'Light Ferro-Fibrous': { IS: 19.2, Clan: 19.2 },
    'Heavy Ferro-Fibrous': { IS: 16.64, Clan: 16.64 }
  };
  
  return armorValues[armorType]?.[techBase] ?? 16;
};

const isTorsoLocation = (location: MechLocation): boolean => {
  const torsoLocations = [
    MECH_LOCATIONS.CENTER_TORSO,
    MECH_LOCATIONS.LEFT_TORSO,
    MECH_LOCATIONS.RIGHT_TORSO
  ] as MechLocation[];
  return torsoLocations.includes(location);
};

/**
 * Redistribute armor to make room for equipment
 */
export const redistributeArmor = (
  currentAllocation: ArmorAllocation[],
  tonnage: number,
  targetReduction: number
): ArmorAllocation[] => {
  const newAllocation = [...currentAllocation];
  let pointsToRemove = targetReduction;
  
  // Remove armor proportionally, avoiding head if possible
  const nonHeadLocations = newAllocation.filter(
    alloc => alloc.location !== MECH_LOCATIONS.HEAD
  );
  
  for (const alloc of nonHeadLocations) {
    if (pointsToRemove <= 0) break;
    
    const currentTotal = alloc.front + alloc.rear;
    const reduction = Math.min(pointsToRemove, Math.floor(currentTotal * 0.1));
    
    if (reduction > 0) {
      // Reduce front armor first
      const frontReduction = Math.min(reduction, alloc.front);
      alloc.front -= frontReduction;
      
      const remainingReduction = reduction - frontReduction;
      if (remainingReduction > 0) {
        alloc.rear -= Math.min(remainingReduction, alloc.rear);
      }
      
      pointsToRemove -= reduction;
    }
  }
  
  return newAllocation;
};
