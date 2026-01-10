/**
 * Armor Calculations
 * 
 * Functions for calculating armor allocation and limits.
 * 
 * @spec openspec/specs/armor-system/spec.md
 */

import { ArmorTypeEnum, getArmorDefinition } from '../../types/construction/ArmorType';
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
 * Simplified 3-phase algorithm:
 * 1. Initial spread: Head gets 25%, body proportional to max capacity
 * 2. Symmetric remainder: Distribute to symmetric pairs first (torsos, legs, arms)
 * 3. Apply splits: Front/rear for torsos
 * 
 * Target distributions (50-ton mech):
 * - 32 pts: Head=8, CT=3+1, LT/RT=5, LA/RA=2, LL/RL=3
 * - 152 pts: Head=9, CT=22+7, LT/RT=17+5, LA/RA=14, LL/RL=21
 * - 169 pts: Head=9, CT=24+8, LT/RT=18+6, LA/RA=16, LL/RL=24
 * 
 * @param availablePoints - Total armor points to distribute
 * @param tonnage - Mech tonnage (determines max per location)
 * @returns Optimal armor allocation
 */
export function calculateOptimalArmorAllocation(
  availablePoints: number,
  tonnage: number
): ArmorAllocationResult {
  // Get max armor for each location
  const maxHead = MAX_HEAD_ARMOR;
  const maxCT = getMaxArmorForLocation(tonnage, 'centerTorso');
  const maxLT = getMaxArmorForLocation(tonnage, 'leftTorso');
  const maxLA = getMaxArmorForLocation(tonnage, 'leftArm');
  const maxLL = getMaxArmorForLocation(tonnage, 'leftLeg');
  
  const maxBodyArmor = maxCT + (maxLT * 2) + (maxLA * 2) + (maxLL * 2);
  const maxTotalArmor = maxHead + maxBodyArmor;
  
  // Cap at max
  const points = Math.min(availablePoints, maxTotalArmor);
  
  // ===========================================================================
  // PHASE 1: Initial proportional spread
  // ===========================================================================
  
  // Head gets ~25% weight, capped at 9
  let head = Math.min(Math.floor(points * 0.25), maxHead);
  
  // Body gets the rest, distributed proportionally to max capacity
  const bodyPoints = points - head;
  
  let ct = Math.floor(bodyPoints * maxCT / maxBodyArmor);
  let lt = Math.floor(bodyPoints * maxLT / maxBodyArmor);
  let rt = lt; // Symmetric
  let la = Math.floor(bodyPoints * maxLA / maxBodyArmor);
  let ra = la; // Symmetric
  let ll = Math.floor(bodyPoints * maxLL / maxBodyArmor);
  let rl = ll; // Symmetric
  
  // ===========================================================================
  // PHASE 2: Symmetric remainder distribution
  // ===========================================================================
  
  let allocated = head + ct + lt + rt + la + ra + ll + rl;
  let remaining = points - allocated;
  
  // Simple priority loop - symmetric pairs first
  while (remaining > 0) {
    // Try symmetric pairs (need 2 points)
    if (remaining >= 2 && lt < maxLT && rt < maxLT) {
      lt++; rt++; remaining -= 2; continue;
    }
    if (remaining >= 2 && ll < maxLL && rl < maxLL) {
      ll++; rl++; remaining -= 2; continue;
    }
    if (remaining >= 2 && la < maxLA && ra < maxLA) {
      la++; ra++; remaining -= 2; continue;
    }
    
    // Single locations for odd remainder
    if (remaining >= 1 && ct < maxCT) {
      ct++; remaining--; continue;
    }
    if (remaining >= 1 && head < maxHead) {
      head++; remaining--; continue;
    }
    
    // Safety: if nothing can be allocated, break
    break;
  }
  
  // ===========================================================================
  // PHASE 3: Apply front/rear splits to torsos (75% front / 25% rear)
  // ===========================================================================
  
  // Standard BattleTech balanced split: 75% front, 25% rear
  const REAR_RATIO = 0.25;
  
  // CT: 25% rear
  const ctRear = Math.round(ct * REAR_RATIO);
  const ctFront = ct - ctRear;
  
  // Side torsos: 25% rear if > 40% capacity, otherwise all front
  let ltRear = 0, ltFront = lt;
  let rtRear = 0, rtFront = rt;
  
  if (lt > maxLT * 0.4) {
    ltRear = Math.round(lt * REAR_RATIO);
    ltFront = lt - ltRear;
    rtRear = ltRear;
    rtFront = rt - rtRear;
  }
  
  allocated = head + ctFront + ctRear + ltFront + ltRear + rtFront + rtRear + la + ra + ll + rl;
  
  return createAllocationResult(
    head, ctFront, ctRear, ltFront, ltRear, rtFront, rtRear,
    la, ra, ll, rl, allocated, availablePoints - allocated
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

/**
 * Standard front/rear armor distribution ratio
 * Based on BattleTech conventions: 75% front, 25% rear
 */
export const FRONT_ARMOR_RATIO = 0.75;
export const REAR_ARMOR_RATIO = 0.25;

/**
 * Get expected armor capacity for front and rear based on standard distribution
 *
 * Uses the 75/25 front/rear split as the baseline for calculating
 * what the "expected" max is for each side. This allows armor status
 * colors to show green when at expected capacity, even if front has
 * more points than rear.
 *
 * @param totalMaxArmor - Total max armor for the location (front + rear)
 * @returns Expected max for front and rear
 */
export function getExpectedArmorCapacity(totalMaxArmor: number): { front: number; rear: number } {
  return {
    front: Math.round(totalMaxArmor * FRONT_ARMOR_RATIO),
    rear: Math.round(totalMaxArmor * REAR_ARMOR_RATIO),
  };
}

/**
 * Calculate armor fill percentage based on expected capacity
 *
 * Returns a percentage that can exceed 100% if the armor exceeds
 * the expected allocation (e.g., heavily front-armored).
 *
 * @param current - Current armor points
 * @param expectedMax - Expected max based on front/rear ratio
 * @returns Fill percentage (can exceed 100)
 */
export function getArmorFillPercent(current: number, expectedMax: number): number {
  if (expectedMax <= 0) return 0;
  return (current / expectedMax) * 100;
}

