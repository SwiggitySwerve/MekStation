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

const equipment = (file: string, omitCase = false) => {
  const state = mapToVehicleState(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/vehicles', file + '.json'),
        'utf8',
      ),
    ),
  );
  return computeVehicleWeightBreakdown(
    omitCase
      ? {
          ...state,
          equipment: state.equipment.filter((m) => m.equipmentId !== 'case'),
        }
      : state,
    (id, isAmmo) =>
      getEquipmentLookupService().getMountedById(id, isAmmo === true),
  ).equipment;
};

// Follow-up 93 for VEH-WEIGHT (carrying-report.md). MegaMek 48fcb2f6 has two
// CASE items: IS CASE 0.5 t (MiscType.java:4709-4715) and Clan CASE 0 t
// (:4774-4780). The catalog has the IS one only, so a `clcase` mount was
// charged 0.5 t. Equipment is Java's weapon + ammo + misc (UL-16b oracle).
it.each([
  // Java 8 + 2 + 0: CASE was the only remaining difference.
  ['Balac Strike VTOL (LRM)', 10],
  // Java 7 + 1 + 0.
  ['Bandit (C) Hovercraft D', 8],
  // Java 4 + 1 + 1 (active probe), the Streak bin weighed 1 t since #2797.
  ['Hephaestus Scout Tank B', 7],
  // Java 14 + 4 + 1: the 1 t is the supercharger, still a variable-mass
  // placeholder at 0 here, so this pins the CASE term only.
  ['SM5 Field Commander Prime', 18],
])('charges %s Clan CASE at Java’s 0 t', (file, expected) => {
  expect(equipment(file)).toBe(expected);
});

it('keeps IS CASE at 0.5 t', () => {
  // MiscType.java:4709-4715: isolate the IS CASE term from computer mass.
  const withCase = equipment('Winston Combat Vehicle (Support)');
  const withoutCase = equipment('Winston Combat Vehicle (Support)', true);
  expect(withCase).not.toBeNull();
  expect(withoutCase).not.toBeNull();
  expect(withCase! - withoutCase!).toBe(0.5);
});
