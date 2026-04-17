/**
 * Regression guard — Target Movement Modifier (TMM) bracket table.
 *
 * Bug #2 from `fix-combat-rule-accuracy`: TMM originally used
 * `ceil(hexesMoved / 5)` which diverges from the TechManual p.115 bracket
 * table at multiple boundaries (e.g., 5 hexes: formula → 1 vs. bracket → 2).
 * The canonical bracket table is now in `toHit/constants.ts` TMM_BRACKETS.
 * This suite asserts every documented bracket boundary.
 *
 * Canonical brackets (per TechManual p.115):
 * 0-2 → +0, 3-4 → +1, 5-6 → +2, 7-9 → +3, 10-17 → +4, 18-24 → +5, 25+ → +6.
 *
 * @spec openspec/changes/fix-combat-rule-accuracy/specs/to-hit-resolution/spec.md
 */

import { MovementType } from '@/types/gameplay';
import { calculateTMM } from '@/utils/gameplay/toHit/movementModifiers';

describe('calculateTMM — bracket table regression guard', () => {
  const BRACKET_CASES: ReadonlyArray<{ hexes: number; expected: number }> = [
    { hexes: 0, expected: 0 },
    { hexes: 1, expected: 0 },
    { hexes: 2, expected: 0 },
    { hexes: 3, expected: 1 },
    { hexes: 4, expected: 1 },
    { hexes: 5, expected: 2 },
    { hexes: 6, expected: 2 },
    { hexes: 7, expected: 3 },
    { hexes: 8, expected: 3 },
    { hexes: 9, expected: 3 },
    { hexes: 10, expected: 4 },
    { hexes: 15, expected: 4 },
    { hexes: 17, expected: 4 },
    { hexes: 18, expected: 5 },
    { hexes: 24, expected: 5 },
    { hexes: 25, expected: 6 },
    { hexes: 40, expected: 6 },
  ];

  it.each(BRACKET_CASES)(
    'walking $hexes hexes returns TMM $expected',
    ({ hexes, expected }) => {
      const mod = calculateTMM(MovementType.Walk, hexes);
      expect(mod.value).toBe(expected);
    },
  );

  it('stationary target returns 0 regardless of hexesMoved', () => {
    expect(calculateTMM(MovementType.Stationary, 0).value).toBe(0);
    expect(calculateTMM(MovementType.Stationary, 10).value).toBe(0);
  });

  it('running target uses hexesMoved-based bracket (no jump bonus)', () => {
    expect(calculateTMM(MovementType.Run, 6).value).toBe(2);
    expect(calculateTMM(MovementType.Run, 8).value).toBe(3);
  });

  it('jumping target gets +1 bonus on top of bracket', () => {
    // 5 hexes → bracket +2, jump bonus +1 → 3
    expect(calculateTMM(MovementType.Jump, 5).value).toBe(3);
    // 10 hexes → bracket +4, jump bonus +1 → 5
    expect(calculateTMM(MovementType.Jump, 10).value).toBe(5);
  });

  it('modifier name is "Target Movement (TMM)"', () => {
    expect(calculateTMM(MovementType.Walk, 5).name).toBe(
      'Target Movement (TMM)',
    );
  });
});
