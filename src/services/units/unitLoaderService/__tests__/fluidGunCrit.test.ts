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

// FU-101 (blocked-classes.json): the MTF crit token "IS Fluid Gun" (MegaMek
// 48fcb2f6 ISFluidGun: 6 BV, 2 t, 2 slots) resolved to nothing, although
// fluid-gun carries those values, so the list mount never took its slots.
it.each([
  '4-clan-invasion/standard/Flashfire FLS-P5',
  '6-dark-age/experimental/Valiant VLT-3E',
])('%s mounts its fluid guns on their crit slots', (path) => {
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
    (item) => item.equipmentId === 'fluid-gun',
  );
  expect(mounts.length).toBeGreaterThan(0);
  expect(mounts.every((item) => (item.slots?.length ?? 0) > 0)).toBe(true);
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
      .filter((message) => /Fluid Gun/.test(message)),
  ).toEqual([]);
});
