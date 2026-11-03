import { execFileSync } from 'node:child_process';
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

it('preserves merged-main lookup results except the five approved Java reroutes', () => {
  execFileSync(
    process.execPath,
    ['--test', 'scripts/equipment-catalog/resolution.test.mjs'],
    {
      env: { ...process.env, NODE_ENV: 'test' },
      windowsHide: true,
      timeout: 360_000,
    },
  );
}, 370_000);

it('keeps every existing catalog record and validates generated Java additions', () => {
  execFileSync(
    process.execPath,
    ['--test', 'scripts/equipment-catalog/generate.test.mjs'],
    {
      windowsHide: true,
      timeout: 30_000,
    },
  );
}, 35_000);

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
