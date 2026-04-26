/**
 * Gameplay Store
 *
 * Zustand store for game session state management. The store body is
 * a thin composition layer that delegates to four sibling slice files:
 *
 *   - useGameplayStore.session.ts      — load/demo/setSession/spectator
 *   - useGameplayStore.interactions.ts — selectUnit/move/fire/click handlers
 *   - useGameplayStore.combatFlows.ts  — movement + attack plan helpers
 *   - useGameplayStore.helpers.ts      — phase advance / AI turn / skip
 *   - useGameplayStore.selectors.ts    — useSelectedUnit, useIsGameCompleted
 *
 * The split keeps each file under the per-file LOC budget while
 * leaving the public hook surface (`useGameplayStore`,
 * `InteractivePhase`, `useSelectedUnit`, `selectIsGameCompleted`,
 * `useIsGameCompleted`) unchanged.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import { create } from 'zustand';

import type { InteractiveSession } from '@/engine/GameEngine';

import {
  DEFAULT_UI_STATE,
  GamePhase,
  IGameSession,
  IGameplayUIState,
  IPilotSpaSummary,
  IWeaponStatus,
} from '@/types/gameplay';
import { logger } from '@/utils/logger';

import {
  clearAttackPlanLogic,
  clearPlannedMovementLogic,
  commitAttackLogic,
  commitPlannedMovementLogic,
  getAttackPlanFor,
  setAttackTargetLogic,
  setPlannedMovementLogic,
  shouldClearAttackPlanOnPhaseChange,
  togglePlannedWeaponLogic,
  type IAttackPlan,
  type IPlannedMovement,
} from './useGameplayStore.combatFlows';
import {
  advanceInteractivePhaseLogic,
  handleActionLogic,
  handleInteractiveTokenClickLogic,
  InteractivePhase,
  runAITurnLogic,
  skipPhaseLogic,
} from './useGameplayStore.helpers';
import {
  fireWeaponsLogic,
  handleInteractiveHexClickLogic,
  moveUnitLogic,
  selectAttackTargetLogic,
  selectUnitForMovementLogic,
  selectUnitLogic,
  selectWeaponLogic,
  setTargetLogic,
  toggleWeaponLogic,
} from './useGameplayStore.interactions';
import {
  createDemoSessionLogic,
  loadSessionLogic,
  setInteractiveSessionLogic,
  setSpectatorModeLogic,
  type SpectatorMode,
} from './useGameplayStore.session';

export { InteractivePhase };
export type { IAttackPlan, IPlannedMovement, SpectatorMode };
export {
  selectIsGameCompleted,
  useIsGameCompleted,
  useSelectedUnit,
  type ISelectedUnitProjection,
} from './useGameplayStore.selectors';

// =============================================================================
// Types
// =============================================================================

interface GameplayState {
  session: IGameSession | null;
  interactiveSession: InteractiveSession | null;
  interactivePhase: InteractivePhase;
  spectatorMode: SpectatorMode | null;
  validMovementHexes: readonly { q: number; r: number }[];
  validTargetIds: readonly string[];
  hitChance: number | null;
  ui: IGameplayUIState;
  isLoading: boolean;
  error: string | null;
  unitWeapons: Record<string, readonly IWeaponStatus[]>;
  maxArmor: Record<string, Record<string, number>>;
  maxStructure: Record<string, Record<string, number>>;
  pilotNames: Record<string, string>;
  heatSinks: Record<string, number>;
  /**
   * Per `add-interactive-combat-core-ui` § 8: projected SPA list per unit,
   * used by the action panel's "Special Pilot Abilities" section. Keyed by
   * unit id so the record-sheet display stays dumb — it just renders
   * whatever the store says. Empty array → renders the "No SPAs" empty
   * state. Missing key → treated the same as an empty array.
   */
  unitSpas: Record<string, readonly IPilotSpaSummary[]>;
  /**
   * Per `add-combat-phase-ui-flows`: in-progress movement the player is
   * building in the Movement phase. `null` until they pick a
   * destination + facing + type.
   */
  plannedMovement: IPlannedMovement | null;
  /**
   * Per `add-combat-phase-ui-flows`: in-progress attack plan the
   * player is building in the Attack phase. Always present (never
   * null) so multi-select works without nil-checks; the empty-attack
   * sentinel is `{ targetUnitId: null, selectedWeapons: [] }`.
   */
  attackPlan: IAttackPlan;
  /**
   * Per `add-what-if-to-hit-preview`: session-scoped UI toggle the
   * weapon-picker reads to decide whether to show the "Exp. Dmg /
   * stddev / Crit %" preview columns. Pure UI flag — flipping it
   * never appends a `AttackDeclared` event, mutates session state,
   * or clears the attack plan. Resets to `false` on `reset()` and
   * does NOT persist across page reloads (intentionally
   * session-scoped per the change's non-goals).
   */
  previewEnabled: boolean;
}

