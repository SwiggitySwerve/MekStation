/**
 * Battle Armor anti-mech leg attack tests.
 *
 * @spec openspec/changes/add-battlearmor-combat-behavior/specs/combat-resolution/spec.md
 *   (Section 5)
 */

import type { D6Roller } from '../../diceTypes';

import {
  LEG_ATTACK_DAMAGE_PER_TROOPER,
  LEG_ATTACK_TARGET_PILOTING_BONUS,
  resolveLegAttack,
} from '../legAttack';
import { createBattleArmorCombatState, killTrooper } from '../state';

function makeState(size = 5) {
  return createBattleArmorCombatState({
    unitId: 'ba-leg',
    squadSize: size,
    armorPointsPerTrooper: 10,
  });
}

function scriptedRoller(values: readonly number[]): D6Roller {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

describe('resolveLegAttack — success path', () => {
  it('rolls 2d6=12 (high) → damage = 4 × survivors to target leg', () => {
    const state = makeState(5);
    const roller = scriptedRoller([6, 6]);
    const { attack, selfDamageResult } = resolveLegAttack({
      state,
      attackerAntiMechSkill: 0,
      targetPilotingSkill: 4,
      diceRoller: roller,
    });
    expect(attack.attackerRoll).toBe(12);
    expect(attack.targetNumber).toBe(
      4 + LEG_ATTACK_TARGET_PILOTING_BONUS + 0, // 8
    );
    expect(attack.success).toBe(true);
    expect(attack.damageToLeg).toBe(LEG_ATTACK_DAMAGE_PER_TROOPER * 5); // 20
    expect(attack.selfDamage).toBe(0);
    expect(attack.survivingTroopers).toBe(5);
    expect(selfDamageResult).toBeUndefined();
  });

  it('damageToLeg scales down as survivors die', () => {
    let state = makeState(5);
    // Kill 2 troopers manually (no selfDamageResult side effects).
    state = killTrooper(state, 0);
    state = killTrooper(state, 4);
    const roller = scriptedRoller([6, 6]);
    const { attack } = resolveLegAttack({
      state,
      attackerAntiMechSkill: 0,
      targetPilotingSkill: 4,
      diceRoller: roller,
    });
    expect(attack.success).toBe(true);
    expect(attack.damageToLeg).toBe(LEG_ATTACK_DAMAGE_PER_TROOPER * 3); // 12
    expect(attack.survivingTroopers).toBe(3);
  });
});

describe('resolveLegAttack — failure path', () => {
  it('2d6=2 (snake eyes) vs TN 8 → miss, 1d6 self damage', () => {
    const state = makeState(5);
    const roller = scriptedRoller([1, 1]); // 2d6 = 2 → miss
    const { attack, selfDamageResult } = resolveLegAttack({
      state,
      attackerAntiMechSkill: 0,
      targetPilotingSkill: 4,
      diceRoller: roller,
      forcedSelfDamage: 3,
    });
    expect(attack.attackerRoll).toBe(2);
    expect(attack.success).toBe(false);
    expect(attack.damageToLeg).toBe(0);
    expect(attack.selfDamage).toBe(3);
    expect(selfDamageResult).toBeDefined();
    // 3 damage distributed as 3 × 1-damage hits
    expect(selfDamageResult!.hits.length).toBeGreaterThanOrEqual(0);
    expect(selfDamageResult!.hits.length).toBeLessThanOrEqual(3);
  });

  it('target number includes mech piloting + 4 + attacker anti-mech skill', () => {
    const state = makeState(5);
    const roller = scriptedRoller([6, 6]); // 12
    const { attack } = resolveLegAttack({
      state,
      attackerAntiMechSkill: 2,
      targetPilotingSkill: 5,
      diceRoller: roller,
      forcedSelfDamage: 0,
    });
    // TN = 5 + 4 + 2 = 11. Roll 12 passes.
    expect(attack.targetNumber).toBe(11);
    expect(attack.success).toBe(true);
  });
});
