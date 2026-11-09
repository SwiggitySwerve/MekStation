import { ArmorTypeEnum } from '@/types/construction/ArmorType';

/**
 * BLK `armor_type` codes: MegaMek 48fcb2f6 EquipmentType.T_ARMOR_*
 * (EquipmentType.java:85-112). BLK vehicles and aerospace store stealth as
 * T_ARMOR_STEALTH_VEHICLE (22; T_ARMOR_STEALTH 8 is the Mek code). Ferro-Fibrous
 * is a single code whose IS/Clan side comes from the unit's tech base
 * (BLKTankFile.java:284-300: `ArmorType.of(armorTypeId, t.isClan())`).
 * The one table for both the BLK writer and readers.
 */
const BLK_ARMOR_CODES: Readonly<Record<ArmorTypeEnum, number>> = {
  [ArmorTypeEnum.STANDARD]: 0,
  [ArmorTypeEnum.FERRO_FIBROUS_IS]: 1,
  [ArmorTypeEnum.FERRO_FIBROUS_CLAN]: 1,
  [ArmorTypeEnum.FERRO_FIBROUS_PROTO]: 9, // 48fcb2f64 EquipmentType.java:94.
  [ArmorTypeEnum.REACTIVE]: 2,
  [ArmorTypeEnum.REFLECTIVE]: 3,
  [ArmorTypeEnum.HARDENED]: 4,
  [ArmorTypeEnum.LIGHT_FERRO]: 5,
  [ArmorTypeEnum.HEAVY_FERRO]: 6,
  [ArmorTypeEnum.FERRO_LAMELLOR]: 16,
  [ArmorTypeEnum.STEALTH]: 22,
  [ArmorTypeEnum.BALLISTIC_REINFORCED]: 26,
  [ArmorTypeEnum.COMMERCIAL]: 10, // 48fcb2f64 EquipmentType.java:95.
};

/** The BLK `armor_type` code for an editor armor type (Standard if unknown). */
export function encodeBlkArmorType(armorType: ArmorTypeEnum): number {
  return BLK_ARMOR_CODES[armorType] ?? 0;
}

/**
 * The editor armor type for a BLK `armor_type` code, or undefined for a code
 * with no editor type (e.g. patchwork, support-vehicle BAR, BA armors).
 */
export function decodeBlkArmorType(
  code: number,
  isClan: boolean,
): ArmorTypeEnum | undefined {
  if (code === 1)
    return isClan
      ? ArmorTypeEnum.FERRO_FIBROUS_CLAN
      : ArmorTypeEnum.FERRO_FIBROUS_IS;
  if (code === 8) return ArmorTypeEnum.STEALTH;
  const found = Object.entries(BLK_ARMOR_CODES).find(
    ([type, value]) =>
      value === code && type !== ArmorTypeEnum.FERRO_FIBROUS_CLAN,
  );
  return found ? (found[0] as ArmorTypeEnum) : undefined;
}
