/**
 * Regression guard — canonical heat-to-hit bracket.
 *
 * Bug #3 from `fix-combat-rule-accuracy`: three divergent heat-threshold
 * tables existed. `src/constants/heat.ts` is now the single source of truth
 * (8/13/17/24). This suite asserts `getHeatToHitModifier` at every boundary
 * so any future refactor that accidentally diverges will fail here.
 *
 * @spec openspec/changes/fix-combat-rule-accuracy/specs/to-hit-resolution/spec.md
 */

import {
  HEAT_THRESHOLDS,
  HEAT_TO_HIT_TABLE,
  getHeatToHitModifier,
} from '@/constants/heat';

describe('getHeatToHitModifier — canonical bracket regression guard', () => {
  const CASES: ReadonlyArray<{ heat: number; expected: number }> = [
    { heat: 0, expected: 0 },
    { heat: 1, expected: 0 },
    { heat: 7, expected: 0 },
    { heat: 8, expected: 1 },
    { heat: 9, expected: 1 },
    { heat: 12, expected: 1 },
    { heat: 13, expected: 2 },
    { heat: 14, expected: 2 },
    { heat: 16, expected: 2 },
    { heat: 17, expected: 3 },
    { heat: 20, expected: 3 },
    { heat: 23, expected: 3 },
    { heat: 24, expected: 4 },
    { heat: 29, expected: 4 },
    { heat: 40, expected: 4 },
    { heat: 100, expected: 4 },
  ];

  it.each(CASES)(
    'heat $heat returns to-hit penalty $expected',
    ({ heat, expected }) => {
      expect(getHeatToHitModifier(heat)).toBe(expected);
    },
  );

  it('HEAT_THRESHOLDS constants match canonical values', () => {
    expect(HEAT_THRESHOLDS.TO_HIT_1).toBe(8);
    expect(HEAT_THRESHOLDS.TO_HIT_2).toBe(13);
    expect(HEAT_THRESHOLDS.TO_HIT_3).toBe(17);
    expect(HEAT_THRESHOLDS.TO_HIT_4).toBe(24);
  });

  it('HEAT_TO_HIT_TABLE has exactly 5 brackets (0, +1, +2, +3, +4)', () => {
    expect(HEAT_TO_HIT_TABLE).toHaveLength(5);
    const modifiers = HEAT_TO_HIT_TABLE.map((b) => b.modifier);
    expect(modifiers).toEqual([0, 1, 2, 3, 4]);
  });

  it('HEAT_TO_HIT_TABLE is monotonically increasing by minHeat', () => {
    for (let i = 1; i < HEAT_TO_HIT_TABLE.length; i++) {
      expect(HEAT_TO_HIT_TABLE[i].minHeat).toBeGreaterThan(
        HEAT_TO_HIT_TABLE[i - 1].minHeat,
      );
    }
  });

  it('penalty is the max bracket only — not additive', () => {
    // At heat 40 the penalty SHALL be +4, not +1+2+3+4 = +10
    expect(getHeatToHitModifier(40)).toBe(4);
    expect(getHeatToHitModifier(100)).toBe(4);
  });
});
