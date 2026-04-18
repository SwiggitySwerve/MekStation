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

import { create } from 'zustand';

import type { InteractiveSession } from '@/engine/GameEngine';
import type { PhysicalAttackType } from '@/utils/gameplay/physicalAttacks/types';

import {
  Facing,
  IHexCoordinate,
  IGameSession,
  IGameplayUIState,
  MovementType,
} from '@/types/gameplay';
import { declarePhysicalAttack } from '@/utils/gameplay/gameSession';

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
 * Per `add-physical-attack-phase-ui`: structured plan the player builds
 * in the Physical-Attack-phase action panel before declaring a melee
 * attack. Mirrors `IAttackPlan` shape but holds an attack-type pick
 * instead of a weapon-id queue (physical attacks resolve as a single
 * action, not a multi-weapon volley). `null` when no target / type are
 * set yet — the panel renders an empty state in that case.
 */
export interface IPhysicalAttackPlan {
  readonly targetUnitId: string | null;
  readonly attackType: PhysicalAttackType | null;
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

// ---------------------------------------------------------------------------
// Physical-Attack-phase planning store (per `add-physical-attack-phase-ui`)
// ---------------------------------------------------------------------------

/**
 * Per `add-physical-attack-phase-ui`: contract the physical-attack
 * panel + forecast modal subscribe to. Lives in its own Zustand store
 * (rather than as a slice on `useGameplayStore`) so the panel can
 * snapshot + clear plans without forcing edits to the main store
 * file. The commit action takes a callback the caller wires to
 * `useGameplayStore.setSession` so the underlying session refresh
 * stays a one-way data-flow.
 */
export interface IPhysicalAttackPlanState {
  /** Current draft plan; empty sentinel `{null,null}` when nothing picked. */
  readonly physicalAttackPlan: IPhysicalAttackPlan;
  /** Target-lock setter — mirrors `setAttackTarget` for the weapon flow. */
  setPhysicalAttackTarget: (unitId: string | null) => void;
  /** Stash the chosen attack type. */
  setPhysicalAttackType: (attackType: PhysicalAttackType | null) => void;
  /** Reset back to `{targetUnitId: null, attackType: null}`. */
  clearPhysicalAttackPlan: () => void;
  /**
   * Commit the plan via `declarePhysicalAttack`. Returns the updated
   * `IGameSession` (so callers can re-seed `useGameplayStore.session`)
   * or `null` when any required slice is missing.
   */
  commitPhysicalAttack: (
    args: ICommitPhysicalAttackArgs,
  ) => IGameSession | null;
}

/**
 * Per `add-physical-attack-phase-ui`: snapshot the panel passes to
 * `commitPhysicalAttack` so the standalone store doesn't need to read
 * from `useGameplayStore` directly (avoids a circular import). All
 * fields are looked up by the panel from `useGameplayStore` selectors
 * + the unit catalog the `GameplayPage` already loads.
 */
export interface ICommitPhysicalAttackArgs {
  readonly interactiveSession: InteractiveSession;
  readonly attackerId: string;
  readonly attackerPiloting: number;
  readonly attackerTonnage?: number;
  readonly targetTonnage?: number;
  readonly hexesMoved?: number;
}

const EMPTY_PHYSICAL_PLAN: IPhysicalAttackPlan = {
  targetUnitId: null,
  attackType: null,
};

/**
 * Per `add-physical-attack-phase-ui`: dedicated Zustand hook for the
 * physical-attack draft plan. Kept side-by-side with the weapon-attack
 * helpers so reviewers can diff the two flows in one screen, but
 * implemented as a separate store so we don't need to widen
 * `useGameplayStore`'s typed shape (the orchestrator brief
 * intentionally scopes us out of `useGameplayStore.ts`).
 */
export const usePhysicalAttackPlanStore = create<IPhysicalAttackPlanState>(
  (set) => ({
    physicalAttackPlan: EMPTY_PHYSICAL_PLAN,

    setPhysicalAttackTarget: (unitId) =>
      set((state) => ({
        physicalAttackPlan: {
          ...state.physicalAttackPlan,
          targetUnitId: unitId,
        },
      })),

    setPhysicalAttackType: (attackType) =>
      set((state) => ({
        physicalAttackPlan: { ...state.physicalAttackPlan, attackType },
      })),

    clearPhysicalAttackPlan: () =>
      set({ physicalAttackPlan: EMPTY_PHYSICAL_PLAN }),

    /**
     * Commit reads the current draft from this store, joins it with
     * the caller-supplied attacker context, and pushes a
     * `PhysicalAttackDeclared` event by calling the engine's
     * `declarePhysicalAttack` helper. Returns the updated session so
     * the caller can re-seed `useGameplayStore.session` via
     * `setSession`. No-op (returns null) when target / type are
     * missing.
     */
    commitPhysicalAttack: (args) => {
      // Read the latest plan via `getState` rather than capturing it
      // in a closure — avoids stale-state bugs when `set` runs
      // between the panel button click and the forecast confirm.
      const plan = usePhysicalAttackPlanStore.getState().physicalAttackPlan;
      if (!plan.targetUnitId || !plan.attackType) {
        return null;
      }

      const baseSession = args.interactiveSession.getSession();
      const attackerState =
        baseSession.currentState.units[args.attackerId] ?? null;

      // Phase-1 stand-in tonnage — matches `InteractiveSession`
      // (catalog tonnage isn't yet plumbed onto `IGameUnit`).
      const attackerTonnage = args.attackerTonnage ?? 65;
      const targetTonnage = args.targetTonnage ?? 65;
      const hexesMoved =
        args.hexesMoved ?? attackerState?.hexesMovedThisTurn ?? 0;

      const nextSession = declarePhysicalAttack(
        baseSession,
        args.attackerId,
        plan.targetUnitId,
        plan.attackType,
        {
          attackerTonnage,
          targetTonnage,
          pilotingSkill: args.attackerPiloting,
          hexesMoved,
        },
      );

      set({ physicalAttackPlan: EMPTY_PHYSICAL_PLAN });
      return nextSession;
    },
  }),
);
