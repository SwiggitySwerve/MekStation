import { render, screen } from '@testing-library/react';

import { ForceBuilder } from '@/components/force/ForceBuilder';
import { ForceCard } from '@/components/force/ForceCard';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { ForceType } from '@/types/force';

import { ForceRepository } from '../ForceRepository';
import { calculateUnitStats } from '../ForceRepository.helpers';
import { resolveNodeCanonicalUnitStats } from '../ForceRepository.helpers.server';

jest.mock('@/utils/construction/bvAdapter', () => ({
  calculateUnitBV: () => 1897,
}));

beforeEach(() => {
  resetSQLiteService();
  getSQLiteService({ path: ':memory:' }).initialize();
});
afterEach(() => {
  resetSQLiteService();
  jest.restoreAllMocks();
});

function savedForce() {
  const repository = new ForceRepository({
    canonicalUnitStatsResolver: resolveNodeCanonicalUnitStats,
  });
  const created = repository.createForce({
    name: 'Saved References',
    forceType: ForceType.Lance,
  });
  if (!created.id) throw new Error(created.error);
  const force = repository.getForceById(created.id);
  if (!force) throw new Error('Missing test force');
  [
    'atlas-as7-d',
    'missing-saved-design',
    'vehicles:missing-catalog-design',
  ].forEach((unitId, slot) => {
    repository.updateAssignment(force.assignments[slot].id, { unitId });
  });
  const reloaded = new ForceRepository({
    canonicalUnitStatsResolver: resolveNodeCanonicalUnitStats,
  }).getForceById(created.id);
  if (!reloaded) throw new Error('Missing reloaded force');
  return reloaded;
}

it('keeps valid subtotals and marks persisted missing references incomplete', () => {
  const force = savedForce();
  expect(force.assignments.filter((a) => a.unitId)).toHaveLength(3);
  expect(force.stats).toMatchObject({
    totalBV: 1897,
    totalTonnage: 100,
    complete: false,
    missingUnits: [
      { family: 'battlemechs', id: 'missing-saved-design' },
      { family: 'vehicles', id: 'missing-catalog-design' },
    ],
  });
  expect(calculateUnitStats('missing-saved-design')).toEqual({
    missingUnit: { family: 'battlemechs', id: 'missing-saved-design' },
  });
  expect(
    resolveNodeCanonicalUnitStats('vehicles:missing-catalog-design'),
  ).toEqual({
    missingUnit: { family: 'vehicles', id: 'missing-catalog-design' },
  });
});

it.each(['builder', 'card'])(
  'shows missing identities and incomplete totals in the %s',
  (surface) => {
    const force = savedForce();
    render(
      surface === 'builder' ? (
        <ForceBuilder
          force={force}
          pilots={new Map()}
          units={
            new Map([
              ['atlas-as7-d', { name: 'Atlas AS7-D', bv: 1897, tonnage: 100 }],
            ])
          }
        />
      ) : (
        <ForceCard force={force} />
      ),
    );
    expect(screen.getByText('Incomplete Totals')).toBeInTheDocument();
    expect(
      screen.getByText('Unit not found: (battlemechs, missing-saved-design)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Unit not found: (vehicles, missing-catalog-design)'),
    ).toBeInTheDocument();
    expect(screen.getByText('1,897')).toBeInTheDocument();
  },
);

it('accepts legacy serialized stats with no completeness fields', () => {
  const force = savedForce();
  const stats = {
    totalBV: 1897,
    totalTonnage: 100,
    assignedPilots: 0,
    assignedUnits: 1,
    emptySlots: 3,
    averageSkill: null,
  };
  render(
    <ForceCard
      force={{ ...force, stats: JSON.parse(JSON.stringify(stats)) }}
    />,
  );
  expect(screen.queryByText('Incomplete Totals')).not.toBeInTheDocument();
});

it('reports a missing definition even when its index entry remains', () => {
  jest
    .spyOn(getNodeCanonicalUnitService(), 'getByIdSync')
    .mockReturnValueOnce(null);
  expect(resolveNodeCanonicalUnitStats('atlas-as7-d')).toEqual({
    missingUnit: { family: 'battlemechs', id: 'atlas-as7-d' },
  });
});
