import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';

import { resolveEquipmentId } from '../equipmentResolution';
import { UnitLoaderService } from '../unitLoader';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));
beforeAll(async () => {
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});

const mech = (path: string) =>
  JSON.parse(
    readFileSync(
      join(process.cwd(), 'public/data/units/battlemechs', `${path}.json`),
      'utf8',
    ),
  );

// FU-101 (blocked-classes.json): MTF crit tokens that resolved to nothing,
// although the catalog already holds the pinned MegaMek 48fcb2f6 item with
// Java's values. Crit-only recovery cannot join them to a list mount until
// the token reaches the same record. Each record was checked against Java's
// BV, tons and tech (L-EQ3 java-registry.json).
it.each([
  // CLERPulseLaserSmall.java:59, 36 BV, 1.5 t; the list id is er-small-pulse-laser.
  ['CLERSmallPulseLaser', 'clan-er-small-pulse-laser', 'er-small-pulse-laser'],
  // ISMekTaser.java:70, 40 BV, 4 t; the list id is battlemech-taser.
  ['Mek Taser', 'battlemech-taser', 'battlemech-taser'],
  // AmmoType.java:13938 / :14120 / :10867 (bins have no list id).
  ['CLIMPAmmoAC5', 'impammoac5', undefined],
  ['CLImpGaussAmmo', 'impgaussammo', undefined],
  ['ISiNarc Explosive Pods', 'inarc-explosive-pods', undefined],
])('crit token %s reaches %s, joining its list mount', (token, id, listId) => {
  const crit = resolveEquipmentId(token, TechBase.CLAN, TechBaseMode.MIXED, [
    token,
  ]).equipmentDef?.id;
  expect(crit).toBe(id);
  if (listId)
    expect(
      resolveEquipmentId(listId, TechBase.CLAN, TechBaseMode.MIXED, [token])
        .equipmentDef?.id,
    ).toBe(id);
});

it.each([
  ['5-civil-war/standard/Prowler PWR-1X', 'clan-er-small-pulse-laser'],
  ['4-clan-invasion/standard/Aquagladius AQS-3', 'battlemech-taser'],
  ['3-succession-wars/experimental/Bull Shark BSK-M3', 'impammoac5'],
  ['3-succession-wars/standard/Cestus CTS-6Y-EC', 'impgaussammo'],
  ['6-dark-age/advanced/Kintaro KTO-22', 'inarc-explosive-pods'],
])('%s loads %s on its crit slots', (path, id) => {
  const state = new UnitLoaderService().mapToUnitState(mech(path), true);
  const mounts = state.equipment.filter((item) => item.equipmentId === id);
  expect(mounts.length).toBeGreaterThan(0);
  expect(mounts.every((item) => (item.slots?.length ?? 0) > 0)).toBe(true);
});
