/** @spec openspec/changes/establish-all-unit-data-parity/specs/battle-value-system/spec.md */
import {
  computeProtoMechBVFromState,
  createDefaultProtoMechState,
} from '@/stores/protoMechState';
import {
  clearAllProtoMechStores,
  hydrateOrCreateProtoMech,
} from '@/stores/protoMechStoreRegistry';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import { getPilotSkillModifier } from '@/types/validation/BattleValue';

import { calculateProtoMechBV, calculateProtoPointBV } from '../protoMechBV';
import * as defense from '../protoMechBVDefensive';
import * as offense from '../protoMechBVOffensive';
import { buildProto } from './protoMechBV.test.helpers';

jest.mock('../protoMechBVDefensive', () => {
  const actual = jest.requireActual<typeof import('../protoMechBVDefensive')>(
    '../protoMechBVDefensive',
  );
  return {
    ...actual,
    calculateProtoDefensive: jest.fn(actual.calculateProtoDefensive),
  };
});
jest.mock('../protoMechBVOffensive', () => {
  const actual = jest.requireActual<typeof import('../protoMechBVOffensive')>(
    '../protoMechBVOffensive',
  );
  return {
    ...actual,
    calculateProtoOffensive: jest.fn(actual.calculateProtoOffensive),
  };
});

beforeEach(() => {
  jest
    .mocked(defense.calculateProtoDefensive)
    .mockImplementation(
      jest.requireActual<typeof import('../protoMechBVDefensive')>(
        '../protoMechBVDefensive',
      ).calculateProtoDefensive,
    );
  jest
    .mocked(offense.calculateProtoOffensive)
    .mockImplementation(
      jest.requireActual<typeof import('../protoMechBVOffensive')>(
        '../protoMechBVOffensive',
      ).calculateProtoOffensive,
    );
});

