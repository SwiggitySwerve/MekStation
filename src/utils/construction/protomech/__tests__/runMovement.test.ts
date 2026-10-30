import { render, renderHook } from '@testing-library/react';
import { createElement, type PropsWithChildren } from 'react';

import { useProtoMechMovementControls } from '@/components/customizer/protomech/ProtoMechStructureTab.logic';
import { ProtoMechMovementSection } from '@/components/customizer/protomech/ProtoMechStructureTab.sections';
import { BlkParserService } from '@/services/conversion/BlkParserService';
import { ProtoMechUnitHandler } from '@/services/units/handlers/ProtoMechUnitHandler';
import {
  createDefaultProtoMechState,
  computeProtoMechBVFromState,
} from '@/stores/protoMechState';
import {
  createProtoMechStore,
  ProtoMechStoreContext,
} from '@/stores/useProtoMechStore';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

import { computeRunMP } from '../index';
import { calculateProtoMechBV } from '../protoMechBV';

jest.mock('@/utils/construction/protomech/protoMechBV', () => {
  const actual = jest.requireActual<
    typeof import('@/utils/construction/protomech/protoMechBV')
  >('@/utils/construction/protomech/protoMechBV');
  return {
    ...actual,
    calculateProtoMechBV: jest.fn(actual.calculateProtoMechBV),
  };
});

