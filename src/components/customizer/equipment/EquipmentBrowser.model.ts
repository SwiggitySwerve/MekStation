import type { IEquipmentItem } from '@/types/equipment';

import { formatTons } from '@/utils/formatting';
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
  return `exceeds free weight by ${formatTons(excess)}`;
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
   * `free`: plain text. `full`: exactly at the limit, a legal state with a
   * separate warning note (`limitText`). `over`: the weight text itself is an
   * error callout.
   */
  readonly state: CatalogCapacityState;
  /**
   * Warning note shown beside the Add column when the unit is exactly full,
   * worded the same on every width.
   */
  readonly limitText?: string;
  /**
   * Why the note matters, after the note on wider screens (and for assistive
   * tech on phones): "adding equipment will exceed 100.0 t".
   */
  readonly limitReason?: string;
}

/**
 * Capacity summary shown beside the result count above the catalog list.
 * Exactly 0.0 t free is a legal, full unit: the free tonnage stays plain text
 * and a separate warning note says the unit is at its limit. Only a deficit
 * is an error and names the fix.
 */
export function getCatalogCapacityNotice(capacity: {
  remainingWeight: number;
  remainingSlots: number;
  /** The unit's tonnage, named in the at-limit reason. */
  tonnage?: number;
}): ICatalogCapacityNotice {
  const { remainingWeight, remainingSlots, tonnage } = capacity;
  const slotsText = `${remainingSlots} ${remainingSlots === 1 ? 'slot' : 'slots'} free`;
  if (remainingWeight < -WEIGHT_EPSILON) {
    const overText = `Over by ${formatTons(-remainingWeight)}`;
    return {
      weightText: `${overText} \u2014 remove equipment or armor`,
      compactWeightText: overText,
      slotsText,
      state: 'over',
    };
  }
  const weightText = `${formatTons(remainingWeight > WEIGHT_EPSILON ? remainingWeight : 0)} free`;
  if (remainingWeight > WEIGHT_EPSILON)
    return {
      weightText,
      compactWeightText: weightText,
      slotsText,
      state: 'free',
    };
  return {
    weightText,
    compactWeightText: weightText,
    slotsText,
    state: 'full',
    // A status sentence, so sentence case.
    limitText: 'At tonnage limit',
    ...(tonnage !== undefined && {
      limitReason: `adding equipment will exceed ${formatTons(tonnage)}`,
    }),
  };
}
export function getCatalogCapacity(
  stats: Pick<
    UnitStats,
    'weightRemaining' | 'criticalSlotsTotal' | 'criticalSlotsUsed' | 'tonnage'
  >,
): { remainingWeight: number; remainingSlots: number; tonnage: number } {
  return {
    tonnage: stats.tonnage,
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

/**
 * List height that ends on a whole row: the bottom of the last row that
 * fits in `available`, so the first screen never shows a sliver of a card
 * (and half its Add button) above the pager. `rowBottoms` are offsets from the
 * top of the list content. Null when every row fits or not even one does.
 */
export function getWholeRowListHeight(
  rowBottoms: readonly number[],
  available: number,
): number | null {
  if (rowBottoms.length === 0 || rowBottoms[rowBottoms.length - 1] <= available)
    return null;
  const fitting = rowBottoms.filter((bottom) => bottom <= available);
  return fitting.length > 0 ? fitting[fitting.length - 1] : null;
}

/** Most a row may grow so the visible rows reach the pager. */
export const MAX_ROW_FILL_PX = 12;

/**
 * Extra height for every row so the rows that fit end at `available` instead
 * of leaving a band of empty list above the pager. Spread evenly over the
 * fitting rows and rounded down to a quarter pixel, so the last fitting row
 * never crosses the edge. Zero when every row fits (the list ends on its own
 * end marker), when no row fits, or when the band is too large to spread
 * without visibly stretching rows (more than `maxPerRow` each).
 */
export function getRowFillPadding(
  rowBottoms: readonly number[],
  available: number,
  maxPerRow = MAX_ROW_FILL_PX,
): number {
  const height = getWholeRowListHeight(rowBottoms, available);
  if (height === null) return 0;
  const fitting = rowBottoms.filter((bottom) => bottom <= available).length;
  const perRow = Math.floor(((available - height) / fitting) * 4) / 4;
  return perRow <= maxPerRow ? perRow : 0;
}
