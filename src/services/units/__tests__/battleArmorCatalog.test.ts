import fs from 'node:fs';
import path from 'node:path';

import { UnitContract } from '@/types/contracts';

import type { RawUnitIndexEntry } from '../unitIndexMapper';

it('parses every BA file through UnitContract and isolates the indexed catalog', () => {
  const directory = path.resolve('public/data/units/battlearmor');
  const index = JSON.parse(
    fs.readFileSync(path.join(directory, 'index.json'), 'utf8'),
  ) as { totalUnits: number; units: RawUnitIndexEntry[] };
  // These pre-ingest synthetic BV fixtures retain their original paths for
  // existing consumers. They are not designs from the pinned source corpus.
  const fixtures = new Set([
    'clan-sylph-sqd5.json',
    'elemental-standard-sqd5.json',
    'is-cavalier-sqd4.json',
  ]);
  const fixtureIds = new Set(
    [...fixtures].map(
      (file) =>
        UnitContract.parse(
          JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')),
        ).id,
    ),
  );
  expect([...fixtureIds].sort()).toEqual(
    [...fixtures].map((file) => file.slice(0, -5)).sort(),
  );
  expect(
    index.units.filter(
      (entry) =>
        fixtures.has(path.basename(entry.path)) || fixtureIds.has(entry.id),
    ),
  ).toEqual([]);
  const files = fs
    .readdirSync(directory, { recursive: true })
    .map(String)
    .filter((file) => file.endsWith('.json') && file !== 'index.json');
  const designs = files.filter((file) => !fixtures.has(file));
  expect(index.totalUnits).toBe(1188);
  expect(index.units).toHaveLength(designs.length);
  expect(index.totalUnits).toBe(index.units.length);
  expect(files.filter((file) => fixtures.has(file)).sort()).toEqual(
    [...fixtures].sort(),
  );
  expect(index.units.map((entry) => entry.path).sort()).toEqual(designs.sort());
  expect(new Set(index.units.map((entry) => entry.id)).size).toBe(
    designs.length,
  );
  const ids: string[] = [];
  for (const file of files) {
    const unit = UnitContract.parse(
      JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')),
    );
    ids.push(unit.id);
    if (!fixtures.has(file)) {
      expect(unit.unitType).toBe('BattleArmor');
      const entry = index.units.find((row) => row.path === file);
      expect(entry).toMatchObject({ id: unit.id, unitType: unit.unitType });
    }
  }
  expect(new Set(ids).size).toBe(files.length);
});
