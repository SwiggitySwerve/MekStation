import fs from 'node:fs';
import path from 'node:path';

import { UnitContract } from '@/types/contracts';

import type { RawUnitIndexEntry } from '../unitIndexMapper';

it('parses every infantry file and keeps samples outside the indexed catalog', () => {
  const directory = path.resolve('public/data/units/infantry');
  const index = JSON.parse(
    fs.readFileSync(path.join(directory, 'index.json'), 'utf8'),
  ) as {
    totalUnits: number;
    units: RawUnitIndexEntry[];
  };
  const samples = new Map([
    ['foot-rifle-platoon.json', 'inf-foot-rifle-28'],
    ['jump-srm-platoon.json', 'inf-jump-srm-21'],
    ['mechanized-tracked-platoon.json', 'inf-mechanized-tracked-20'],
  ]);
  const files = fs
    .readdirSync(directory, { recursive: true })
    .map(String)
    .filter((file) => file.endsWith('.json') && file !== 'index.json');
  const designs = files.filter((file) => !samples.has(file));
  expect(index.totalUnits).toBe(1820);
  expect(index.units).toHaveLength(index.totalUnits);
  expect(index.units.map((entry) => entry.path).sort()).toEqual(designs.sort());
  expect(files.filter((file) => samples.has(file)).sort()).toEqual(
    [...samples.keys()].sort(),
  );
  const ids: string[] = [];
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'));
    const unit = UnitContract.parse(raw);
    ids.push(unit.id);
    if (samples.has(file)) {
      expect(unit.id).toBe(samples.get(file));
    } else {
      expect(unit).toEqual(raw);
      expect(unit.unitType).toBe('Infantry');
      expect([...samples.values()]).not.toContain(unit.id);
      expect([...samples.keys()]).not.toContain(path.basename(file));
      expect(index.units.find((entry) => entry.path === file)).toMatchObject({
        id: unit.id,
        unitType: unit.unitType,
        tonnage: 0,
      });
    }
  }
  expect(new Set(ids).size).toBe(files.length);
});
