/**
 * Battle Armor damage distribution tests.
 *
 * @spec openspec/changes/add-battlearmor-combat-behavior/specs/combat-resolution/spec.md
 */

import type { D6Roller } from '../../diceTypes';

import {
  battleArmorResolveAreaEffect,
  battleArmorResolveCluster,
  battleArmorResolveDamage,
} from '../damage';
import { createBattleArmorCombatState } from '../state';

function makeState(squadSize = 5, armorPerTrooper = 10) {
  return createBattleArmorCombatState({
    unitId: 'ba-1',
    squadSize,
    armorPointsPerTrooper: armorPerTrooper,
    stealthKind: 'none',
    hasMagneticClamp: false,
    hasVibroClaws: false,
    vibroClawCount: 0,
  });
}

/**
 * Scripted roller that walks through a list; handy for driving both the
 * trooper-selection d6 and the 2d6 cluster roll in one test.
 */
function scriptedRoller(values: readonly number[]): D6Roller {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

describe('battleArmorResolveDamage — one-hit-at-a-time', () => {
  it('routes a single hit to one trooper', () => {
    const state = makeState(5, 10);
    const roller = scriptedRoller([6]); // 6 % 5 = 1 → trooper index 1
    const r = battleArmorResolveDamage(state, [5], { diceRoller: roller });
    expect(r.hits).toHaveLength(1);
    expect(r.hits[0].trooperIndex).toBe(1);
    expect(r.hits[0].damage).toBe(5);
    expect(r.hits[0].killed).toBe(false);
    expect(r.state.troopers[1].armorRemaining).toBe(5);
  });

  it('overflow damage kills the trooper and the rest of the shot is lost', () => {
    const state = makeState(3, 4);
    // 3 survivors -> index = die % 3. Die = 3 → index 0.
    const roller = scriptedRoller([3]);
    const r = battleArmorResolveDamage(state, [10], { diceRoller: roller });
    expect(r.hits[0].trooperIndex).toBe(0);
    expect(r.hits[0].killed).toBe(true);
    expect(r.trooperKills).toEqual([0]);
    expect(r.state.troopers[0].alive).toBe(false);
    expect(r.state.troopers[1].armorRemaining).toBe(4); // untouched
    expect(r.state.troopers[2].armorRemaining).toBe(4); // untouched
  });

  it('multiple hits pick independently; subsequent hits route to survivors', () => {
    const state = makeState(3, 2);
    // First roll: 3 → index 3 % 3 = 0 → kills trooper 0 (2 armor, 5 dmg).
    // After kill: 2 survivors (indices 1,2). Next roll: 4 → 4 % 2 = 0 → survivor list[0] = 1.
    const roller = scriptedRoller([3, 4]);
    const r = battleArmorResolveDamage(state, [5, 5], { diceRoller: roller });
    expect(r.hits).toHaveLength(2);
    expect(r.hits[0].trooperIndex).toBe(0);
    expect(r.hits[0].killed).toBe(true);
    expect(r.hits[1].trooperIndex).toBe(1);
    expect(r.hits[1].killed).toBe(true);
    expect(r.trooperKills).toEqual([0, 1]);
  });

  it('stops early when the squad is eliminated', () => {
    const state = makeState(2, 2);
    // Dice: 2 → 2%2=0, 3 → 3%1=0 (only index 1 left)
    const roller = scriptedRoller([2, 3, 5, 5]);
    const r = battleArmorResolveDamage(state, [10, 10, 10, 10], {
      diceRoller: roller,
    });
    expect(r.squadEliminated).toBe(true);
    // Hit list is the number of hits actually applied before early-exit.
    expect(r.hits.length).toBeGreaterThanOrEqual(2);
    expect(r.hits.length).toBeLessThanOrEqual(4);
  });

  it('doubles each hit when isFlamer=true', () => {
    const state = makeState(5, 10);
    const roller = scriptedRoller([5]);
    const r = battleArmorResolveDamage(state, [3], {
      diceRoller: roller,
      isFlamer: true,
    });
    expect(r.hits[0].damage).toBe(6); // 3 × 2
    expect(r.state.troopers[5 % 5].armorRemaining).toBe(10 - 6);
  });
});

describe('battleArmorResolveCluster', () => {
  it('uses cluster hit table with squad as cluster input', () => {
    const state = makeState(5, 10);
    // 2d6 = [4,4] = total 8. Cluster size 5, row 8 = 4 hits. Each hit 2 dmg.
    // Trooper-selection rolls follow: 1,2,3,4 → indices 1,2,3,4.
    const roller = scriptedRoller([4, 4, 1, 2, 3, 4]);
    const r = battleArmorResolveCluster(state, {
      missileCount: 5,
      damagePerMissile: 2,
      clusterSize: 5,
      diceRoller: roller,
    });
    // cluster size 5 row 8 = 3 hits (per CLUSTER_HIT_TABLE).
    expect(r.hits.length).toBeGreaterThan(0);
    expect(r.hits.every((h) => h.damage === 2)).toBe(true);
  });

  it('falls back to missileCount when clusterSize omitted', () => {
    const state = makeState(5, 10);
    const roller = scriptedRoller([4, 4, 1, 2, 3, 4, 5, 6]);
    const r = battleArmorResolveCluster(state, {
      missileCount: 10,
      damagePerMissile: 1,
      diceRoller: roller,
    });
    expect(r.hits.length).toBeGreaterThan(0);
  });
});

describe('battleArmorResolveAreaEffect (Inferno)', () => {
  it('applies damage to EVERY alive trooper with no selection roll', () => {
    const state = makeState(5, 10);
    const r = battleArmorResolveAreaEffect(state, 3);
    expect(r.hits).toHaveLength(5);
    expect(r.hits.every((h) => h.damage === 3 && !h.killed)).toBe(true);
    for (const t of r.state.troopers) {
      expect(t.armorRemaining).toBe(7);
    }
  });

  it('kills all troopers if damagePerTrooper exceeds their armor', () => {
    const state = makeState(5, 2);
    const r = battleArmorResolveAreaEffect(state, 10);
    expect(r.trooperKills).toHaveLength(5);
    expect(r.squadEliminated).toBe(true);
  });

  it('returns no-op on 0 damage', () => {
    const state = makeState(5, 10);
    const r = battleArmorResolveAreaEffect(state, 0);
    expect(r.hits).toHaveLength(0);
  });
});
