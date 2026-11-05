import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { GroundMotionType as M } from '@/types/unit/BaseUnitInterfaces';

import {
  computeVehicleBVStructurePoints,
  computeVehicleStructureWeight,
  hasSixSideVehicleHull,
  VehicleStructureType as S,
} from '../structure';
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
// MegaMek 48fcb2f64 VTOL.java:729-730, Structure.java:76-87,102-107.
it.each([
  [30, S.STANDARD, 3],
  [30.1, S.STANDARD, 6.5],
  [35, S.STANDARD, 7],
  [40, S.STANDARD, 8],
  [50, S.STANDARD, 10],
  [55, S.STANDARD, 11],
  [55, S.ENDO_STEEL, 5.5],
  [55, S.COMPOSITE, 3],
])(
  'charges native VTOL %s t / %s structure at %s t',
  (tonnage, type, expected) => {
    expect(computeVehicleStructureWeight(tonnage, type, M.VTOL)).toBe(expected);
  },
);
it('keeps the ordinary rotor layout and BV points above the mass threshold', () => {
  const layout = { tonnage: 55, motionType: M.VTOL };
  expect(hasSixSideVehicleHull(layout)).toBe(false);
  expect(computeVehicleBVStructurePoints(layout)).toBe(30);
  expect(
    computeVehicleBVStructurePoints({ ...layout, turretKind: 'chin' }),
  ).toBe(36);
  expect(computeVehicleStructureWeight(55, S.STANDARD, M.TRACKED)).toBe(5.5);
  expect(computeVehicleStructureWeight(55, S.STANDARD, M.NAVAL)).toBe(5.5);
});
it.each([
  ['Kamakiri Attack VTOL', 11, 55],
  ['Garuda Heavy VTOL', 8, 40],
])(
  'makes native %s structure and total match Java',
  (name, structure, java) => {
    const state = mapToVehicleState(
      JSON.parse(
        readFileSync(
          join(process.cwd(), 'public/data/units/vehicles', name + '.json'),
          'utf8',
        ),
      ),
    );
    const result = computeVehicleWeightBreakdown(state, (id, isAmmo) =>
      getEquipmentLookupService().getMountedById(id, isAmmo === true),
    );
    expect(result.structure).toBe(structure);
    expect(state.tonnage - (result.remaining ?? NaN)).toBe(java);
  },
);
