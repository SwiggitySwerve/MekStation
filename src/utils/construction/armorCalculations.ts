/**
 * Armor Calculations
 *
 * Functions for calculating armor allocation and limits.
 *
 * @spec openspec/specs/armor-system/spec.md
 */

import {
  MechLocation,
  getLocationsForConfig,
} from '@/types/construction/MechConfigurationSystem';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';
import {
  ARMOR_RATIOS,
  getExpectedArmorCapacity,
} from '@/utils/armor/armorRatios';

import {
  ArmorTypeEnum,
  getArmorDefinition,
} from '../../types/construction/ArmorType';
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
export function getMaxArmorForLocation(
  tonnage: number,
  location: string,
): number {
  const normalizedLocation = location.toLowerCase();

  // Head is special - max 9
  if (normalizedLocation.includes('head')) {
    return MAX_HEAD_ARMOR;
  }

  const structurePoints = getStructurePoints(tonnage, location);
  return structurePoints * 2;
}

/**
 * Calculate maximum total armor points for a mech based on configuration
 *
 * @param tonnage - Unit tonnage
 * @param configuration - Mech configuration (Biped, Quad, Tripod, LAM, QuadVee)
 * @returns Maximum total armor points
 */
export function getMaxTotalArmor(
  tonnage: number,
  configuration?: MechConfiguration,
): number {
  const config = configuration ?? MechConfiguration.BIPED;
  const locations = getLocationsForConfig(config);

  let total = 0;
  for (const location of locations) {
    total += getMaxArmorForLocation(tonnage, location);
  }

  return total;
}

/**
 * Calculate armor weight from points and armor type
 *
 * @param armorPoints - Total armor points
 * @param armorType - Type of armor
 * @returns Armor weight in tons
 */
export function calculateArmorWeight(
  armorPoints: number,
  armorType: ArmorTypeEnum,
): number {
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
export function calculateArmorPoints(
  tonnage: number,
  armorType: ArmorTypeEnum,
): number {
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
  rear: number = 0,
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
    head: 0.05, // 5% - head
    centerTorso: 0.2, // 20% - CT front
    centerTorsoRear: 0.05, // 5% - CT rear
    leftTorso: 0.12, // 12% - LT front
    leftTorsoRear: 0.03, // 3% - LT rear
    rightTorso: 0.12, // 12% - RT front
    rightTorsoRear: 0.03, // 3% - RT rear
    leftArm: 0.1, // 10% - LA
    rightArm: 0.1, // 10% - RA
    leftLeg: 0.1, // 10% - LL
    rightLeg: 0.1, // 10% - RL
  };
}

/**
 * Complete armor allocation result - supports all mech configurations
 */
export interface ArmorAllocationResult {
  // Universal locations
  head: number;
  centerTorsoFront: number;
  centerTorsoRear: number;
  leftTorsoFront: number;
  leftTorsoRear: number;
  rightTorsoFront: number;
  rightTorsoRear: number;
  // Biped/Tripod/LAM locations
  leftArm: number;
  rightArm: number;
  leftLeg: number;
  rightLeg: number;
  // Tripod-specific
  centerLeg: number;
  // Quad/QuadVee-specific
  frontLeftLeg: number;
  frontRightLeg: number;
  rearLeftLeg: number;
  rearRightLeg: number;
  // Totals
  totalAllocated: number;
  unallocated: number;
}

/**
 * Calculate optimal armor allocation for any mech configuration
 *
 * Simplified 3-phase algorithm:
 * 1. Initial spread: Head gets 25%, body proportional to max capacity
 * 2. Symmetric remainder: Distribute to symmetric pairs first
 * 3. Apply splits: Front/rear for torsos (75% front / 25% rear)
 *
 * @param availablePoints - Total armor points to distribute
 * @param tonnage - Mech tonnage (determines max per location)
 * @param configuration - Mech configuration (defaults to Biped)
 * @returns Optimal armor allocation for the configuration
 */
