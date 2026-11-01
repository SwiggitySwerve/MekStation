/** @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md */
import { buildVehicleUnitObject } from '@/components/customizer/vehicle/buildVehicleUnitObject';
import { EngineType } from '@/types/construction/EngineType';
import { TechBase } from '@/types/enums/TechBase';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  computeFlankMP,
  validateVehicleEngine,
} from '@/utils/construction/vehicle/engine';
import { toVehicleBVInput } from '@/utils/construction/vehicle/vehicleBVAdapter';
import {
  calculateVehicleSpeedFactor,
  calculateVehicleTMM,
} from '@/utils/construction/vehicle/vehicleBVMovement';

import { createVehicleStore } from '../useVehicleStore';
import { createDefaultVehicleState } from '../vehicleState';
import {
  clearAllVehicleStores,
  duplicateVehicle,
  hydrateOrCreateVehicle,
  registerVehicleStore,
} from '../vehicleStoreRegistry';

const OPTIONS = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Flank persistence',
  tonnage: 20,
  techBase: TechBase.INNER_SPHERE,
};
const STORAGE_KEY = `megamek-vehicle-${OPTIONS.id}`;

beforeEach(() => {
  clearAllVehicleStores();
  localStorage.clear();
});
afterEach(() => clearAllVehicleStores());

// Independent unmodified movement examples: MegaMek 48fcb2f64a1b,
// Entity.java:4004-4016. These do not assert MASC, damage or complete BV parity.
it.each([
  [0, 0],
  [1, 2],
  [3, 5],
  [4, 6],
  [5, 8],
  [17, 26],
])(
  'cruise %s gives base flank %s across construction and edits',
  (cruise, flank) => {
    expect(computeFlankMP(cruise)).toBe(flank);
    expect(
      validateVehicleEngine(
        20,
        cruise,
        EngineType.STANDARD,
        GroundMotionType.TRACKED,
      ).flankMP,
    ).toBe(flank);
    for (const unitType of [
      UnitType.VEHICLE,
      UnitType.VTOL,
      UnitType.SUPPORT_VEHICLE,
    ] as const) {
      const store = createVehicleStore(
        createDefaultVehicleState({ ...OPTIONS, unitType }),
      );
      store.getState().setCruiseMP(cruise);
      expect(store.getState().flankMP).toBe(flank);
      expect(toVehicleBVInput(store.getState()).flankMP).toBe(flank);
      expect(buildVehicleUnitObject(store.getState()).flankMP).toBe(flank);
    }
  },
);

it('updates base flank when the engine editor changes cruise', () => {
  const store = createVehicleStore(createDefaultVehicleState(OPTIONS));
  store.getState().setEngineRating(60);
  expect(store.getState().cruiseMP).toBe(3);
  expect(store.getState().flankMP).toBe(5);
  // This adapter input crosses a TMM boundary and restores the base speed term.
  const input = toVehicleBVInput(store.getState());
  expect(calculateVehicleTMM(input)).toBe(2);
  expect(calculateVehicleSpeedFactor(input)).toBe(1);
});

it.each([undefined, 7, 99])(
  'reopens cruise 5 with derived flank despite saved %s',
  (savedFlank) => {
    const store = createVehicleStore(createDefaultVehicleState(OPTIONS));
    store.getState().setCruiseMP(5);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const saved = JSON.parse(raw!) as { state: Record<string, unknown> };
    expect(saved.state.cruiseMP).toBe(5);
    expect(saved.state).not.toHaveProperty('flankMP');
    if (savedFlank !== undefined) saved.state.flankMP = savedFlank;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

    const reopened = hydrateOrCreateVehicle(OPTIONS.id, OPTIONS);
    expect(reopened.getState().cruiseMP).toBe(5);
    expect(reopened.getState().flankMP).toBe(8);
    expect(buildVehicleUnitObject(reopened.getState()).flankMP).toBe(8);
    reopened.getState().setCruiseMP(3);
    expect(reopened.getState().flankMP).toBe(5);
  },
);

it('normalizes supplied state and duplicated vehicles from cruise', () => {
  const store = createVehicleStore({
    ...createDefaultVehicleState(OPTIONS),
    cruiseMP: 17,
    flankMP: 6,
  });
  expect(store.getState().flankMP).toBe(26);
  registerVehicleStore(store);
  const duplicate = duplicateVehicle(OPTIONS.id);
  expect(duplicate).not.toBeNull();
  expect(duplicate!.getState().cruiseMP).toBe(17);
  expect(duplicate!.getState().flankMP).toBe(26);
});