// Actual MegaMek 48fcb2f6 weight/type/summary/adjustBV observations.
// Reference pools isolate summary and skill rules from equipment resolution.
const reference = [
  {
    gunnery: 0,
    factor: 1.75,
    applications: [
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.0,
        roundedBase: 0,
        final: 0,
      },
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.49,
        roundedBase: 0,
        final: 0,
      },
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.5,
        roundedBase: 1,
        final: 2,
      },
      {
        defensiveBefore: 0.49,
        offensiveBefore: 0.01,
        roundedBase: 1,
        final: 2,
      },
      {
        defensiveBefore: 17.5,
        offensiveBefore: 23.49,
        roundedBase: 41,
        final: 72,
      },
      {
        defensiveBefore: 125.0,
        offensiveBefore: 43.51,
        roundedBase: 169,
        final: 296,
      },
      {
        defensiveBefore: 280.0,
        offensiveBefore: 0.0,
        roundedBase: 280,
        final: 490,
      },
      {
        defensiveBefore: 600.0,
        offensiveBefore: 0.0,
        roundedBase: 600,
        final: 1050,
      },
    ],
  },
  {
    gunnery: 1,
    factor: 1.6,
    applications: [
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.0,
        roundedBase: 0,
        final: 0,
      },
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.49,
        roundedBase: 0,
        final: 0,
      },
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.5,
        roundedBase: 1,
        final: 2,
      },
      {
        defensiveBefore: 0.49,
        offensiveBefore: 0.01,
        roundedBase: 1,
        final: 2,
      },
      {
        defensiveBefore: 17.5,
        offensiveBefore: 23.49,
        roundedBase: 41,
        final: 66,
      },
      {
        defensiveBefore: 125.0,
        offensiveBefore: 43.51,
        roundedBase: 169,
        final: 270,
      },
      {
        defensiveBefore: 280.0,
        offensiveBefore: 0.0,
        roundedBase: 280,
        final: 448,
      },
      {
        defensiveBefore: 600.0,
        offensiveBefore: 0.0,
        roundedBase: 600,
        final: 960,
      },
    ],
  },
  {
    gunnery: 2,
    factor: 1.4,
    applications: [
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.0,
        roundedBase: 0,
        final: 0,
      },
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.49,
        roundedBase: 0,
        final: 0,
      },
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.5,
        roundedBase: 1,
        final: 1,
      },
      {
        defensiveBefore: 0.49,
        offensiveBefore: 0.01,
        roundedBase: 1,
        final: 1,
      },
      {
        defensiveBefore: 17.5,
        offensiveBefore: 23.49,
        roundedBase: 41,
        final: 57,
      },
      {
        defensiveBefore: 125.0,
        offensiveBefore: 43.51,
        roundedBase: 169,
        final: 237,
      },
      {
        defensiveBefore: 280.0,
        offensiveBefore: 0.0,
        roundedBase: 280,
        final: 392,
      },
      {
        defensiveBefore: 600.0,
        offensiveBefore: 0.0,
        roundedBase: 600,
        final: 840,
      },
    ],
  },
  {
    gunnery: 3,
    factor: 1.2,
    applications: [
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.0,
        roundedBase: 0,
        final: 0,
      },
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.49,
        roundedBase: 0,
        final: 0,
      },
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.5,
        roundedBase: 1,
        final: 1,
      },
      {
        defensiveBefore: 0.49,
        offensiveBefore: 0.01,
        roundedBase: 1,
        final: 1,
      },
      {
        defensiveBefore: 17.5,
        offensiveBefore: 23.49,
        roundedBase: 41,
        final: 49,
      },
      {
        defensiveBefore: 125.0,
        offensiveBefore: 43.51,
        roundedBase: 169,
        final: 203,
      },
      {
        defensiveBefore: 280.0,
        offensiveBefore: 0.0,
        roundedBase: 280,
        final: 336,
      },
      {
        defensiveBefore: 600.0,
        offensiveBefore: 0.0,
        roundedBase: 600,
        final: 720,
      },
    ],
  },
  {
    gunnery: 4,
    factor: 1.0,
    applications: [
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.0,
        roundedBase: 0,
        final: 0,
      },
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.49,
        roundedBase: 0,
        final: 0,
      },
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.5,
        roundedBase: 1,
        final: 1,
      },
      {
        defensiveBefore: 0.49,
        offensiveBefore: 0.01,
        roundedBase: 1,
        final: 1,
      },
      {
        defensiveBefore: 17.5,
        offensiveBefore: 23.49,
        roundedBase: 41,
        final: 41,
      },
      {
        defensiveBefore: 125.0,
        offensiveBefore: 43.51,
        roundedBase: 169,
        final: 169,
      },
      {
        defensiveBefore: 280.0,
        offensiveBefore: 0.0,
        roundedBase: 280,
        final: 280,
      },
      {
        defensiveBefore: 600.0,
        offensiveBefore: 0.0,
        roundedBase: 600,
        final: 600,
      },
    ],
  },
  {
    gunnery: 5,
    factor: 0.9,
    applications: [
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.0,
        roundedBase: 0,
        final: 0,
      },
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.49,
        roundedBase: 0,
        final: 0,
      },
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.5,
        roundedBase: 1,
        final: 1,
      },
      {
        defensiveBefore: 0.49,
        offensiveBefore: 0.01,
        roundedBase: 1,
        final: 1,
      },
      {
        defensiveBefore: 17.5,
        offensiveBefore: 23.49,
        roundedBase: 41,
        final: 37,
      },
      {
        defensiveBefore: 125.0,
        offensiveBefore: 43.51,
        roundedBase: 169,
        final: 152,
      },
      {
        defensiveBefore: 280.0,
        offensiveBefore: 0.0,
        roundedBase: 280,
        final: 252,
      },
      {
        defensiveBefore: 600.0,
        offensiveBefore: 0.0,
        roundedBase: 600,
        final: 540,
      },
    ],
  },
  {
    gunnery: 6,
    factor: 0.85,
    applications: [
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.0,
        roundedBase: 0,
        final: 0,
      },
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.49,
        roundedBase: 0,
        final: 0,
      },
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.5,
        roundedBase: 1,
        final: 1,
      },
      {
        defensiveBefore: 0.49,
        offensiveBefore: 0.01,
        roundedBase: 1,
        final: 1,
      },
      {
        defensiveBefore: 17.5,
        offensiveBefore: 23.49,
        roundedBase: 41,
        final: 35,
      },
      {
        defensiveBefore: 125.0,
        offensiveBefore: 43.51,
        roundedBase: 169,
        final: 144,
      },
      {
        defensiveBefore: 280.0,
        offensiveBefore: 0.0,
        roundedBase: 280,
        final: 238,
      },
      {
        defensiveBefore: 600.0,
        offensiveBefore: 0.0,
        roundedBase: 600,
        final: 510,
      },
    ],
  },
  {
    gunnery: 7,
    factor: 0.8,
    applications: [
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.0,
        roundedBase: 0,
        final: 0,
      },
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.49,
        roundedBase: 0,
        final: 0,
      },
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.5,
        roundedBase: 1,
        final: 1,
      },
      {
        defensiveBefore: 0.49,
        offensiveBefore: 0.01,
        roundedBase: 1,
        final: 1,
      },
      {
        defensiveBefore: 17.5,
        offensiveBefore: 23.49,
        roundedBase: 41,
        final: 33,
      },
      {
        defensiveBefore: 125.0,
        offensiveBefore: 43.51,
        roundedBase: 169,
        final: 135,
      },
      {
        defensiveBefore: 280.0,
        offensiveBefore: 0.0,
        roundedBase: 280,
        final: 224,
      },
      {
        defensiveBefore: 600.0,
        offensiveBefore: 0.0,
        roundedBase: 600,
        final: 480,
      },
    ],
  },
  {
    gunnery: 8,
    factor: 0.75,
    applications: [
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.0,
        roundedBase: 0,
        final: 0,
      },
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.49,
        roundedBase: 0,
        final: 0,
      },
      {
        defensiveBefore: 0.0,
        offensiveBefore: 0.5,
        roundedBase: 1,
        final: 1,
      },
      {
        defensiveBefore: 0.49,
        offensiveBefore: 0.01,
        roundedBase: 1,
        final: 1,
      },
      {
        defensiveBefore: 17.5,
        offensiveBefore: 23.49,
        roundedBase: 41,
        final: 31,
      },
      {
        defensiveBefore: 125.0,
        offensiveBefore: 43.51,
        roundedBase: 169,
        final: 127,
      },
      {
        defensiveBefore: 280.0,
        offensiveBefore: 0.0,
        roundedBase: 280,
        final: 210,
      },
      {
        defensiveBefore: 600.0,
        offensiveBefore: 0.0,
        roundedBase: 600,
        final: 450,
      },
    ],
  },
];

