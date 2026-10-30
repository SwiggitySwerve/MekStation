/** @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md */
import { BlkParserService } from '@/services/conversion/BlkParserService';
import { ProtoMechUnitHandler } from '@/services/units/handlers/ProtoMechUnitHandler';
import {
  createDefaultProtoMechState,
  computeProtoMechBVFromState,
} from '@/stores/protoMechState';
import { createProtoMechStore } from '@/stores/useProtoMechStore';
import { ProtoMechLocation as L } from '@/types/construction/UnitLocation';
import { ProtoChassis as C } from '@/types/unit/ProtoMechInterfaces';

import {
  computeProtoArmorLimits,
  getProtoArmorMaxByTonnage,
  computeProtoStructure,
} from '..';

// Explicit observations of pinned TestProtoMek.maxArmorFactor, not product-derived expectations.
const cases = [
  [0.25, C.BIPED, false, 15, [2, 0, 2, 2, 16, 0]],
  [2, C.BIPED, true, 18, [3, 4, 2, 2, 4, 3]],
  [5, C.BIPED, false, 24, [4, 10, 2, 2, 6, 0]],
  [5, C.QUAD, true, 27, [4, 10, 0, 0, 10, 3]],
  [5.75, C.GLIDER, false, 24, [4, 10, 2, 2, 6, 0]],
  [6, C.BIPED, false, 33, [5, 12, 4, 4, 8, 0]],
  [9, C.BIPED, true, 45, [6, 18, 4, 4, 10, 3]],
  [9.25, C.BIPED, true, 48, [6, 18, 4, 4, 10, 6]],
  [10, C.ULTRAHEAVY, false, 51, [7, 20, 6, 6, 12, 0]],
  [15, C.QUAD, true, 73, [9, 30, 0, 0, 28, 6]],
  [16, C.BIPED, false, 67, [10, 32, 6, 6, 16, 0]],
] as const;
const locations = [
  L.HEAD,
  L.TORSO,
  L.LEFT_ARM,
  L.RIGHT_ARM,
  L.LEGS,
  L.MAIN_GUN,
];

describe('pinned ProtoMech armor limits', () => {
  it.each(cases)('%s t %s gun %s', (tonnage, chassis, gun, total, points) => {
    const limits = computeProtoArmorLimits(tonnage, chassis, gun);
    expect(limits.total).toBe(total);
    expect(locations.map((loc) => limits.byLocation[loc])).toEqual(points);
    expect(getProtoArmorMaxByTonnage(tonnage, chassis, gun)).toEqual({
      head: points[0],
      torso: points[1],
      arm: points[2],
      legs: points[4],
      mainGun: points[5],
    });
  });

  it('uses supplied original structure without deriving total capacity from it', () => {
    const structure = {
      ...computeProtoStructure(5, C.BIPED, true),
      [L.TORSO]: 7,
      [L.LEGS]: 4,
      [L.MAIN_GUN]: 2,
    };
    const limits = computeProtoArmorLimits(5, C.BIPED, true, structure);
    expect(limits).toEqual({
      total: 27,
      byLocation: {
        [L.HEAD]: 4,
        [L.TORSO]: 14,
        [L.LEFT_ARM]: 2,
        [L.RIGHT_ARM]: 2,
        [L.LEGS]: 8,
        [L.MAIN_GUN]: 6,
      },
    });
    expect(structure[L.TORSO]).toBe(7);
  });

  it.each([0, -1, NaN, Infinity, 2147483648])(
    'diagnoses unusable tonnage %s',
    (tonnage) => {
      expect(() => computeProtoArmorLimits(tonnage, C.BIPED, false)).toThrow(
        /tonnage/i,
      );
    },
  );

  it.each([NaN, Infinity, -1, 1.5])(
    'diagnoses unusable original structure %s',
    (points) => {
      expect(() =>
        computeProtoArmorLimits(5, C.BIPED, false, {
          ...computeProtoStructure(5, C.BIPED, false),
          [L.TORSO]: points,
        }),
      ).toThrow(/structure/i);
    },
  );
});

