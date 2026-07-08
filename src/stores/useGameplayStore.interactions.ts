/**
 * Player-interaction action helpers for `useGameplayStore`.
 *
 * Pulled out of the main store file so the per-file LOC budget stays
 * under the lint warning threshold. Covers the unit-selection /
 * movement / fire / hex-click / token-click flows. Each function takes
 * Zustand's `set` / `get` directly (typed against a minimal slice) so
 * the store can compose them as thin pass-throughs.
 *
 * Behavior is byte-for-byte identical to the original inline
 * implementation.
 */

import type { InteractiveSession } from '@/engine/GameEngine';

import { Facing, GamePhase, MovementType } from '@/types/gameplay';
import {
  IGameSession,
  IGameplayUIState,
  IWeaponStatus,
} from '@/types/gameplay';

import type { IAttackPlan } from './useGameplayStore.combatFlows';

import { InteractivePhase } from './useGameplayStore.helpers';
import { allowIntentInPhase } from './useGameplayStore.phaseGuard';

/** Base hit chance used when the to-hit calculator hasn't run yet. */
const DEFAULT_BASE_HIT_CHANCE = 58;

/**
 * Minimal slice of the gameplay store the interaction helpers need.
 */
interface InteractionsSlice {
  session: IGameSession | null;
  interactiveSession: InteractiveSession | null;
  interactivePhase: InteractivePhase;
  validMovementHexes: readonly { q: number; r: number }[];
  validTargetIds: readonly string[];
  hitChance: number | null;
  ui: IGameplayUIState;
  attackPlan: IAttackPlan;
  unitWeapons: Record<string, readonly IWeaponStatus[]>;
}

type SetFn = {
  (partial: Partial<InteractionsSlice>): void;
  (fn: (state: InteractionsSlice) => Partial<InteractionsSlice>): void;
};
type GetFn = () => InteractionsSlice;

/**
 * Stash the player's selection inside the store's UI subtree (the
 * action panel + record-sheet header subscribe to this).
 */
export function selectUnitLogic(unitId: string | null, set: SetFn): void {
  set((state) => ({
    ui: { ...state.ui, selectedUnitId: unitId },
  }));
}

export function setTargetLogic(unitId: string | null, set: SetFn): void {
  set((state) => ({
    ui: { ...state.ui, targetUnitId: unitId },
  }));
}

/**
 * Toggle a weapon id in the legacy `ui.queuedWeaponIds` queue. Kept as
 * a separate action from `selectWeapon` because the new combat-phase
 * UI tracks its weapon picks via the structured `attackPlan` slice
 * instead — both paths still need to coexist while the migration is
 * in flight.
 */
export function toggleWeaponLogic(weaponId: string, set: SetFn): void {
  set((state) => {
    const current = state.ui.queuedWeaponIds;
    const newQueued = current.includes(weaponId)
      ? current.filter((id) => id !== weaponId)
      : [...current, weaponId];
    return {
      ui: { ...state.ui, queuedWeaponIds: newQueued },
    };
  });
}

/**
 * Movement-phase entry point: stash the selected unit, query the
 * engine for valid destination hexes, and flip the interactive phase
 * to SelectMovement so the hex map renders the move overlay.
 */
export function selectUnitForMovementLogic(
  unitId: string,
  get: GetFn,
  set: SetFn,
): void {
  const { interactiveSession, session } = get();
  if (!interactiveSession) return;
  const currentPhase =
    session?.currentState.phase ?? interactiveSession.getState().phase;
  if (
    !allowIntentInPhase({
      currentPhase,
      requiredPhase: GamePhase.Movement,
      intent: 'movement',
    })
  ) {
    return;
  }

  const actions = interactiveSession.getAvailableActions(unitId);

  set((state) => ({
    ui: { ...state.ui, selectedUnitId: unitId },
    interactivePhase: InteractivePhase.SelectMovement,
    validMovementHexes: actions.validMoves,
  }));
}

/**
 * Commit a movement to the engine. Defaults to walk + north facing —
 * the structured `commitPlannedMovement` flow (in `combatFlows.ts`)
 * is the production path; this helper exists for the fallback "click
 * a hex to move" UX.
 */
export function moveUnitLogic(
  unitId: string,
  targetHex: { q: number; r: number },
  get: GetFn,
  set: SetFn,
): void {
  const { interactiveSession, session } = get();
  if (!interactiveSession) return;
  const currentPhase =
    session?.currentState.phase ?? interactiveSession.getState().phase;
  if (
    !allowIntentInPhase({
      currentPhase,
      requiredPhase: GamePhase.Movement,
      intent: 'movement',
    })
  ) {
    return;
  }

  interactiveSession.applyMovement(
    unitId,
    targetHex,
    Facing.North,
    MovementType.Walk,
  );

  set({
    session: interactiveSession.getSession(),
    interactivePhase: InteractivePhase.SelectUnit,
    validMovementHexes: [],
    ui: { ...get().ui, selectedUnitId: null },
  });
}

