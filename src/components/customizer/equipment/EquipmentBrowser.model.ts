import type { IEquipmentItem } from '@/types/equipment';

import { getTechBaseLabel } from '@/utils/techBase';

import type { UnitStats } from '../shared/UnitInfoBanner';

import { getWeightStatus } from '../shared/unitStatStatus';

/** Catalog data flags for items whose size is chosen per unit, not fixed. */
const VARIABLE_SIZE_MARKERS: readonly string[] = [
  'Variable weight',
  'Variable critical slots',
];

/**
 * True when the catalog weight and slot values are placeholders: the item has
 * a variable-equipment formula, or the data marks it as variable weight/slots.
 * The second case covers entries (such as Communications Equipment) that
 * carry 0 t / 0 slots plus the marker but no formula id.
 */
export function isVariableSizeEquipment(
  equipment: Pick<IEquipmentItem, 'variableEquipmentId' | 'special'>,
): boolean {
  return (
    Boolean(equipment.variableEquipmentId) ||
    (equipment.special ?? []).some((note) =>
      VARIABLE_SIZE_MARKERS.includes(note),
    )
  );
}

/** Free tonnage below this reads as "0.0 t free" (weights come in half tons). */
const WEIGHT_EPSILON = 0.005;

/**
 * True when the unit has no free tonnage left (or is already overweight), so
 * every weighted item would add to the overweight. The catalog then shows one
 * capacity line instead of marking each row.
 */
export function isCatalogWeightExhausted(
  remainingWeight: number | undefined,
): boolean {
  return remainingWeight !== undefined && remainingWeight <= WEIGHT_EPSILON;
}

/**
 * Tons by which a fixed-weight item exceeds the unit's free tonnage. Only rows
 * that are heavier than a non-zero free budget are annotated; with nothing
 * free the capacity notice covers every row, and variable-weight items are
 * not guessed. Catalog annotations only; adding still uses the existing rules.
 */
export function getCatalogWeightExcess(
  equipment: Pick<IEquipmentItem, 'weight' | 'variableEquipmentId'>,
  remainingWeight: number | undefined,
): number | null {
  if (
    remainingWeight === undefined ||
    equipment.variableEquipmentId ||
    isCatalogWeightExhausted(remainingWeight)
  )
    return null;
  return getWeightStatus(equipment.weight, remainingWeight) === 'error'
    ? equipment.weight - remainingWeight
    : null;
}

/** Accessible description for a Tons value that exceeds the free tonnage. */
export function describeCatalogWeightExcess(excess: number): string {
  return `exceeds free weight by ${excess.toFixed(1)} t`;
}

/** Where the unit stands against its tonnage limit. */
export type CatalogCapacityState = 'free' | 'full' | 'over';

export interface ICatalogCapacityNotice {
  /** Free tonnage, or what to do about running out of it. */
  readonly weightText: string;
  /** Same meaning in fewer words, for a phone-width summary line. */
  readonly compactWeightText: string;
  readonly slotsText: string;
  /**
   * `free`: plain text. `full`: exactly at the limit, a legal state shown as
   * neutral text. `over`: the only state shown as a warning callout.
   */
  readonly state: CatalogCapacityState;
}

/**
 * Capacity summary shown beside the result count above the catalog list.
 * Exactly 0.0 t free is a legal, full unit and reads as neutral status; only
 * a deficit is an error and names the fix.
 */
export function getCatalogCapacityNotice(capacity: {
  remainingWeight: number;
  remainingSlots: number;
}): ICatalogCapacityNotice {
  const { remainingWeight, remainingSlots } = capacity;
  const slotsText = `${remainingSlots} ${remainingSlots === 1 ? 'slot' : 'slots'} free`;
  if (remainingWeight < -WEIGHT_EPSILON) {
    const overText = `Over by ${(-remainingWeight).toFixed(1)} t`;
    return {
      weightText: `${overText} \u2014 remove equipment or armor`,
      compactWeightText: overText,
      slotsText,
      state: 'over',
    };
  }
  const weightText = `${(remainingWeight > WEIGHT_EPSILON ? remainingWeight : 0).toFixed(1)} t free`;
  if (remainingWeight > WEIGHT_EPSILON)
    return {
      weightText,
      compactWeightText: weightText,
      slotsText,
      state: 'free',
    };
  return {
    weightText: `${weightText} \u00B7 unit is at its tonnage limit`,
    compactWeightText: `${weightText} \u00B7 at tonnage limit`,
    slotsText,
    state: 'full',
  };
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

/**
 * Short availability text for the phone Filters button, such as "IS · 3028".
 * The full wording stays in the button's accessible name and the panel.
 */
export function getCompactAvailabilitySummary(
  techBase: string | null,
  year: number | null,
): string {
  return [techBase ? getTechBaseLabel(techBase) : null, year]
    .filter(Boolean)
    .join(' · ');
}
