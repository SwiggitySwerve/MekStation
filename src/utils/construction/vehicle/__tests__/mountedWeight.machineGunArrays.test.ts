import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';

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

const arrays = (file: string) =>
  mapToVehicleState(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/vehicles', `${file}.json`),
        'utf8',
      ),
    ),
  )
    .equipment.filter((mount) => /mga/.test(mount.equipmentId))
    .map((mount) => [
      mount.equipmentId,
      getEquipmentLookupService().getById(mount.equipmentId)?.weight,
    ]);

// MegaMek 48fcb2f6: ISLMGA and ISMGA weigh 0.5 t (ISLightMGA.java:69,82;
// ISMGA.java:70,83). Their decorated list ids (the BLK "(ST)" suffix and the
// ":omni" pod marker) lost the IS prefix and loaded the Clan arrays (0.25 t).
it.each([
  ['Myrmidon Medium Tank P (Tate)', 'islmga-registry', 2],
  ['Zibler Fast Strike Tank (B)', 'islmga-registry', 1],
  ['Dreadnought Mk II Land Train', 'ismga-registry', 2],
])('mounts %s IS machine gun arrays at 0.5 t', (file, id, count) => {
  expect(arrays(file)).toEqual(Array(count).fill([id, 0.5]));
});

// CLLightMGA.java:81 / CLMGA / CLHeavyMGA: the Clan arrays stay 0.25 t.
it.each([
  ['Bandit (C) Hovercraft G', ['hmga', 'lmga']],
  ['Eurus MBT Prime', ['mga']],
  ['SM Tank Destroyer SM1A', ['lmga']],
])('keeps %s Clan arrays at 0.25 t', (file, ids) => {
  expect(arrays(file)).toEqual(ids.map((id) => [id, 0.25]));
});
