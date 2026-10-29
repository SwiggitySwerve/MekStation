import { z } from 'zod';

import { createVehicleStore } from '@/stores/useVehicleStore';
import { createDefaultVehicleState } from '@/stores/vehicleState';
import { EngineType } from '@/types/construction/EngineType';
import { TechBase } from '@/types/enums/TechBase';
import { GroundMotionType as M } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  computeEngineRating,
  validateVehicleEngine,
} from '@/utils/construction/vehicle/engine';

describe('combat vehicle suspension callers', () => {
  // BLKTankFile.java:155-162 uses BLKFile.NONE (8), independently of trailer.
  it.each([
    [0, false, 10],
    [0, true, 10],
    [1, false, 10],
    [1, true, 10],
    [8, false, 0],
    [8, true, 0],
  ])(
    'imports engine code %s, trailer %s with rating %s',
    (engineType, isTrailer, rating) => {
      const handler = new VehicleUnitHandler();
      const document: IBlkDocument = {
        blockVersion: 1,
        version: 'MAM0',
        unitType: 'Tank',
        mappedUnitType: UnitType.VEHICLE,
        name: 'Engine and trailer independence',
        model: '',
        year: 3075,
        type: 'IS Level 1',
        tonnage: 20,
        cruiseMP: 0,
        motionType: 'Tracked',
        engineType,
        armor: [],
        equipmentByLocation: {},
        rawTags: { trailer: [String(isTrailer)] },
      };
      const loaded = handler.parse(document);
      expect(loaded.success).toBe(true);
      if (!loaded.success) throw new Error(loaded.error.errors.join('; '));
      const unit = loaded.data.unit;
      expect(unit.engineType).toBe(engineType);
      expect(unit.isTrailer).toBe(isTrailer);
      expect(unit.engineRating).toBe(rating);
      // Existing handler approximations must consume the same source distinction;
      // these assertions do not establish weight or cost parity with MegaMek.
      expect(handler.calculateWeight(unit)).toBe(
        handler.calculateWeight({ ...unit, isTrailer: !isTrailer }),
      );
      expect(handler.calculateCost(unit)).toBe(200000 + rating * 5000);
    },
  );

  it.each([
    [EngineType.STANDARD, false],
    [EngineType.STANDARD, true],
    [EngineType.ICE, false],
    [EngineType.ICE, true],
  ])(
    'keeps an explicit %s engine independent of trailer %s on edits',
    (engineType, isTrailer) => {
      const store = createVehicleStore({
        ...createDefaultVehicleState({
          name: 'Powered trailer',
          tonnage: 20,
          techBase: TechBase.INNER_SPHERE,
        }),
        engineType,
        isTrailer,
      });
      store.getState().setCruiseMP(0);
      expect(store.getState().engineRating).toBe(10);
      store.getState().setMotionType(M.WHEELED);
      expect(store.getState().engineRating).toBe(10);
      store.getState().setTonnage(25);
      expect(store.getState().engineRating).toBe(10);
      expect(store.getState().isTrailer).toBe(isTrailer);
      expect(store.getState().engineType).toBe(engineType);
    },
  );

  it.each([
    [20, 12, M.HOVER, 155],
    [52, 3, M.TRACKED, 160],
    [5, 8, M.HOVER, 10],
    [20, 8, M.VTOL, 65],
    [50, 4, M.WHEELED, 180],
    [50, 4, M.HYDROFOIL, 10],
    [301, 1, M.NAVAL, 270],
    [90, 4, M.WIGE, 185],
  ])('%s tons cruise %s %s -> %s', (tons, mp, motion, rating) => {
    expect(computeEngineRating(tons, mp, motion)).toBe(rating);
    expect(
      validateVehicleEngine(tons, mp, EngineType.STANDARD, motion).engineRating,
    ).toBe(rating);
  });
  it('reacts to cruise, motion, tonnage and inverse rating edits through the real store', () => {
    const store = createVehicleStore(
      createDefaultVehicleState({
        name: 'Suspension',
        tonnage: 20,
        techBase: TechBase.INNER_SPHERE,
        motionType: M.HOVER,
      }),
    );
    expect(store.getState().engineRating).toBe(10);
    store.getState().setCruiseMP(12);
    expect(store.getState().engineRating).toBe(155);
    store.getState().setEngineRating(155);
    expect(store.getState().cruiseMP).toBe(12);
    store.getState().setMotionType(M.TRACKED);
    expect(store.getState().engineRating).toBe(240);
    store.getState().setMotionType(M.HOVER);
    store.getState().setTonnage(30);
    expect(store.getState().engineRating).toBe(230);
  });
  it('retains legacy support construction without claiming combat parity', () => {
    const store = createVehicleStore(
      createDefaultVehicleState({
        name: 'Support',
        tonnage: 20,
        techBase: TechBase.INNER_SPHERE,
        motionType: M.HOVER,
        unitType: UnitType.SUPPORT_VEHICLE,
      }),
    );
    store.getState().setCruiseMP(12);
    expect(store.getState().engineRating).toBe(240);
    store.getState().setMotionType(M.VTOL);
    store.getState().setCruiseMP(10);
    expect(store.getState().unitType).toBe(UnitType.SUPPORT_VEHICLE);
    expect(store.getState().engineRating).toBe(200);
  });
});
import { execFileSync } from 'child_process';

