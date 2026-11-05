import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';

import { resolveVehicleVariableMass } from '../variableEquipmentMass';
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

const lookup = (id: string, isAmmo?: boolean) =>
  getEquipmentLookupService().getMountedById(id, isAmmo === true);
const load = (file: string) =>
  mapToVehicleState(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/vehicles', `${file}.json`),
        'utf8',
      ),
    ),
  );
const motiveMass = (file: string) => {
  const state = load(file);
  const mount = state.equipment.find((m) =>
    /armoredmotivesystem/.test(m.equipmentId),
  );
  const item = mount && lookup(mount.equipmentId);
  return item
    ? [
        mount.equipmentId,
        resolveVehicleVariableMass(item, mount.equipmentId, {
          tonnage: state.tonnage,
          isSupportVehicle: false,
        }),
      ]
    : [];
};

// MegaMek 48fcb2f6 has two armored motive systems: ISArmoredMotiveSystem
// (MiscType.java:3909-3929) and CLArmoredMotiveSystem (:3933-3953). Their mass
// is 15% / 10% of the unit by the equipment's own tech (:607-613). The Clan
// token loaded the IS record, so Clan vehicles were charged 15%.
it.each([
  ['Bellona Hover Tank (XL)', 4.5], // 45 t
  ['Aesir Medium AA Vehicle', 5.5], // 55 t
  ['Kite Reconnaissance Vehicle', 3], // 30 t
  ['Aithon Assault Transport', 10], // 100 t
])('charges %s Clan armored motive system 10%% (%d t)', (file, tons) => {
  expect(motiveMass(file)).toEqual(['clarmoredmotivesystem-registry', tons]);
});

it('keeps the IS armored motive system at 15%', () => {
  // Bandit Hovercraft Mk 2, 50 t, ISArmoredMotiveSystem: 7.5 t.
  expect(motiveMass('Bandit Hovercraft Mk 2')).toEqual([
    'armoredmotivesystem',
    7.5,
  ]);
});

it('gives the Aesir Java’s equipment mass', () => {
  // UL-16b oracle: weapon + ammo + misc = 27.5 t (was 30.5 t at 15%).
  expect(
    computeVehicleWeightBreakdown(load('Aesir Medium AA Vehicle'), lookup)
      .equipment,
  ).toBe(27.5);
});
