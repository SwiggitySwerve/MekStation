import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory, IEquipmentItem } from '@/types/equipment';

import type {
  EquipmentFilters,
  SortColumn,
  SortState,
  UnitContext,
} from './useEquipmentStore';

const OTHER_COMBINED_CATEGORIES: readonly EquipmentCategory[] = [
  EquipmentCategory.MISC_EQUIPMENT,
  EquipmentCategory.ELECTRONICS,
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
  return equipment
    .filter((item) => matchesSearch(item, filters.search))
    .filter((item) => matchesTechBase(item, filters.techBase))
    .filter((item) => matchesCategory(item, filters))
    .filter((item) => matchesPrototypeFilter(item, filters.hidePrototype))
    .filter((item) => matchesOneShotFilter(item, filters.hideOneShot))
    .filter((item) => matchesAvailability(item, filters, unitContext))
    .filter((item) => matchesAmmoWeaponFilter(item, filters, unitContext))
    .filter((item) => matchesNumericFilters(item, filters))
    .sort((first, second) => compareEquipment(first, second, sort));
}

function exclusiveEquipmentCategories(
  category: EquipmentCategory,
): Set<EquipmentCategory> {
  return new Set(
    category === EquipmentCategory.MISC_EQUIPMENT
      ? OTHER_COMBINED_CATEGORIES
      : [category],
  );
}

function toggleOtherEquipmentCategories(
  categories: Set<EquipmentCategory>,
): void {
  const isOtherActive = categories.has(EquipmentCategory.MISC_EQUIPMENT);
  for (const category of OTHER_COMBINED_CATEGORIES) {
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
  if (filters.category && item.category !== filters.category) return false;
  if (filters.showAllCategories || filters.activeCategories.size === 0) {
    return true;
  }
  return (
    filters.activeCategories.has(item.category) ||
    item.additionalCategories?.some((category) =>
      filters.activeCategories.has(category),
    ) === true
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
  return !hideOneShot || !item.name.toLowerCase().includes('one-shot');
}

function matchesAvailability(
  item: IEquipmentItem,
  filters: EquipmentFilters,
  unitContext: UnitContext,
): boolean {
  if (!filters.hideUnavailable) return true;
  if (
    unitContext.unitYear !== null &&
    item.introductionYear > unitContext.unitYear
  ) {
    return false;
  }
  return (
    unitContext.unitTechBase === null ||
    item.techBase === unitContext.unitTechBase
  );
}

function matchesAmmoWeaponFilter(
  item: IEquipmentItem,
  filters: EquipmentFilters,
  unitContext: UnitContext,
): boolean {
  if (
    !filters.hideAmmoWithoutWeapon ||
    unitContext.unitWeaponIds.length === 0 ||
    item.category !== EquipmentCategory.AMMUNITION
  ) {
    return true;
  }

  const normalizedAmmoName = item.name.toLowerCase().replace(/-/g, '/');
  return unitContext.unitWeaponIds.some((weaponId) =>
    ammoMatchesWeapon(normalizedAmmoName, weaponId),
  );
}

function ammoMatchesWeapon(
  normalizedAmmoName: string,
  weaponId: string,
): boolean {
  const normalizedWeaponId = weaponId.toLowerCase().replace(/-/g, '/');
  return (
    normalizedAmmoName.includes(normalizedWeaponId) ||
    normalizedAmmoName.includes(normalizedWeaponId.replace('/', ''))
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
    (filters.maxYear === null || item.introductionYear <= filters.maxYear)
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

function compareEquipment(
  first: IEquipmentItem,
  second: IEquipmentItem,
  sort: SortState,
): number {
  const getValue = EQUIPMENT_SORT_VALUE_GETTERS[sort.column];
  const firstValue = getValue(first);
  const secondValue = getValue(second);
  if (firstValue < secondValue) return sort.direction === 'asc' ? -1 : 1;
  if (firstValue > secondValue) return sort.direction === 'asc' ? 1 : -1;
  return 0;
}
