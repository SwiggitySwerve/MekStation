/**
 * Unit Loader Service - Armor Calculations
 * 
 * Functions for calculating armor-related values from unit data.
 * 
 * @spec openspec/specs/unit-services/spec.md
 */

import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { IArmorAllocation } from '@/stores/unitState';

/**
 * Calculate total armor tonnage from allocation
 */
export function calculateArmorTonnage(allocation: IArmorAllocation, armorType: ArmorTypeEnum): number {
  // Sum all armor points
  const totalPoints = 
    allocation[MechLocation.HEAD] +
    allocation[MechLocation.CENTER_TORSO] +
    allocation.centerTorsoRear +
    allocation[MechLocation.LEFT_TORSO] +
    allocation.leftTorsoRear +
    allocation[MechLocation.RIGHT_TORSO] +
    allocation.rightTorsoRear +
    allocation[MechLocation.LEFT_ARM] +
    allocation[MechLocation.RIGHT_ARM] +
    allocation[MechLocation.LEFT_LEG] +
    allocation[MechLocation.RIGHT_LEG];
  
  // Points per ton varies by armor type
  // Standard: 16 points per ton
  // Ferro-Fibrous IS: 17.92 points per ton (12% bonus)
  // Ferro-Fibrous Clan: 19.2 points per ton (20% bonus)
  // etc.
  let pointsPerTon = 16;
  
  if (armorType === ArmorTypeEnum.FERRO_FIBROUS_IS) {
    pointsPerTon = 17.92;
  } else if (armorType === ArmorTypeEnum.FERRO_FIBROUS_CLAN) {
    pointsPerTon = 19.2;
  } else if (armorType === ArmorTypeEnum.LIGHT_FERRO) {
    pointsPerTon = 16.96; // 6% bonus
  } else if (armorType === ArmorTypeEnum.HEAVY_FERRO) {
    pointsPerTon = 19.52; // 22% bonus
  } else if (armorType === ArmorTypeEnum.HARDENED) {
    pointsPerTon = 8; // 2x weight
  }
  
  return Math.ceil((totalPoints / pointsPerTon) * 2) / 2; // Round to nearest half ton
}