interface GameplayActions {
  loadSession: (sessionId: string) => Promise<void>;
  createDemoSession: () => void;
  setSession: (session: IGameSession) => void;
  setInteractiveSession: (interactiveSession: InteractiveSession) => void;
  setSpectatorMode: (
    interactiveSession: InteractiveSession,
    spectatorMode: SpectatorMode,
  ) => void;
  selectUnit: (unitId: string | null) => void;
  setTarget: (unitId: string | null) => void;
  handleAction: (actionId: string) => void;
  toggleWeapon: (weaponId: string) => void;
  clearError: () => void;
  reset: () => void;
  selectUnitForMovement: (unitId: string) => void;
  moveUnit: (unitId: string, targetHex: { q: number; r: number }) => void;
  selectWeapon: (weaponId: string) => void;
  selectAttackTarget: (unitId: string) => void;
  fireWeapons: () => void;
  runAITurn: () => void;
  advanceInteractivePhase: () => void;
  handleInteractiveHexClick: (hex: { q: number; r: number }) => void;
  handleInteractiveTokenClick: (unitId: string) => void;
  skipPhase: () => void;
  checkGameOver: () => boolean;
  /**
   * Per `add-combat-phase-ui-flows`: Movement-phase planning actions.
   * `setPlannedMovement` replaces the in-progress plan (used by both
   * hex picker and facing picker so each can update the plan
   * incrementally). `clearPlannedMovement` resets it to `null` (called
   * when the type switcher changes types or the player picks a new
   * destination). `commitPlannedMovement` emits a `MovementDeclared`
   * event via `interactiveSession.applyMovement` and clears the plan.
   */
  setPlannedMovement: (plan: IPlannedMovement) => void;
  clearPlannedMovement: () => void;
  commitPlannedMovement: () => void;
  /**
   * Per `add-combat-phase-ui-flows`: Attack-phase planning actions.
   * `setAttackTarget` sets the target id when an enemy token is
   * clicked. `togglePlannedWeapon` flips a weapon id in the
   * `selectedWeapons` queue. `clearAttackPlan` resets target +
   * weapons. `commitAttack` emits an `AttackDeclared` event via
   * `interactiveSession.applyAttack` and clears the plan.
   */
  setAttackTarget: (unitId: string | null) => void;
  togglePlannedWeapon: (weaponId: string) => void;
  clearAttackPlan: () => void;
  commitAttack: () => void;
  /**
   * Per `add-attack-phase-ui` task 1.3: returns the current attack
   * plan scoped to the passed `attackerId`. Returns `null` when the
   * active attacker (the store's selected unit) isn't the requested
   * attacker — callers use this to avoid rendering another unit's
   * target lock/weapon selection on a sibling panel.
   */
  getAttackPlan: (attackerId: string) => IAttackPlan | null;
  /**
   * Per `add-what-if-to-hit-preview` § 8: flip the "Preview Damage"
   * toggle. The weapon-picker subscribes to `previewEnabled` and
   * shows the expected-damage / stddev / crit% columns when ON.
   * NEVER calls `applyAction` or appends an event — pure UI flag.
   */
  setPreviewEnabled: (enabled: boolean) => void;
}

type GameplayStore = GameplayState & GameplayActions;

// =============================================================================
// Initial State
// =============================================================================

const initialState: GameplayState = {
  session: null,
  interactiveSession: null,
  interactivePhase: InteractivePhase.None,
  spectatorMode: null,
  validMovementHexes: [],
  validTargetIds: [],
  hitChance: null,
  ui: DEFAULT_UI_STATE,
  isLoading: false,
  error: null,
  unitWeapons: {},
  maxArmor: {},
  maxStructure: {},
  pilotNames: {},
  heatSinks: {},
  unitSpas: {},
  plannedMovement: null,
  attackPlan: { targetUnitId: null, selectedWeapons: [] },
  previewEnabled: false,
};

// =============================================================================
// Store
// =============================================================================

