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

// FU-101 (blocked-classes.json): MegaMek 48fcb2f6 ISTSEMPOneShot (98 BV, 4 t,
// 3 slots; ISTSEMPOneShot.java:56-61) had no record. Its list slug loaded the
// TSEMP Cannon (6 t, 5 slots) and its crit token "TSEMP One-Shot" nothing, so
// the mount never took its slots and Hellion G weighed 2 t heavy.
it.each([
  '6-dark-age/experimental/Hellion G',
  '6-dark-age/standard/Celerity CLR-04-R',
])('%s mounts its TSEMP One-Shot on its crit slots', (path) => {
  const state = new UnitLoaderService().mapToUnitState(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/battlemechs', `${path}.json`),
        'utf8',
      ),
    ),
    true,
  );
  const mounts = state.equipment.filter(
    (item) => item.equipmentId === 'tsemp-one-shot-registry',
  );
  expect(mounts.length).toBe(1);
  expect(mounts[0].slots).toHaveLength(3);
  expect(
    getEquipmentLookupService().getById('tsemp-one-shot-registry')?.weight,
  ).toBe(4);
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
      .filter((message) => /TSEMP/.test(message)),
  ).toEqual([]);
});