export function calculateOptimalArmorAllocation(
  availablePoints: number,
  tonnage: number,
  configuration?: MechConfiguration,
): ArmorAllocationResult {
  const config = configuration ?? MechConfiguration.BIPED;

  if (
    config === MechConfiguration.QUAD ||
    config === MechConfiguration.QUADVEE
  ) {
    return calculateQuadArmorAllocation(availablePoints, tonnage);
  } else if (config === MechConfiguration.TRIPOD) {
    return calculateTripodArmorAllocation(availablePoints, tonnage);
  } else {
    return calculateBipedArmorAllocation(availablePoints, tonnage);
  }
}

function calculateBipedArmorAllocation(
  availablePoints: number,
  tonnage: number,
): ArmorAllocationResult {
  const maxHead = MAX_HEAD_ARMOR;
  const maxCT = getMaxArmorForLocation(tonnage, 'centerTorso');
  const maxLT = getMaxArmorForLocation(tonnage, 'leftTorso');
  const maxLA = getMaxArmorForLocation(tonnage, 'leftArm');
  const maxLL = getMaxArmorForLocation(tonnage, 'leftLeg');

  const maxBodyArmor = maxCT + maxLT * 2 + maxLA * 2 + maxLL * 2;
  const maxTotalArmor = maxHead + maxBodyArmor;
  const points = Math.min(availablePoints, maxTotalArmor);

  let head = Math.min(Math.floor(points * 0.25), maxHead);
  const bodyPoints = points - head;

  let ct = Math.floor((bodyPoints * maxCT) / maxBodyArmor);
  let lt = Math.floor((bodyPoints * maxLT) / maxBodyArmor);
  let rt = lt;
  let la = Math.floor((bodyPoints * maxLA) / maxBodyArmor);
  let ra = la;
  let ll = Math.floor((bodyPoints * maxLL) / maxBodyArmor);
  let rl = ll;

  let allocated = head + ct + lt + rt + la + ra + ll + rl;
  let remaining = points - allocated;

  while (remaining > 0) {
    if (remaining >= 2 && lt < maxLT && rt < maxLT) {
      lt++;
      rt++;
      remaining -= 2;
      continue;
    }
    if (remaining >= 2 && ll < maxLL && rl < maxLL) {
      ll++;
      rl++;
      remaining -= 2;
      continue;
    }
    if (remaining >= 2 && la < maxLA && ra < maxLA) {
      la++;
      ra++;
      remaining -= 2;
      continue;
    }
    if (remaining >= 1 && ct < maxCT) {
      ct++;
      remaining--;
      continue;
    }
    if (remaining >= 1 && head < maxHead) {
      head++;
      remaining--;
      continue;
    }
    break;
  }

  // MegaMekLab uses 75% front / 25% rear for ALL torsos (CT, LT, RT)
  const REAR_RATIO = 0.25;
  const ctRear = Math.round(ct * REAR_RATIO);
  const ctFront = ct - ctRear;

  // Side torsos always get 25% rear, same as center torso (matching MegaMekLab)
  const ltRear = Math.round(lt * REAR_RATIO);
  const ltFront = lt - ltRear;
  const rtRear = ltRear;
  const rtFront = rt - rtRear;

  allocated =
    head +
    ctFront +
    ctRear +
    ltFront +
    ltRear +
    rtFront +
    rtRear +
    la +
    ra +
    ll +
    rl;

  return createEmptyAllocationResult({
    head,
    centerTorsoFront: ctFront,
    centerTorsoRear: ctRear,
    leftTorsoFront: ltFront,
    leftTorsoRear: ltRear,
    rightTorsoFront: rtFront,
    rightTorsoRear: rtRear,
    leftArm: la,
    rightArm: ra,
    leftLeg: ll,
    rightLeg: rl,
    totalAllocated: allocated,
    unallocated: availablePoints - allocated,
  });
}

