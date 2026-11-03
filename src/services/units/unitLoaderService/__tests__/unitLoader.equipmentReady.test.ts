import fs from 'node:fs';
import path from 'node:path';

import type { UnitFamily } from '@/types/unit/UnitIndex';

import { resetEquipmentLoader } from '@/services/equipment/EquipmentLoaderService';
import {
  getEquipmentLookupService,
  resetEquipmentLookupService,
} from '@/services/equipment/EquipmentLookupService';
import { resetEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { UnitContract } from '@/types/contracts';

import type { UnitSource } from '../definitionTypes';

import { loadUnitDefinition } from '../loadUnitDefinition';
import { UnitLoaderService } from '../unitLoader';

let mockEquipmentGate: Promise<void> = Promise.resolve();
jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) => {
    await mockEquipmentGate;
    return JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    );
  },
}));
jest.mock('../loadUnitDefinition', () => ({ loadUnitDefinition: jest.fn() }));

const cases: { family: UnitFamily; file: string; expectedId: string }[] = [
  {
    family: 'vehicles',
    file: 'vehicles/Gulltoppr OmniMonitor (Prime).json',
    expectedId: 'long-tom',
  },
  {
    family: 'aerospace',
    file: 'aerospace/Stuka STU-K5.json',
    expectedId: 'medium-laser',
  },
  {
    family: 'battlemechs',
    file: 'battlemechs/2-star-league/standard/Atlas AS7-D.json',
    expectedId: 'medium-laser',
  },
];
function reset() {
  resetEquipmentLookupService();
  resetEquipmentRegistry();
  resetEquipmentLoader();
}
beforeEach(reset);
afterEach(() => {
  reset();
  jest.clearAllMocks();
});
describe.each(['canonical', 'custom'] as const)(
  '%s source waits for real equipment',
  (source) => {
    it.each(cases)(
      '$family stays pending, then resolves native equipment',
      async ({ family, file, expectedId }) => {
        const definition = UnitContract.parse(
          JSON.parse(
            fs.readFileSync(
              path.join(process.cwd(), 'public/data/units', file),
              'utf8',
            ),
          ),
        );
        jest.mocked(loadUnitDefinition).mockResolvedValueOnce({
          success: true,
          definition,
          family,
          reference: { source, id: definition.id, family },
        });
        let release!: () => void;
        mockEquipmentGate = new Promise<void>((resolve) => {
          release = resolve;
        });
        let completed = false;
        const loading = new UnitLoaderService()
          .loadUnit(definition.id, source as UnitSource, family)
          .then((result) => {
            completed = true;
            return result;
          });
        try {
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
          expect(completed).toBe(false);
        } finally {
          release();
        }
        const result = await loading;
        expect(result.success).toBe(true);
        const equipment =
          result.state?.equipment ??
          (result.familyState?.store === 'vehicle' ||
          result.familyState?.store === 'aerospace'
            ? result.familyState.state.equipment
            : []);
        expect(
          equipment.some((mount) => mount.equipmentId === expectedId),
        ).toBe(true);
        expect(getEquipmentLookupService().getById(expectedId)).toBeDefined();
        if (result.familyState?.store === 'vehicle') {
          for (const mount of result.familyState.state.equipment.filter(
            (item) => item.isTurretMounted,
          ))
            expect(
              getEquipmentLookupService().getById(mount.equipmentId),
            ).toBeDefined();
        }
      },
    );
  },
);
