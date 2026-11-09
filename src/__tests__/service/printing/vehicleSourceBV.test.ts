/** @spec openspec/changes/establish-all-unit-data-parity/specs/customizer-tabs/spec.md */
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

import { buildVehicleUnitObject } from '@/components/customizer/vehicle/buildVehicleUnitObject';
import { RecordSheetService } from '@/services/printing/RecordSheetService';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { createDefaultVehicleState } from '@/stores/vehicleState';
import { UnitContract } from '@/types/contracts';
import { TechBase } from '@/types/enums/TechBase';
import { getEraForYear } from '@/types/temporal/Era';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { contractVehicleToBVUnit } from '@/utils/construction/contractBVUnitAdapter';
import {
  calculateVehicleBVFromUnit,
  computeVehicleBVFromState,
} from '@/utils/construction/vehicle/vehicleBVAdapter';
import { serializeCustomVehicleState } from '@/utils/serialization/CustomUnitSerializer';

import { initializeEquipment } from './catalogRecordSheets.helpers';

// MegaMek 48fcb2f64: SupportTank.java:63,79; BLKFile.java:484-529;
// BVCalculator.java:430-434. Totals are pinned P1 reference values, SHA-256
// 4e19c56b957de2a8fc70dbfd131e76b64caa05adf8ba145b1610cc6b3ec37d87.
const cases = [
  ['Air Car', 75],
  ['Brunel Dump Truck (LRM)', 965],
  ['Buffalo BFFL Drone Bomb', 161],
  ['Estevez MBT', 293],
  ['Estevez MBT (Anti-Aircraft)', 217],
  ['HMRV (Hazardous Materials Recovery Vehicle) Salvage Bed', 166],
  ['J-37 Ordnance Transport', 97],
] as const;
const service = new RecordSheetService();

function readSource(name: string) {
  const source = UnitContract.parse(
    JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'public/data/units/vehicles', `${name}.json`),
        'utf8',
      ),
    ),
  );
  if (source.tonnage === undefined || source.armor === undefined)
    throw new Error(`Missing vehicle construction facts: ${name}`);
  return {
    ...source,
    tonnage: source.tonnage,
    armor: source.armor,
    movement: z
      .object({
        cruiseMP: z.number(),
        flankMP: z.number(),
        jumpMP: z.number().optional(),
      })
      .parse(source.movement),
  };
}

describe('support vehicle source BAR and record-sheet BV', () => {
  beforeAll(initializeEquipment);

  it.each(cases)(
    '%s retains its missing BAR and pinned BV %i',
    (name, total) => {
      const source = readSource(name);
      expect(source.armor.barRating).toBeUndefined();
      const state = mapToVehicleState(source);
      expect(state.barRating).toBeNull();
      const bv = computeVehicleBVFromState(state);
      expect(bv).toEqual(
        calculateVehicleBVFromUnit(contractVehicleToBVUnit(source)),
      );
      expect(bv.armorBV).toBe(0);
      expect(bv.final).toBe(total);
      expect(
        service.extractData(buildVehicleUnitObject(state)).header.battleValue,
      ).toBe(total);

      const saved = serializeCustomVehicleState(state, {
        id: source.id,
        chassis: state.chassis,
        variant: state.model,
        era: getEraForYear(state.year),
      });
      const reopened = mapToVehicleState(JSON.parse(JSON.stringify(saved)));
      expect(reopened.barRating).toBeNull();
      expect(computeVehicleBVFromState(reopened)).toEqual(bv);
      expect(
        service.extractData(buildVehicleUnitObject(reopened)).header
          .battleValue,
      ).toBe(total);
    },
  );

  it.each([2, 6, 10])('preserves explicit source BAR %i', (barRating) => {
    const original = readSource('Air Car');
    const source = {
      ...original,
      armor: { ...original.armor, type: 'BAR', barRating },
    };
    const state = mapToVehicleState(source);
    expect(state.barRating).toBe(barRating);
    expect(computeVehicleBVFromState(state)).toEqual(
      calculateVehicleBVFromUnit(contractVehicleToBVUnit(source)),
    );
  });

  it.each([null, 7])(
    'preserves saved editor BAR %s over source BAR',
    (barRating) => {
      const source = readSource('Air Car');
      const state = { ...mapToVehicleState(source), barRating };
      const saved = serializeCustomVehicleState(state, {
        id: source.id,
        chassis: state.chassis,
        variant: state.model,
        era: getEraForYear(state.year),
      });
      // Exercise precedence even when an explicit contract fact disagrees.
      const reopened = mapToVehicleState({
        ...JSON.parse(JSON.stringify(saved)),
        armor: { ...source.armor, barRating: 6 },
      });
      expect(reopened.barRating).toBe(barRating);
      expect(computeVehicleBVFromState(reopened)).toEqual(
        computeVehicleBVFromState(state),
      );
    },
  );

  it('keeps BAR 7 for a newly created support vehicle', () => {
    expect(
      createDefaultVehicleState({
        id: 'new-support',
        name: 'New Support Vehicle',
        tonnage: 40,
        techBase: TechBase.INNER_SPHERE,
        unitType: UnitType.SUPPORT_VEHICLE,
      }).barRating,
    ).toBe(7);
  });
});
