/**
 * Armor Calculations
 * 
 * Functions for calculating armor allocation and limits.
 * 
 * @spec openspec/specs/armor-system/spec.md
 */

import { ArmorTypeEnum, ArmorDefinition, getArmorDefinition } from '../../types/construction/ArmorType';
import { getStructurePoints } from '../../types/construction/InternalStructureType';
import { ceilToHalfTon } from '../physical/weightUtils';

/**
 * Maximum armor points for head location
 */
export const MAX_HEAD_ARMOR = 9;

/**
 * Calculate maximum armor for a location
 * 
 * Max armor = 2 × internal structure points (head = 9)
 * 
 * @param tonnage - Unit tonnage
 * @param location - Location name
 * @returns Maximum armor points
 */
export function getMaxArmorForLocation(tonnage: number, location: string): number {
  const normalizedLocation = location.toLowerCase();
  
  // Head is special - max 9
  if (normalizedLocation.includes('head')) {
    return MAX_HEAD_ARMOR;
  }
  
  const structurePoints = getStructurePoints(tonnage, location);
  return structurePoints * 2;
}

/**
 * Calculate maximum total armor points for a mech
 * 
 * @param tonnage - Unit tonnage
 * @returns Maximum total armor points
 */
export function getMaxTotalArmor(tonnage: number): number {
  return (
    MAX_HEAD_ARMOR +
    getMaxArmorForLocation(tonnage, 'centerTorso') +
    getMaxArmorForLocation(tonnage, 'leftTorso') +
    getMaxArmorForLocation(tonnage, 'rightTorso') +
    getMaxArmorForLocation(tonnage, 'leftArm') +
    getMaxArmorForLocation(tonnage, 'rightArm') +
    getMaxArmorForLocation(tonnage, 'leftLeg') +
    getMaxArmorForLocation(tonnage, 'rightLeg')
  );
}

/**
 * Calculate armor weight from points and armor type
 * 
 * @param armorPoints - Total armor points
 * @param armorType - Type of armor
 * @returns Armor weight in tons
 */
export function calculateArmorWeight(armorPoints: number, armorType: ArmorTypeEnum): number {
  const definition = getArmorDefinition(armorType);
  if (!definition) {
    return ceilToHalfTon(armorPoints / 16); // Default to standard
  }
  
  return ceilToHalfTon(armorPoints / definition.pointsPerTon);
}

/**
 * Calculate armor points from tonnage and armor type
 * 
 * @param tonnage - Armor tonnage
 * @param armorType - Type of armor
 * @returns Armor points available
 */
export function calculateArmorPoints(tonnage: number, armorType: ArmorTypeEnum): number {
  const definition = getArmorDefinition(armorType);
  if (!definition) {
    return Math.floor(tonnage * 16);
  }
  
  return Math.floor(tonnage * definition.pointsPerTon);
}

/**
 * Calculate critical slots required for armor
 * 
 * @param armorType - Type of armor
 * @returns Critical slots needed
 */
export function getArmorCriticalSlots(armorType: ArmorTypeEnum): number {
  const definition = getArmorDefinition(armorType);
  return definition?.criticalSlots ?? 0;
}

/**
 * Validate armor allocation for a location
 * 
 * @param tonnage - Unit tonnage
 * @param location - Location name
 * @param front - Front armor points
 * @param rear - Rear armor points (for torsos)
 * @returns Validation result
 */
