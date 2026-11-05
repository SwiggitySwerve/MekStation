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

// MegaMek 48fcb2f64 MiscType.java:496-497,867-889,2004-2012.
it.each([
  [20, 0.5],
  [55, 0.5],
  [55.01, 1],
  [85, 1],
  [85.01, 2],
])('resolves a vehicle jump jet on %s tons to %s tons', (tonnage, expected) => {
  expect(
    resolveVehicleVariableMass(
      { id: 'vehiclejumpjet', weight: 0 },
      'VehicleJumpJet',
      { tonnage, isSupportVehicle: false },
    ),
  ).toBe(expected);
});

it.each([
  ['Kanga Medium Hovertank', 50],
  ['Kanga-X Jump Tank', 50],
  ['Scapha Hovertank J', 40],
  ["Harasser Missile Platform 'Leaping Lisa'", 25],
  ['Pandion Combat WiGE (3135 Upgrade)', 20],
])('charges every native jet on %s in the editor total', (file, javaTotal) => {
  const state = mapToVehicleState(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/vehicles', `${file}.json`),
        'utf8',
      ),
    ),
  );
  const figures = computeVehicleWeightBreakdown(state, (id, isAmmo) =>
    getEquipmentLookupService().getMountedById(id, isAmmo === true),
  );
  expect(figures.remaining).not.toBeNull();
  expect(state.tonnage - figures.remaining!).toBe(javaTotal);
});
