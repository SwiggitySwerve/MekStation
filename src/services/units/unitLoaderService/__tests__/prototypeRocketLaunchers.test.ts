import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';

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

// Follow-up 102 / 113: MegaMek 48fcb2f6 PrototypeRL10/15 are their own items
// (CLRocketLauncher10Prototype / 15Prototype, PrototypeRL15.java:54-57,77-83;
// introduced 2095), not the production RL/10 and RL/15 (3064). Both the list id
// and the crit token reached the production record.
it.each([
  [
    '3-succession-wars/standard/Carbine CON-1 ConstructionMech (RL)',
    'clrocketlauncher15prototype-registry',
    5,
    2,
  ],
  [
    '3-succession-wars/standard/Crosscut ED-X2 LoggerMech (RL)',
    'clrocketlauncher10prototype-registry',
    8,
    1,
  ],
])('%s mounts %s on its crits', (path, id, count, slots) => {
  const state = new UnitLoaderService().mapToUnitState(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/battlemechs', `${path}.json`),
        'utf8',
      ),
    ),
    true,
  );
  const launchers = state.equipment.filter((item) =>
    /^rl1[05]$|rocketlauncher1[05]/.test(item.equipmentId),
  );
  expect(launchers.map((item) => item.equipmentId)).toEqual(
    Array(count).fill(id),
  );
  expect(launchers.every((item) => item.slots?.length === slots)).toBe(true);
  expect(getEquipmentLookupService().getById(id)?.introductionYear).toBe(2095);
});
