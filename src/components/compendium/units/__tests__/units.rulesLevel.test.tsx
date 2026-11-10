/**
 * The unit library's rules-level filter, sort and label against the index's
 * real spelling (the contract tag, e.g. "STANDARD"), not the enum's display
 * value. The fixture has the shape of the corrected index: tags only.
 */
import { render, screen, within } from '@testing-library/react';

import type { IUnitEntry } from '@/types/pages';

import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { Era } from '@/types/temporal/Era';

import { RULES_LEVEL_OPTIONS } from '../units.constants';
import {
  rulesLevelLabel,
  sortUnits,
  unitMatchesSelectFilters,
} from '../units.helpers';
import { UnitsTable } from '../UnitsTable';

const counts = {
  INTRODUCTORY: 2,
  STANDARD: 5,
  ADVANCED: 3,
  EXPERIMENTAL: 2,
} as const;

let seq = 0;
function unit(rulesLevel: string | undefined, over: Partial<IUnitEntry> = {}) {
  seq += 1;
  return {
    id: `u${seq}`,
    name: `Unit ${seq}`,
    chassis: `Chassis ${seq}`,
    variant: `V${seq}`,
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
    era: Era.LATE_SUCCESSION_WARS,
    weightClass: WeightClass.MEDIUM,
    unitType: 'BattleMech',
    rulesLevel,
    ...over,
  } as IUnitEntry;
}
const fixture: IUnitEntry[] = (
  Object.entries(counts) as [keyof typeof counts, number][]
).flatMap(([level, n]) => Array.from({ length: n }, () => unit(level)));

const filters = (rulesLevel: string) => ({
  search: '',
  techBase: '',
  weightClass: '',
  rulesLevel,
  yearMin: '',
  yearMax: '',
  tonnageMin: '',
  tonnageMax: '',
  bvMin: '',
  bvMax: '',
});

describe('rules-level filter', () => {
  it('offers the tags as values with the level names as labels', () => {
    expect(RULES_LEVEL_OPTIONS.slice(0, 5)).toEqual([
      { value: '', label: 'All Levels' },
      { value: 'INTRODUCTORY', label: 'Introductory' },
      { value: 'STANDARD', label: 'Standard' },
      { value: 'ADVANCED', label: 'Advanced' },
      { value: 'EXPERIMENTAL', label: 'Experimental' },
    ]);
  });

  it.each(Object.entries(counts))(
    'every option value returns the %s rows',
    (tag, expected) => {
      const option = RULES_LEVEL_OPTIONS.find((o) => o.value === tag);
      expect(option).toBeDefined();
      expect(
        fixture.filter((u) =>
          unitMatchesSelectFilters(u, filters(option?.value ?? '')),
        ),
      ).toHaveLength(expected);
    },
  );

  it('returns every row for All Levels and none for an unknown value', () => {
    expect(
      fixture.filter((u) => unitMatchesSelectFilters(u, filters(''))),
    ).toHaveLength(12);
    expect(
      fixture.filter((u) => unitMatchesSelectFilters(u, filters('Bogus'))),
    ).toHaveLength(0);
  });

  it('still matches a record stored with the display spelling, and combines with other filters', () => {
    const legacy = unit('Standard');
    expect(unitMatchesSelectFilters(legacy, filters('STANDARD'))).toBe(true);
    expect(
      unitMatchesSelectFilters(legacy, {
        ...filters('STANDARD'),
        techBase: TechBase.CLAN,
      }),
    ).toBe(false);
  });
});

describe('rules-level sort', () => {
  const shuffled = [
    unit('EXPERIMENTAL'),
    unit('STANDARD'),
    unit('INTRODUCTORY'),
    unit('ADVANCED'),
    unit('STANDARD'),
  ];
  const levels = (units: IUnitEntry[]) => units.map((u) => u.rulesLevel);

  it('orders by the pinned level order, ascending and descending', () => {
    expect(
      levels(sortUnits(shuffled, { column: 'rulesLevel', direction: 'asc' })),
    ).toEqual([
      'INTRODUCTORY',
      'STANDARD',
      'STANDARD',
      'ADVANCED',
      'EXPERIMENTAL',
    ]);
    expect(
      levels(sortUnits(shuffled, { column: 'rulesLevel', direction: 'desc' })),
    ).toEqual([
      'EXPERIMENTAL',
      'ADVANCED',
      'STANDARD',
      'STANDARD',
      'INTRODUCTORY',
    ]);
  });

  it('puts a missing or unknown level last in both directions', () => {
    const mixed = [
      unit(undefined),
      unit('ADVANCED'),
      unit('Bogus'),
      unit('INTRODUCTORY'),
    ];
    for (const direction of ['asc', 'desc'] as const) {
      const sorted = levels(
        sortUnits(mixed, { column: 'rulesLevel', direction }),
      );
      expect(sorted.slice(0, 2)).toEqual(
        direction === 'asc'
          ? ['INTRODUCTORY', 'ADVANCED']
          : ['ADVANCED', 'INTRODUCTORY'],
      );
      expect(new Set(sorted.slice(2))).toEqual(new Set([undefined, 'Bogus']));
    }
  });
});

describe('rules-level label', () => {
  it.each([
    ['INTRODUCTORY', 'Intro'],
    ['STANDARD', 'Std'],
    ['ADVANCED', 'Adv'],
    ['EXPERIMENTAL', 'Exp'],
    ['Standard', 'Std'],
  ])('shows %s as %s', (value, label) => {
    expect(rulesLevelLabel(value)).toBe(label);
  });

  it('shows an unknown level as written and a missing one as a dash', () => {
    expect(rulesLevelLabel('Bogus')).toBe('Bogus');
    expect(rulesLevelLabel(undefined)).toBe('—');
  });

  it('prints the short label in the table for index-spelled rows', () => {
    render(
      <UnitsTable
        units={[unit('ADVANCED'), unit('STANDARD')]}
        sort={{ column: 'chassis', direction: 'asc' }}
        onSort={() => undefined}
      />,
    );
    const rows = screen.getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText('Adv')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Std')).toBeInTheDocument();
  });
});
