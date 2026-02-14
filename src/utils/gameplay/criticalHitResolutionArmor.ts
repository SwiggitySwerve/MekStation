import { ArmorTypeEnum } from '@/types/construction/ArmorType';

export function isHardenedArmor(armorType?: ArmorTypeEnum): boolean {
  return armorType === ArmorTypeEnum.HARDENED;
}

export function isFerroLamellorArmor(armorType?: ArmorTypeEnum): boolean {
  return armorType === ArmorTypeEnum.FERRO_LAMELLOR;
}

export function halveCritCount(critCount: number): number {
  if (critCount <= 0) return 0;
  return Math.max(Math.floor(critCount / 2), 1);
}