describe.each(Object.values(C))('%s armor consumers', (chassis) => {
  it.each([2, 5, 9, 9.25, 15])(
    'explicit allocation at %s t respects topology and caps and refreshes BV',
    (tonnage) => {
      for (const gun of [false, true]) {
        const store = createProtoMechStore(
          createDefaultProtoMechState({
            id: 'armor-test',
            tonnage,
            chassisType: chassis,
          }),
        );
        store.getState().setMainGun(gun);
        const limits = computeProtoArmorLimits(tonnage, chassis, gun);
        store.getState().autoAllocateArmor();
        const state = store.getState();
        const points = Object.values(state.armorByLocation);
        expect(points.every((p) => Number.isInteger(p) && p >= 0)).toBe(true);
        expect(points.reduce((a, b) => a + b, 0)).toBe(
          Math.min(
            limits.total,
            Object.values(limits.byLocation).reduce((a, b) => a + b, 0),
          ),
        );
        for (const loc of locations)
          expect(state.armorByLocation[loc]).toBeLessThanOrEqual(
            limits.byLocation[loc],
          );
        expect(state.bvBreakdown).toEqual(computeProtoMechBVFromState(state));
        const allocation = { ...state.armorByLocation };
        store.getState().autoAllocateArmor();
        expect(store.getState().armorByLocation).toEqual(allocation);
      }
    },
  );
});

it('keeps manual armor on unrelated edits and only allocates when requested', () => {
  const initial = createDefaultProtoMechState({
    id: 'preserved-armor',
    tonnage: 5,
  });
  initial.armorByLocation[L.HEAD] = 99;
  initial.structureByLocation[L.TORSO] = 7;
  const store = createProtoMechStore(initial);
  const before = { ...store.getState().armorByLocation };
  store.getState().setCruiseMP(6);
  expect(store.getState().armorByLocation).toEqual(before);
  store.getState().autoAllocateArmor();
  expect(store.getState().armorByLocation[L.TORSO]).toBeLessThanOrEqual(14);
  expect(store.getState().armorByLocation[L.HEAD]).toBeLessThanOrEqual(4);
});

describe.each(['ProtoMek', 'ProtoMech', 'Protomech'])(
  '%s source diagnostics',
  (spelling) => {
    it.each([
      ['5', 'Biped', [5, 0, 0, 0, 0], /Head armor/],
      ['5', 'Quad', [0, 0, 1, 0, 0], /Right Arm armor/],
      ['5', 'Biped', [-1, 0, 0, 0, 0], /Head armor/],
      ['16', 'Biped', [10, 32, 6, 6, 16], /total armor/i],
    ] as const)(
      'retains armor and adds construction errors at %s t %s',
      (weight, motion, armor, diagnostic) => {
        const tags = {
          UnitType: spelling,
          Name: 'Armor test',
          year: '3060',
          type: 'Clan Level 2',
          Tonnage: weight,
          motion_type: motion,
          cruiseMP: '4',
          armor: armor.join('\n'),
        };
        const parsed = new BlkParserService().parse(
          Object.entries(tags)
            .map(([key, value]) => `<${key}>\n${value}\n</${key}>`)
            .join('\n'),
        );
        if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
        const handler = new ProtoMechUnitHandler();
        const result = handler.parse(parsed.data.document);
        if (!result.success) throw new Error(result.error.errors.join('; '));
        const unit = result.data.unit;
        expect(unit.armorByLocation).toEqual({
          [L.HEAD]: armor[0],
          [L.TORSO]: armor[1],
          [L.RIGHT_ARM]: armor[2],
          [L.LEFT_ARM]: armor[3],
          [L.LEGS]: armor[4],
          [L.MAIN_GUN]: 0,
        });
        expect(unit.isValid).toBe(false);
        expect(unit.validationErrors?.join('; ')).toMatch(diagnostic);
        expect(handler.validate(unit).errors.join('; ')).toMatch(diagnostic);
      },
    );
  },
);
