import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { EquipmentCategory as C } from '@/types/equipment/EquipmentCategory';

import { isPowerAmplifierEnergyWeapon } from '../powerAmplifier';
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
// MegaMek 48fcb2f64 TestTank.java:744-750 excludes VehicleFlamerWeapon.
// ISVehicleFlamer.java:52; ISHeavyFlamer.java:54; CLHeavyFlamer.java:54.
it.each(['vehicle-flamer', 'heavy-flamer', 'clheavyflamer-registry'])(
  'excludes native %s even when Requires ammo metadata is absent',
  (id) => {
    expect(
      isPowerAmplifierEnergyWeapon({ id, category: C.ENERGY_WEAPON }),
    ).toBe(false);
  },
);
it.each(['Vehicle Flamer', 'Heavy Flamer'])(
  'shares the exclusion with weapon-heat consumers that only have the name %s',
  (name) => {
    expect(
      isPowerAmplifierEnergyWeapon({ name, category: C.ENERGY_WEAPON }),
    ).toBe(false);
  },
);
it.each([
  ['flamer', 'Flamer'],
  ['flamer-heavy-registry', 'Flamer (Heavy)'],
])(
  'keeps ordinary/infantry %s outside the VehicleFlamer class exclusion',
  (id, name) => {
    expect(
      isPowerAmplifierEnergyWeapon({ id, name, category: C.ENERGY_WEAPON }),
    ).toBe(true);
  },
);
it('removes Sokar’s spurious half-ton amplifier charge and matches Java', () => {
  const state = mapToVehicleState(
    JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          'public/data/units/vehicles',
          'Sokar Urban Combat Unit.json',
        ),
        'utf8',
      ),
    ),
  );
  const result = computeVehicleWeightBreakdown(state, (id, isAmmo) =>
    getEquipmentLookupService().getMountedById(id, isAmmo === true),
  );
  expect(result.energyWeapons).toBe(0);
  expect(result.powerAmplifiers).toBe(0);
  expect(result.heatSinks).toBe(0);
  expect(state.tonnage - (result.remaining ?? NaN)).toBe(50);
});