/** @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md */
describe('Pinned undamaged ProtoMech running movement', () => {
  // Actual ProtoMek.getRunMP observations at MegaMek48fcb2f6.
  it.each([
    [0, 0, 0],
    [1, 2, 2],
    [2, 3, 4],
    [3, 5, 6],
    [4, 6, 8],
    [5, 8, 10],
    [6, 9, 12],
    [8, 12, 16],
  ])('walk %s has ordinary run %s and boosted run %s', (walk, run, boosted) => {
    expect(computeRunMP(walk, false)).toBe(run);
    expect(computeRunMP(walk, true)).toBe(boosted);
    expect(computeRunMP(walk)).toBe(run);
  });

  it.each([
    [2, ProtoChassis.BIPED, 4, 6],
    [2, ProtoChassis.QUAD, 4, 6],
    [2, ProtoChassis.GLIDER, 4, 6],
    [15, ProtoChassis.ULTRAHEAVY, 3, 5],
  ] satisfies [number, ProtoChassis, number, number][])(
    'creates %s-ton %s movement without changing its base walk default',
    (tonnage, chassisType, walk, run) => {
      expect(
        createDefaultProtoMechState({ tonnage, chassisType }),
      ).toMatchObject({
        walkMP: walk,
        cruiseMP: walk,
        flankMP: run,
      });
    },
  );

  it.each([false, true])(
    'refreshes all six movement actions with booster=%s',
    (booster) => {
      const store = createProtoMechStore({
        ...createDefaultProtoMechState({ tonnage: 2 }),
        hasMyomerBooster: booster,
      });
      const check = (walk: number, run: number) => {
        expect(store.getState()).toMatchObject({
          walkMP: walk,
          cruiseMP: walk,
          flankMP: run,
        });
        expect(store.getState().bvBreakdown).toEqual(
          computeProtoMechBVFromState(store.getState()),
        );
      };
      store.getState().setCruiseMP(5);
      check(5, booster ? 10 : 8);
      store.getState().setWalkMP(3);
      check(3, booster ? 6 : 5);
      store.getState().setEngineRating(16);
      check(5, booster ? 10 : 8);
      expect(store.getState().engineRating).toBe(16);
      store.getState().setChassisType(ProtoChassis.QUAD);
      check(5, booster ? 10 : 8);
      expect(store.getState().engineRating).toBe(12);
      store.getState().setTonnage(7);
      check(3, booster ? 6 : 5);
      expect(store.getState().engineRating).toBe(21);
      store.getState().setMyomerBooster(!booster);
      check(3, booster ? 5 : 6);
      expect(store.getState().engineRating).toBe(21);
    },
  );

  it('retains existing clamps and the direct-rating zero-speed case', () => {
    const store = createProtoMechStore(
      createDefaultProtoMechState({ tonnage: 2 }),
    );
    store.getState().setCruiseMP(0);
    expect(store.getState()).toMatchObject({ walkMP: 1, flankMP: 2 });
    store.getState().setWalkMP(99);
    expect(store.getState()).toMatchObject({ walkMP: 8, flankMP: 12 });
    store.getState().setEngineRating(0);
    expect(store.getState()).toMatchObject({
      walkMP: 0,
      cruiseMP: 0,
      flankMP: 0,
    });
  });

  it('preserves saved flank through unrelated edits until a movement edit', () => {
    const store = createProtoMechStore({
      ...createDefaultProtoMechState({ tonnage: 2 }),
      walkMP: 5,
      cruiseMP: 5,
      flankMP: 6,
    });
    store.getState().setName('Saved movement');
    expect(store.getState().flankMP).toBe(6);
    store.getState().setWalkMP(5);
    expect(store.getState().flankMP).toBe(8);
  });

  it.each([false, true])(
    'derives missing saved flank from explicit booster=%s',
    (booster) => {
      const state = {
        ...createDefaultProtoMechState({ tonnage: 2 }),
        walkMP: 5,
        cruiseMP: 5,
        hasMyomerBooster: booster,
      };
      Reflect.deleteProperty(state, 'flankMP');
      computeProtoMechBVFromState(state);
      expect(
        jest.mocked(calculateProtoMechBV).mock.lastCall?.[0],
      ).toMatchObject({
        walkMP: 5,
        runMP: booster ? 10 : 8,
      });
    },
  );

  it.each([false, true])(
    'projects a real raw source with explicit booster=%s',
    (booster) => {
      const tags = {
        UnitType: 'ProtoMek',
        Name: 'Run probe',
        Model: 'A',
        year: '3060',
        type: 'Clan Level 2',
        Tonnage: '2',
        motion_type: 'Biped',
        cruiseMP: '5',
        armor: '0\n0\n0\n0\n0',
        'Torso Equipment': booster ? 'CLMyomerBooster' : '',
      };
      const parsed = new BlkParserService().parse(
        Object.entries(tags)
          .map(([key, value]) => `<${key}>\n${value}\n</${key}>`)
          .join('\n'),
      );
      if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
      const handler = new ProtoMechUnitHandler();
      const loaded = handler.parse(parsed.data.document);
      if (!loaded.success) throw new Error(loaded.error.errors.join('; '));
      expect(loaded.data.unit).toMatchObject({
        cruiseMP: 5,
        engineRating: 16,
        hasMyomerBooster: booster,
      });
      const before = JSON.stringify(loaded.data.unit);
      handler.calculateBV(loaded.data.unit);
      expect(
        jest.mocked(calculateProtoMechBV).mock.lastCall?.[0],
      ).toMatchObject({
        walkMP: 5,
        runMP: booster ? 10 : 8,
        engineRating: 16,
      });
      expect(JSON.stringify(loaded.data.unit)).toBe(before);
    },
  );

  it('displays boosted Run while retaining base Walk in the real controls', () => {
    const store = createProtoMechStore({
      ...createDefaultProtoMechState({ tonnage: 2 }),
      walkMP: 5,
      cruiseMP: 5,
      hasMyomerBooster: true,
    });
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(ProtoMechStoreContext.Provider, { value: store }, children);
    const { result } = renderHook(() => useProtoMechMovementControls(false), {
      wrapper,
    });
    expect(result.current.effectiveWalk).toBe(5);
    expect(result.current.runMP).toBe(10);
    const view = render(
      createElement(ProtoMechMovementSection, {
        readOnly: false,
        controls: result.current,
      }),
    );
    expect(view.container.textContent).not.toMatch(
      /walk \+ 1|\+1 booster|\+1 walk/i,
    );
  });
});
