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
// MegaMek 48fcb2f64 MiscType.java:702-703, RoundWeight.java:58-68.
it.each([
  [70, false, 3],
  [62.5, false, 2.5],
  [62.51, false, 3],
  [1.3, true, 0.052],
  [1.3, false, 0.5],
])(
  'resolves limited-amphibious chassis on %s tons with support=%s',
  (tonnage, isSupportVehicle, expected) => {
    expect(
      resolveVehicleVariableMass(
        {
          id: 'limitedamphibiouschassis',
          weight: 0,
          special: ['Variable weight'],
        },
        'islimitedamphibiouschassis',
        {
          tonnage: Number(tonnage),
          isSupportVehicle: Boolean(isSupportVehicle),
        },
      ),
    ).toBe(expected);
  },
);
it('charges the native Mamono IFV accessory in the editor total', () => {
  const state = mapToVehicleState(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/vehicles', 'Mamono IFV.json'),
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
        (m) => m.equipmentId !== 'limitedamphibiouschassis',
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
  expect(withAccessory.equipment - withoutAccessory.equipment).toBe(3);
  expect(withoutAccessory.remaining - withAccessory.remaining).toBe(3);
});
