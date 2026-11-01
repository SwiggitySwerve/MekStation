import fs from 'node:fs';
import path from 'node:path';

import type { RawUnitIndexEntry } from '../unitIndexMapper';

import { NodeCanonicalUnitService } from '../NodeCanonicalUnitService';

it('loads every shipped vehicle index entry through the canonical service', () => {
  const root = path.resolve(__dirname, '../../../../');
  const index = JSON.parse(
    fs.readFileSync(
      path.join(root, 'public/data/units/vehicles/index.json'),
      'utf8',
    ),
  ) as { totalUnits: number; units: RawUnitIndexEntry[] };
  const service = new NodeCanonicalUnitService(root);

  // The pinned source has 1,453 BLKs; its nine FixedWingSupport designs
  // belong to the aerospace catalog.
  expect(index.units).toHaveLength(1444);
  expect(index.totalUnits).toBe(index.units.length);
  expect(service.getIndexSync({ family: 'vehicles' })).toHaveLength(
    index.units.length,
  );
  expect(new Set(index.units.map((entry) => entry.id)).size).toBe(
    index.units.length,
  );

  for (const entry of index.units) {
    expect(service.getByIdSync(entry.id, { family: 'vehicles' })).toMatchObject(
      {
        id: entry.id,
        unitType: entry.unitType,
      },
    );
  }
});
