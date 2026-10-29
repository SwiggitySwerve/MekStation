import { ProtoMechUnitHandler } from '@/services/units/handlers/ProtoMechUnitHandler';
import {
  computeProtoMechBVFromState,
  createDefaultProtoMechState,
} from '@/stores/protoMechState';
import { createProtoMechStore } from '@/stores/useProtoMechStore';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

import {
  computeProtoEngineRating,
  computeProtoWalkMPForRating,
} from '../index';

/** @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md */
describe('Pinned ProtoMek engine rating', () => {
  // Direct TestProtoMek.calcEngineRating observations from MegaMek48fcb2f6,
  // TestProtoMek.java:548-562. These are ratings, not complete engine weights.
  it.each([
    [5, 4, ProtoChassis.BIPED, 30],
    [9, 4, ProtoChassis.BIPED, 55],
    [2, 13, ProtoChassis.BIPED, 40],
    [2, 14, ProtoChassis.BIPED, 45],
    [2.5, 3, ProtoChassis.BIPED, 12],
    [4, 6, ProtoChassis.QUAD, 28],
    [9, 6, ProtoChassis.GLIDER, 65],
    [15, 3, ProtoChassis.ULTRAHEAVY, 75],
    [2, 0, ProtoChassis.BIPED, 0],
    [2, 0, ProtoChassis.QUAD, -4],
  ] satisfies [number, number, ProtoChassis, number][])(
    '%s tons, walk %s, %s produces %s',
    (tonnage, walk, chassis, rating) => {
      expect(computeProtoEngineRating(tonnage, walk, chassis)).toBe(rating);
    },
  );

  it.each([
    [5, ProtoChassis.BIPED, 30],
    [4, ProtoChassis.QUAD, 16],
    [9, ProtoChassis.GLIDER, 36],
    [15, ProtoChassis.ULTRAHEAVY, 75],
  ] satisfies [number, ProtoChassis, number][])(
    'default %s-ton %s state has rating %s',
    (tonnage, chassisType, rating) => {
      const state = createDefaultProtoMechState({ tonnage, chassisType });
      expect(state.engineRating).toBe(rating);
      expect(state.walkMP).toBe(state.cruiseMP);
    },
  );

  function makeStore(tonnage = 5, chassisType = ProtoChassis.BIPED) {
    return createProtoMechStore(
      createDefaultProtoMechState({ tonnage, chassisType }),
    );
  }

  it('updates rating and movement aliases after each relevant edit', () => {
    const store = makeStore();
    store.getState().setWalkMP(6);
    expect(store.getState()).toMatchObject({
      engineRating: 45,
      walkMP: 6,
      cruiseMP: 6,
    });
    store.getState().setChassisType(ProtoChassis.QUAD);
    expect(store.getState().engineRating).toBe(35);
    store.getState().setChassisType(ProtoChassis.GLIDER);
    expect(store.getState().engineRating).toBe(35);
    store.getState().setTonnage(7);
    expect(store.getState()).toMatchObject({
      engineRating: 21,
      walkMP: 3,
      cruiseMP: 3,
    });
    store.getState().setCruiseMP(4);
    expect(store.getState()).toMatchObject({
      engineRating: 28,
      walkMP: 4,
      cruiseMP: 4,
    });
    expect(store.getState().bvBreakdown).toEqual(
      computeProtoMechBVFromState(store.getState()),
    );
  });

  it('calculates from the admitted cruise value when the minimum applies', () => {
    const store = makeStore();
    store.getState().setCruiseMP(-1);
    expect(store.getState()).toMatchObject({
      engineRating: 10,
      walkMP: 1,
      cruiseMP: 1,
    });
  });

  it('keeps the booster separate from base movement and engine rating', () => {
    const store = makeStore();
    store.getState().setWalkMP(6);
    store.getState().setMyomerBooster(true);
    expect(store.getState()).toMatchObject({
      engineRating: 45,
      walkMP: 6,
      cruiseMP: 6,
    });
  });

  it('inverts a representable rating and synchronizes both movement fields', () => {
    const store = makeStore();
    store.getState().setEngineRating(45);
    expect(store.getState()).toMatchObject({
      engineRating: 45,
      walkMP: 6,
      cruiseMP: 6,
    });
    expect(store.getState().bvBreakdown).toEqual(
      computeProtoMechBVFromState(store.getState()),
    );
  });

  it('preserves an existing speed when rounding makes the inverse ambiguous', () => {
    const store = makeStore(2);
    store.getState().setCruiseMP(17);
    store.getState().setEngineRating(55);
    expect(store.getState()).toMatchObject({
      engineRating: 55,
      walkMP: 17,
      cruiseMP: 17,
    });
  });

  it('otherwise selects the greatest integer speed with exactly that rating', () => {
    const store = makeStore(2);
    store.getState().setEngineRating(55);
    expect(store.getState()).toMatchObject({
      engineRating: 55,
      walkMP: 18,
      cruiseMP: 18,
    });
  });

  it.each([31, 35, 30.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects rating %s before mutating the store',
    (rating) => {
      const store = makeStore();
      const before = store.getState();
      expect(() => store.getState().setEngineRating(rating)).toThrow(/rating/i);
      expect(store.getState()).toBe(before);
    },
  );

  it.each([ProtoChassis.QUAD, ProtoChassis.GLIDER])(
    'inverts using the %s chassis adjustment',
    (chassis) => {
      expect(computeProtoWalkMPForRating(4, 28, chassis, 4)).toBe(6);
      expect(computeProtoWalkMPForRating(2, -4, chassis, 4)).toBe(0);
      expect(computeProtoWalkMPForRating(2, 0, chassis, 4)).toBe(1);
    },
  );

  it.each([0, -1, NaN, Infinity])(
    'rejects invalid inverse tonnage %s',
    (tonnage) => {
      expect(() =>
        computeProtoWalkMPForRating(tonnage, 30, ProtoChassis.BIPED, 4),
      ).toThrow(/rating/i);
    },
  );

  it.each([
    [5, 4, {}, 30],
    [4, 6, { quad: 'true' }, 28],
    [9, 6, { glider: 'true' }, 65],
    [5, 0, {}, 0],
  ] satisfies [number, number, Record<string, string>, number][])(
    'legacy handler preserves %s tons / walk %s / %j as rating %s',
    (tonnage, cruiseMP, rawTags, rating) => {
      const document: IBlkDocument = {
        blockVersion: 1,
        version: 'MAM0',
        unitType: 'ProtoMech',
        mappedUnitType: UnitType.PROTOMECH,
        name: 'Rating probe',
        model: '',
        year: 3060,
        type: 'Clan Level 3',
        tonnage,
        cruiseMP,
        armor: [2, 7, 2, 2, 4, 1],
        equipmentByLocation: {},
        rawTags,
      };
      const result = new ProtoMechUnitHandler().parse(document);
      expect(result.success).toBe(true);
      expect(result.data?.unit.engineRating).toBe(rating);
      expect(result.data?.unit.cruiseMP).toBe(cruiseMP);
    },
  );
});
