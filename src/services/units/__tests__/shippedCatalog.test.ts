import fs from 'node:fs';
import path from 'node:path';

import type { RawUnitIndexEntry } from '../unitIndexMapper';

import { NodeCanonicalUnitService } from '../NodeCanonicalUnitService';

it.each([
  ['vehicles', 1444],
  ['aerospace', 620],
  ['capital', 394],
] as const)(
  'loads every shipped %s index entry through the canonical service',
  (family, count) => {
    const root = path.resolve(__dirname, '../../../../');
    const index = JSON.parse(
      fs.readFileSync(
        path.join(root, 'public/data/units', family, 'index.json'),
        'utf8',
      ),
    ) as { totalUnits: number; units: RawUnitIndexEntry[] };
    const service = new NodeCanonicalUnitService(root);

    // Counts from pinned mm-data include the nine FixedWingSupport designs
    // in aerospace; vehicle conversion deliberately skips them.
    expect(index.units).toHaveLength(count);
    expect(index.totalUnits).toBe(index.units.length);
    expect(service.getIndexSync({ family })).toHaveLength(index.units.length);
    expect(new Set(index.units.map((entry) => entry.id)).size).toBe(
      index.units.length,
    );

    for (const entry of index.units) {
      expect(service.getByIdSync(entry.id, { family })).toMatchObject({
        id: entry.id,
        unitType: entry.unitType,
      });
    }
  },
);
