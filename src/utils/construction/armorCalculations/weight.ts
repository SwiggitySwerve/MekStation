import {
  ArmorTypeEnum,
  getArmorDefinition,
} from '@/types/construction/ArmorType';

import { ceilToHalfTon } from '../../physical/weightUtils';

export function calculateArmorWeight(
  armorPoints: number,
  armorType: ArmorTypeEnum,
): number {
  const definition = getArmorDefinition(armorType);
  if (!definition) {
    return ceilToHalfTon(armorPoints / 16);
  }
  return ceilToHalfTon(armorPoints / definition.pointsPerTon);
}

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

export function getArmorCriticalSlots(armorType: ArmorTypeEnum): number {
  const definition = getArmorDefinition(armorType);
  return definition?.criticalSlots ?? 0;
}

export function calculateArmorCost(
  armorPoints: number,
  armorType: ArmorTypeEnum,
): number {
  const definition = getArmorDefinition(armorType);
  const baseCost = armorPoints * 10000;
  return baseCost * (definition?.costMultiplier ?? 1);
}
