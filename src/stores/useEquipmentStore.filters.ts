import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory, IEquipmentItem } from '@/types/equipment';
import {
  createAmmoWeaponMatcher,
  isOneShotEquipment,
} from '@/utils/equipment/ammunitionCompatibility';
import { isAvailableInYear } from '@/utils/temporal/availabilityUtils';

import type {
  EquipmentFilters,
  SortColumn,
  SortState,
  UnitContext,
} from './useEquipmentStore';

export const CATALOG_OTHER_CATEGORIES: readonly EquipmentCategory[] = [
  EquipmentCategory.MISC_EQUIPMENT,
  EquipmentCategory.MOVEMENT,
  EquipmentCategory.STRUCTURAL,
];

export function updateEquipmentCategories(
  activeCategories: ReadonlySet<EquipmentCategory>,
  category: EquipmentCategory,
  isMultiSelect: boolean,
): Set<EquipmentCategory> {
  if (!isMultiSelect) return exclusiveEquipmentCategories(category);

  const nextCategories = new Set(activeCategories);
  if (category === EquipmentCategory.MISC_EQUIPMENT) {
    toggleOtherEquipmentCategories(nextCategories);
    return nextCategories;
  }

  if (nextCategories.has(category)) {
    nextCategories.delete(category);
  } else {
    nextCategories.add(category);
  }
  return nextCategories;
}

export function filterEquipment(
  equipment: readonly IEquipmentItem[],
  filters: EquipmentFilters,
  unitContext: UnitContext,
  sort: SortState,
): IEquipmentItem[] {
  const matchesMountedWeapon = createAmmoWeaponMatcher(
    unitContext.unitWeaponIds,
    equipment,
  );
  const hasUnitContext =
    unitContext.unitYear !== null ||
    unitContext.unitTechBase !== null ||
    unitContext.unitWeaponIds.length > 0;
  return equipment
    .filter((item) => matchesSearch(item, filters.search))
    .filter((item) => matchesTechBase(item, filters.techBase))
    .filter((item) => matchesCategory(item, filters))
    .filter((item) => matchesPrototypeFilter(item, filters.hidePrototype))
    .filter((item) => matchesOneShotFilter(item, filters.hideOneShot))
    .filter((item) => matchesAvailability(item, filters, unitContext))
    .filter(
      (item) =>
        !filters.hideAmmoWithoutWeapon ||
        !hasUnitContext ||
        item.category !== EquipmentCategory.AMMUNITION ||
        matchesMountedWeapon(item),
    )
    .filter((item) => matchesNumericFilters(item, filters))
    .sort((first, second) => compareEquipment(first, second, sort));
}

function exclusiveEquipmentCategories(
  category: EquipmentCategory,
): Set<EquipmentCategory> {
  return new Set(
    category === EquipmentCategory.MISC_EQUIPMENT
      ? CATALOG_OTHER_CATEGORIES
      : [category],
  );
}

function toggleOtherEquipmentCategories(
  categories: Set<EquipmentCategory>,
): void {
  const isOtherActive = categories.has(EquipmentCategory.MISC_EQUIPMENT);
  for (const category of CATALOG_OTHER_CATEGORIES) {
    if (isOtherActive) {
      categories.delete(category);
    } else {
      categories.add(category);
    }
  }
}

function matchesSearch(item: IEquipmentItem, search: string): boolean {
  return !search || item.name.toLowerCase().includes(search.toLowerCase());
}

function matchesTechBase(
  item: IEquipmentItem,
  techBase: TechBase | null,
): boolean {
  return !techBase || item.techBase === techBase;
}

function matchesCategory(
  item: IEquipmentItem,
  filters: EquipmentFilters,
): boolean {
  const categories = filters.category
    ? exclusiveEquipmentCategories(filters.category)
    : filters.activeCategories;
  if (
    !filters.category &&
    (filters.showAllCategories || categories.size === 0)
  ) {
    return true;
  }
  return (
    categories.has(item.category) ||
    item.additionalCategories?.some((category) => categories.has(category)) ===
      true
  );
}

function matchesPrototypeFilter(
  item: IEquipmentItem,
  hidePrototype: boolean,
): boolean {
  return (
    !hidePrototype ||
    (item.rulesLevel !== 'Experimental' &&
      !item.name.toLowerCase().includes('prototype'))
  );
}

function matchesOneShotFilter(
  item: IEquipmentItem,
  hideOneShot: boolean,
): boolean {
  return !hideOneShot || !isOneShotEquipment(item);
}

function matchesAvailability(
  item: IEquipmentItem,
  filters: EquipmentFilters,
  unitContext: UnitContext,
): boolean {
  if (!filters.hideUnavailable) return true;
  if (
    unitContext.unitYear !== null &&
    !isAvailableInYear(item, unitContext.unitYear)
  ) {
    return false;
  }
  return (
    unitContext.unitTechBase === null ||
    item.techBase === unitContext.unitTechBase
  );
}

function matchesNumericFilters(
  item: IEquipmentItem,
  filters: EquipmentFilters,
): boolean {
  return (
    (filters.maxWeight === null || item.weight <= filters.maxWeight) &&
    (filters.maxCriticalSlots === null ||
      item.criticalSlots <= filters.maxCriticalSlots) &&
    (filters.maxYear === null || isAvailableInYear(item, filters.maxYear))
  );
}

type EquipmentSortValue = string | number;
type EquipmentSortValueGetter = (item: IEquipmentItem) => EquipmentSortValue;

const EQUIPMENT_SORT_VALUE_GETTERS: Readonly<
  Record<SortColumn, EquipmentSortValueGetter>
> = {
  name: (item) => item.name.toLowerCase(),
  category: (item) => item.category,
  techBase: (item) => item.techBase,
  weight: (item) => item.weight,
  criticalSlots: (item) => item.criticalSlots,
  damage: (item) => item.name.toLowerCase(),
  heat: (item) => item.name.toLowerCase(),
};

/** Names compare numerically so AC/2, AC/5, AC/10 and AC/20 read in order. */
const NATURAL_NAME_COLLATOR = new Intl.Collator('en', { numeric: true });
const NATURAL_NAME_COLUMNS: ReadonlySet<SortColumn> = new Set([
  'name',
  'damage',
  'heat',
]);

function compareEquipment(
  first: IEquipmentItem,
  second: IEquipmentItem,
  sort: SortState,
): number {
  const getValue = EQUIPMENT_SORT_VALUE_GETTERS[sort.column];
  const firstValue = getValue(first);
  const secondValue = getValue(second);
  const order =
    NATURAL_NAME_COLUMNS.has(sort.column) &&
    typeof firstValue === 'string' &&
    typeof secondValue === 'string'
      ? NATURAL_NAME_COLLATOR.compare(firstValue, secondValue)
      : firstValue < secondValue
        ? -1
        : firstValue > secondValue
          ? 1
          : 0;
  return sort.direction === 'asc' ? order : -order;
}
