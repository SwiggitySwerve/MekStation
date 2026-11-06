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
// MegaMek 48fcb2f64 MiscType.java:839-840; RoundWeight.java:58-68.
it.each([
  [0, 0, 0],
  [0.5, 0.5, 0.5],
  [0.5001, 1, 0.501],
  [20, 20, 20],
])(
  'shares sized cargo rounding for liquid size %s',
  (size, combat, smallSupport) => {
    for (const [tonnage, isSupportVehicle, expected] of [
      [50, false, combat],
      [2, true, smallSupport],
    ] as const) {
      for (const id of [
        'liquid-storage',
        'cargo',
        'communications-equipment',
      ]) {
        expect(
          resolveVehicleVariableMass({ id, weight: 0 }, id + ':size:' + size, {
            tonnage,
            isSupportVehicle,
          }),
        ).toBe(expected);
      }
    }
  },
);
it('charges the native coolant truck twenty tons without changing its sentinel', () => {
  const state = mapToVehicleState(
    JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          'public/data/units/vehicles',
          'R10 Mechanized ICV (Coolant Truck).json',
        ),
        'utf8',
      ),
    ),
  );
  const lookup = getEquipmentLookupService();
  const resolve = (id: string, isAmmo?: boolean) =>
    lookup.getMountedById(id, isAmmo === true);
  const record = resolve('liquid-storage');
  expect(record?.weight).toBe(0);
  const result = computeVehicleWeightBreakdown(state, resolve);
  const without = computeVehicleWeightBreakdown(
    {
      ...state,
      equipment: state.equipment.filter(
        (m) => m.equipmentId !== 'liquid-storage',
      ),
    },
    resolve,
  );
  expect((without.remaining ?? NaN) - (result.remaining ?? NaN)).toBe(20);
  expect(state.tonnage - (result.remaining ?? NaN)).toBe(44);
  expect(record?.weight).toBe(0);
});
