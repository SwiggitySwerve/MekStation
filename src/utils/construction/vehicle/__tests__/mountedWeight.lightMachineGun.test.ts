import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';

import { computeVehicleWeightBreakdown } from '../weightComposition';

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

const equipment = (file: string) =>
  computeVehicleWeightBreakdown(
    mapToVehicleState(
      JSON.parse(
        readFileSync(
          join(process.cwd(), 'public/data/units/vehicles', `${file}.json`),
          'utf8',
        ),
      ),
    ),
    (id, isAmmo) =>
      getEquipmentLookupService().getMountedById(id, isAmmo === true),
  ).equipment;

// VEH-WEIGHT (demon-causes.md): MegaMek 48fcb2f6 ISLightMG.java:72 weighs the
// IS light machine gun 0.5 t; CLLightMG.java:71 keeps the Clan one at 0.25 t.
// Equipment is Java's weapon + ammo + misc (UL-16b oracle).
it('charges Demon Medium Tank its two IS light MGs at Java’s 0.5 t', () => {
  expect(equipment('Demon Medium Tank')).toBe(7.5);
});

it('keeps Clan light MGs at 0.25 t', () => {
  // Chalchiuhtotolin (Bombast Laser) mounts four `cllightmg` (clan-light-machine-gun).
  // Isolate those mounts so the targeting computer and other equipment may change.
  const state = mapToVehicleState(
    JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          'public/data/units/vehicles',
          'Chalchiuhtotolin Support Tank (Bombast Laser).json',
        ),
        'utf8',
      ),
    ),
  );
  const machineGuns = state.equipment.filter(
    (mount) => mount.equipmentId === 'clan-light-machine-gun',
  );
  expect(machineGuns).toHaveLength(4);
  expect(
    computeVehicleWeightBreakdown(
      { ...state, equipment: machineGuns },
      (id, isAmmo) =>
        getEquipmentLookupService().getMountedById(id, isAmmo === true),
    ).equipment,
  ).toBe(4 * 0.25);
});
