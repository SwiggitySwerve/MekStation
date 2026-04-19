/**
 * Battle Armor swarm attack tests.
 *
 * @spec openspec/changes/add-battlearmor-combat-behavior/specs/combat-resolution/spec.md
 *   (Section 6)
 */

import type { D6Roller } from '../../diceTypes';

import { createBattleArmorCombatState, killTrooper } from '../state';
import {
  detachSwarm,
  resolveSwarmAttach,
  resolveSwarmDamageTick,
  resolveSwarmDismount,
  SWARM_ATTACH_TARGET_PILOTING_BONUS,
  SWARM_DISMOUNT_TARGET_NUMBER,
} from '../swarm';

function makeState(
  overrides: { size?: number; clamps?: boolean; swarm?: string } = {},
) {
  const s = createBattleArmorCombatState({
    unitId: 'ba-swarm',
    squadSize: overrides.size ?? 5,
    armorPointsPerTrooper: 10,
    hasMagneticClamp: overrides.clamps ?? true,
  });
  if (overrides.swarm) {
    return { ...s, swarmingUnitId: overrides.swarm };
  }
  return s;
}

function scriptedRoller(values: readonly number[]): D6Roller {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

describe('resolveSwarmAttach — eligibility', () => {
  it('rejects if no magnetic clamps', () => {
    const s = makeState({ clamps: false });
    const { result, state } = resolveSwarmAttach({
      state: s,
      targetIsMech: true,
      targetAdjacent: true,
      attackerAntiMechSkill: 0,
      targetPilotingSkill: 4,
      targetMechId: 'mech-1',
      diceRoller: scriptedRoller([6, 6]),
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('no_magnetic_clamp');
    expect(result.success).toBe(false);
    expect(state).toBe(s); // no state change
  });

  it('rejects if target is not a mech', () => {
    const s = makeState();
    const { result } = resolveSwarmAttach({
      state: s,
      targetIsMech: false,
      targetAdjacent: true,
      attackerAntiMechSkill: 0,
      targetPilotingSkill: 4,
      targetMechId: 'tank-1',
      diceRoller: scriptedRoller([6, 6]),
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('target_not_mech');
  });

  it('rejects if target not adjacent', () => {
    const s = makeState();
    const { result } = resolveSwarmAttach({
      state: s,
      targetIsMech: true,
      targetAdjacent: false,
      attackerAntiMechSkill: 0,
      targetPilotingSkill: 4,
      targetMechId: 'mech-1',
      diceRoller: scriptedRoller([6, 6]),
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('target_not_adjacent');
  });
});

describe('resolveSwarmAttach — roll resolution', () => {
  it('success attaches the squad (swarmingUnitId set)', () => {
    const s = makeState();
    const { result, state } = resolveSwarmAttach({
      state: s,
      targetIsMech: true,
      targetAdjacent: true,
      attackerAntiMechSkill: 0,
      targetPilotingSkill: 4,
      targetMechId: 'mech-7',
      diceRoller: scriptedRoller([6, 6]), // 12 >= TN 8
    });
    expect(result.success).toBe(true);
    expect(result.targetNumber).toBe(4 + SWARM_ATTACH_TARGET_PILOTING_BONUS);
    expect(state.swarmingUnitId).toBe('mech-7');
  });

  it('failure does not attach', () => {
    const s = makeState();
    const { result, state } = resolveSwarmAttach({
      state: s,
      targetIsMech: true,
      targetAdjacent: true,
      attackerAntiMechSkill: 0,
      targetPilotingSkill: 4,
      targetMechId: 'mech-7',
      diceRoller: scriptedRoller([1, 1]), // 2 < TN 8
    });
    expect(result.success).toBe(false);
    expect(state.swarmingUnitId).toBeUndefined();
  });
});

describe('resolveSwarmDamageTick', () => {
  it('damage = 1d6 + surviving troopers', () => {
    const s = makeState({ swarm: 'mech-7' });
    const r = resolveSwarmDamageTick({
      state: s,
      locationLabel: 'Center Torso',
      diceRoller: scriptedRoller([4]),
    });
    expect(r.rollD6).toBe(4);
    expect(r.survivingTroopers).toBe(5);
    expect(r.damage).toBe(4 + 5);
    expect(r.locationLabel).toBe('Center Torso');
  });

  it('damage scales down with survivor loss', () => {
    let s = makeState({ swarm: 'mech-7' });
    s = killTrooper(killTrooper(s, 0), 1);
    const r = resolveSwarmDamageTick({
      state: s,
      locationLabel: 'RT',
      diceRoller: scriptedRoller([6]),
    });
    expect(r.survivingTroopers).toBe(3);
    expect(r.damage).toBe(6 + 3);
  });
});

describe('resolveSwarmDismount', () => {
  it('failure leaves state untouched', () => {
    const s = makeState({ swarm: 'mech-7' });
    const { result, state, damageResult } = resolveSwarmDismount({
      state: s,
      mechPilotingSkill: 4,
      diceRoller: scriptedRoller([1, 1]), // 2 < 8
    });
    expect(result.success).toBe(false);
    expect(result.targetNumber).toBe(SWARM_DISMOUNT_TARGET_NUMBER);
    expect(result.dismountDamage).toBe(0);
    expect(state).toBe(s);
    expect(damageResult).toBeUndefined();
  });

  it('success detaches swarm, applies 2d6 dismount damage', () => {
    const s = makeState({ swarm: 'mech-7' });
    const { result, state, damageResult } = resolveSwarmDismount({
      state: s,
      mechPilotingSkill: 4,
      diceRoller: scriptedRoller([6, 6]), // 12 ≥ 8, success
      forcedDismountDamage: 4,
    });
    expect(result.success).toBe(true);
    expect(result.dismountDamage).toBe(4);
    expect(state.swarmingUnitId).toBeUndefined();
    expect(damageResult).toBeDefined();
  });
});

describe('detachSwarm', () => {
  it('clears swarmingUnitId', () => {
    const s = makeState({ swarm: 'mech-7' });
    expect(detachSwarm(s).swarmingUnitId).toBeUndefined();
  });
});
