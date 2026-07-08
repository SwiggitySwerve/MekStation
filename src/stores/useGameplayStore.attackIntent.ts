/**
 * Attack Intent slice (change `attack-phase-intent-composer`, ADR 0002
 * D2/D6/D7).
 *
 * Pure reducers over the stored `IAttackIntentState` (`focusedTargetId` +
 * `assignments` + `composedTwist`) plus derived selectors for
 * primary/secondary designation and per-target grouping. Every to-hit /
 * heat / penalty value the composer displays is sourced from existing
 * code paths (`toHit/forecast`, `secondary-target-tracking` rules) — there
 * is NO UI-local attack math in this module.
 *
 * Reducers are exported as standalone pure functions (unit-testable
 * without the store), mirroring `useGameplayStore.movementIntent`.
 *
 * @spec openspec/changes/attack-phase-intent-composer/specs/tactical-attack-intent/spec.md
 */

import type {
  Facing,
  IAttackIntentState,
  IWeaponAssignment,
  WeaponFireMode,
} from '@/types/gameplay';

import { GamePhase } from '@/types/gameplay';

import type { GetFn, SetFn } from './useGameplayStore.combatFlowTypes';

import { InteractivePhase } from './useGameplayStore.helpers';
import { allowIntentInPhase } from './useGameplayStore.phaseGuard';

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

/** Empty composition: nothing focused, nothing assigned, no twist. */
export const INITIAL_ATTACK_INTENT_STATE: IAttackIntentState = {
  focusedTargetId: null,
  assignments: [],
  composedTwist: null,
};

// ---------------------------------------------------------------------------
// Reducers (pure)
// ---------------------------------------------------------------------------

/**
 * Focus an enemy as the working target (D6 target-first). Focusing never
 * changes assignments — it only routes subsequent weapon toggles.
 */
export function focusTargetReducer(
  state: IAttackIntentState,
  targetId: string | null,
): IAttackIntentState {
  if (state.focusedTargetId === targetId) return state;
  return { ...state, focusedTargetId: targetId };
}

/**
 * Toggle a weapon against the focused working target:
 * - not assigned anywhere → assign to the focused target (appended, so
 *   assignment order drives primary/secondary designation);
 * - assigned to the focused target → unassign;
 * - assigned to a DIFFERENT target → reassign to the focused target
 *   (drops to the end of the order — a reassigned weapon is the newest
 *   decision).
 * No-op when nothing is focused: the palette disables toggles without a
 * working target, but the reducer never guesses a target itself.
 */
export function toggleWeaponAssignmentReducer(
  state: IAttackIntentState,
  weaponId: string,
): IAttackIntentState {
  const focused = state.focusedTargetId;
  if (!focused) return state;

  const existing = state.assignments.find(
    (assignment) => assignment.weaponId === weaponId,
  );

  if (existing && existing.targetId === focused) {
    return {
      ...state,
      assignments: state.assignments.filter(
        (assignment) => assignment.weaponId !== weaponId,
      ),
    };
  }

  const withoutWeapon = state.assignments.filter(
    (assignment) => assignment.weaponId !== weaponId,
  );
  const next: IWeaponAssignment = existing
    ? { ...existing, targetId: focused }
    : { weaponId, targetId: focused };
  return { ...state, assignments: [...withoutWeapon, next] };
}

/** Set a multi-mode weapon's fire mode on its existing assignment. */
export function setAssignmentModeReducer(
  state: IAttackIntentState,
  weaponId: string,
  mode: WeaponFireMode,
): IAttackIntentState {
  const index = state.assignments.findIndex(
    (assignment) => assignment.weaponId === weaponId,
  );
  if (index === -1) return state;
  const assignments = state.assignments.map((assignment, i) =>
    i === index ? { ...assignment, mode } : assignment,
  );
  return { ...state, assignments };
}

/**
 * Set or clear the torso-twist intent (D7). The reducer stores the value
 * only — arc-feasibility recomputation is a derived concern (selectors and
 * the map read `composedTwist` live), so clearing the twist restores prior
 * gating exactly by construction.
 */
export function setComposedTwistReducer(
  state: IAttackIntentState,
  twist: Facing | null,
): IAttackIntentState {
  if (state.composedTwist === twist) return state;
  return { ...state, composedTwist: twist };
}

/** Reset the whole composition (unit change, phase change, post-commit). */
export function clearAttackIntentReducer(): IAttackIntentState {
  return INITIAL_ATTACK_INTENT_STATE;
}

// ---------------------------------------------------------------------------
// Selectors (pure derivations — never stored)
// ---------------------------------------------------------------------------

/**
 * The volley's primary target: the FIRST assignment's target (per
 * `secondary-target-tracking`, consumed as-is). Null for an empty volley.
 */
export function selectPrimaryTargetId(
  state: IAttackIntentState,
): string | null {
  return state.assignments[0]?.targetId ?? null;
}

