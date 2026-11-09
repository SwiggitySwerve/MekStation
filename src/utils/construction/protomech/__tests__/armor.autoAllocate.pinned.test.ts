/**
 * Auto armor allocation against MegaMekLab.
 *
 * `fixtures/armor-auto-allocate-java.json` holds the armor MegaMekLab 62bf193
 * places on a real ProtoMek for every tonnage 2-15, biped/quad/glider, with and
 * without a main gun, at up to 14 point totals each, plus cases with edited
 * internal structure (1,834 cases). Its probe,
 * `fixtures/ProtoAutoAllocateProbe.java`, copies `autoAllocateArmor`,
 * `allocateLeftoverPoints` and `addArmorPoint` byte-for-byte from
 * `PMStructureTab.java` and runs them on the original MegaMek and MegaMekLab
 * classes (`UnitUtil`, `TestProtoMek`, `ProtoMek`).
 *
 * Java walks the locations Head, Torso, Right Arm, Left Arm, Legs, Main Gun
 * (ProtoMek.java:102-108; firstArmorIndex() is LOC_HEAD).
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import { createNewProtoMechStore } from '@/stores/useProtoMechStore';
import { ProtoMechLocation as L } from '@/types/construction/UnitLocation';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import { allocateProtoArmor } from '@/utils/construction/protomech';

import fixture from './fixtures/armor-auto-allocate-java.json';

type Chassis = 'biped' | 'quad' | 'glider';
type Case = [number, Chassis, boolean, number, number, number[], number[]?];

const CASES = fixture.cases as Case[];
const JAVA_ORDER = [
  L.HEAD,
  L.TORSO,
  L.RIGHT_ARM,
  L.LEFT_ARM,
  L.LEGS,
  L.MAIN_GUN,
] as const;
const CHASSIS: Record<Chassis, ProtoChassis> = {
  biped: ProtoChassis.BIPED,
  quad: ProtoChassis.QUAD,
  glider: ProtoChassis.GLIDER,
};

/** Original structure in the fixture's order, for the cases that edit it. */
function structureOf(values?: number[]) {
  if (!values) return undefined;
  return Object.fromEntries(
    JAVA_ORDER.map((location, index) => [location, values[index]]),
  ) as Record<L, number>;
}

/** The result in the order the fixture lists it. */
function allocate(
  tonnage: number,
  chassis: ProtoChassis,
  mainGun: boolean,
  points?: number,
  structure?: number[],
): number[] {
  const result = allocateProtoArmor(
    tonnage,
    mainGun,
    chassis,
    structureOf(structure),
    points,
  );
  return JAVA_ORDER.map((location) => result[location]);
}

describe('pinned MegaMekLab autoAllocateArmor', () => {
  it('records the pinned provenance', () => {
    expect(fixture.meta.pins.megameklab).toBe(
      '62bf19360382049e2e6a1e8f24e859e27bdc5878',
    );
    expect(fixture.meta.pins.megamek).toBe(
      '48fcb2f64a1b3f2d575707ce5653dad64927b587',
    );
    expect(fixture.meta.probeSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(CASES).toHaveLength(fixture.meta.cases);
  });

  it('covers every tonnage, chassis and main gun setting', () => {
    const keys = new Set(CASES.map(([t, c, mg]) => `${t}|${c}|${mg}`));
    expect(keys.size).toBe(14 * 3 * 2);
    expect(CASES.filter((c) => c[6] !== undefined).length).toBeGreaterThan(
      1500,
    );
  });

  it('matches Java on every case', () => {
    const mismatches: string[] = [];
    for (const [
      tonnage,
      chassis,
      mainGun,
      points,
      cap,
      expected,
      structure,
    ] of CASES) {
      const actual = allocate(
        tonnage,
        CHASSIS[chassis],
        mainGun,
        points,
        structure,
      );
      if (actual.join() !== expected.join()) {
        mismatches.push(
          `${tonnage} t ${chassis}${mainGun ? ' +MG' : ''} ${points}/${cap}: ours [${actual}] Java [${expected}]`,
        );
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('treats the ultraheavy chassis as a non-quad above 9 t', () => {
    for (const [
      tonnage,
      chassis,
      mainGun,
      points,
      ,
      expected,
      structure,
    ] of CASES) {
      if (chassis !== 'biped' || tonnage < 10) continue;
      expect(
        allocate(tonnage, ProtoChassis.ULTRAHEAVY, mainGun, points, structure),
      ).toEqual(expected);
    }
  });

  it('places exactly the requested points, up to the cap, with the default structure', () => {
    for (const [tonnage, chassis, mainGun, points, cap, , structure] of CASES) {
      if (structure) continue;
      const total = allocate(tonnage, CHASSIS[chassis], mainGun, points).reduce(
        (sum, value) => sum + value,
        0,
      );
      expect([tonnage, chassis, mainGun, points, total]).toEqual([
        tonnage,
        chassis,
        mainGun,
        points,
        Math.min(points, cap),
      ]);
    }
  });

  it('drops points it cannot place when edited structure shrinks the limits, as upstream does', () => {
    let dropped = 0;
    for (const [
      tonnage,
      chassis,
      mainGun,
      points,
      cap,
      expected,
      structure,
    ] of CASES) {
      if (!structure) continue;
      const total = expected.reduce((sum, value) => sum + value, 0);
      expect(total).toBeLessThanOrEqual(Math.min(points, cap));
      if (total < Math.min(points, cap)) {
        dropped++;
        // Ours drops exactly the same points, never more and never fewer.
        expect(
          allocate(
            tonnage,
            CHASSIS[chassis],
            mainGun,
            points,
            structure,
          ).reduce((sum, value) => sum + value, 0),
        ).toBe(total);
      }
    }
    expect(dropped).toBeGreaterThan(500);
  });

  it('fills the legal total when no point count is given', () => {
    for (const [
      tonnage,
      chassis,
      mainGun,
      points,
      cap,
      expected,
      structure,
    ] of CASES) {
      if (points !== cap) continue;
      expect(
        allocate(tonnage, CHASSIS[chassis], mainGun, undefined, structure),
      ).toEqual(expected);
    }
  });

  it('never exceeds a location limit and leaves quad arms empty', () => {
    for (const [tonnage, chassis, mainGun, points, , , structure] of CASES) {
      const result = allocateProtoArmor(
        tonnage,
        mainGun,
        CHASSIS[chassis],
        structureOf(structure),
        points,
      );
      if (chassis === 'quad') {
        expect(result[L.LEFT_ARM]).toBe(0);
        expect(result[L.RIGHT_ARM]).toBe(0);
      }
      if (!mainGun) expect(result[L.MAIN_GUN]).toBe(0);
    }
  });

  it('rejects a point count that is not a nonnegative whole number', () => {
    for (const bad of [-1, 2.5, Number.NaN]) {
      expect(() =>
        allocateProtoArmor(5, false, ProtoChassis.BIPED, undefined, bad),
      ).toThrow('nonnegative whole number');
    }
  });
});

describe('Auto armor in the store', () => {
  it('uses the pinned allocation at the legal total', () => {
    const store = createNewProtoMechStore({
      tonnage: 7,
      chassisType: ProtoChassis.BIPED,
    });
    store.getState().setMainGun(true);
    store.getState().autoAllocateArmor();
    const [, , , , , expected] = CASES.find(
      ([t, c, mg, p, cap]) => t === 7 && c === 'biped' && mg && p === cap,
    )!;
    expect(JAVA_ORDER.map((l) => store.getState().armorByLocation[l])).toEqual(
      expected,
    );
  });
});
