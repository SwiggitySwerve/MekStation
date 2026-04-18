/**
 * Movement-phase + Attack-phase planning helpers extracted from
 * `useGameplayStore` per `add-combat-phase-ui-flows`.
 *
 * Lives outside the main store file so the store stays under the
 * project's per-file line budget while keeping the planning state +
 * commit handshakes co-located.
 *
 * The functions take Zustand's `set` / `get` directly (typed with the
 * minimal slices they actually touch) so the store can compose them
 * without boilerplate.
 */

import type { InteractiveSession } from '@/engine/GameEngine';

import {
  Facing,
  IHexCoordinate,
  IGameSession,
  IGameplayUIState,
  MovementType,
} from '@/types/gameplay';

import { InteractivePhase } from './useGameplayStore.helpers';

/**
 * Per `add-combat-phase-ui-flows`: structured plan the player builds
 * in the Movement-phase action panel before committing.
 */
export interface IPlannedMovement {
  readonly destination: IHexCoordinate;
  readonly facing: Facing;
  readonly movementType: MovementType;
  readonly path: readonly IHexCoordinate[];
}

/**
 * Per `add-combat-phase-ui-flows`: structured plan the player builds
 * in the Attack-phase action panel before firing.
 */
export interface IAttackPlan {
  readonly targetUnitId: string | null;
  readonly selectedWeapons: readonly string[];
}

/**
 * Minimal slice of the gameplay store the combat-flow helpers need.
 */
interface CombatFlowsSlice {
  session: IGameSession | null;
  interactiveSession: InteractiveSession | null;
  ui: IGameplayUIState;
  plannedMovement: IPlannedMovement | null;
  attackPlan: IAttackPlan;
  interactivePhase: InteractivePhase;
  validMovementHexes: readonly { q: number; r: number }[];
  validTargetIds: readonly string[];
  hitChance: number | null;
}

type SetFn = {
  (partial: Partial<CombatFlowsSlice>): void;
  (fn: (state: CombatFlowsSlice) => Partial<CombatFlowsSlice>): void;
};
type GetFn = () => CombatFlowsSlice;

// ---------------------------------------------------------------------------
// Movement-phase planning helpers
// ---------------------------------------------------------------------------

export function setPlannedMovementLogic(
  plan: IPlannedMovement,
  set: SetFn,
): void {
  set({ plannedMovement: plan });
}

export function clearPlannedMovementLogic(set: SetFn): void {
  set({ plannedMovement: null });
}

/**
 * Apply the planned move to the interactive session (emits
 * `MovementDeclared` + `MovementLocked` events) and clear the plan.
 * No-op when session / plan / selected unit are missing.
 */
export function commitPlannedMovementLogic(get: GetFn, set: SetFn): void {
  const { interactiveSession, plannedMovement, ui } = get();
  if (!interactiveSession || !plannedMovement || !ui.selectedUnitId) return;

  interactiveSession.applyMovement(
    ui.selectedUnitId,
    plannedMovement.destination,
    plannedMovement.facing,
    plannedMovement.movementType,
  );

  set({
    session: interactiveSession.getSession(),
    interactivePhase: InteractivePhase.SelectUnit,
    plannedMovement: null,
    validMovementHexes: [],
    ui: { ...get().ui, selectedUnitId: null },
  });
}

// ---------------------------------------------------------------------------
// Attack-phase planning helpers
// ---------------------------------------------------------------------------

export function setAttackTargetLogic(unitId: string | null, set: SetFn): void {
  set((state) => ({
    attackPlan: { ...state.attackPlan, targetUnitId: unitId },
    ui: { ...state.ui, targetUnitId: unitId },
  }));
}

export function togglePlannedWeaponLogic(weaponId: string, set: SetFn): void {
  set((state) => {
    const current = state.attackPlan.selectedWeapons;
    const next = current.includes(weaponId)
      ? current.filter((id) => id !== weaponId)
      : [...current, weaponId];
    return {
      attackPlan: { ...state.attackPlan, selectedWeapons: next },
    };
  });
}

export function clearAttackPlanLogic(set: SetFn): void {
  set((state) => ({
    attackPlan: { targetUnitId: null, selectedWeapons: [] },
    ui: { ...state.ui, targetUnitId: null },
  }));
}

/**
 * Apply the planned attack via the interactive session (emits
 * `AttackDeclared` + `AttackLocked`) and clear the plan. No-op when
 * any required slice is missing.
 */
export function commitAttackLogic(get: GetFn, set: SetFn): void {
  const { interactiveSession, attackPlan, ui } = get();
  if (
    !interactiveSession ||
    !ui.selectedUnitId ||
    !attackPlan.targetUnitId ||
    attackPlan.selectedWeapons.length === 0
  ) {
    return;
  }

  interactiveSession.applyAttack(
    ui.selectedUnitId,
    attackPlan.targetUnitId,
    attackPlan.selectedWeapons,
  );

  const gameOver = interactiveSession.isGameOver();

  set((state) => ({
    session: interactiveSession.getSession(),
    interactivePhase: gameOver
      ? InteractivePhase.GameOver
      : InteractivePhase.SelectUnit,
    attackPlan: { targetUnitId: null, selectedWeapons: [] },
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
