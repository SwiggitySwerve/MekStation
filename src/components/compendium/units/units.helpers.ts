import {
  matchesRulesLevelFilter,
  parseRulesLevel,
  RULES_LEVEL_ORDER,
} from '@/types/enums/RulesLevel';
import { IUnitEntry } from '@/types/pages';

import type { FilterState } from './UnitsFilters';

import { WEIGHT_CLASS_ORDER, RULES_LEVEL_LABELS } from './units.constants';

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

/** undefined means "no value": it sorts last in either direction. */
type SortValue = string | number | undefined;
type SortAccessor = (unit: IUnitEntry) => SortValue;

function rulesLevelSortValue(unit: IUnitEntry): number | undefined {
  const level = parseRulesLevel(unit.rulesLevel);
  return level === undefined ? undefined : RULES_LEVEL_ORDER[level];
}

/** Table label for a stored level: short name, the text as written, or a dash. */
export function rulesLevelLabel(value: string | undefined): string {
  const level = parseRulesLevel(value);
  return (level && RULES_LEVEL_LABELS[level]) ?? value ?? '—';
}

/** The select filters (tech base, weight class, rules level) a unit satisfies. */
export function unitMatchesSelectFilters(
  unit: IUnitEntry,
  filters: FilterState,
): boolean {
  if (filters.techBase && unit.techBase !== filters.techBase) return false;
  if (filters.weightClass && unit.weightClass !== filters.weightClass) {
    return false;
  }
  return matchesRulesLevelFilter(unit.rulesLevel, filters.rulesLevel);
}

const SORT_ACCESSORS: Record<SortColumn, SortAccessor> = {
  chassis: (unit) => unit.chassis.toLowerCase(),
  variant: (unit) => unit.variant.toLowerCase(),
  tonnage: (unit) => unit.tonnage,
  year: (unit) => unit.year ?? 9999,
  weightClass: (unit) => WEIGHT_CLASS_ORDER[unit.weightClass] ?? 99,
  techBase: (unit) => unit.techBase,
  unitType: (unit) => unit.unitType,
  rulesLevel: rulesLevelSortValue,
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
  if (aValue === undefined) return bValue === undefined ? 0 : 1;
  if (bValue === undefined) return -1;
  if (aValue < bValue) return -1 * multiplier;
  if (aValue > bValue) return 1 * multiplier;
  return 0;
}
