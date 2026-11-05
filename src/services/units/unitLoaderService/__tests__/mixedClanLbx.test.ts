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

// Follow-up 93 / 113 (mixed-tech Clan LB-X) and the FU-101 rows behind its
// LB-X ammo classes: on a mixed-tech mech the list id lb-N-x-ac reached the IS
// record (more slots and tons) while the crit tokens are MegaMek 48fcb2f6's
// CLLBXAC2/5/10 (5/7/10 t, 3/4/5 slots), so the mount never took its slots.
// List and crit now reach the Clan record together.
it.each([
  ['4-clan-invasion/standard/Sunder SD1-OR', ['clan-lb-10-x-ac']],
  ['6-dark-age/experimental/Wulfen D', ['clan-lb-2-x-ac']],
  [
    '3-succession-wars/standard/Emperor EMP-6A-EC',
    ['clan-lb-10-x-ac', 'clan-lb-5-x-ac'],
  ],
  ['6-dark-age/standard/Templar III TLR2-OD', ['clan-lb-10-x-ac']],
  ['6-dark-age/experimental/Templar TLR1-OR', ['clan-lb-10-x-ac']],
])('%s mounts its Clan LB-X on its crit slots', (path, ids) => {
  const state = new UnitLoaderService().mapToUnitState(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/battlemechs', `${path}.json`),
        'utf8',
      ),
    ),
    true,
  );
  for (const id of ids) {
    const mounts = state.equipment.filter((item) => item.equipmentId === id);
    expect(mounts.length).toBeGreaterThan(0);
    expect(mounts.every((item) => (item.slots?.length ?? 0) > 0)).toBe(true);
  }
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
      .filter((message) => /LB \d+-X/.test(message)),
  ).toEqual([]);
});
