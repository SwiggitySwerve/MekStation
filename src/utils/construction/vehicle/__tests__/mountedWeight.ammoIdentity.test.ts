import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { EquipmentCategory } from '@/types/equipment';

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

// The resolver every vehicle weight caller passes (status bar, harnesses).
const resolve = (id: string, isAmmo?: boolean) =>
  getEquipmentLookupService().getMountedById(id, isAmmo === true);
const vehicle = (file: string) =>
  mapToVehicleState(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/vehicles', `${file}.json`),
        'utf8',
      ),
    ),
  );

// Follow-up 93 for VEH-WEIGHT (demon-causes.md). The ammunition catalog's
// MRM and Clan Streak bins share their launcher's id (mrm-20, mrm-40,
// clan-streak-srm-4), so an id-only lookup weighed each bin as the launcher.
// Java charges a bin its AmmoType mass (AmmoType.java:2068, 1 t;
// TestEntity.java:753-768).
it.each([
  'Hiryo Armored Infantry Transport (MRM)',
  'Mamono IFV',
  'Chalchiuhtotolin Support Tank (Bombast Laser)',
])('weighs every %s ammo mount as ammunition', (file) => {
  const ammo = vehicle(file).equipment.filter((mount) => mount.isAmmo);
  expect(ammo.length).toBeGreaterThan(0);
  for (const mount of ammo)
    expect(resolve(mount.equipmentId, true)?.category).toBe(
      EquipmentCategory.AMMUNITION,
    );
});

it('charges Hiryo (MRM) Java’s equipment mass: one MRM 20 and three 1 t bins', () => {
  // Java (UL-16b oracle): equipment 10 t; the bins were charged 7 t each (28 t).
  const breakdown = computeVehicleWeightBreakdown(
    vehicle('Hiryo Armored Infantry Transport (MRM)'),
    resolve,
  );
  expect(breakdown.equipment).toBe(10);
});
