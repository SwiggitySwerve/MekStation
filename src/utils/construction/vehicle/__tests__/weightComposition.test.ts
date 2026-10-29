import { computeVehicleWeightBreakdown as facade } from '@/components/customizer/vehicle/VehicleStatusBar.utils';
import { BlkParserService } from '@/services/conversion/BlkParserService';
import { createDefaultVehicleState } from '@/stores/vehicleState';
import { TechBase } from '@/types/enums/TechBase';
import { GroundMotionType as M } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  computeVehicleWeightBreakdown,
  type VehicleWeightState,
} from '../weightComposition';

it('preserves the facade and every legacy support composition output', () => {
  const state: VehicleWeightState = {
    ...createDefaultVehicleState({
      name: 'Characterization',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
    }),
    unitType: UnitType.SUPPORT_VEHICLE,
    engineRating: 25,
    armorTonnage: 0,
    turret: null,
  };
  const result = computeVehicleWeightBreakdown(state, () => undefined);
  expect(facade(state, () => undefined)).toEqual(result);
  expect(result).toEqual({
    engine: 1,
    controls: 0,
    lift: 0,
    structure: 5,
    armor: 0,
    equipment: 0,
    turret: 0,
    secondaryTurret: 0,
    powerAmplifiers: 0,
    turretEquipment: 0,
    secondaryTurretEquipment: 0,
    turretMounted: 0,
    energyWeapons: 0,
    remaining: 44,
  });
});

// Test-first controls/lift acceptance: these fields are absent on the refactor head.

const base = createDefaultVehicleState({
  name: 'Controls/lift',
  tonnage: 20,
  techBase: TechBase.INNER_SPHERE,
});
const weights = (
  tonnage: number,
  motionType = M.TRACKED,
  hasNoControlSystems = false,
  unitType: VehicleWeightState['unitType'] = UnitType.VEHICLE,
) =>
  computeVehicleWeightBreakdown(
    { ...base, tonnage, motionType, hasNoControlSystems, unitType },
    () => undefined,
  );

it.each([
  [10, 0.5],
  [10.01, 1],
  [20, 1],
  [20.1, 1.5],
  [30, 1.5],
  [30.01, 2],
])('rounds %s-ton controls upward to %s', (tons, controls) => {
  expect(weights(tons)).toMatchObject({ controls, lift: 0 });
});
it.each([M.HOVER, M.VTOL, M.HYDROFOIL, M.SUBMARINE, M.WIGE])(
  '%s carries half-ton-rounded lift',
  (mode) => {
    expect(weights(20, mode)).toMatchObject({ controls: 1, lift: 2 });
    expect(weights(20.1, mode)).toMatchObject({ controls: 1.5, lift: 2.5 });
  },
);
it.each([M.TRACKED, M.WHEELED, M.NAVAL, M.RAIL, M.MAGLEV])(
  '%s carries no lift',
  (mode) => {
    expect(weights(20, mode)).toMatchObject({ controls: 1, lift: 0 });
  },
);
it('honors explicit no-controls without removing lift', () => {
  expect(weights(20, M.HOVER, true)).toMatchObject({ controls: 0, lift: 2 });
});
it('keeps support calculations outside combat controls/lift', () => {
  expect(weights(20, M.HOVER, false, UnitType.SUPPORT_VEHICLE)).toMatchObject({
    controls: 0,
    lift: 0,
  });
});

it.each(['0', '1', 'false'])(
  'accepts upstream no-controls presence despite BLK payload %s',
  (payload) => {
    const parsed = new BlkParserService().parse(
      `<UnitType>\nTank\n</UnitType>\n<Name>\nNo-controls\n</Name>\n<tonnage>\n20\n</tonnage>\n<year>\n3039\n</year>\n<hasNoControlSystems>\n${payload}\n</hasNoControlSystems>`,
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success)
      throw new Error('BLK presence fixture failed to parse');
    // Explicit adapter for the test: production tag-to-store wiring remains separate.
    const noControls = Object.hasOwn(
      parsed.data.document.rawTags,
      'hasNoControlSystems',
    );
    expect(noControls).toBe(true);
    expect(
      weights(parsed.data.document.tonnage, M.TRACKED, noControls),
    ).toMatchObject({ controls: 0, lift: 0 });
  },
);
