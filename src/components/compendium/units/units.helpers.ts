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

export function sortUnits(units: IUnitEntry[], sort: SortState): IUnitEntry[] {
  const sorted = [...units];
  const { column, direction } = sort;
  const multiplier = direction === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;

    switch (column) {
      case 'chassis':
        aVal = a.chassis.toLowerCase();
        bVal = b.chassis.toLowerCase();
        break;
      case 'variant':
        aVal = a.variant.toLowerCase();
        bVal = b.variant.toLowerCase();
        break;
      case 'tonnage':
        aVal = a.tonnage;
        bVal = b.tonnage;
        break;
      case 'year':
        aVal = a.year ?? 9999;
        bVal = b.year ?? 9999;
        break;
      case 'weightClass':
        aVal = WEIGHT_CLASS_ORDER[a.weightClass] ?? 99;
        bVal = WEIGHT_CLASS_ORDER[b.weightClass] ?? 99;
        break;
      case 'techBase':
        aVal = a.techBase;
        bVal = b.techBase;
        break;
      case 'unitType':
        aVal = a.unitType;
        bVal = b.unitType;
        break;
      case 'rulesLevel':
        aVal = RULES_LEVEL_ORDER[a.rulesLevel ?? ''] ?? 99;
        bVal = RULES_LEVEL_ORDER[b.rulesLevel ?? ''] ?? 99;
        break;
      case 'cost':
        aVal = a.cost ?? 0;
        bVal = b.cost ?? 0;
        break;
      case 'bv':
        aVal = a.bv ?? 0;
        bVal = b.bv ?? 0;
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return -1 * multiplier;
    if (aVal > bVal) return 1 * multiplier;
    return 0;
  });

  return sorted;
}
