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

const mounts = (file: string, pattern: RegExp) =>
  mapToVehicleState(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/vehicles', `${file}.json`),
        'utf8',
      ),
    ),
  )
    .equipment.filter((mount) => pattern.test(mount.equipmentId))
    .map((mount) => {
      const item = getEquipmentLookupService().getById(mount.equipmentId);
      return [mount.equipmentId, item?.weight];
    });

// MegaMek 48fcb2f6: ISLongTom is the 30 t artillery piece (LongTom.java:58,71);
// the Long Tom Cannon is a separate 20 t item. The vehicle list id islongtom
// loaded the cannon record.
it.each([
  ['Mobile Long Tom Artillery LT-MOB-25', 1],
  ['Paladin Defense System', 2],
])('mounts %s Long Tom artillery at 30 t', (file, count) => {
  expect(mounts(file, /long-?tom(?!.*ammo)/)).toEqual(
    Array(count).fill(['islongtom-registry', 30]),
  );
});

it('keeps the Long Tom Cannon at 20 t', () => {
  expect(
    mounts('Padilla Tube Artillery Tank (LTC)', /long-?tom(?!.*ammo)/),
  ).toEqual([['long-tom', 20]]);
});

// CLMekMortar8.java:69-70: Clan Mech Mortar-8 is 5 t in 3 slots.
it.each(['Bardiche Heavy Strike Tank C', 'Gurzil Support Tank'])(
  'mounts %s Clan Mech Mortar-8 at 5 t',
  (file) => {
    expect(mounts(file, /mech-mortar-8/)).toEqual([
      ['clan-mech-mortar-8', 5],
      ['clan-mech-mortar-8', 5],
    ]);
  },
);
