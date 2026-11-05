import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { GroundMotionType as M } from '@/types/unit/BaseUnitInterfaces';

import {
  computeVehicleStructureWeight,
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
// MegaMek 48fcb2f64 TestTank.java:88-95; Structure.java:75-108;
// BLKTankFile.java:94-123 uses the shared native superheavy thresholds.
it.each<[number, S, M, number]>([
  [100, S.STANDARD, M.TRACKED, 10],
  [100.01, S.STANDARD, M.TRACKED, 20.5],
  [190, S.STANDARD, M.TRACKED, 38],
  [190, S.ENDO_STEEL, M.TRACKED, 19],
  [190, S.COMPOSITE, M.TRACKED, 9.5],
  [190, S.STANDARD, M.NAVAL, 19],
  [350, S.STANDARD, M.NAVAL, 35],
  [350, S.STANDARD, M.SUBMARINE, 35],
  [350, S.ENDO_STEEL, M.NAVAL, 35],
  [50, S.STANDARD, M.HOVER, 5],
  [51, S.STANDARD, M.HOVER, 10.5],
  [80, S.STANDARD, M.WHEELED, 8],
  [81, S.STANDARD, M.WHEELED, 16.5],
])('charges %s-ton %s %s structure', (tonnage, type, motion, expected) => {
  expect(computeVehicleStructureWeight(tonnage, type, motion)).toBe(expected);
});
it('charges native Gulltoppr tracked-superheavy structure at the editor owner', () => {
  const state = mapToVehicleState(
    JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          'public/data/units/vehicles',
          'Gulltoppr OmniMonitor (A).json',
        ),
        'utf8',
      ),
    ),
  );
  expect(
    computeVehicleWeightBreakdown(state, (id) =>
      getEquipmentLookupService().getById(id),
    ).structure,
  ).toBe(38);
});
