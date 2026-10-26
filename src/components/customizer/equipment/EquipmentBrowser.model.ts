import type { IEquipmentItem } from '@/types/equipment';

import type { UnitStats } from '../shared/UnitInfoBanner';

import { getWeightStatus } from '../shared/unitStatStatus';

/** Catalog annotations only; adding equipment still uses the existing rules. */
export function getCatalogWeightExcess(
  equipment: Pick<IEquipmentItem, 'weight' | 'variableEquipmentId'>,
  remainingWeight: number | undefined,
): number | null {
  if (remainingWeight === undefined || equipment.variableEquipmentId)
    return null;
  return getWeightStatus(equipment.weight, remainingWeight) === 'error'
    ? equipment.weight - remainingWeight
    : null;
}

export function getCatalogCapacity(
  stats: Pick<
    UnitStats,
    'weightRemaining' | 'criticalSlotsTotal' | 'criticalSlotsUsed'
  >,
): { remainingWeight: number; remainingSlots: number } {
  return {
    remainingWeight: stats.weightRemaining,
    remainingSlots: stats.criticalSlotsTotal - stats.criticalSlotsUsed,
  };
}

export function countCatalogMounts(
  equipment: readonly { equipmentId: string }[],
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const item of equipment) {
    counts.set(item.equipmentId, (counts.get(item.equipmentId) ?? 0) + 1);
  }
  return counts;
}
