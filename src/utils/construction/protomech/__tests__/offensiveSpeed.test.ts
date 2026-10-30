/** @spec openspec/changes/establish-all-unit-data-parity/specs/battle-value-system/spec.md */
import {
  computeProtoMechBVFromState,
  createDefaultProtoMechState,
} from '@/stores/protoMechState';
import {
  clearAllProtoMechStores,
  hydrateOrCreateProtoMech,
} from '@/stores/protoMechStoreRegistry';
import { createProtoMechStore } from '@/stores/useProtoMechStore';

import {
  calculateProtoMechBV,
  calculateProtoSpeedFactor,
} from '../protoMechBV';
import { buildProto } from './protoMechBV.test.helpers';

// Actual BVCalculator component observations at MegaMek 48fcb2f6.
const cases = [
  [0, 0, 0.44],
  [2, 1, 0.77],
  [5, 0, 1],
  [6, 0, 1.12],
  [6, -3, 1.12],
  [8, 0, 1.37],
  [9, 5, 1.89],
  [10, 0, 1.63],
  [12, 5, 2.3],
  [60, 40, 13.04],
];

afterEach(() => clearAllProtoMechStores(true));

it.each(cases)(
  'uses Run %s and Jump %s for speed factor %s',
  (runMP, jumpMP, factor) => {
    expect(calculateProtoSpeedFactor(runMP, jumpMP)).toBe(factor);
    const unit = buildProto({ tonnage: 5, walkMP: 1, runMP, jumpMP });
    const before = JSON.stringify(unit);
    const result = calculateProtoMechBV(unit);
    expect(result.speedFactor).toBe(factor);
    expect(result.offensiveBV).toBe(
      (result.weaponBV +
        result.ammoBV +
        result.physicalWeaponBV +
        result.offensiveEquipmentBV) *
        factor,
    );
    expect(JSON.stringify(unit)).toBe(before);
  },
);

it('uses explicit Run independently of Walk or a booster flag', () => {
  const unit = buildProto({
    tonnage: 5,
    walkMP: 5,
    runMP: 6,
    myomerBooster: true,
  });
  expect(calculateProtoMechBV(unit).speedFactor).toBe(1.12);
  expect(calculateProtoMechBV({ ...unit, walkMP: 20 }).speedFactor).toBe(1.12);
  expect(calculateProtoMechBV({ ...unit, runMP: 10 }).speedFactor).toBe(1.63);
});

it('updates the store component when Run changes through movement and booster actions', () => {
  const store = createProtoMechStore(
    createDefaultProtoMechState({ id: 'offensive-speed', tonnage: 5 }),
  );
  store.getState().setWalkMP(5);
  expect(store.getState().flankMP).toBe(8);
  expect(store.getState().bvBreakdown?.speedFactor).toBe(1.37);
  store.getState().setMyomerBooster(true);
  expect(store.getState().flankMP).toBe(10);
  expect(store.getState().bvBreakdown?.speedFactor).toBe(1.63);
  store.getState().setJumpMP(5);
  expect(store.getState().bvBreakdown).toEqual(
    computeProtoMechBVFromState(store.getState()),
  );
});

it('preserves saved movement and cached BV until an explicit recomputation', () => {
  const id = '11111111-2222-4333-8444-555555555555';
  const initial = {
    ...createDefaultProtoMechState({ id, tonnage: 5 }),
    walkMP: 5,
    cruiseMP: 5,
    flankMP: 6,
    hasMyomerBooster: true,
  };
  const legacy = {
    ...computeProtoMechBVFromState(initial),
    speedFactor: 1,
    final: 123,
  };
  const key = `megamek-protomech-${id}`;
  const saved = JSON.stringify({
    state: { ...initial, bvBreakdown: legacy },
    version: 0,
  });
  localStorage.setItem(key, saved);
  const store = hydrateOrCreateProtoMech(id, { tonnage: 5 });
  expect(localStorage.getItem(key)).toBe(saved);
  expect(store.getState().bvBreakdown).toEqual(legacy);
  store.getState().setName('Renamed');
  expect(store.getState().bvBreakdown).toEqual(legacy);
  store.getState().recomputeBV();
  expect(store.getState().bvBreakdown?.speedFactor).toBe(1.12);
  expect(store.getState()).toMatchObject({
    walkMP: 5,
    cruiseMP: 5,
    flankMP: 6,
    hasMyomerBooster: true,
  });
});
