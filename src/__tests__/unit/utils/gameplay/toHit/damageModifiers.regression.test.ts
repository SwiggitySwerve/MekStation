/**
 * Regression guard — target-prone modifier.
 *
 * Bug #1 from `fix-combat-rule-accuracy`: the prone modifier was originally
 * reversed (adjacent attackers received +1, ranged attackers -2). The fix
 * landed before this test was written; this suite exists to make silent
 * re-regression fail at merge time.
 *
 * Per TechManual p.113: adjacent attacker vs. prone target → -2 (easier);
 * ranged attacker vs. prone target → +1 (harder).
 *
 * @spec openspec/changes/fix-combat-rule-accuracy/specs/to-hit-resolution/spec.md
 */

import { calculateProneModifier } from '@/utils/gameplay/toHit/damageModifiers';

describe('calculateProneModifier — regression guard', () => {
  it('adjacent attacker (range 1) vs prone target returns -2', () => {
    const mod = calculateProneModifier(true, 1);
    expect(mod).not.toBeNull();
    expect(mod?.value).toBe(-2);
  });

  it('attacker at range 2 vs prone target returns +1', () => {
    const mod = calculateProneModifier(true, 2);
    expect(mod).not.toBeNull();
    expect(mod?.value).toBe(1);
  });

  it('attacker at long range (12 hexes) vs prone target returns +1', () => {
    const mod = calculateProneModifier(true, 12);
    expect(mod).not.toBeNull();
    expect(mod?.value).toBe(1);
  });

  it('standing target returns null (no modifier applied)', () => {
    expect(calculateProneModifier(false, 1)).toBeNull();
    expect(calculateProneModifier(false, 5)).toBeNull();
  });

  it('modifier name is "Target Prone"', () => {
    const mod = calculateProneModifier(true, 1);
    expect(mod?.name).toBe('Target Prone');
  });
});
