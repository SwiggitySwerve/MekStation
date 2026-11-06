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
// MegaMek 48fcb2f64 MiscType.java:745-767 (standard vehicle SRCS).
it.each([
  [2, 0],
  [9.999, 0],
  [10, 0.5],
  [10.001, 1],
  [60, 3],
  [80, 4],
  [99.999, 5],
])('charges standard SRCS at %s t as %s t', (tonnage, expected) => {
  for (const isSupportVehicle of [false, true]) {
    expect(
      resolveVehicleVariableMass(
        { id: 'smartroboticcontrolsystem', weight: 0 },
        'smartroboticcontrolsystem:omni',
        { tonnage, isSupportVehicle },
      ),
    ).toBe(expected);
  }
});
it.each([
  ['Giant Guardian', 4, 80],
  ['Main Guardian', 3, 60],
])(
  'charges native %s computer mass and matches Java total',
  (name, mass, java) => {
    const state = mapToVehicleState(
      JSON.parse(
        readFileSync(
          join(process.cwd(), 'public/data/units/vehicles', name + '.json'),
          'utf8',
        ),
      ),
    );
    const lookup = getEquipmentLookupService();
    const resolve = (id: string, isAmmo?: boolean) =>
      lookup.getMountedById(id, isAmmo === true);
    const record = resolve('smartroboticcontrolsystem');
    expect(record?.weight).toBe(0);
    const result = computeVehicleWeightBreakdown(state, resolve);
    const without = computeVehicleWeightBreakdown(
      {
        ...state,
        equipment: state.equipment.filter(
          (m) => m.equipmentId !== 'smartroboticcontrolsystem',
        ),
      },
      resolve,
    );
    expect((without.remaining ?? NaN) - (result.remaining ?? NaN)).toBe(mass);
    expect(state.tonnage - (result.remaining ?? NaN)).toBe(java);
    expect(record?.weight).toBe(0);
  },
);
