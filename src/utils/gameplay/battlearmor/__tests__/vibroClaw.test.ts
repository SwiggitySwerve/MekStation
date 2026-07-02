/**
 * Battle Armor vibro-claw attack tests — MegaMek cluster model
 * (`missilesHit(shootingStrength) × vibroClaws`, applied in claw-sized
 * clusters), per `wire-vibroclaw-attack-dispatch`.
 *
 * @spec openspec/specs/battle-armor-combat/spec.md (Requirement: Vibroclaw Attack)
 */

import { createBattleArmorCombatState, killTrooper } from '../state';
import {
  resolveVibroClawAttack,
  splitVibroClawDamageIntoClusters,
} from '../vibroClaw';

function makeState(size = 4, claws = 2, hasClaws = true) {
  return createBattleArmorCombatState({
    unitId: 'ba-vc',
    squadSize: size,
    armorPointsPerTrooper: 10,
    hasVibroClaws: hasClaws,
    vibroClawCount: claws,
  });
}

/** Deterministic roller: returns the queued values in order (repeating). */
function fixedRoller(values: readonly number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

describe('splitVibroClawDamageIntoClusters', () => {
  it('chunks total damage into claw-sized clusters with a remainder', () => {
    expect(splitVibroClawDamageIntoClusters(6, 2)).toEqual([2, 2, 2]);
    expect(splitVibroClawDamageIntoClusters(5, 2)).toEqual([2, 2, 1]);
    expect(splitVibroClawDamageIntoClusters(3, 1)).toEqual([1, 1, 1]);
    expect(splitVibroClawDamageIntoClusters(0, 2)).toEqual([]);
    expect(splitVibroClawDamageIntoClusters(4, 0)).toEqual([]);
  });
});

describe('resolveVibroClawAttack', () => {
  it('returns zeros when the squad lacks vibro-claws', () => {
    const result = resolveVibroClawAttack({
      state: makeState(4, 0, false),
      targetType: 'mech',
      diceRoller: fixedRoller([3, 4]),
    });
    expect(result.missileHits).toBe(0);
    expect(result.claws).toBe(0);
    expect(result.totalDamage).toBe(0);
    expect(result.clusters).toEqual([]);
  });

  it('4-trooper squad, 2 claws, roll of 7: missilesHit(4)=3 → 6 damage (living spec scenario)', () => {
    const result = resolveVibroClawAttack({
      state: makeState(4, 2),
      targetType: 'mech',
      diceRoller: fixedRoller([3, 4]),
    });
    expect(result.survivingTroopers).toBe(4);
    expect(result.missileHits).toBe(3);
    expect(result.claws).toBe(2);
    expect(result.totalDamage).toBe(6);
    expect(result.clusters).toEqual([2, 2, 2]);
  });

  it('single-claw squad multiplies cluster hits by 1', () => {
    const result = resolveVibroClawAttack({
      state: makeState(4, 1),
      targetType: 'mech',
      diceRoller: fixedRoller([3, 4]),
    });
    expect(result.missileHits).toBe(3);
    expect(result.totalDamage).toBe(3);
    expect(result.clusters).toEqual([1, 1, 1]);
  });

  it('degraded squad rolls the cluster table against SURVIVING troopers', () => {
    let state = makeState(4, 2);
    state = killTrooper(state, 0);
    state = killTrooper(state, 1);

    const result = resolveVibroClawAttack({
      state,
      targetType: 'mech',
      diceRoller: fixedRoller([3, 4]),
    });
    expect(result.survivingTroopers).toBe(2);
    // Cluster-2 column at a roll of 7 yields 1 hit.
    expect(result.missileHits).toBe(1);
    expect(result.totalDamage).toBe(2);
    expect(result.clusters).toEqual([2]);
  });

  it('honors clawsOverride but never exceeds squad vibroClawCount', () => {
    const capped = resolveVibroClawAttack({
      state: makeState(4, 1),
      targetType: 'vehicle',
      clawsOverride: 2,
      diceRoller: fixedRoller([3, 4]),
    });
    expect(capped.claws).toBe(1);

    const zero = resolveVibroClawAttack({
      state: makeState(4, 1),
      targetType: 'protomech',
      clawsOverride: 0,
      diceRoller: fixedRoller([3, 4]),
    });
    expect(zero.claws).toBe(0);
    expect(zero.totalDamage).toBe(0);
  });

  it('wiped squad deals nothing', () => {
    let state = makeState(2, 2);
    state = killTrooper(state, 0);
    state = killTrooper(state, 1);

    const result = resolveVibroClawAttack({
      state,
      targetType: 'mech',
      diceRoller: fixedRoller([3, 4]),
    });
    expect(result.totalDamage).toBe(0);
    expect(result.survivingTroopers).toBe(0);
  });
});
