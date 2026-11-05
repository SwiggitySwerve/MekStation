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
// MegaMek 48fcb2f64 MiscType.java:518-527, RoundWeight.java:58-68.
it.each([
  [13.5, 30, false, 1.5],
  [10, 30, false, 1],
  [0, 30, false, 0],
  [0.51, 2, true, 0.051],
])(
  'resolves jet-booster engine %s on %s tons with support=%s',
  (engineWeight, tonnage, isSupportVehicle, expected) => {
    expect(
      resolveVehicleVariableMass(
        { id: 'vtoljetbooster', weight: 0, special: ['Variable weight'] },
        'isvtoljetbooster',
        {
          tonnage: Number(tonnage),
          engineWeight: Number(engineWeight),
          isSupportVehicle: Boolean(isSupportVehicle),
        },
      ),
    ).toBeCloseTo(Number(expected), 8);
  },
);
it('requires the installed engine basis instead of treating variable zero as fixed', () => {
  expect(
    resolveVehicleVariableMass(
      { id: 'vtoljetbooster', weight: 0 },
      'isvtoljetbooster',
      { tonnage: 30, isSupportVehicle: false },
    ),
  ).toBeUndefined();
});
it('charges the native Strix Stealth VTOL accessory in the editor total', () => {
  const state = mapToVehicleState(
    JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          'public/data/units/vehicles',
          'Strix Stealth VTOL.json',
        ),
        'utf8',
      ),
    ),
  );
  const resolve = (id: string) => getEquipmentLookupService().getById(id);
  const withAccessory = computeVehicleWeightBreakdown(state, resolve);
  const withoutAccessory = computeVehicleWeightBreakdown(
    {
      ...state,
      equipment: state.equipment.filter(
        (m) => m.equipmentId !== 'vtoljetbooster',
      ),
    },
    resolve,
  );
  if (
    withAccessory.equipment === null ||
    withoutAccessory.equipment === null ||
    withAccessory.remaining === null ||
    withoutAccessory.remaining === null
  )
    throw Error('Native mass must be known');
  expect(withAccessory.equipment - withoutAccessory.equipment).toBe(0.5);
  expect(withoutAccessory.remaining - withAccessory.remaining).toBe(0.5);
});
