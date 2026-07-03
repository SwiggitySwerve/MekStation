/**
 * Unit tests for the Attack Intent slice (change
 * `attack-phase-intent-composer`, ADR 0002 D2/D6/D7) — pure reducer
 * semantics (target-first focus, toggle assign/unassign/reassign-to-end,
 * twist intent) and the derived selectors (primary/secondary designation
 * by assignment order, per-target volley grouping, primary first).
 *
 * The compile-down commit path is covered engine-side in
 * `InteractiveSession.volley.scenario.test.ts` (single-target volley ≡
 * legacy applyAttack event stream).
 */

import { Facing } from '@/types/gameplay';

import {
  clearAttackIntentReducer,
  focusTargetReducer,
  INITIAL_ATTACK_INTENT_STATE,
  selectPrimaryTargetId,
  selectSecondaryTargetIds,
  selectVolleyGroups,
  setAssignmentModeReducer,
  setComposedTwistReducer,
  toggleWeaponAssignmentReducer,
} from '../useGameplayStore.attackIntent';

describe('attackIntent reducers (ADR 0002 D6 target-first)', () => {
  it('focusTargetReducer sets the working target without touching assignments', () => {
    const focused = focusTargetReducer(INITIAL_ATTACK_INTENT_STATE, 't1');
    expect(focused.focusedTargetId).toBe('t1');
    expect(focused.assignments).toEqual([]);

    // Same-value focus is an identity no-op (no re-render churn).
    expect(focusTargetReducer(focused, 't1')).toBe(focused);
  });

  it('toggleWeaponAssignment is a no-op without a focused working target', () => {
    const result = toggleWeaponAssignmentReducer(
      INITIAL_ATTACK_INTENT_STATE,
      'w1',
    );
    expect(result).toBe(INITIAL_ATTACK_INTENT_STATE);
  });

  it('toggle assigns to the focused target, toggle again unassigns', () => {
    let state = focusTargetReducer(INITIAL_ATTACK_INTENT_STATE, 't1');
    state = toggleWeaponAssignmentReducer(state, 'w1');
    expect(state.assignments).toEqual([{ weaponId: 'w1', targetId: 't1' }]);

    state = toggleWeaponAssignmentReducer(state, 'w1');
    expect(state.assignments).toEqual([]);
  });

  it('reassigning a weapon to a new focused target drops it to the END of the order', () => {
    let state = focusTargetReducer(INITIAL_ATTACK_INTENT_STATE, 't1');
    state = toggleWeaponAssignmentReducer(state, 'w1');
    state = toggleWeaponAssignmentReducer(state, 'w2');
    state = focusTargetReducer(state, 't2');
    // w1 moves t1 → t2 and is now the NEWEST decision (last in order).
    state = toggleWeaponAssignmentReducer(state, 'w1');

    expect(state.assignments).toEqual([
      { weaponId: 'w2', targetId: 't1' },
      { weaponId: 'w1', targetId: 't2' },
    ]);
  });

  it('setAssignmentMode updates only an existing assignment', () => {
    let state = focusTargetReducer(INITIAL_ATTACK_INTENT_STATE, 't1');
    state = toggleWeaponAssignmentReducer(state, 'w1');

    const withMode = setAssignmentModeReducer(state, 'w1', 'Indirect');
    expect(withMode.assignments[0]).toEqual({
      weaponId: 'w1',
      targetId: 't1',
      mode: 'Indirect',
    });

    // Unassigned weapon → identity no-op.
    expect(setAssignmentModeReducer(state, 'w9', 'Indirect')).toBe(state);
  });

  it('setComposedTwist stores and clears the twist intent (D7)', () => {
    const twisted = setComposedTwistReducer(
      INITIAL_ATTACK_INTENT_STATE,
      Facing.Northeast,
    );
    expect(twisted.composedTwist).toBe(Facing.Northeast);

    const cleared = setComposedTwistReducer(twisted, null);
    expect(cleared.composedTwist).toBeNull();
    // Same-value set is an identity no-op.
    expect(setComposedTwistReducer(twisted, Facing.Northeast)).toBe(twisted);
  });

  it('clearAttackIntentReducer resets the whole composition', () => {
    expect(clearAttackIntentReducer()).toBe(INITIAL_ATTACK_INTENT_STATE);
  });
});

describe('attackIntent selectors (primary/secondary + volley grouping)', () => {
  /** Compose: w1,w2 → t1 (first), then w3 → t2, then w4 → t1. */
  function composedState() {
    let state = focusTargetReducer(INITIAL_ATTACK_INTENT_STATE, 't1');
    state = toggleWeaponAssignmentReducer(state, 'w1');
    state = toggleWeaponAssignmentReducer(state, 'w2');
    state = focusTargetReducer(state, 't2');
    state = toggleWeaponAssignmentReducer(state, 'w3');
    state = focusTargetReducer(state, 't1');
    state = toggleWeaponAssignmentReducer(state, 'w4');
    return state;
  }

  it('primary target is the FIRST assignment target; empty volley has none', () => {
    expect(selectPrimaryTargetId(INITIAL_ATTACK_INTENT_STATE)).toBeNull();
    expect(selectPrimaryTargetId(composedState())).toBe('t1');
  });

  it('secondary targets are every other assigned target, deduplicated', () => {
    expect(selectSecondaryTargetIds(composedState())).toEqual(['t2']);
    expect(selectSecondaryTargetIds(INITIAL_ATTACK_INTENT_STATE)).toEqual([]);
  });

  it('volley groups are per-target, primary first, with per-weapon modes', () => {
    const state = setAssignmentModeReducer(composedState(), 'w3', 'Indirect');

    expect(selectVolleyGroups(state)).toEqual([
      { targetId: 't1', weaponIds: ['w1', 'w2', 'w4'], modesByWeaponId: {} },
      {
        targetId: 't2',
        weaponIds: ['w3'],
        modesByWeaponId: { w3: 'Indirect' },
      },
    ]);
  });

  it('unassigning the last weapon on a target removes its group', () => {
    let state = composedState();
    state = focusTargetReducer(state, 't2');
    state = toggleWeaponAssignmentReducer(state, 'w3'); // unassign

    expect(selectVolleyGroups(state).map((g) => g.targetId)).toEqual(['t1']);
    expect(selectSecondaryTargetIds(state)).toEqual([]);
  });
});
