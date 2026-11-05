import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { getEquipmentSlotIssues } from '@/utils/construction/slotOperations/placement';

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

// FU-101 mortar classes. MegaMek 48fcb2f6: Clan Mech Mortar-8 is 5 t / 3 slots
// and Clan Mech Mortar-4 3.5 t / 2 slots. Crossbow D's list id reached a stale
// 10 t / 5 slot record; Antlion LK-3D's crit token "Clan Mech Mortar-4"
// resolved to nothing, and its record was 5 t / 3 slots.
it.each([
  ['4-clan-invasion/experimental/Crossbow D', 'clan-mech-mortar-8-registry', 5],
  ['6-dark-age/standard/Antlion LK-3D', 'clan-mech-mortar-4', 3.5],
])('%s mounts %s on its crit slots at Java’s %d t', (path, id, tons) => {
  const state = new UnitLoaderService().mapToUnitState(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/battlemechs', `${path}.json`),
        'utf8',
      ),
    ),
    true,
  );
  const mounts = state.equipment.filter((item) => item.equipmentId === id);
  expect(mounts.length).toBeGreaterThan(0);
  expect(mounts.every((item) => (item.slots?.length ?? 0) > 0)).toBe(true);
  expect(getEquipmentLookupService().getById(id)?.weight).toBe(tons);
  expect(
    getEquipmentSlotIssues(
      state.equipment,
      state.configuration,
      state.engineType,
      state.gyroType,
      state.armActuators,
      state.cockpitType,
    )
      .map((issue) => issue.message)
      .filter((message) => /Mortar/i.test(message)),
  ).toEqual([]);
});