export function validateLocationArmor(
  tonnage: number,
  location: string,
  front: number,
  rear: number = 0
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const maxArmor = getMaxArmorForLocation(tonnage, location);
  const total = front + rear;
  
  if (total > maxArmor) {
    errors.push(`${location} armor (${total}) exceeds maximum (${maxArmor})`);
  }
  
  if (front < 0) {
    errors.push(`${location} front armor cannot be negative`);
  }
  
  if (rear < 0) {
    errors.push(`${location} rear armor cannot be negative`);
  }
  
  // Rear armor rules
  const normalizedLocation = location.toLowerCase();
  if (normalizedLocation.includes('torso') && rear > 0) {
    // Rear armor is allowed for torso locations
  } else if (rear > 0) {
    errors.push(`${location} does not support rear armor`);
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Get recommended armor allocation percentages
 * @deprecated Use calculateOptimalArmorAllocation instead
 */
export function getRecommendedArmorDistribution(): Record<string, number> {
  return {
    head: 0.05,           // 5% - head
    centerTorso: 0.20,    // 20% - CT front
    centerTorsoRear: 0.05, // 5% - CT rear
    leftTorso: 0.12,      // 12% - LT front
    leftTorsoRear: 0.03,  // 3% - LT rear
    rightTorso: 0.12,     // 12% - RT front
    rightTorsoRear: 0.03, // 3% - RT rear
    leftArm: 0.10,        // 10% - LA
    rightArm: 0.10,       // 10% - RA
    leftLeg: 0.10,        // 10% - LL
    rightLeg: 0.10,       // 10% - RL
  };
}

/**
 * Armor allocation weights (normalized to 8.0 total)
 * 
 * These weights match MegaMekLab's auto-allocate distribution:
 * - Head: 2.0 (25%) - highest priority for pilot protection
 * - CT: 1.0 (12.5%) - engine/gyro protection
 * - LT/RT: 1.25 each (15.625% each) - side protection
 * - LA/RA: 0.5 each (6.25% each) - arms are expendable
 * - LL/RL: 0.75 each (9.375% each) - mobility
 */
export interface ArmorAllocationWeights {
  readonly head: number;
  readonly centerTorso: number;
  readonly sideTorso: number;
  readonly arms: number;
  readonly legs: number;
}

export const DEFAULT_ARMOR_WEIGHTS: ArmorAllocationWeights = {
  head: 2.0,        // 25% - pilot protection is critical
  centerTorso: 1.0, // 12.5% - engine/gyro
  sideTorso: 1.25,  // 15.625% each (LT/RT)
  arms: 0.5,        // 6.25% each (LA/RA)
  legs: 0.75,       // 9.375% each (LL/RL)
};

// Total weight = 2.0 + 1.0 + 1.25*2 + 0.5*2 + 0.75*2 = 8.0
const TOTAL_WEIGHT = 8.0;

/**
 * Complete armor allocation result
 */
export interface ArmorAllocationResult {
  head: number;
  centerTorsoFront: number;
  centerTorsoRear: number;
  leftTorsoFront: number;
  leftTorsoRear: number;
  rightTorsoFront: number;
  rightTorsoRear: number;
  leftArm: number;
  rightArm: number;
  leftLeg: number;
  rightLeg: number;
  totalAllocated: number;
  unallocated: number;
}

/**
 * Calculate optimal armor allocation matching MegaMekLab's distribution
 * 
 * Algorithm:
 * 1. At low points: use percentage-based weights (head gets 25%)
 * 2. At high points (head maxed): distribute proportionally to max capacity
 * 3. Enforce symmetry for paired locations (LT=RT, LA=RA, LL=RL)
 * 4. Split torso armor: ~75% front, ~25% rear for CT; ~82/18 for sides at high points
 * 5. Distribute remainder to maintain symmetry
 * 
 * Target distributions:
 * - 32 pts: Head=8, CT=4, LT/RT=5, LA/RA=2, LL/RL=3
 * - 160 pts: Head=9, CT=31, LT/RT=23, LA/RA=15, LL/RL=22
 * 
 * @param availablePoints - Total armor points to distribute
 * @param tonnage - Mech tonnage (determines max per location)
 * @param weights - Optional custom weights (defaults to MegaMekLab standard)
 * @returns Optimal armor allocation
 */
export function calculateOptimalArmorAllocation(
  availablePoints: number,
  tonnage: number,
  weights: ArmorAllocationWeights = DEFAULT_ARMOR_WEIGHTS
): ArmorAllocationResult {
  // Get max armor for each location
  const maxHead = MAX_HEAD_ARMOR;
  const maxCT = getMaxArmorForLocation(tonnage, 'centerTorso');
  const maxLT = getMaxArmorForLocation(tonnage, 'leftTorso');
  const maxRT = getMaxArmorForLocation(tonnage, 'rightTorso');
  const maxLA = getMaxArmorForLocation(tonnage, 'leftArm');
  const maxRA = getMaxArmorForLocation(tonnage, 'rightArm');
  const maxLL = getMaxArmorForLocation(tonnage, 'leftLeg');
  const maxRL = getMaxArmorForLocation(tonnage, 'rightLeg');
  
  // Total max body armor (excluding head)
  const maxBodyArmor = maxCT + maxLT + maxRT + maxLA + maxRA + maxLL + maxRL;
  
  // =========================================================================
  // PHASE 1: Calculate initial allocation
  // Use weights at low points, proportional to max at high points
  // =========================================================================
  
  // Calculate head first using weights
  let headArmor = Math.floor(availablePoints * weights.head / TOTAL_WEIGHT);
  headArmor = Math.min(headArmor, maxHead);
  
  // Remaining points for body
  const bodyPoints = availablePoints - headArmor;
  
  // Decide allocation strategy based on whether head is maxed
  let ctTotal: number, sideTorsoEach: number, armEach: number, legEach: number;
  
  if (headArmor >= maxHead) {
    // Head maxed: distribute body points proportionally to max capacity
    // Use floor for all to avoid overallocation, remainder handled in phase 3
    ctTotal = Math.floor(bodyPoints * maxCT / maxBodyArmor);
    sideTorsoEach = Math.floor(bodyPoints * maxLT / maxBodyArmor);
    armEach = Math.floor(bodyPoints * maxLA / maxBodyArmor);
    legEach = Math.floor(bodyPoints * maxLL / maxBodyArmor);
  } else {
    // Low points: use percentage weights
    ctTotal = Math.floor(availablePoints * weights.centerTorso / TOTAL_WEIGHT);
    sideTorsoEach = Math.floor(availablePoints * weights.sideTorso / TOTAL_WEIGHT);
    armEach = Math.floor(availablePoints * weights.arms / TOTAL_WEIGHT);
    legEach = Math.floor(availablePoints * weights.legs / TOTAL_WEIGHT);
  }
  
  // Cap at maximums
  ctTotal = Math.min(ctTotal, maxCT);
  sideTorsoEach = Math.min(sideTorsoEach, maxLT); // LT and RT have same max
  armEach = Math.min(armEach, maxLA); // LA and RA have same max
  legEach = Math.min(legEach, maxLL); // LL and RL have same max
  
  // =========================================================================
  // PHASE 2: Split torso armor between front and rear
  // CT: 75% front, 25% rear
  // Side torsos: 100% front when limited, add rear when more points available
  // =========================================================================
  
  // CT split: rear is approximately ctTotal/4.5 rounded up
  // This matches MegaMekLab: 29→7, 31→7, 4→1
  let ctRear = Math.ceil(ctTotal / 4.5);
  let ctFront = ctTotal - ctRear;
  
  // Side torsos: all front at low point counts, start adding rear above ~40% capacity
  let ltFront = sideTorsoEach;
  let ltRear = 0;
  let rtFront = sideTorsoEach;
  let rtRear = 0;
  
  // Add rear armor to side torsos if we have decent coverage (>40% of max)
  if (sideTorsoEach > maxLT * 0.4) {
    const rearRatio = 0.22; // ~22% goes to rear (18+5 / 23 = 0.217)
    const rearPoints = Math.round(sideTorsoEach * rearRatio);
    ltRear = rearPoints;
    rtRear = rearPoints;
    ltFront = sideTorsoEach - rearPoints;
    rtFront = sideTorsoEach - rearPoints;
  }
  
  // Arms and legs are simple (no front/rear split)
  let laArmor = armEach;
  let raArmor = armEach;
  let llArmor = legEach;
  let rlArmor = legEach;
  
  // =========================================================================
  // PHASE 3: Calculate remainder and distribute
  // Priority: Head > CT front > Side Torsos (symmetric) > Legs (symmetric) > Arms (symmetric) > CT rear
  // MegaMekLab prioritizes torsos over limbs
  // =========================================================================
  
  let allocated = headArmor + ctFront + ctRear + ltFront + ltRear + 
                  rtFront + rtRear + laArmor + raArmor + llArmor + rlArmor;
  let remaining = availablePoints - allocated;
  
  // Distribute remaining points to achieve target distribution
  // Use round-robin with symmetry enforcement
  let maxIterations = remaining + 10; // Safety limit
  
  while (remaining > 0 && maxIterations > 0) {
    maxIterations--;
    let distributed = false;
    
    // Priority 1: Head (if not maxed)
    if (remaining >= 1 && headArmor < maxHead) {
      headArmor++;
      remaining--;
      distributed = true;
      continue;
    }
    
    // Priority 2: Side torsos front (symmetric, need 2 points)
    if (remaining >= 2 && ltFront < maxLT - ltRear && rtFront < maxRT - rtRear) {
      ltFront++;
      rtFront++;
      remaining -= 2;
      distributed = true;
      continue;
    }
    
    // Priority 3: Legs (symmetric, need 2 points)
    if (remaining >= 2 && llArmor < maxLL && rlArmor < maxRL) {
      llArmor++;
      rlArmor++;
      remaining -= 2;
      distributed = true;
      continue;
    }
    
    // Priority 4: Arms (symmetric, need 2 points)
    if (remaining >= 2 && laArmor < maxLA && raArmor < maxRA) {
      laArmor++;
      raArmor++;
      remaining -= 2;
      distributed = true;
      continue;
    }
    
    // Priority 5: Side torsos rear (symmetric, need 2 points)
    if (remaining >= 2 && ltRear < maxLT - ltFront && rtRear < maxRT - rtFront) {
      ltRear++;
      rtRear++;
      remaining -= 2;
      distributed = true;
      continue;
    }
    
    // Priority 6: CT front (single location, takes odd points)
    if (remaining >= 1 && ctFront < maxCT - ctRear) {
      ctFront++;
      remaining--;
      distributed = true;
      continue;
    }
    
    // Priority 7: CT rear (single location)
    if (remaining >= 1 && ctRear < maxCT - ctFront) {
      ctRear++;
      remaining--;
      distributed = true;
      continue;
    }
    
    // If we have 1 point left and can't add to symmetric pairs
    if (remaining === 1) {
      // Try CT front, CT rear, head first (single locations)
      if (ctFront < maxCT - ctRear) {
        ctFront++;
        remaining--;
        distributed = true;
      } else if (ctRear < maxCT - ctFront) {
        ctRear++;
        remaining--;
        distributed = true;
      } else if (headArmor < maxHead) {
        headArmor++;
        remaining--;
        distributed = true;
      } 
      // As last resort, break symmetry and add to one side
      else if (llArmor < maxLL) {
        llArmor++;
        remaining--;
        distributed = true;
      } else if (rlArmor < maxRL) {
        rlArmor++;
        remaining--;
        distributed = true;
      } else if (ltFront < maxLT - ltRear) {
        ltFront++;
        remaining--;
        distributed = true;
      } else if (rtFront < maxRT - rtRear) {
        rtFront++;
        remaining--;
        distributed = true;
      } else if (laArmor < maxLA) {
        laArmor++;
        remaining--;
        distributed = true;
      } else if (raArmor < maxRA) {
        raArmor++;
        remaining--;
        distributed = true;
      } else if (ltRear < maxLT - ltFront) {
        ltRear++;
        remaining--;
        distributed = true;
      } else if (rtRear < maxRT - rtFront) {
        rtRear++;
        remaining--;
        distributed = true;
      }
    }
    
    // If nothing could be distributed, we're done
    if (!distributed) break;
  }
  
  // Final allocation calculation
  allocated = headArmor + ctFront + ctRear + ltFront + ltRear + 
              rtFront + rtRear + laArmor + raArmor + llArmor + rlArmor;
  
  return createAllocationResult(
    headArmor, ctFront, ctRear, ltFront, ltRear, rtFront, rtRear,
    laArmor, raArmor, llArmor, rlArmor, allocated, availablePoints - allocated
  );
}

/**
 * Helper to create allocation result object
 */
function createAllocationResult(
  head: number, ctFront: number, ctRear: number,
  ltFront: number, ltRear: number, rtFront: number, rtRear: number,
  laArmor: number, raArmor: number, llArmor: number, rlArmor: number,
  totalAllocated: number, unallocated: number
): ArmorAllocationResult {
  return {
    head,
    centerTorsoFront: ctFront,
    centerTorsoRear: ctRear,
    leftTorsoFront: ltFront,
    leftTorsoRear: ltRear,
    rightTorsoFront: rtFront,
    rightTorsoRear: rtRear,
    leftArm: laArmor,
    rightArm: raArmor,
    leftLeg: llArmor,
    rightLeg: rlArmor,
    totalAllocated,
    unallocated,
  };
}

/**
 * Calculate armor cost
 * 
 * @param armorPoints - Total armor points
 * @param armorType - Type of armor
 * @returns Cost in C-Bills
 */
export function calculateArmorCost(armorPoints: number, armorType: ArmorTypeEnum): number {
  const definition = getArmorDefinition(armorType);
  const baseCost = armorPoints * 10000; // Base 10000 C-Bills per point
  return baseCost * (definition?.costMultiplier ?? 1);
}