function calculateQuadArmorAllocation(
  availablePoints: number,
  tonnage: number,
): ArmorAllocationResult {
  const maxHead = MAX_HEAD_ARMOR;
  const maxCT = getMaxArmorForLocation(tonnage, 'centerTorso');
  const maxLT = getMaxArmorForLocation(tonnage, 'leftTorso');
  const maxFLL = getMaxArmorForLocation(tonnage, MechLocation.FRONT_LEFT_LEG);
  const maxRLL = getMaxArmorForLocation(tonnage, MechLocation.REAR_LEFT_LEG);

  const maxBodyArmor = maxCT + maxLT * 2 + maxFLL * 2 + maxRLL * 2;
  const maxTotalArmor = maxHead + maxBodyArmor;
  const points = Math.min(availablePoints, maxTotalArmor);

  let head = Math.min(Math.floor(points * 0.25), maxHead);
  const bodyPoints = points - head;

  let ct = Math.floor((bodyPoints * maxCT) / maxBodyArmor);
  let lt = Math.floor((bodyPoints * maxLT) / maxBodyArmor);
  let rt = lt;
  let fll = Math.floor((bodyPoints * maxFLL) / maxBodyArmor);
  let frl = fll;
  let rll = Math.floor((bodyPoints * maxRLL) / maxBodyArmor);
  let rrl = rll;

  let allocated = head + ct + lt + rt + fll + frl + rll + rrl;
  let remaining = points - allocated;

  while (remaining > 0) {
    if (remaining >= 2 && lt < maxLT && rt < maxLT) {
      lt++;
      rt++;
      remaining -= 2;
      continue;
    }
    if (remaining >= 2 && fll < maxFLL && frl < maxFLL) {
      fll++;
      frl++;
      remaining -= 2;
      continue;
    }
    if (remaining >= 2 && rll < maxRLL && rrl < maxRLL) {
      rll++;
      rrl++;
      remaining -= 2;
      continue;
    }
    if (remaining >= 1 && ct < maxCT) {
      ct++;
      remaining--;
      continue;
    }
    if (remaining >= 1 && head < maxHead) {
      head++;
      remaining--;
      continue;
    }
    break;
  }

  const REAR_RATIO = 0.25;
  const ctRear = Math.round(ct * REAR_RATIO);
  const ctFront = ct - ctRear;

  const ltRear = Math.round(lt * REAR_RATIO);
  const ltFront = lt - ltRear;
  const rtRear = ltRear;
  const rtFront = rt - rtRear;

  allocated =
    head +
    ctFront +
    ctRear +
    ltFront +
    ltRear +
    rtFront +
    rtRear +
    fll +
    frl +
    rll +
    rrl;

  return createEmptyAllocationResult({
    head,
    centerTorsoFront: ctFront,
    centerTorsoRear: ctRear,
    leftTorsoFront: ltFront,
    leftTorsoRear: ltRear,
    rightTorsoFront: rtFront,
    rightTorsoRear: rtRear,
    frontLeftLeg: fll,
    frontRightLeg: frl,
    rearLeftLeg: rll,
    rearRightLeg: rrl,
    totalAllocated: allocated,
    unallocated: availablePoints - allocated,
  });
}

