/** @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md */
import { BlkParserService } from '@/services/conversion/BlkParserService';
import { extractProtoMechData } from '@/services/printing/recordsheet/dataExtractors.protoMech';
import { computeProtoMechPipCounts } from '@/services/printing/svgRecordSheetRenderer/protomech/bindings';
import { ProtoMechUnitHandler } from '@/services/units/handlers/ProtoMechUnitHandler';
import { createDefaultProtoMechState } from '@/stores/protoMechState';
import { createProtoMechStore } from '@/stores/useProtoMechStore';
import { ProtoMechLocation as L } from '@/types/construction/UnitLocation';
import { ProtoChassis as C } from '@/types/unit/ProtoMechInterfaces';

// Pinned ProtoMek.java:785-826. Explicit table expectations, not a copy of the implementation.
const cases = [
  [1.5, 4, 8, 14],
  [2, 1, 2, 4],
  [3, 1, 2, 4],
  [4, 1, 3, 5],
  [5, 1, 3, 5],
  [5.75, 1, 3, 5],
  [6, 2, 4, 8],
  [7, 2, 4, 8],
  [8, 2, 5, 9],
  [9, 2, 5, 9],
  [9.5, 2, 5, 9],
  [10, 3, 6, 12],
  [11, 3, 6, 12],
  [12, 3, 7, 13],
  [13, 3, 7, 13],
  [14, 4, 8, 14],
  [15, 4, 8, 14],
  [16, 4, 8, 14],
] as const;

function source(tonnage: number, chassis: C, gun: boolean) {
  const tags = {
    UnitType: 'ProtoMek',
    Name: 'Structure test',
    Model: 'A',
    year: '3060',
    type: 'Clan Level 2',
    Tonnage: String(tonnage),
    motion_type:
      chassis === C.QUAD ? 'Quad' : chassis === C.GLIDER ? 'WiGE' : 'Biped',
    cruiseMP: '4',
    armor: gun ? '0\n0\n0\n0\n0\n0' : '0\n0\n0\n0\n0',
  };
  const parsed = new BlkParserService().parse(
    Object.entries(tags)
      .map(([key, value]) => `<${key}>\n${value}\n</${key}>`)
      .join('\n'),
  );
  if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
  const loaded = new ProtoMechUnitHandler().parse(parsed.data.document);
  if (!loaded.success) throw new Error(loaded.error.errors.join('; '));
  return loaded.data.unit;
}

function printData(tonnage: number, chassis: C, hasMainGun: boolean) {
  return extractProtoMechData({
    id: 'structure',
    name: 'Structure',
    chassis: 'Test',
    model: 'A',
    tonnage,
    techBase: 'Clan',
    rulesLevel: 'Advanced',
    era: 'Clan Invasion',
    isQuad: chassis === C.QUAD,
    hasMainGun,
  });
}

describe.each(Object.values(C))('%s structure', (chassis) => {
  it.each(cases)(
    'matches the source rule at %s tons',
    (tonnage, head, legs, quadLegs) => {
      for (const gun of [false, true]) {
        const expected = {
          [L.HEAD]: head,
          [L.TORSO]: Math.trunc(tonnage),
          [L.LEFT_ARM]: chassis === C.QUAD ? 0 : head,
          [L.RIGHT_ARM]: chassis === C.QUAD ? 0 : head,
          [L.LEGS]: chassis === C.QUAD ? quadLegs : legs,
          [L.MAIN_GUN]: gun ? (tonnage > 9 ? 2 : 1) : 0,
        };
        expect(source(tonnage, chassis, gun).structureByLocation).toEqual(
          expected,
        );
        const defaults = createDefaultProtoMechState({
          tonnage,
          chassisType: chassis,
        });
        expect(defaults.structureByLocation).toEqual({
          ...expected,
          [L.MAIN_GUN]: 0,
        });
        const store = createProtoMechStore(defaults);
        store.getState().setMainGun(gun);
        expect(store.getState().structureByLocation).toEqual(expected);
        expect(store.getState().bvBreakdown?.structureBV).toBe(
          Object.values(expected).reduce((a, b) => a + b, 0) * 1.5,
        );
        const pips = computeProtoMechPipCounts(
          printData(tonnage, chassis, gun),
        );
        expect(pips.HD.structure).toBe(head);
        expect(pips.T.structure).toBe(Math.trunc(tonnage));
        expect(pips.L.structure).toBe(expected[L.LEGS]);
        expect(pips.LA?.structure).toBe(chassis === C.QUAD ? undefined : head);
        expect(pips.RA?.structure).toBe(chassis === C.QUAD ? undefined : head);
        expect(pips.MG?.structure).toBe(gun ? expected[L.MAIN_GUN] : undefined);
      }
    },
  );
});

it('recalculates structural edits and BV, while retaining tonnage caps and manual overrides until then', () => {
  const store = createProtoMechStore(
    createDefaultProtoMechState({ tonnage: 5 }),
  );
  store.getState().setLocationStructure(L.TORSO, 99);
  store.getState().setName('Renamed');
  store.getState().setCruiseMP(3);
  expect(store.getState().structureByLocation[L.TORSO]).toBe(99);
  store.getState().setTonnage(20);
  expect(store.getState().tonnage).toBe(9);
  expect(store.getState().structureByLocation).toEqual({
    Head: 2,
    Torso: 9,
    'Left Arm': 2,
    'Right Arm': 2,
    Legs: 5,
    'Main Gun': 0,
  });
  expect(store.getState().bvBreakdown?.structureBV).toBe(30);
  store.getState().setChassisType(C.QUAD);
  expect(store.getState().structureByLocation).toEqual({
    Head: 2,
    Torso: 9,
    'Left Arm': 0,
    'Right Arm': 0,
    Legs: 9,
    'Main Gun': 0,
  });
  store.getState().setMainGun(true);
  expect(store.getState().bvBreakdown?.structureBV).toBe(31.5);
  store.getState().setMainGun(false);
  expect(store.getState().bvBreakdown?.structureBV).toBe(30);
  store.getState().setChassisType(C.GLIDER);
  expect(store.getState().structureByLocation[L.LEFT_ARM]).toBe(2);
});

it('preserves explicit legacy stored structure on creation without an implicit migration', () => {
  const saved = createDefaultProtoMechState();
  saved.structureByLocation[L.TORSO] = 99;
  const restored = createProtoMechStore(JSON.parse(JSON.stringify(saved)));
  expect(restored.getState().structureByLocation[L.TORSO]).toBe(99);
  restored.getState().setMainGun(false);
  expect(restored.getState().structureByLocation[L.TORSO]).toBe(5);
});

it.each([NaN, Infinity, -Infinity, 0, -1, 2147483648])(
  'rejects unusable default tonnage %s',
  (tonnage) => {
    expect(() => createDefaultProtoMechState({ tonnage })).toThrow(/tonnage/i);
  },
);

it('retains legacy weapon-name inference, but explicit absence wins', () => {
  const base = printData(9, C.BIPED, false);
  expect(
    computeProtoMechPipCounts({
      ...base,
      hasMainGun: undefined,
      mainGun: 'Laser',
    }).MG?.structure,
  ).toBe(1);
  expect(
    computeProtoMechPipCounts({ ...base, mainGun: 'Stale name' }).MG,
  ).toBeUndefined();
});