afterEach(() => {
  jest.restoreAllMocks();
  clearAllProtoMechStores(true);
});

describe.each(Object.values(ProtoChassis))(
  '%s native adjustments',
  (chassisType) => {
    it.each([2, 2.5, 5, 9, 9.000000001, 9.5, 10, 15])(
      'has zero weight-only offense at %s tons',
      (tonnage) => {
        const bv = calculateProtoMechBV(buildProto({ tonnage, chassisType }));
        expect(bv.physicalWeaponBV).toBe(0);
        expect(bv.offensiveBV).toBe(0);
        expect(bv.baseBV).toBe(0);
        expect(bv.final).toBe(0);
      },
    );

    it.each(reference)(
      'uses Gunnery $gunnery with every Piloting and native rounding',
      (row) => {
        const unit = buildProto({ tonnage: 5, chassisType });
        const defensive = defense.calculateProtoDefensive(unit);
        const offensive = offense.calculateProtoOffensive(unit);
        const defSpy = jest.mocked(defense.calculateProtoDefensive);
        const offSpy = jest.mocked(offense.calculateProtoOffensive);
        for (const sample of row.applications) {
          defSpy.mockReturnValue({
            ...defensive,
            defensiveBV: sample.defensiveBefore,
          });
          offSpy.mockReturnValue({
            ...offensive,
            offensiveBV: sample.offensiveBefore,
          });
          for (let piloting = 0; piloting <= 8; piloting++) {
            const options = { gunnery: row.gunnery, piloting };
            const before = JSON.stringify({ unit, options });
            const result = calculateProtoMechBV(unit, options);
            expect(result.chassisMultiplier).toBe(1);
            expect(result.pilotMultiplier).toBe(row.factor);
            expect(result.baseBV).toBe(sample.roundedBase);
            expect(result.final).toBe(sample.final);
            expect(calculateProtoPointBV([unit, unit], options)).toBe(
              sample.final * 2,
            );
            expect(JSON.stringify({ unit, options })).toBe(before);
          }
        }
      },
    );
  },
);

it('defaults Gunnery to four and keeps the generic skill owner unchanged', () => {
  const unit = buildProto({ tonnage: 5 });
  expect(calculateProtoMechBV(unit).pilotMultiplier).toBe(1);
  expect(calculateProtoMechBV(unit, { piloting: 0 }).pilotMultiplier).toBe(1);
  expect(getPilotSkillModifier(4, 0)).toBe(1.38);
  expect(getPilotSkillModifier(4, 8)).toBe(0.85);
});

it.each(Object.values(ProtoChassis))(
  'preserves a saved %s cache until explicit recomputation',
  (chassisType) => {
    const id = '11111111-2222-4333-8444-777777777777';
    const state = {
      ...createDefaultProtoMechState({ id, tonnage: 5, chassisType }),
      walkMP: 5,
      cruiseMP: 5,
      flankMP: 6,
    };
    const cached = {
      ...computeProtoMechBVFromState(state),
      physicalWeaponBV: 5,
      chassisMultiplier: 0.9,
      pilotMultiplier: 1.38,
      final: 123,
    };
    const key = `megamek-protomech-${id}`;
    const saved = JSON.stringify({
      state: { ...state, bvBreakdown: cached },
      version: 0,
    });
    localStorage.setItem(key, saved);
    const store = hydrateOrCreateProtoMech(id, { tonnage: 5 });
    expect(localStorage.getItem(key)).toBe(saved);
    expect(store.getState().bvBreakdown).toEqual(cached);
    store.getState().setName('Retained');
    expect(store.getState().bvBreakdown).toEqual(cached);
    store.getState().recomputeBV();
    expect(store.getState().bvBreakdown).toMatchObject({
      physicalWeaponBV: 0,
      offensiveBV: 0,
      chassisMultiplier: 1,
      pilotMultiplier: 1,
    });
    expect(store.getState().bvBreakdown).toEqual(
      computeProtoMechBVFromState(store.getState()),
    );
    expect(store.getState()).toMatchObject({
      walkMP: 5,
      cruiseMP: 5,
      flankMP: 6,
    });
    expect(JSON.parse(localStorage.getItem(key)!).state.bvBreakdown).toEqual(
      store.getState().bvBreakdown,
    );
  },
);
