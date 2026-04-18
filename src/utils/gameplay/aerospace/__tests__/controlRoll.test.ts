/**
 * Aerospace control-roll tests.
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/specs/combat-resolution/spec.md
 */

import {
  AEROSPACE_CONTROL_TN,
  damageToControlModifier,
  rollAerospaceControlCheck,
} from '../controlRoll';

describe('damageToControlModifier', () => {
  it('returns 0 for 0 or negative damage', () => {
    expect(damageToControlModifier(0)).toBe(0);
    expect(damageToControlModifier(-3)).toBe(0);
  });
  it('returns 0 for 1-4 damage', () => {
    expect(damageToControlModifier(1)).toBe(0);
    expect(damageToControlModifier(4)).toBe(0);
  });
  it('returns 1 for 5-9 damage', () => {
    expect(damageToControlModifier(5)).toBe(1);
    expect(damageToControlModifier(9)).toBe(1);
  });
  it('returns 2 for 10-14 damage', () => {
    expect(damageToControlModifier(10)).toBe(2);
    expect(damageToControlModifier(14)).toBe(2);
  });
  it('returns 4 for 20 damage', () => {
    expect(damageToControlModifier(20)).toBe(4);
  });
});

describe('rollAerospaceControlCheck', () => {
  it('AEROSPACE_CONTROL_TN is 8', () => {
    expect(AEROSPACE_CONTROL_TN).toBe(8);
  });

  it('passes when 2d6 + pilot + mod ≥ 8', () => {
    const r = rollAerospaceControlCheck({
      unitId: 'asf-1',
      pilotSkill: 4,
      damageApplied: 0,
      diceRoller: () => 2, // 2+2=4, +pilot 4 + mod 0 = 8 → pass
    });
    expect(r.passed).toBe(true);
    expect(r.rollTotal).toBe(8);
  });

  it('fails when 2d6 + pilot + mod < 8', () => {
    const r = rollAerospaceControlCheck({
      unitId: 'asf-1',
      pilotSkill: 0,
      damageApplied: 0,
      diceRoller: () => 1, // 1+1=2, no pilot, no mod → 2 → fail
    });
    expect(r.passed).toBe(false);
    expect(r.rollTotal).toBe(2);
  });

  it('damage modifier bumps the roll upward', () => {
    const r = rollAerospaceControlCheck({
      unitId: 'asf-1',
      pilotSkill: 0,
      damageApplied: 20, // +4 mod
      diceRoller: () => 2, // 2+2+0+4 = 8 → pass
    });
    expect(r.modifier).toBe(4);
    expect(r.passed).toBe(true);
  });

  it('returns both dice and pilot skill for logging', () => {
    const r = rollAerospaceControlCheck({
      unitId: 'asf-1',
      pilotSkill: 3,
      damageApplied: 5,
      diceRoller: () => 4,
    });
    expect(r.dice).toEqual([4, 4]);
    expect(r.pilotSkill).toBe(3);
    expect(r.targetNumber).toBe(8);
  });
});
