/**
 * unit.armor-tech-base-by-location.contract.test.ts
 *
 * `armor.techBaseByLocation` is the Patchwork mech's per-location armor tech base, a map parallel to
 * `armor.typeByLocation` with the same wire values as `componentTechBases` (INNER_SPHERE | CLAN).
 * MegaMek 48fcb2f64 MtfFile.java:483-525 reads each Patchwork line's type and tech level separately
 * (the line text containing "clan" is Clan, "inner sphere" is Inner Sphere); the integer type code
 * alone (`typeByLocation`) cannot say which.
 *
 * Contract rules, enforced by the schema and therefore by the generated zod:
 *  - optional; never defaulted;
 *  - present only when armor.type is PATCHWORK;
 *  - its keys must be a subset of `typeByLocation`'s keys (a location without an entry is "unknown");
 *  - values are INNER_SPHERE | CLAN, keys are mech locations.
 */

import fs from 'node:fs';
import path from 'node:path';

import { type IUnitContract, UnitContract } from '@/types/contracts';

// Type level (checked by tsc, not by Jest): the field is optional and carries only the two wire values.
type ArmorTechBase = NonNullable<
  NonNullable<IUnitContract['armor']>['techBaseByLocation']
>;
export const typedTechBase: ArmorTechBase = {
  HEAD: 'CLAN',
  LEFT_ARM: 'INNER_SPHERE',
};
// @ts-expect-error MIXED is not a per-location armor tech base
export const mixedTechBase: ArmorTechBase = { HEAD: 'MIXED' };
// @ts-expect-error a map key must be a mech location
export const unknownLocation: ArmorTechBase = { FRONT: 'CLAN' };

const UNIT = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      'public',
      'data',
      'units',
      'battlemechs',
      '4-clan-invasion',
      'standard',
      'Zeus-X ZEU-X.json',
    ),
    'utf-8',
  ),
) as { armor: Record<string, unknown>; [key: string]: unknown };

// Zeus-X ZEU-X: IS Reactive arms and legs, Clan Standard torsos and head, on an Inner Sphere unit.
const FULL = {
  LEFT_ARM: 'INNER_SPHERE',
  RIGHT_ARM: 'INNER_SPHERE',
  LEFT_TORSO: 'CLAN',
  RIGHT_TORSO: 'CLAN',
  CENTER_TORSO: 'CLAN',
  HEAD: 'CLAN',
  LEFT_LEG: 'INNER_SPHERE',
  RIGHT_LEG: 'INNER_SPHERE',
};

const withArmor = (armor: Record<string, unknown>) =>
  UnitContract.safeParse({ ...UNIT, armor: { ...UNIT.armor, ...armor } });

