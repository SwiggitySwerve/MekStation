/**
 * Unit Loader Service - Armor Calculations
 *
 * Functions for calculating armor-related values from unit data.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import { IArmorAllocation } from '@/types/construction/ArmorAllocation';
import {
  ArmorTypeEnum,
  getLoaderArmorPointsPerTon,
} from '@/types/construction/ArmorType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';

type CountedArmorPointField =
  | MechLocation
  | 'centerTorsoRear'
  | 'leftTorsoRear'
  | 'rightTorsoRear';

const COUNTED_ARMOR_POINT_FIELDS: readonly CountedArmorPointField[] = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  'centerTorsoRear',
  MechLocation.LEFT_TORSO,
  'leftTorsoRear',
  MechLocation.RIGHT_TORSO,
  'rightTorsoRear',
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
];

const HALF_TON_INCREMENT = 2;

function totalCountedArmorPoints(allocation: IArmorAllocation): number {
  return COUNTED_ARMOR_POINT_FIELDS.reduce(
    (total, field) => total + allocation[field],
    0,
  );
}

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
    totalCountedArmorPoints(allocation) / getLoaderArmorPointsPerTon(armorType),
  );
}