export const useGameplayStore = create<GameplayStore>((set, get) => ({
  ...initialState,

  // -------------------------------------------------------------------------
  // Session lifecycle (delegated to useGameplayStore.session)
  // -------------------------------------------------------------------------
  loadSession: (sessionId) =>
    loadSessionLogic(sessionId, get, set, () => get().createDemoSession()),
  createDemoSession: () => createDemoSessionLogic(set),
  setSession: (session) => {
    set({ session, isLoading: false, error: null });
  },
  setInteractiveSession: (interactiveSession) =>
    setInteractiveSessionLogic(interactiveSession, set),
  setSpectatorMode: (interactiveSession, spectatorMode) =>
    setSpectatorModeLogic(interactiveSession, spectatorMode, set),
  clearError: () => {
    set({ error: null });
  },
  reset: () => {
    set(initialState);
  },

  // -------------------------------------------------------------------------
  // Interaction actions (delegated to useGameplayStore.interactions)
  // -------------------------------------------------------------------------
  selectUnit: (unitId) => selectUnitLogic(unitId, set),
  setTarget: (unitId) => setTargetLogic(unitId, set),
  toggleWeapon: (weaponId) => toggleWeaponLogic(weaponId, set),
  selectWeapon: (weaponId) => selectWeaponLogic(weaponId, set),
  selectUnitForMovement: (unitId) =>
    selectUnitForMovementLogic(unitId, get, set),
  moveUnit: (unitId, targetHex) => moveUnitLogic(unitId, targetHex, get, set),
  selectAttackTarget: (targetUnitId) =>
    selectAttackTargetLogic(targetUnitId, get, set),
  fireWeapons: () => fireWeaponsLogic(get, set),
  handleInteractiveHexClick: (hex) =>
    handleInteractiveHexClickLogic(
      hex,
      get,
      set,
      get().moveUnit,
      get().clearAttackPlan,
    ),

  // -------------------------------------------------------------------------
  // Phase / AI / engine handshake (delegated to useGameplayStore.helpers)
  // -------------------------------------------------------------------------
  handleAction: (actionId) => {
    const { session, ui } = get();
    handleActionLogic(actionId, session, ui, set);
  },
  runAITurn: () => {
    const { interactiveSession } = get();
    runAITurnLogic(interactiveSession, set);
  },
  advanceInteractivePhase: () => {
    const { interactiveSession } = get();
    advanceInteractivePhaseLogic(interactiveSession, get, set);
  },
  handleInteractiveTokenClick: (unitId) => {
    const { interactivePhase, interactiveSession, attackPlan, session } = get();

    // Per `add-attack-phase-ui` § 2.3: during WeaponAttack, clicking
    // the *same* token that is currently the active attack target
    // clears the plan (matches the "click again to clear" pattern the
    // spec calls out for the pulsing-ring target). We short-circuit
    // before the generic dispatch so the target isn't immediately
    // re-set by `selectAttackTarget`.
    if (
      session &&
      session.currentState.phase === GamePhase.WeaponAttack &&
      attackPlan.targetUnitId === unitId
    ) {
      get().clearAttackPlan();
      set({ interactivePhase: InteractivePhase.SelectTarget });
      return;
    }

    handleInteractiveTokenClickLogic(
      unitId,
      interactivePhase,
      interactiveSession,
      get,
      set,
      get().selectUnitForMovement,
      get().selectAttackTarget,
    );
  },
  skipPhase: () => {
    const { interactiveSession } = get();
    skipPhaseLogic(interactiveSession, get, set);
  },
  checkGameOver: (): boolean => {
    const { interactiveSession } = get();
    if (!interactiveSession) return false;

    if (interactiveSession.isGameOver()) {
      const result = interactiveSession.getResult();
      set({
        session: interactiveSession.getSession(),
        interactivePhase: InteractivePhase.GameOver,
      });
      logger.info('Game over', result);
      return true;
    }
    return false;
  },

  // -------------------------------------------------------------------------
  // Movement / attack plan (delegated to useGameplayStore.combatFlows)
  // -------------------------------------------------------------------------
  setPlannedMovement: (plan) => setPlannedMovementLogic(plan, set),
  clearPlannedMovement: () => clearPlannedMovementLogic(set),
  commitPlannedMovement: () => commitPlannedMovementLogic(get, set),
  setAttackTarget: (unitId) => setAttackTargetLogic(unitId, set),
  togglePlannedWeapon: (weaponId) => togglePlannedWeaponLogic(weaponId, set),
  clearAttackPlan: () => clearAttackPlanLogic(set),
  commitAttack: () => commitAttackLogic(get, set),
  getAttackPlan: (attackerId) => {
    const state = get();
    return getAttackPlanFor(
      state.attackPlan,
      state.ui.selectedUnitId,
      attackerId,
    );
  },
  // Pure UI flag — flipping it intentionally never touches session
  // state, the attack plan, or the interactive session. The
  // weapon-picker subscribes via the `previewEnabled` selector.
  setPreviewEnabled: (enabled) => set({ previewEnabled: enabled }),
}));

// ---------------------------------------------------------------------------
// Phase-change side effects (task 1.2)
// ---------------------------------------------------------------------------

/**
 * Per `add-attack-phase-ui` task 1.2: whenever the session's phase
 * transitions away from Weapon Attack, flush any in-progress attack
 * plan. The plan's target + weapon selections are scoped to that
 * phase — carrying them into Heat / End / Movement is meaningless and
 * would leak stale state onto the next attack phase.
 *
 * Implemented as a module-level Zustand subscription so it fires
 * regardless of which mutator drives the phase change (engine-driven
 * phase advance, skipPhase, runAITurn, setSession, etc.). We track
 * the previous phase across runs via a closed-over variable — that's
 * the canonical Zustand pattern for "derived effects on value
 * transitions".
 */
let previousPhaseForAttackPlan: GamePhase | null = null;
useGameplayStore.subscribe((state) => {
  const nextPhase = state.session?.currentState.phase ?? null;
  if (
    shouldClearAttackPlanOnPhaseChange(previousPhaseForAttackPlan, nextPhase) &&
    (state.attackPlan.targetUnitId !== null ||
      state.attackPlan.selectedWeapons.length > 0)
  ) {
    state.clearAttackPlan();
  }
  previousPhaseForAttackPlan = nextPhase;
});