import { VehicleUnitHandler } from '@/services/units/handlers/VehicleUnitHandler';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { computeSuspensionFactor } from '@/utils/construction/vehicle/engine';

it.each([
  [10, M.HOVER, 40],
  [10.1, M.HOVER, 85],
  [20, M.HOVER, 85],
  [20.1, M.HOVER, 130],
  [30, M.HOVER, 130],
  [30.1, M.HOVER, 175],
  [40, M.HOVER, 175],
  [40.1, M.HOVER, 235],
  [50, M.HOVER, 235],
  [50.1, M.HOVER, 280],
  [75, M.HOVER, 280],
  [75.1, M.HOVER, 325],
  [80, M.WHEELED, 20],
  [80.1, M.WHEELED, 40],
  [300, M.NAVAL, 30],
  [301, M.NAVAL, 32],
  [10, M.VTOL, 50],
  [10.1, M.VTOL, 95],
  [20, M.VTOL, 95],
  [20.1, M.VTOL, 140],
  [30, M.VTOL, 140],
  [30.1, M.VTOL, 185],
  [50.1, M.VTOL, 230],
  [15, M.WIGE, 45],
  [15.1, M.WIGE, 80],
  [30, M.WIGE, 80],
  [30.1, M.WIGE, 115],
  [45, M.WIGE, 115],
  [45.1, M.WIGE, 140],
  [80, M.WIGE, 140],
  [80.1, M.WIGE, 175],
  [110.1, M.WIGE, 210],
  [100, M.TRACKED, 0],
  [100, M.RAIL, 0],
  [100, M.MAGLEV, 0],
  [10, M.HYDROFOIL, 60],
  [10.1, M.HYDROFOIL, 105],
  [20.1, M.HYDROFOIL, 150],
  [30.1, M.HYDROFOIL, 195],
  [40.1, M.HYDROFOIL, 255],
  [50.1, M.HYDROFOIL, 300],
  [60.1, M.HYDROFOIL, 345],
  [70.1, M.HYDROFOIL, 390],
  [80.1, M.HYDROFOIL, 435],
  [90.1, M.HYDROFOIL, 480],
  [150, M.HYDROFOIL, 480],
  [351, M.SUBMARINE, 37],
])('pinned suspension threshold %s %s -> %s', (tons, motion, factor) => {
  expect(computeSuspensionFactor(tons, motion)).toBe(factor);
});

it('agrees with actual Python converter output and direct BLK import', () => {
  const output = execFileSync(
    'python',
    [
      '-B',
      '-c',
      "import sys,json; sys.path.insert(0,'scripts/__tests__'); from test_vehicle_suspension import SuspensionConversionTest; print(json.dumps([SuspensionConversionTest().convert(tons=t,cruise=m,motion=k) for t,m,k in [(20,12,'Hover'),(52,3,'Tracked'),(20,8,'VTOL'),(301,1,'Naval')]]))",
    ],
    { encoding: 'utf8' },
  );
  const converted = z
    .array(
      z.object({
        engine: z.object({ rating: z.number() }),
        tonnage: z.number(),
        movement: z.object({ cruiseMP: z.number() }),
        motionType: z.nativeEnum(M),
      }),
    )
    .parse(JSON.parse(output));
  for (const unit of converted) {
    expect(unit.engine.rating).toBe(
      computeEngineRating(
        unit.tonnage,
        unit.movement.cruiseMP,
        unit.motionType,
      ),
    );
  }
  const document: IBlkDocument = {
    blockVersion: 1,
    version: 'MAM0',
    unitType: 'Tank',
    mappedUnitType: UnitType.VEHICLE,
    name: 'Tamerlane',
    model: 'Flamer',
    year: 3075,
    type: 'IS Level 1',
    tonnage: 20,
    cruiseMP: 12,
    motionType: 'Hover',
    armor: [],
    equipmentByLocation: {},
    rawTags: {},
  };
  expect(
    new VehicleUnitHandler().parse(document).data?.unit?.engineRating,
  ).toBe(155);
});

it('handles minimum, integer-tonnage rounding and engine-less input explicitly', () => {
  expect(computeEngineRating(52.9, 3, M.TRACKED)).toBe(160);
  expect(computeEngineRating(20, 0, M.HOVER)).toBe(10);
  expect(computeEngineRating(20, 0, M.HOVER, true)).toBe(0);
  expect(computeEngineRating(150, 4, M.TRACKED)).toBe(600);
});

it('uses integer propulsion tonnage for inverse combat rating edits', () => {
  const store = createVehicleStore(
    createDefaultVehicleState({
      name: 'Fractional',
      tonnage: 52.9,
      techBase: TechBase.INNER_SPHERE,
      motionType: M.TRACKED,
    }),
  );
  store.getState().setCruiseMP(10);
  expect(store.getState().engineRating).toBe(520);
  store.getState().setEngineRating(520);
  expect(store.getState().cruiseMP).toBe(10);
  store.getState().setMotionType(M.HOVER);
  store.getState().setEngineRating(0);
  expect(store.getState().cruiseMP).toBe(0);
});
