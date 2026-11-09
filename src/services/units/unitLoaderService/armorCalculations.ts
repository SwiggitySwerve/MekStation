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
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
const HALF_TON_INCREMENT = 2;

function roundUpToNearestHalfTon(tons: number): number {
  return Math.ceil(tons * HALF_TON_INCREMENT) / HALF_TON_INCREMENT;
}

/**
 * Calculate armor tonnage from active configuration locations. Omitted
 * configuration retains the legacy biped field set and half-ton rounding.
 */
export function calculateArmorTonnage(
  allocation: IArmorAllocation,
  armorType: ArmorTypeEnum,
  configuration?: MechConfiguration,
): number {
  return roundUpToNearestHalfTon(
    getTotalAllocatedArmor(allocation, configuration) /
      getLoaderArmorPointsPerTon(armorType),
  );
}