/**
 * Toggle a weapon id in the legacy `ui.queuedWeaponIds` queue. Same
 * implementation as `toggleWeaponLogic` — kept as a separate exported
 * action because the original inline store had two action names
 * mapped to the same body.
 */
export function selectWeaponLogic(weaponId: string, set: SetFn): void {
  set((state) => {
    const current = state.ui.queuedWeaponIds;
    const newQueued = current.includes(weaponId)
      ? current.filter((id) => id !== weaponId)
      : [...current, weaponId];
    return {
      ui: { ...state.ui, queuedWeaponIds: newQueued },
    };
  });
}

/**
 * Lock the attack target on both the legacy `ui.targetUnitId` field
 * and the structured `attackPlan.targetUnitId` so the new
 * WeaponSelector + ToHitForecastModal can read a single source of
 * truth instead of dual-tracking. Falls back to the base 58% hit
 * chance until the to-hit forecast runs.
 */
export function selectAttackTargetLogic(
  targetUnitId: string,
  get: GetFn,
  set: SetFn,
): void {
  const { interactiveSession, ui } = get();
  if (!interactiveSession || !ui.selectedUnitId) return;

  const attackerState = interactiveSession.getState().units[ui.selectedUnitId];
  const targetState = interactiveSession.getState().units[targetUnitId];
  if (!attackerState || !targetState) return;

  const hitChance = DEFAULT_BASE_HIT_CHANCE;

  set((state) => ({
    ui: { ...state.ui, targetUnitId },
    attackPlan: { ...state.attackPlan, targetUnitId },
    interactivePhase: InteractivePhase.SelectWeapons,
    hitChance,
  }));
}

/**
 * Commit a fire-weapons volley to the engine. Falls back to a
 * `medium-laser` placeholder when no weapons are queued (matches the
 * legacy "fire whatever is loaded" behavior of the demo session).
 * Flips to GameOver when the engine reports the match resolved.
 */
export function fireWeaponsLogic(get: GetFn, set: SetFn): void {
  const { interactiveSession, session, ui } = get();
  if (!interactiveSession || !ui.selectedUnitId || !ui.targetUnitId) return;
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

  const weaponIds =
    ui.queuedWeaponIds.length > 0 ? ui.queuedWeaponIds : ['medium-laser'];

  interactiveSession.applyAttack(ui.selectedUnitId, ui.targetUnitId, weaponIds);

  const gameOver = interactiveSession.isGameOver();

  set({
    session: interactiveSession.getSession(),
    interactivePhase: gameOver
      ? InteractivePhase.GameOver
      : InteractivePhase.SelectUnit,
    validTargetIds: [],
    hitChance: null,
    ui: {
      ...get().ui,
      selectedUnitId: null,
      targetUnitId: null,
      queuedWeaponIds: [],
    },
  });
}

/**
 * Find the unit (if any) sitting on the given hex. Centralised so the
 * three different click handlers ask the live engine state for the
 * occupant via the same lookup.
 */
function getOccupyingUnit(
  session: IGameSession,
  hex: { q: number; r: number },
): { id: string } | undefined {
  return Object.values(session.currentState.units).find(
    (u) => u.position.q === hex.q && u.position.r === hex.r,
  );
}

/**
 * Hex-click dispatcher: routes the click into one of three behaviours
 * based on the current interactive phase + attack-plan state.
 *   1. SelectMovement   -> commit the move via `moveUnit`
 *   2. WeaponAttack on a locked target + empty hex -> clear target
 *   3. SelectUnit on an empty hex -> drop the current unit selection
 */
export function handleInteractiveHexClickLogic(
  hex: { q: number; r: number },
  get: GetFn,
  set: SetFn,
  moveUnit: (unitId: string, hex: { q: number; r: number }) => void,
  clearAttackPlan: () => void,
): void {
  const { interactivePhase, ui, interactiveSession, session, attackPlan } =
    get();
  if (!interactiveSession) return;

  if (
    interactivePhase === InteractivePhase.SelectMovement &&
    ui.selectedUnitId
  ) {
    moveUnit(ui.selectedUnitId, hex);
    return;
  }

  // Per `add-attack-phase-ui` § 2.3: during WeaponAttack, clicking an
  // empty hex clears the current attack target (pulsing ring goes
  // away, WeaponSelector collapses back to the pre-target view). We
  // only key off `attackPlan.targetUnitId` so the clear is a no-op
  // when no target is set.
  if (
    session &&
    session.currentState.phase === GamePhase.WeaponAttack &&
    attackPlan.targetUnitId
  ) {
    if (!getOccupyingUnit(session, hex)) {
      clearAttackPlan();
      set({ interactivePhase: InteractivePhase.SelectTarget });
      return;
    }
  }

  // Per `add-interactive-combat-core-ui` § 2 Scenario 2: clicking an
  // empty hex during the default SelectUnit phase clears the unit
  // selection so the action panel falls back to the placeholder copy.
  if (interactivePhase === InteractivePhase.SelectUnit && session) {
    if (!getOccupyingUnit(session, hex)) {
      set((state) => ({
        ui: { ...state.ui, selectedUnitId: null },
      }));
    }
  }
}
