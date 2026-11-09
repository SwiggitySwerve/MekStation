/**
 * ProtoMech Partial Wing jump bonus: the pinned MegaMek 48fcb2f64
 * ProtoMek.getJumpMP table (ProtoMek.java:470-487), including the two ways it is
 * switched off (wing not working, weather ignored).
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import type { AtmosphereCondition } from '@/types/gameplay/EnvironmentalConditions';

import { effectiveJumpMP } from '../movementCaps';
import {
  partialWingJumpBonus,
  type PartialWingAtmosphere,
} from '../partialWing';

const working = { wingWorking: true, ignoreWeather: false } as const;

describe('partialWingJumpBonus (ProtoMek.java:470-487)', () => {
  it.each<[PartialWingAtmosphere, number]>([
    ['very_high', 3],
    ['high', 3],
    ['standard', 2],
    ['thin', 2],
    ['trace', 1],
    ['vacuum', 0],
  ])('a working wing in %s atmosphere gives +%d', (atmosphere, bonus) => {
    expect(partialWingJumpBonus(atmosphere, working)).toBe(bonus);
  });

  it.each<PartialWingAtmosphere>([
    'very_high',
    'high',
    'standard',
    'thin',
    'trace',
    'vacuum',
  ])('gives 0 in %s atmosphere when the wing is not working', (atmosphere) => {
    expect(
      partialWingJumpBonus(atmosphere, {
        wingWorking: false,
        ignoreWeather: false,
      }),
    ).toBe(0);
  });

  it.each<PartialWingAtmosphere>([
    'very_high',
    'high',
    'standard',
    'thin',
    'trace',
    'vacuum',
  ])('gives 0 in %s atmosphere when weather is ignored', (atmosphere) => {
    expect(
      partialWingJumpBonus(atmosphere, {
        wingWorking: true,
        ignoreWeather: true,
      }),
    ).toBe(0);
  });

  it('gives 0 when the wing is not working and weather is ignored', () => {
    expect(
      partialWingJumpBonus('very_high', {
        wingWorking: false,
        ignoreWeather: true,
      }),
    ).toBe(0);
  });

  it('accepts every gameplay AtmosphereCondition', () => {
    const conditions: AtmosphereCondition[] = [
      'standard',
      'thin',
      'trace',
      'vacuum',
    ];
    expect(conditions.map((c) => partialWingJumpBonus(c, working))).toEqual([
      2, 2, 1, 0,
    ]);
  });
});

describe('effectiveJumpMP uses the Partial Wing owner', () => {
  it('adds the standard-atmosphere bonus for a mounted wing', () => {
    expect(effectiveJumpMP(5, true)).toBe(
      5 + partialWingJumpBonus('standard', working),
    );
  });

  it('adds nothing without a wing', () => {
    expect(effectiveJumpMP(5, false)).toBe(5);
  });
});
