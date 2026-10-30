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
import { ProtoChassis, ProtoLocation } from '@/types/unit/ProtoMechInterfaces';

import { calculateProtoMechBV } from '../protoMechBV';
import { armor, buildProto } from './protoMechBV.test.helpers';

// Actual pinned Java getRunningTMM/getJumpingTMM/tmmFactor observations.
// Local Ultraheavy enum has the same non-Glider modifier as the native Biped.
const cases: [ProtoChassis, number, number, number][] = [
  [ProtoChassis.BIPED, 0, 0, 1.1],
  [ProtoChassis.BIPED, 2, 1, 1.2000000000000002],
  [ProtoChassis.BIPED, 4, 0, 1.2000000000000002],
  [ProtoChassis.BIPED, 4, 6, 1.4000000000000001],
  [ProtoChassis.BIPED, 10, 0, 1.5],
  [ProtoChassis.BIPED, 24, 0, 1.6],
  [ProtoChassis.BIPED, 25, 0, 1.7000000000000002],
  [ProtoChassis.BIPED, 60, 40, 1.8],
  [ProtoChassis.QUAD, 0, 0, 1.1],
  [ProtoChassis.QUAD, 2, 1, 1.2000000000000002],
  [ProtoChassis.QUAD, 4, 0, 1.2000000000000002],
  [ProtoChassis.QUAD, 4, 6, 1.4000000000000001],
  [ProtoChassis.QUAD, 10, 0, 1.5],
  [ProtoChassis.QUAD, 24, 0, 1.6],
  [ProtoChassis.QUAD, 25, 0, 1.7000000000000002],
  [ProtoChassis.QUAD, 60, 40, 1.8],
  [ProtoChassis.GLIDER, 0, 0, 1.2000000000000002],
  [ProtoChassis.GLIDER, 2, 1, 1.2000000000000002],
  [ProtoChassis.GLIDER, 4, 0, 1.3],
  [ProtoChassis.GLIDER, 4, 6, 1.4000000000000001],
  [ProtoChassis.GLIDER, 10, 0, 1.6],
  [ProtoChassis.GLIDER, 24, 0, 1.7000000000000002],
  [ProtoChassis.GLIDER, 25, 0, 1.8],
  [ProtoChassis.GLIDER, 60, 40, 1.8],
  [ProtoChassis.ULTRAHEAVY, 0, 0, 1.1],
  [ProtoChassis.ULTRAHEAVY, 2, 1, 1.2000000000000002],
  [ProtoChassis.ULTRAHEAVY, 4, 0, 1.2000000000000002],
  [ProtoChassis.ULTRAHEAVY, 4, 6, 1.4000000000000001],
  [ProtoChassis.ULTRAHEAVY, 10, 0, 1.5],
  [ProtoChassis.ULTRAHEAVY, 24, 0, 1.6],
  [ProtoChassis.ULTRAHEAVY, 25, 0, 1.7000000000000002],
  [ProtoChassis.ULTRAHEAVY, 60, 40, 1.8],
];

afterEach(() => clearAllProtoMechStores(true));

it.each(cases)(
  '%s Run %s Jump %s has native defensive factor %s',
  (chassisType, runMP, jumpMP, factor) => {
    const unit = buildProto({
      tonnage: 5,
      chassisType,
      runMP,
      jumpMP,
      armorByLocation: armor({ [ProtoLocation.HEAD]: 7 }),
    });
    const before = JSON.stringify(unit);
    const bv = calculateProtoMechBV(unit);
    expect(bv.defensiveFactor).toBe(factor);
    expect(bv.defensiveBV).toBe(17.5 * factor);
    expect(JSON.stringify(unit)).toBe(before);
  },
);

it('uses chassis and explicit Run without inferring booster or Walk', () => {
  const unit = buildProto({
    tonnage: 5,
    chassisType: ProtoChassis.GLIDER,
    walkMP: 5,
    runMP: 6,
    myomerBooster: true,
  });
  expect(calculateProtoMechBV(unit).defensiveFactor).toBe(1.4000000000000001);
  expect(
    calculateProtoMechBV({ ...unit, walkMP: 10, myomerBooster: false })
      .defensiveFactor,
  ).toBe(1.4000000000000001);
  expect(calculateProtoMechBV({ ...unit, runMP: 10 }).defensiveFactor).toBe(
    1.6,
  );
});

it('refreshes the real store through chassis, movement, jump and booster actions', () => {
  const store = createProtoMechStore(
    createDefaultProtoMechState({ id: 'defensive-factor', tonnage: 5 }),
  );
  store.getState().setWalkMP(4);
  expect(store.getState().bvBreakdown?.defensiveFactor).toBe(1.3);
  store.getState().setChassisType(ProtoChassis.GLIDER);
  expect(store.getState().bvBreakdown?.defensiveFactor).toBe(
    1.4000000000000001,
  );
  store.getState().setWalkMP(5);
  expect(store.getState().bvBreakdown?.defensiveFactor).toBe(1.5);
  store.getState().setMyomerBooster(true);
  expect(store.getState().bvBreakdown?.defensiveFactor).toBe(1.6);
  store.getState().setWalkMP(1);
  store.getState().setJumpMP(4);
  expect(store.getState().bvBreakdown?.defensiveFactor).toBe(1.3);
  expect(store.getState().bvBreakdown).toEqual(
    computeProtoMechBVFromState(store.getState()),
  );
});

it('preserves saved movement and cached BV until recomputation, then persists the corrected factor', () => {
  const id = '11111111-2222-4333-8444-666666666666';
  const initial = {
    ...createDefaultProtoMechState({
      id,
      tonnage: 5,
      chassisType: ProtoChassis.GLIDER,
    }),
    walkMP: 5,
    cruiseMP: 5,
    flankMP: 6,
    hasMyomerBooster: true,
  };
  const cached = {
    ...computeProtoMechBVFromState(initial),
    defensiveFactor: 1.2,
    final: 123,
  };
  const key = `megamek-protomech-${id}`;
  const saved = JSON.stringify({
    state: { ...initial, bvBreakdown: cached },
    version: 0,
  });
  localStorage.setItem(key, saved);
  const store = hydrateOrCreateProtoMech(id, { tonnage: 5 });
  expect(localStorage.getItem(key)).toBe(saved);
  expect(store.getState().bvBreakdown).toEqual(cached);
  store.getState().setName('Retained');
  expect(store.getState().bvBreakdown).toEqual(cached);
  store.getState().recomputeBV();
  expect(store.getState().bvBreakdown?.defensiveFactor).toBe(
    1.4000000000000001,
  );
  expect(store.getState()).toMatchObject({
    walkMP: 5,
    cruiseMP: 5,
    flankMP: 6,
    hasMyomerBooster: true,
  });
  const reloaded = JSON.parse(localStorage.getItem(key)!);
  expect(reloaded.state.bvBreakdown.defensiveFactor).toBe(1.4000000000000001);
});