/** Target ids carrying at least one assignment, beyond the primary. */
export function selectSecondaryTargetIds(
  state: IAttackIntentState,
): readonly string[] {
  const primary = selectPrimaryTargetId(state);
  const seen = new Set<string>();
  for (const assignment of state.assignments) {
    if (assignment.targetId !== primary) seen.add(assignment.targetId);
  }
  return Array.from(seen);
}

/**
 * Assignments grouped per target, PRIMARY FIRST, secondaries in first-
 * assignment order — the shape the volley compiles down through (one
 * declaration group per target).
 */
export function selectVolleyGroups(state: IAttackIntentState): readonly {
  readonly targetId: string;
  readonly weaponIds: readonly string[];
  readonly modesByWeaponId: Readonly<Record<string, WeaponFireMode>>;
}[] {
  const order: string[] = [];
  const byTarget = new Map<
    string,
    { weaponIds: string[]; modes: Record<string, WeaponFireMode> }
  >();
  for (const assignment of state.assignments) {
    let group = byTarget.get(assignment.targetId);
    if (!group) {
      group = { weaponIds: [], modes: {} };
      byTarget.set(assignment.targetId, group);
      order.push(assignment.targetId);
    }
    group.weaponIds.push(assignment.weaponId);
    if (assignment.mode) group.modes[assignment.weaponId] = assignment.mode;
  }
  return order.map((targetId) => {
    const group = byTarget.get(targetId)!;
    return {
      targetId,
      weaponIds: group.weaponIds,
      modesByWeaponId: group.modes,
    };
  });
}

// ---------------------------------------------------------------------------
// Commit (compile-down to the preserved attackPlan contract — design D2)
// ---------------------------------------------------------------------------

/**
 * Fire: commit the whole composed volley atomically.
 *
 * Compile-down (D2): the composed twist declares through the existing
 * torso-twist path first (arcs at resolution match what the composer
 * gated against), then the volley declares one group per target — primary
 * first — through the session's volley path, which locks the attacker
 * once after the final group. A single-target volley is byte-equivalent
 * to the legacy `applyAttack` flow.
 *
 * No-op when any required slice is missing or the volley is empty (an
 * empty pass is the explicit Hold Fire action, not a silent commit).
 */
export function commitComposedVolleyLogic(get: GetFn, set: SetFn): void {
  const { interactiveSession, attackIntent, session, ui } = get();
  const attackerId = ui.selectedUnitId;
  if (
    !interactiveSession ||
    !attackerId ||
    attackIntent.assignments.length === 0
  ) {
    return;
  }
  const currentPhase =
    session?.currentState.phase ?? interactiveSession.getState().phase;
  if (
    !allowIntentInPhase({
      currentPhase,
      requiredPhase: GamePhase.WeaponAttack,
      intent: 'attack',
    })
  ) {
    return;
  }

  if (attackIntent.composedTwist !== null) {
    interactiveSession.torsoTwist(attackerId, attackIntent.composedTwist);
  }

  interactiveSession.applyVolley(attackerId, selectVolleyGroups(attackIntent));

  const gameOver = interactiveSession.isGameOver();

  set((state) => ({
    session: interactiveSession.getSession(),
    interactivePhase: gameOver
      ? InteractivePhase.GameOver
      : InteractivePhase.SelectUnit,
    attackIntent: INITIAL_ATTACK_INTENT_STATE,
    attackPlan: {
      targetUnitId: null,
      selectedWeapons: [],
      weaponModeError: null,
    },
    validTargetIds: [],
    hitChance: null,
    ui: {
      ...state.ui,
      selectedUnitId: null,
      targetUnitId: null,
      queuedWeaponIds: [],
    },
  }));
}

/**
 * Hold Fire: the explicit decline-to-attack action for an empty (or
 * abandoned) composition — ends the unit's weapon activation by locking
 * with no declarations, then clears the composition.
 */
export function holdFireLogic(get: GetFn, set: SetFn): void {
  const { interactiveSession, session, ui } = get();
  const attackerId = ui.selectedUnitId;
  if (!interactiveSession || !attackerId) return;
  const currentPhase =
    session?.currentState.phase ?? interactiveSession.getState().phase;
  if (
    !allowIntentInPhase({
      currentPhase,
      requiredPhase: GamePhase.WeaponAttack,
      intent: 'attack',
    })
  ) {
    return;
  }

  interactiveSession.applyVolley(attackerId, []);

  const gameOver = interactiveSession.isGameOver();

  set((state) => ({
    session: interactiveSession.getSession(),
    interactivePhase: gameOver
      ? InteractivePhase.GameOver
      : InteractivePhase.SelectUnit,
    attackIntent: INITIAL_ATTACK_INTENT_STATE,
    ui: {
      ...state.ui,
      selectedUnitId: null,
      targetUnitId: null,
      queuedWeaponIds: [],
    },
  }));
}
