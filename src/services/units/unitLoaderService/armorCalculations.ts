/**
 * Unit Loader Service - Armor Calculations
 *
 * Functions for calculating armor-related values from unit data.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import {
  IArmorAllocation,
  getTotalAllocatedArmor,
} from '@/types/construction/ArmorAllocation';
import {
  ArmorTypeEnum,
  getLoaderArmorPointsPerTon,
} from '@/types/construction/ArmorType';
const HALF_TON_INCREMENT = 2;

function roundUpToNearestHalfTon(tons: number): number {
  return Math.ceil(tons * HALF_TON_INCREMENT) / HALF_TON_INCREMENT;
}

/**
 * Calculate total armor tonnage from allocation
 */
export function calculateArmorTonnage(
  allocation: IArmorAllocation,
  armorType: ArmorTypeEnum,
): number {
  return roundUpToNearestHalfTon(
    getTotalAllocatedArmor(allocation) / getLoaderArmorPointsPerTon(armorType),
  );
}
