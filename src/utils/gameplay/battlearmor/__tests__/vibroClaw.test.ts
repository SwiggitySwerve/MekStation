/**
 * Battle Armor vibro-claw attack tests.
 *
 * @spec openspec/changes/add-battlearmor-combat-behavior/specs/combat-resolution/spec.md
 *   (Section 8)
 */

import { createBattleArmorCombatState, killTrooper } from '../state';
import {
  computeVibroClawDamagePerClaw,
  resolveVibroClawAttack,
} from '../vibroClaw';

function makeState(size = 5, claws = 2, hasClaws = true) {
  return createBattleArmorCombatState({
    unitId: 'ba-vc',
    squadSize: size,
    armorPointsPerTrooper: 10,
    hasVibroClaws: hasClaws,
    vibroClawCount: claws,
  });
}

describe('computeVibroClawDamagePerClaw', () => {
  it('returns 0 for non-positive troopers', () => {
    expect(computeVibroClawDamagePerClaw(0)).toBe(0);
    expect(computeVibroClawDamagePerClaw(-3)).toBe(0);
  });

  it('1 trooper → 1 + ceil(0.5) = 2', () => {
    expect(computeVibroClawDamagePerClaw(1)).toBe(2);
  });

  it('2 troopers → 1 + ceil(1) = 2', () => {
    expect(computeVibroClawDamagePerClaw(2)).toBe(2);
  });

  it('3 troopers → 1 + ceil(1.5) = 3', () => {
    expect(computeVibroClawDamagePerClaw(3)).toBe(3);
  });

  it('5 troopers → 1 + ceil(2.5) = 4', () => {
    expect(computeVibroClawDamagePerClaw(5)).toBe(4);
  });
});

describe('resolveVibroClawAttack', () => {
  it('returns 0 damage when squad lacks vibro-claws', () => {
    const s = makeState(5, 0, false);
    const r = resolveVibroClawAttack({ state: s, targetType: 'mech' });
    expect(r.damagePerClaw).toBe(0);
    expect(r.claws).toBe(0);
    expect(r.totalDamage).toBe(0);
  });

  it('computes totalDamage = damagePerClaw × claws', () => {
    const s = makeState(5, 2);
    const r = resolveVibroClawAttack({ state: s, targetType: 'mech' });
    expect(r.damagePerClaw).toBe(4);
    expect(r.claws).toBe(2);
    expect(r.totalDamage).toBe(8);
    expect(r.survivingTroopers).toBe(5);
  });

  it('scales down with trooper loss', () => {
    let s = makeState(5, 2);
    s = killTrooper(killTrooper(s, 0), 1);
    const r = resolveVibroClawAttack({ state: s, targetType: 'mech' });
    expect(r.survivingTroopers).toBe(3);
    expect(r.damagePerClaw).toBe(3); // 1 + ceil(0.5*3) = 3
    expect(r.totalDamage).toBe(6);
  });

  it('honors clawsOverride but never exceeds squad vibroClawCount', () => {
    const s = makeState(5, 1);
    const r1 = resolveVibroClawAttack({
      state: s,
      targetType: 'vehicle',
      clawsOverride: 2,
    });
    expect(r1.claws).toBe(1); // capped

    const r2 = resolveVibroClawAttack({
      state: s,
      targetType: 'protomech',
      clawsOverride: 0,
    });
    expect(r2.claws).toBe(0);
    expect(r2.totalDamage).toBe(0);
  });

  it('target types are accepted (mech / vehicle / protomech)', () => {
    const s = makeState(5, 2);
    for (const t of ['mech', 'vehicle', 'protomech'] as const) {
      const r = resolveVibroClawAttack({ state: s, targetType: t });
      expect(r.totalDamage).toBe(8);
    }
  });
});
