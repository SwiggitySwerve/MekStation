import { matchesRulesLevelFilter } from '@/types/enums/RulesLevel';

import type { FilterState, UnitEntry } from './list.types';

/** The custom-unit list's search and select filters. */
export function filterUnits(
  units: UnitEntry[],
  filters: FilterState,
): UnitEntry[] {
  let result = [...units];

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    result = result.filter(
      (unit) =>
        unit.chassis.toLowerCase().includes(searchLower) ||
        unit.variant.toLowerCase().includes(searchLower) ||
        `${unit.chassis} ${unit.variant}`.toLowerCase().includes(searchLower),
    );
  }

  if (filters.unitType) {
    result = result.filter((unit) => unit.unitType === filters.unitType);
  }

  if (filters.techBase) {
    result = result.filter((unit) => unit.techBase === filters.techBase);
  }

  // Saved records store the contract tag; an older one may store the enum value.
  if (filters.rulesLevel) {
    result = result.filter((unit) =>
      matchesRulesLevelFilter(unit.rulesLevel, filters.rulesLevel),
    );
  }

  if (filters.weightClass) {
    result = result.filter((unit) => unit.weightClass === filters.weightClass);
  }

  return result;
}