describe('unit contract: armor.techBaseByLocation', () => {
  it('fixture is a Patchwork mech with a typeByLocation map and no tech map', () => {
    expect(UNIT.armor.type).toBe('PATCHWORK');
    expect(Object.keys(UNIT.armor.typeByLocation as object).sort()).toEqual(
      Object.keys(FULL).sort(),
    );
    expect(UNIT.armor).not.toHaveProperty('techBaseByLocation');
    expect(UnitContract.safeParse(UNIT).success).toBe(true);
  });

  describe('accepts', () => {
    it('a Patchwork unit with a tech entry for every typed location', () => {
      expect(withArmor({ techBaseByLocation: FULL }).success).toBe(true);
    });

    it('a Patchwork unit with a subset: the missing location is unknown', () => {
      const { HEAD: _head, LEFT_LEG: _leg, ...subset } = FULL;
      expect(withArmor({ techBaseByLocation: subset }).success).toBe(true);
    });

    it('a Patchwork unit with no map at all', () => {
      expect(withArmor({}).success).toBe(true);
    });

    it('keeps the map on parse (the contract does not strip it)', () => {
      const parsed = withArmor({ techBaseByLocation: FULL });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        const armor = (parsed.data as { armor: Record<string, unknown> }).armor;
        expect(armor.techBaseByLocation).toEqual(FULL);
      }
    });
  });

  describe('rejects', () => {
    it.each(['STANDARD', 'FERRO_FIBROUS', 'REACTIVE'])(
      'a non-Patchwork unit (armor.type %s) that carries the map',
      (type) => {
        const { typeByLocation: _t, ...rest } = UNIT.armor;
        expect(
          withArmor({
            ...rest,
            type,
            typeByLocation: undefined,
            techBaseByLocation: { HEAD: 'CLAN' },
          }).success,
        ).toBe(false);
      },
    );

    it('a non-Patchwork unit even when the map is empty', () => {
      expect(
        withArmor({
          type: 'STANDARD',
          typeByLocation: undefined,
          techBaseByLocation: {},
        }).success,
      ).toBe(false);
    });

    it('a location that is not in typeByLocation', () => {
      const { LEFT_LEG: _leg, ...typed } = UNIT.armor.typeByLocation as Record<
        string,
        number
      >;
      expect(
        withArmor({
          typeByLocation: typed,
          techBaseByLocation: { LEFT_LEG: 'INNER_SPHERE' },
        }).success,
      ).toBe(false);
    });

    it('a map when typeByLocation is absent entirely', () => {
      expect(
        withArmor({
          typeByLocation: undefined,
          techBaseByLocation: { HEAD: 'CLAN' },
        }).success,
      ).toBe(false);
    });

    it.each(['MIXED', 'Clan', 'clan', 'IS', 'INNER SPHERE', '', 1, null])(
      'the value %p',
      (value) => {
        expect(withArmor({ techBaseByLocation: { HEAD: value } }).success).toBe(
          false,
        );
      },
    );

    it.each(['FRONT', 'REAR', 'LEFT_TORSO_REAR', 'head', 'CENTER_LEG_REAR'])(
      'the location key %p',
      (key) => {
        expect(
          withArmor({ techBaseByLocation: { [key]: 'CLAN' } }).success,
        ).toBe(false);
      },
    );

    it('a non-object map', () => {
      expect(withArmor({ techBaseByLocation: ['CLAN'] }).success).toBe(false);
      expect(withArmor({ techBaseByLocation: 'CLAN' }).success).toBe(false);
    });
  });

  // The two structural rules are rendered by the generator as one refine, not as unions in the type.
  // These tests name the refusal: if the refine is removed, the parse succeeds and every one of them fails.
  describe('refuses with a named message', () => {
    const messages = (result: ReturnType<typeof withArmor>) =>
      result.success ? [] : result.error.issues.map((issue) => issue.message);

    it('a Patchwork unit with an entry for a location it does not have', () => {
      const { LEFT_LEG: _leg, ...typed } = UNIT.armor.typeByLocation as Record<
        string,
        number
      >;
      expect(
        messages(
          withArmor({
            typeByLocation: typed,
            techBaseByLocation: { LEFT_LEG: 'INNER_SPHERE', HEAD: 'CLAN' },
          }),
        ),
      ).toEqual([
        'armor.techBaseByLocation names LEFT_LEG, which armor.typeByLocation does not carry',
      ]);
    });

    it('names every missing location, one message each', () => {
      expect(
        messages(
          withArmor({
            typeByLocation: undefined,
            techBaseByLocation: { HEAD: 'CLAN', LEFT_ARM: 'CLAN' },
          }),
        ),
      ).toEqual([
        'armor.techBaseByLocation names HEAD, which armor.typeByLocation does not carry',
        'armor.techBaseByLocation names LEFT_ARM, which armor.typeByLocation does not carry',
      ]);
    });

    it('a non-Patchwork unit carrying the map', () => {
      expect(
        messages(
          withArmor({
            type: 'STANDARD',
            typeByLocation: undefined,
            techBaseByLocation: {},
          }),
        ),
      ).toEqual([
        'armor.techBaseByLocation is only valid when armor.type is PATCHWORK',
      ]);
    });
  });
});
