/**
 * Phase 6a — `add-combat-fidelity-suite` test pyramid (Task 6.4).
 *
 * Damage transfer chain coverage: 8 tests, one per source location:
 *
 *   HD → null (head doesn't transfer; overflow discarded)
 *   CT → null (terminal)
 *   LT → CT (with overflow)
 *   RT → CT
 *   LA → LT
 *   RA → RT
 *   LL → LT
 *   RL → RT
 *
 * Per `getTransferCombatLocation` at
 * `src/types/gameplay/CombatInterfaces.ts:801-822`.
 *
 * Each fixture: source location at 1 armor + 1 structure, attack delivers
 * 5 damage. After transfer: source destroyed (armor 0, structure 0),
 * 3 damage transferred to next location in chain (5 - 1 armor - 1
 * structure = 3 overflow).
 *
 * Spec anchor: `damage-system/spec.md` "Damage Transfer Chain" Requirement.
 * MegaMek reference: `Mek.getTransferLocation`.
 */

import { CombatLocation } from '@/types/gameplay';
import { applyDamageWithTransfer } from '@/utils/gameplay/damage';
import {
  IUnitDamageState,
  RearArmorLocation,
} from '@/utils/gameplay/damage/types';

// ---------------------------------------------------------------------------
// Fixture builder
// ---------------------------------------------------------------------------

/**
 * Build a damage state where every location has 1 armor + 1 structure
 * and rear-torso armor is non-zero. With 5 damage, the source location
 * dies (1 armor absorbed, 1 structure absorbed, 3 overflow) and the
 * next location in the transfer chain absorbs the residual.
 */
function makeBaselineState(): IUnitDamageState {
  const armor: Record<CombatLocation, number> = {
    head: 1,
    center_torso: 1,
    center_torso_rear: 0,
    left_torso: 1,
    left_torso_rear: 0,
    right_torso: 1,
    right_torso_rear: 0,
    left_arm: 1,
    right_arm: 1,
    left_leg: 1,
    right_leg: 1,
  };
  const rearArmor: Record<RearArmorLocation, number> = {
    center_torso: 1,
    left_torso: 1,
    right_torso: 1,
  };
  const structure: Record<CombatLocation, number> = {
    head: 1,
    center_torso: 1,
    center_torso_rear: 0, // unused; structure is keyed off front
    left_torso: 1,
    left_torso_rear: 0,
    right_torso: 1,
    right_torso_rear: 0,
    left_arm: 1,
    right_arm: 1,
    left_leg: 1,
    right_leg: 1,
  };
  return {
    armor,
    rearArmor,
    structure,
    destroyedLocations: [],
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
  };
}

// ---------------------------------------------------------------------------
// Tests — 8 total covering every source-location transfer.
// ---------------------------------------------------------------------------

describe('combat-fidelity / Damage transfer chain (8 source locations)', () => {
  it('HD: head does not transfer (overflow discarded)', () => {
    const state = makeBaselineState();
    const { state: after, results } = applyDamageWithTransfer(state, 'head', 5);
    // Single result — head dies, residual cannot flow.
    expect(results).toHaveLength(1);
    expect(results[0].location).toBe('head');
    expect(results[0].destroyed).toBe(true);
    expect(results[0].armorDamage).toBe(1);
    expect(results[0].structureDamage).toBe(1);
    expect(results[0].transferredDamage).toBe(0);
    expect(results[0].transferLocation).toBeUndefined();
    expect(after.destroyedLocations).toContain('head');
  });

  it('CT: center torso does not transfer (terminal)', () => {
    const state = makeBaselineState();
    const { state: after, results } = applyDamageWithTransfer(
      state,
      'center_torso',
      5,
    );
    expect(results).toHaveLength(1);
    expect(results[0].location).toBe('center_torso');
    expect(results[0].destroyed).toBe(true);
    expect(results[0].transferredDamage).toBe(0);
    expect(results[0].transferLocation).toBeUndefined();
    expect(after.destroyedLocations).toContain('center_torso');
  });

  it('LT -> CT with 3 overflow damage', () => {
    const state = makeBaselineState();
    const { results } = applyDamageWithTransfer(state, 'left_torso', 5);
    expect(results.length).toBeGreaterThanOrEqual(2);
    // First result: LT destroyed.
    expect(results[0].location).toBe('left_torso');
    expect(results[0].destroyed).toBe(true);
    expect(results[0].transferredDamage).toBe(3);
    expect(results[0].transferLocation).toBe('center_torso');
    // Second result: CT absorbed the 3 overflow.
    expect(results[1].location).toBe('center_torso');
    expect(results[1].damage).toBe(3);
  });

  it('RT -> CT with 3 overflow damage', () => {
    const state = makeBaselineState();
    const { results } = applyDamageWithTransfer(state, 'right_torso', 5);
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0].location).toBe('right_torso');
    expect(results[0].destroyed).toBe(true);
    expect(results[0].transferredDamage).toBe(3);
    expect(results[0].transferLocation).toBe('center_torso');
    expect(results[1].location).toBe('center_torso');
    expect(results[1].damage).toBe(3);
  });

  it('LA -> LT with 3 overflow damage', () => {
    const state = makeBaselineState();
    const { results } = applyDamageWithTransfer(state, 'left_arm', 5);
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0].location).toBe('left_arm');
    expect(results[0].destroyed).toBe(true);
    expect(results[0].transferredDamage).toBe(3);
    expect(results[0].transferLocation).toBe('left_torso');
    expect(results[1].location).toBe('left_torso');
    expect(results[1].damage).toBe(3);
  });

  it('RA -> RT with 3 overflow damage', () => {
    const state = makeBaselineState();
    const { results } = applyDamageWithTransfer(state, 'right_arm', 5);
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0].location).toBe('right_arm');
    expect(results[0].destroyed).toBe(true);
    expect(results[0].transferredDamage).toBe(3);
    expect(results[0].transferLocation).toBe('right_torso');
    expect(results[1].location).toBe('right_torso');
    expect(results[1].damage).toBe(3);
  });

  it('LL -> LT with 3 overflow damage', () => {
    const state = makeBaselineState();
    const { results } = applyDamageWithTransfer(state, 'left_leg', 5);
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0].location).toBe('left_leg');
    expect(results[0].destroyed).toBe(true);
    expect(results[0].transferredDamage).toBe(3);
    expect(results[0].transferLocation).toBe('left_torso');
    expect(results[1].location).toBe('left_torso');
    expect(results[1].damage).toBe(3);
  });

  it('RL -> RT with 3 overflow damage', () => {
    const state = makeBaselineState();
    const { results } = applyDamageWithTransfer(state, 'right_leg', 5);
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0].location).toBe('right_leg');
    expect(results[0].destroyed).toBe(true);
    expect(results[0].transferredDamage).toBe(3);
    expect(results[0].transferLocation).toBe('right_torso');
    expect(results[1].location).toBe('right_torso');
    expect(results[1].damage).toBe(3);
  });
});
