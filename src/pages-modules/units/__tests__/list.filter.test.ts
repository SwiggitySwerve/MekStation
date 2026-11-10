import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';

/**
 * The custom-unit list's rules-level filter. Saved records store the contract
 * tag ("STANDARD"); a record without one falls back to the display value.
 */
import type { UnitEntry } from '../list.types';

import { filterUnits } from '../list.filter';

function entry(id: string, rulesLevel: string): UnitEntry {
  return {
    id,
    chassis: `Chassis ${id}`,
    variant: id,
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
    era: 'Late Succession Wars',
    rulesLevel: rulesLevel as RulesLevel,
    unitType: 'BattleMech',
    weightClass: WeightClass.MEDIUM,
    currentVersion: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}
const units = [
  entry('a', 'STANDARD'),
  entry('b', 'STANDARD'),
  entry('c', 'Standard'),
  entry('d', 'ADVANCED'),
  entry('e', 'EXPERIMENTAL'),
];
const base = {
  search: '',
  unitType: '',
  techBase: '' as const,
  weightClass: '' as const,
};

describe('custom-unit list rules-level filter', () => {
  it('matches the tag and the display spelling of the chosen level', () => {
    expect(
      filterUnits(units, { ...base, rulesLevel: 'STANDARD' }).map((u) => u.id),
    ).toEqual(['a', 'b', 'c']);
    expect(
      filterUnits(units, { ...base, rulesLevel: 'ADVANCED' }).map((u) => u.id),
    ).toEqual(['d']);
  });

  it('returns every unit with no level chosen, and none for an unknown level', () => {
    expect(filterUnits(units, { ...base, rulesLevel: '' })).toHaveLength(5);
    expect(
      filterUnits(units, { ...base, rulesLevel: 'Bogus' as never }),
    ).toHaveLength(0);
  });
});
