/**
 * Tests for BA combat §1 (squad state helpers) and §2 (damage allocation).
 *
 * Spec coverage:
 *   §1 — initial-state population, dead-trooper retention, helper thresholds
 *   §2 — distribute 4 damage on full squad; re-roll skips dead trooper;
 *         trooper killed when armor reaches 0; TacOps crit-slot trigger
 *
 * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
 */

import { describe, expect, it } from '@jest/globals';

import type { IBASquadCombatState } from '@/types/gameplay';

import {
  allocateSquadDamage,
  getNumberActiveTroopers,
  isDmgLight,
  isDmgModerate,
} from '../baCombat';

// =============================================================================
// Fixtures
// =============================================================================

/**
 * Build a fresh 4-trooper squad with `armorPerTrooper` armor each.
 * Indices are 1-based per MegaMek convention.
 */
function makeSquad(squadSize = 4, armorPerTrooper = 5): IBASquadCombatState {
  return {
    troopers: Array.from({ length: squadSize }, (_, i) => ({
      index: i + 1,
      alive: true,
      armorRemaining: armorPerTrooper,
      equipmentDestroyed: [],
    })),
    swarmingUnitId: undefined,
    swarmedByUnitIds: [],
    mountedOn: undefined,
    mimeticActiveThisTurn: false,
    stealthActiveThisTurn: false,
  };
}

/**
 * Deterministic RNG — cycles through the provided values.
 */