function calculateTripodArmorAllocation(
  availablePoints: number,
  tonnage: number,
): ArmorAllocationResult {
  const maxHead = MAX_HEAD_ARMOR;
  const maxCT = getMaxArmorForLocation(tonnage, 'centerTorso');
  const maxLT = getMaxArmorForLocation(tonnage, 'leftTorso');
  const maxLA = getMaxArmorForLocation(tonnage, 'leftArm');
  const maxLL = getMaxArmorForLocation(tonnage, 'leftLeg');
  const maxCL = getMaxArmorForLocation(tonnage, MechLocation.CENTER_LEG);

  const maxBodyArmor = maxCT + maxLT * 2 + maxLA * 2 + maxLL * 2 + maxCL;
  const maxTotalArmor = maxHead + maxBodyArmor;
  const points = Math.min(availablePoints, maxTotalArmor);

  let head = Math.min(Math.floor(points * 0.25), maxHead);
  const bodyPoints = points - head;

  let ct = Math.floor((bodyPoints * maxCT) / maxBodyArmor);
  let lt = Math.floor((bodyPoints * maxLT) / maxBodyArmor);
  let rt = lt;
  let la = Math.floor((bodyPoints * maxLA) / maxBodyArmor);
  let ra = la;
  let ll = Math.floor((bodyPoints * maxLL) / maxBodyArmor);
  let rl = ll;
  let cl = Math.floor((bodyPoints * maxCL) / maxBodyArmor);

  let allocated = head + ct + lt + rt + la + ra + ll + rl + cl;
  let remaining = points - allocated;

  while (remaining > 0) {
    if (remaining >= 2 && lt < maxLT && rt < maxLT) {
      lt++;
      rt++;
      remaining -= 2;
      continue;
    }
    if (remaining >= 2 && ll < maxLL && rl < maxLL) {
      ll++;
      rl++;
      remaining -= 2;
      continue;
    }
    if (remaining >= 2 && la < maxLA && ra < maxLA) {
      la++;
      ra++;
      remaining -= 2;
      continue;
    }
    if (remaining >= 1 && cl < maxCL) {
      cl++;
      remaining--;
      continue;
    }
    if (remaining >= 1 && ct < maxCT) {
      ct++;
      remaining--;
      continue;
    }
    if (remaining >= 1 && head < maxHead) {
      head++;
      remaining--;
      continue;
    }
    break;
  }

  const REAR_RATIO = 0.25;
  const ctRear = Math.round(ct * REAR_RATIO);
  const ctFront = ct - ctRear;

  const ltRear = Math.round(lt * REAR_RATIO);
  const ltFront = lt - ltRear;
  const rtRear = ltRear;
  const rtFront = rt - rtRear;

  allocated =
    head +
    ctFront +
    ctRear +
    ltFront +
    ltRear +
    rtFront +
    rtRear +
    la +
    ra +
    ll +
    rl +
    cl;

  return createEmptyAllocationResult({
    head,
    centerTorsoFront: ctFront,
    centerTorsoRear: ctRear,
    leftTorsoFront: ltFront,
    leftTorsoRear: ltRear,
    rightTorsoFront: rtFront,
    rightTorsoRear: rtRear,
    leftArm: la,
    rightArm: ra,
    leftLeg: ll,
    rightLeg: rl,
    centerLeg: cl,
    totalAllocated: allocated,
    unallocated: availablePoints - allocated,
  });
}

function createEmptyAllocationResult(
  overrides: Partial<ArmorAllocationResult> = {},
): ArmorAllocationResult {
  return {
    head: 0,
    centerTorsoFront: 0,
    centerTorsoRear: 0,
    leftTorsoFront: 0,
    leftTorsoRear: 0,
    rightTorsoFront: 0,
    rightTorsoRear: 0,
    leftArm: 0,
    rightArm: 0,
    leftLeg: 0,
    rightLeg: 0,
    centerLeg: 0,
    frontLeftLeg: 0,
    frontRightLeg: 0,
    rearLeftLeg: 0,
    rearRightLeg: 0,
    totalAllocated: 0,
    unallocated: 0,
    ...overrides,
  };
}

/**
 * Calculate armor cost
 *
 * @param armorPoints - Total armor points
 * @param armorType - Type of armor
 * @returns Cost in C-Bills
 */
export function calculateArmorCost(
  armorPoints: number,
  armorType: ArmorTypeEnum,
): number {
  const definition = getArmorDefinition(armorType);
  const baseCost = armorPoints * 10000; // Base 10000 C-Bills per point
  return baseCost * (definition?.costMultiplier ?? 1);
}

/**
 * Standard front/rear armor distribution ratio
 * Based on BattleTech conventions: 75% front, 25% rear
 * @deprecated Use ARMOR_RATIOS from @/utils/armor/armorRatios instead
 */
export const FRONT_ARMOR_RATIO = ARMOR_RATIOS.FRONT;
export const REAR_ARMOR_RATIO = ARMOR_RATIOS.REAR;

// Re-export getExpectedArmorCapacity from centralized location
export { getExpectedArmorCapacity };

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
export function getArmorFillPercent(
  current: number,
  expectedMax: number,
): number {
  if (expectedMax <= 0) return 0;
  return (current / expectedMax) * 100;
}
