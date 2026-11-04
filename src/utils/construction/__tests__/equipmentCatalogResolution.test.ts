import { readFileSync } from 'node:fs';

import {
  expectJavaCatalogAddition,
  javaCatalogAdditions,
} from '@/__tests__/helpers/equipmentJavaAdditions.test-helpers';

import removedAllowlistRows from '../../../../scripts/equipment-catalog/allowlist-resolved.json';
import {
  WEAPON_CATALOG_FILES,
  AMMUNITION_CATALOG_FILES,
  MISCELLANEOUS_CATALOG_FILES,
} from '../equipmentBVCatalogData';
import { getEquipmentEntry } from '../equipmentBVResolver';

// The resolution guard and generator tests (scripts/equipment-catalog/*.test.mjs)
// run as node:test files in Schema Bridge ("Test equipment catalog generator and
// resolution guards", pr-checks.yml, registered in openspec-ci-contracts.mjs).
// Re-spawning them here cost ~3.5 min per run and, when a loaded machine hit
// the spawn timeout, crashed the Jest worker on a circular spawn error (check 5).

const generatedCatalogItems = [
  ...WEAPON_CATALOG_FILES,
  ...AMMUNITION_CATALOG_FILES,
  ...MISCELLANEOUS_CATALOG_FILES,
].flatMap((file) => file.items ?? []);
it.each(javaCatalogAdditions)(
  'pins all added Java values and source citation: $native',
  (row) => {
    expectJavaCatalogAddition(
      generatedCatalogItems.find((item) => item.id === row.values.id),
    );
  },
);

const baselineResolution = JSON.parse(
  readFileSync('scripts/equipment-catalog/resolution-before.json', 'utf8'),
) as { apis: string[]; resolved: Record<string, Record<string, number[]>> };
const equipmentApi = baselineResolution.apis.indexOf('equipment');
it.each(removedAllowlistRows)(
  'each removed unresolved id resolves to the added Java record: $family/$input',
  (row) => {
    // The compact baseline keeps only resolved entries; it now pins the record.
    const baselineTarget = Object.entries(
      baselineResolution.resolved[row.input] ?? {},
    ).find(([, apis]) => apis.includes(equipmentApi))?.[0];
    expect(baselineTarget).toBe(row.id);
    const item = getEquipmentEntry(row.input);
    expect(item?.id).toBe(row.id);
    expectJavaCatalogAddition(item, 'bv');
  },
);