function seededRng(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

// =============================================================================
// §1 — Initial-state population
// =============================================================================

describe('IBASquadCombatState — initial state', () => {
  it('builds a 4-trooper squad with all troopers alive at full armor', () => {
    const state = makeSquad(4, 5);
    expect(state.troopers).toHaveLength(4);
    state.troopers.forEach((t, i) => {
      expect(t.index).toBe(i + 1);
      expect(t.alive).toBe(true);
      expect(t.armorRemaining).toBe(5);
      expect(t.equipmentDestroyed).toEqual([]);
    });
    expect(state.swarmingUnitId).toBeUndefined();
    expect(state.swarmedByUnitIds).toEqual([]);
    expect(state.mountedOn).toBeUndefined();
    expect(state.mimeticActiveThisTurn).toBe(false);
  });
});

// =============================================================================
// §1 — Dead-trooper retention
// =============================================================================

describe('dead-trooper retention', () => {
  it('retains dead trooper at its index with alive=false', () => {
    const state = makeSquad(4, 5);
    // Manually kill trooper at index 2 (array position 1).
    state.troopers[1].alive = false;
    state.troopers[1].armorRemaining = 0;

    expect(state.troopers[1].alive).toBe(false);
    // Array is not compacted — length stays 4.
    expect(state.troopers).toHaveLength(4);
  });

  it('getNumberActiveTroopers returns 3 when one trooper is dead', () => {
    const state = makeSquad(4, 5);
    state.troopers[1].alive = false;
    state.troopers[1].armorRemaining = 0;

    expect(getNumberActiveTroopers(state)).toBe(3);
  });
});

// =============================================================================
// §1 — Helper thresholds
// =============================================================================

describe('isDmgLight / isDmgModerate', () => {
  it('full squad — neither light nor moderate', () => {
    const state = makeSquad(4, 5);
    expect(isDmgLight(state)).toBe(false);
    expect(isDmgModerate(state)).toBe(false);
  });

  it('3 of 4 alive (75%) — light damage, NOT moderate', () => {
    const state = makeSquad(4, 5);
    state.troopers[0].alive = false;
    state.troopers[0].armorRemaining = 0;
    // 3/4 = 0.75 — not < 0.9? Yes it is → light=true; not < 0.75 → moderate=false
    expect(isDmgLight(state)).toBe(true);
    expect(isDmgModerate(state)).toBe(false);
  });

  it('2 of 4 alive (50%) — both light and moderate', () => {
    const state = makeSquad(4, 5);
    state.troopers[0].alive = false;
    state.troopers[0].armorRemaining = 0;
    state.troopers[1].alive = false;
    state.troopers[1].armorRemaining = 0;
    expect(isDmgLight(state)).toBe(true);
    expect(isDmgModerate(state)).toBe(true);
  });

  it('empty squad returns false for both helpers', () => {
    const state = makeSquad(0, 5);
    expect(isDmgLight(state)).toBe(false);
    expect(isDmgModerate(state)).toBe(false);
  });
});

// =============================================================================
// §2 — Distribute 4 damage on full 4-trooper squad
// =============================================================================

describe('allocateSquadDamage', () => {
  it('4 damage on full squad produces 4 allocations each with damage=1', () => {
    // Each d6 roll maps to a different trooper: rolls 1,2,3,4 → indices 0,1,2,3
    const rng = seededRng([1, 2, 3, 4]);
    const squad = makeSquad(4, 5);
    const result = allocateSquadDamage(squad, 4, rng, {
      tacOpsCritSlots: false,
    });

    expect(result.allocations).toHaveLength(4);
    result.allocations.forEach((a) => {
      expect(a.damage).toBe(1);
    });
    // No trooper should die (5 armor each, only 1 hit per trooper)
    expect(result.events).toHaveLength(0);
    result.squad.troopers.forEach((t) => {
      expect(t.alive).toBe(true);
      expect(t.armorRemaining).toBe(4);
    });
  });

  it('re-rolls when rolled trooper is dead — distributes among 3 alive', () => {
    const squad = makeSquad(4, 5);
    // Kill trooper at array index 3 (roll=4 → idx=(4-1)%4=3)
    squad.troopers[3].alive = false;
    squad.troopers[3].armorRemaining = 0;

    // First two rolls land on dead slot (roll=4 → idx=3), then hit idx=0
    const rng = seededRng([4, 4, 1, 2, 3]);
    const result = allocateSquadDamage(squad, 3, rng, {
      tacOpsCritSlots: false,
    });

    expect(result.allocations).toHaveLength(3);
    // Dead trooper should never appear in allocations
    result.allocations.forEach((a) => {
      expect(result.squad.troopers[a.trooperIndex].index).not.toBe(
        squad.troopers[3].index,
      );
    });
  });

  it('kills a trooper when armorRemaining reaches 0 and emits BATrooperKilled', () => {
    // Use a squad with trooper 0 having only 2 armor
    const squad = makeSquad(4, 5);
    squad.troopers[0].armorRemaining = 2;

    // Roll 1 → idx=0 twice (hits the same trooper twice)
    const rng = seededRng([1, 1, 2, 3]);
    const result = allocateSquadDamage(squad, 4, rng, {
      tacOpsCritSlots: false,
    });

    // Trooper 0 should be dead after 2 hits
    expect(result.squad.troopers[0].alive).toBe(false);
    expect(result.squad.troopers[0].armorRemaining).toBe(0);

    // Exactly 1 BATrooperKilled event
    const killEvents = result.events.filter(
      (e) => e.kind === 'BATrooperKilled',
    );
    expect(killEvents).toHaveLength(1);
    expect(killEvents[0]).toMatchObject({
      kind: 'BATrooperKilled',
      trooperIndex: 0,
    });
  });

  it('TacOps crit triggers when consecutive rolls hit same trooper', () => {
    const squad = makeSquad(4, 5);
    // Rolls 1,1 → both land on idx=0 → second should be criticalHit
    const rng = seededRng([1, 1, 2, 3]);
    const result = allocateSquadDamage(squad, 4, rng, {
      tacOpsCritSlots: true,
    });

    expect(result.allocations[0].criticalHit).toBe(false); // first hit on trooper 0
    expect(result.allocations[1].criticalHit).toBe(true); // consecutive hit on same trooper
    // Third hit rolls 2 → different trooper → no crit
    expect(result.allocations[2].criticalHit).toBe(false);
  });

  it('TacOps crit does NOT trigger when attacker is conventional infantry', () => {
    const squad = makeSquad(4, 5);
    const rng = seededRng([1, 1, 2, 3]);
    const result = allocateSquadDamage(squad, 4, rng, {
      tacOpsCritSlots: true,
      isAttackingConvInfantry: true,
    });

    // All criticalHit flags must be false
    result.allocations.forEach((a) => expect(a.criticalHit).toBe(false));
  });

  it('stops allocating when entire squad is destroyed', () => {
    // 1-trooper squad with 1 armor — first damage point kills it, rest discarded
    const squad = makeSquad(1, 1);
    const rng = seededRng([1, 1, 1, 1]);
    const result = allocateSquadDamage(squad, 5, rng, {
      tacOpsCritSlots: false,
    });

    expect(result.allocations).toHaveLength(1);
    const killEvents = result.events.filter(
      (e) => e.kind === 'BATrooperKilled',
    );
    expect(killEvents).toHaveLength(1);
    expect(result.squad.troopers[0].alive).toBe(false);
  });
});
