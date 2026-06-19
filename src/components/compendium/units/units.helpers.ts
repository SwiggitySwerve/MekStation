import { IUnitEntry } from '@/types/pages';

import { WEIGHT_CLASS_ORDER, RULES_LEVEL_ORDER } from './units.constants';

export type SortColumn =
  | 'chassis'
  | 'variant'
  | 'tonnage'
  | 'year'
  | 'weightClass'
  | 'techBase'
  | 'unitType'
  | 'rulesLevel'
  | 'cost'
  | 'bv';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  column: SortColumn;
  direction: SortDirection;
}

type SortValue = string | number;
type SortAccessor = (unit: IUnitEntry) => SortValue;

const SORT_ACCESSORS: Record<SortColumn, SortAccessor> = {
  chassis: (unit) => unit.chassis.toLowerCase(),
  variant: (unit) => unit.variant.toLowerCase(),
  tonnage: (unit) => unit.tonnage,
  year: (unit) => unit.year ?? 9999,
  weightClass: (unit) => WEIGHT_CLASS_ORDER[unit.weightClass] ?? 99,
  techBase: (unit) => unit.techBase,
  unitType: (unit) => unit.unitType,
  rulesLevel: (unit) => RULES_LEVEL_ORDER[unit.rulesLevel ?? ''] ?? 99,
  cost: (unit) => unit.cost ?? 0,
  bv: (unit) => unit.bv ?? 0,
};

export function sortUnits(units: IUnitEntry[], sort: SortState): IUnitEntry[] {
  const accessor = SORT_ACCESSORS[sort.column];
  const multiplier = sort.direction === 'asc' ? 1 : -1;

  return [...units].sort((a, b) =>
    compareSortValues(accessor(a), accessor(b), multiplier),
  );
}

function compareSortValues(
  aValue: SortValue,
  bValue: SortValue,
  multiplier: number,
): number {
  if (aValue < bValue) return -1 * multiplier;
  if (aValue > bValue) return 1 * multiplier;
  return 0;
}
