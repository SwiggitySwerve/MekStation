import { render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

import { ForceStatsCompleteness } from '@/components/force/ForceStatsCompleteness';
import { calculateStats } from '@/services/forces/ForceRepository.helpers';
import { resolveNodeCanonicalUnitStats } from '@/services/forces/ForceRepository.helpers.server';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { ForcePosition } from '@/types/force';

import removedIds from './fixtures/battleMechRemovedIds.json';

const root = path.join(process.cwd(), 'public');
const catalog = path.join(root, 'data/units/battlemechs');
const index: { totalUnits: number; units: { id: string; path: string }[] } =
  JSON.parse(fs.readFileSync(path.join(catalog, 'index.json'), 'utf8'));

afterEach(() => {
  resetSQLiteService();
});

it('shows all 36 removed references while retaining the valid-unit subtotal', () => {
  getSQLiteService({ path: ':memory:' }).initialize();
  expect(removedIds).toHaveLength(36);
  for (const id of removedIds) {
    expect(index.units.some((row) => row.id === id)).toBe(false);
    expect(resolveNodeCanonicalUnitStats(`battlemechs:${id}`)).toEqual({
      missingUnit: { family: 'battlemechs', id },
    });
  }
  const stats = calculateStats(
    ['atlas-as7-d', ...removedIds].map((unitId, slot) => ({
      id: String(slot),
      unitId,
      pilotId: null,
      slot,
      position: ForcePosition.Member,
    })),
    { canonicalUnitStatsResolver: resolveNodeCanonicalUnitStats },
  );
  const atlas = resolveNodeCanonicalUnitStats('atlas-as7-d');
  if (!atlas || 'missingUnit' in atlas)
    throw new Error('Missing Atlas control');
  expect(stats).toMatchObject({
    complete: false,
    totalBV: atlas.bv,
    totalTonnage: atlas.tonnage,
  });
  expect(stats.missingUnits).toHaveLength(36);
  render(<ForceStatsCompleteness stats={stats} />);
  expect(screen.getByText('Incomplete Totals')).toBeInTheDocument();
  for (const id of removedIds)
    expect(
      screen.getByText(`Unit not found: (battlemechs, ${id})`),
    ).toBeInTheDocument();
});

it('ships all 4263 pinned Meks with the 23 LAM subtypes', () => {
  expect(index.totalUnits).toBe(4263);
  const lams = index.units
    .map((row) => {
      const unit = JSON.parse(
        fs.readFileSync(path.join(catalog, row.path), 'utf8'),
      ) as {
        id: string;
        configuration: string;
        model: string;
        lamType?: string;
      };
      expect(unit.id).toBe(row.id);
      return unit;
    })
    .filter((unit) => unit.configuration === 'LAM');
  expect(lams).toHaveLength(23);
  for (const unit of lams)
    expect(unit.lamType).toBe(
      ['SHD-X1', 'SHD-X2'].includes(unit.model) ? 'Bimodal' : 'Standard',
    );
});
