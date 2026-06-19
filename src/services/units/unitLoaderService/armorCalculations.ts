/**
 * Unit Loader Service - Armor Calculations
 *
 * Functions for calculating armor-related values from unit data.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import { IArmorAllocation } from '@/types/construction/ArmorAllocation';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
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

const DEFAULT_ARMOR_POINTS_PER_TON = 16;
const HALF_TON_INCREMENT = 2;

const ARMOR_POINTS_PER_TON_BY_TYPE: Partial<Record<ArmorTypeEnum, number>> = {
  [ArmorTypeEnum.FERRO_FIBROUS_IS]: 17.92,
  [ArmorTypeEnum.FERRO_FIBROUS_CLAN]: 19.2,
  [ArmorTypeEnum.LIGHT_FERRO]: 16.96,
  [ArmorTypeEnum.HEAVY_FERRO]: 19.52,
  [ArmorTypeEnum.HARDENED]: 8,
};

function totalCountedArmorPoints(allocation: IArmorAllocation): number {
  return COUNTED_ARMOR_POINT_FIELDS.reduce(
    (total, field) => total + allocation[field],
    0,
  );
}

function pointsPerTonForArmorType(armorType: ArmorTypeEnum): number {
  return (
    ARMOR_POINTS_PER_TON_BY_TYPE[armorType] ?? DEFAULT_ARMOR_POINTS_PER_TON
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
    totalCountedArmorPoints(allocation) / pointsPerTonForArmorType(armorType),
  );
}
