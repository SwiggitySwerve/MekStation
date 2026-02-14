import { EquipmentFlag } from '@/types/enums/EquipmentFlag';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import type { IEquipmentFilter } from './EquipmentLoaderTypes';

interface IFilterableEquipment {
  id: string;
  name: string;
  techBase: TechBase;
  rulesLevel: RulesLevel;
  introductionYear: number;
  allowedUnitTypes?: readonly UnitType[];
  flags?: readonly EquipmentFlag[];
}

const DEFAULT_ALLOWED_UNIT_TYPES: readonly UnitType[] = [
  UnitType.BATTLEMECH,
  UnitType.VEHICLE,
  UnitType.AEROSPACE,
];

export function filterEquipmentByCriteria<T extends IFilterableEquipment>(
  items: readonly T[],
  filter: IEquipmentFilter,
): T[] {
  let results = [...items];

  if (filter.techBase) {
    const techBases = Array.isArray(filter.techBase)
      ? filter.techBase
      : [filter.techBase];
    results = results.filter((item) => techBases.includes(item.techBase));
  }

  if (filter.rulesLevel) {
    const levels = Array.isArray(filter.rulesLevel)
      ? filter.rulesLevel
      : [filter.rulesLevel];
    results = results.filter((item) => levels.includes(item.rulesLevel));
  }

  if (filter.maxYear !== undefined) {
    const maxYear = filter.maxYear;
    results = results.filter((item) => item.introductionYear <= maxYear);
  }

  if (filter.minYear !== undefined) {
    const minYear = filter.minYear;
    results = results.filter((item) => item.introductionYear >= minYear);
  }

  if (filter.searchText) {
    const search = filter.searchText.toLowerCase();
    results = results.filter(
      (item) =>
        item.name.toLowerCase().includes(search) ||
        item.id.toLowerCase().includes(search),
    );
  }

  if (filter.unitType) {
    const unitTypes = Array.isArray(filter.unitType)
      ? filter.unitType
      : [filter.unitType];
    results = results.filter((item) => {
      const allowedUnitTypes =
        item.allowedUnitTypes ?? DEFAULT_ALLOWED_UNIT_TYPES;
      return unitTypes.some((unitType) => allowedUnitTypes.includes(unitType));
    });
  }

  if (filter.hasFlags && filter.hasFlags.length > 0) {
    const requiredFlags = filter.hasFlags;
    results = results.filter((item) => {
      const itemFlags = item.flags ?? [];
      return requiredFlags.every((flag) => itemFlags.includes(flag));
    });
  }

  if (filter.excludeFlags && filter.excludeFlags.length > 0) {
    const excludedFlags = filter.excludeFlags;
    results = results.filter((item) => {
      const itemFlags = item.flags ?? [];
      return !excludedFlags.some((flag) => itemFlags.includes(flag));
    });
  }

  return results;
}
