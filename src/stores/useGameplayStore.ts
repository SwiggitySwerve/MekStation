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
import type { IRuntimeMovementStateChangedPayload } from '@/types/gameplay/GameSessionMovementEvents';

import { recoverInteractiveSession } from '@/engine/InteractiveSession';
import {
  DEFAULT_UI_STATE,
  GamePhase,
  IGameSession,
  IGameplayUIState,
  IPilotSpaSummary,
  IWeaponStatus,
  MovementType,
  WeaponFireMode,
  type Facing,
  type IIntentItem,
  type IMovementIntentState,
  type PostureActionType,
  type StandUpMode,
} from '@/types/gameplay';
import { RECONNECT_GRACE_MS } from '@/types/multiplayer/Protocol';
import { logger } from '@/utils/logger';

import {
  clearAttackPlanLogic,
  clearPlannedMovementLogic,
  commitAttackLogic,
  commitPlannedMovementLogic,
  enterHullDownActiveUnitLogic,
  getAttackPlanFor,
  goProneActiveUnitLogic,
  applyRuntimeMovementStateForSelectedUnitLogic,
  setAttackTargetLogic,
  setPlannedMovementLogic,
  setPlannedWeaponModeLogic,
  shouldClearAttackPlanOnPhaseChange,
  standActiveUnitLogic,
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
  type IGameplayActionPayload,
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
  addPostureActionReducer,
  appendWaypointReducer,
  INITIAL_MOVEMENT_INTENT_STATE,
  intentToMovementDeclaration,
  lockInReducer,
  popWaypointReducer,
  removeIntentItemReducer,
  resetCompositionReducer,
  setFinalFacingReducer,
} from './useGameplayStore.movementIntent';
import {
  projectSelectedUnit,
  selectIsGameCompleted,
  selectLocalMatchGraceRemainingMs,
  selectLocalMatchStatus,
  type ISelectedUnitProjection,
} from './useGameplayStore.selectors';
import {
  createDemoSessionLogic,
  loadSessionLogic,
  setInteractiveSessionLogic,
  setSpectatorModeLogic,
  type SpectatorMode,
} from './useGameplayStore.session';

export { InteractivePhase, selectIsGameCompleted };
export { selectLocalMatchGraceRemainingMs, selectLocalMatchStatus };
export type {
  IAttackPlan,
  IPlannedMovement,
  ISelectedUnitProjection,
  SpectatorMode,
};

// =============================================================================
// Types
// =============================================================================

export type LocalMatchStatus =
  | 'live'
  | 'guestPending'
  | 'hostPending'
  | 'aborted';

interface GameplayState {
  session: IGameSession | null;
  interactiveSession: InteractiveSession | null;
  localMatchStatus: LocalMatchStatus;
  localMatchGraceDeadlineMs: number | null;
  localMatchGraceRemainingMs: number | null;
  reconnectGraceMs: number;
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
  weaponModesByUnitId: Record<string, Readonly<Record<string, WeaponFireMode>>>;
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
  /**
   * Per `tactical-movement-intent-composer` (design D5): the intent-first
   * movement composition the active player is building — Posture Actions plus
   * at most one waypointed Locomotion Path — plus the mode locked in at
   * Lock-In. Derived values (ledger total, budget options) are NOT stored;
   * selectors compute them from `movementIntent.items` + live unit state.
   */
  movementIntent: IMovementIntentState;
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
  setLocalMatchStatus: (
    status: LocalMatchStatus,
    options?: { graceMs?: number; nowMs?: number },
  ) => void;
  resetLocalMatchStatus: () => void;
  setLocalMatchGraceDeadline: (
    deadlineMs: number | null,
    nowMs?: number,
  ) => void;
  setLocalMatchGraceRemaining: (
    remainingMs: number | null,
    nowMs?: number,
  ) => void;
  selectUnit: (unitId: string | null) => void;
  setTarget: (unitId: string | null) => void;
  handleAction: (actionId: string, payload?: IGameplayActionPayload) => void;
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
  /** Commit a zero-hex stand-up movement for the selected prone unit. */
  standActiveUnit: (standUpMode?: StandUpMode) => void;
  /** Commit a zero-hex hull-down entry movement for the selected standing unit. */
  enterHullDownActiveUnit: () => void;
  /** Commit a zero-hex go-prone movement for the selected hull-down unit. */
  goProneActiveUnit: () => void;
  /** Commit a replayable conversion or infantry mount-state update. */
  applyRuntimeMovementState: (
    patch: Omit<IRuntimeMovementStateChangedPayload, 'unitId'>,
  ) => void;
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
  setPlannedWeaponMode: (weaponId: string, mode: WeaponFireMode) => void;
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
  /**
   * Per `tactical-movement-intent-composer` (design D5): Movement Intent
   * Composer actions. Reducers mutate `movementIntent.items` (each edit clears
   * `lockedMode`); MP / heat / to-hit costs are supplied by the caller from
   * `movement-system` code paths — the store holds no UI-local movement math.
   */
  addPostureAction: (action: PostureActionType, mpCost: number) => void;
  removeIntentItem: (index: number) => void;
  appendWaypoint: (
    leg: Extract<IIntentItem, { kind: 'locomotion' }>['legs'][number],
    finalFacing: Facing,
  ) => void;
  popWaypoint: (restoredFinalFacing: Facing) => void;
  setFinalFacing: (finalFacing: Facing) => void;
  resetComposition: () => void;
  /** Record the explicit player Lock-In choice (never auto-picked). */
  lockIn: (mode: MovementType) => void;
  /**
   * Commit the composed intent + locked mode into the existing movement
   * declaration path (the same `applyMovement` route the legacy planner uses),
   * then reset the composition. No-op when there is nothing to commit.
   */
  commitComposedMovement: (
    intent: IMovementIntentState,
    lockedMode: MovementType,
  ) => void;
}

type GameplayStore = GameplayState & GameplayActions;

// =============================================================================
// Initial State
// =============================================================================

const initialState: GameplayState = {
  session: null,
  interactiveSession: null,
  localMatchStatus: 'live',
  localMatchGraceDeadlineMs: null,
  localMatchGraceRemainingMs: null,
  reconnectGraceMs: RECONNECT_GRACE_MS,
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
  weaponModesByUnitId: {},
  plannedMovement: null,
  attackPlan: {
    targetUnitId: null,
    selectedWeapons: [],
    weaponModeError: null,
  },
  previewEnabled: false,
  movementIntent: INITIAL_MOVEMENT_INTENT_STATE,
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
    loadSessionLogic(
      sessionId,
      get,
      set,
      () => get().createDemoSession(),
      recoverInteractiveSession,
    ),
  createDemoSession: () => createDemoSessionLogic(set),
  setSession: (session) => {
    set({ session, isLoading: false, error: null });
  },
  setInteractiveSession: (interactiveSession) =>
    setInteractiveSessionLogic(interactiveSession, set),
  setSpectatorMode: (interactiveSession, spectatorMode) =>
    setSpectatorModeLogic(interactiveSession, spectatorMode, set),
  setLocalMatchStatus: (status, options) => {
    if (status === 'live') {
      set({
        localMatchStatus: 'live',
        localMatchGraceDeadlineMs: null,
        localMatchGraceRemainingMs: null,
      });
      return;
    }

    const nowMs = options?.nowMs ?? Date.now();
    if (status === 'aborted') {
      set({
        localMatchStatus: 'aborted',
        localMatchGraceDeadlineMs: nowMs,
        localMatchGraceRemainingMs: 0,
      });
      return;
    }

    const graceMs = options?.graceMs ?? get().reconnectGraceMs;
    const deadlineMs = nowMs + graceMs;
    set({
      localMatchStatus: status,
      reconnectGraceMs: graceMs,
      localMatchGraceDeadlineMs: deadlineMs,
      localMatchGraceRemainingMs: graceMs,
    });
  },
  resetLocalMatchStatus: () => {
    set({
      localMatchStatus: 'live',
      localMatchGraceDeadlineMs: null,
      localMatchGraceRemainingMs: null,
      reconnectGraceMs: RECONNECT_GRACE_MS,
    });
  },
  setLocalMatchGraceDeadline: (deadlineMs, nowMs = Date.now()) => {
    set({
      localMatchGraceDeadlineMs: deadlineMs,
      localMatchGraceRemainingMs:
        deadlineMs === null ? null : Math.max(0, deadlineMs - nowMs),
    });
  },
  setLocalMatchGraceRemaining: (remainingMs, nowMs = Date.now()) => {
    set({
      localMatchGraceDeadlineMs:
        remainingMs === null ? null : nowMs + Math.max(0, remainingMs),
      localMatchGraceRemainingMs:
        remainingMs === null ? null : Math.max(0, remainingMs),
    });
  },
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
  handleAction: (actionId, payload) => {
    const { session, ui, interactiveSession } = get();
    handleActionLogic(actionId, session, ui, set, interactiveSession, payload);
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
      {
        selectUnitForMovement: get().selectUnitForMovement,
        selectAttackTarget: get().selectAttackTarget,
      },
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
  standActiveUnit: (standUpMode) => standActiveUnitLogic(get, set, standUpMode),
  enterHullDownActiveUnit: () => enterHullDownActiveUnitLogic(get, set),
  goProneActiveUnit: () => goProneActiveUnitLogic(get, set),
  applyRuntimeMovementState: (patch) =>
    applyRuntimeMovementStateForSelectedUnitLogic(get, set, patch),
  setAttackTarget: (unitId) => setAttackTargetLogic(unitId, set),
  togglePlannedWeapon: (weaponId) => togglePlannedWeaponLogic(weaponId, set),
  setPlannedWeaponMode: (weaponId, mode) =>
    setPlannedWeaponModeLogic(weaponId, mode, set),
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

  // -------------------------------------------------------------------------
  // Movement Intent Composer (tactical-movement-intent-composer, design D5)
  // -------------------------------------------------------------------------
  addPostureAction: (action, mpCost) =>
    set((state) => ({
      movementIntent: addPostureActionReducer(
        state.movementIntent,
        action,
        mpCost,
      ),
    })),
  removeIntentItem: (index) =>
    set((state) => ({
      movementIntent: removeIntentItemReducer(state.movementIntent, index),
    })),
  appendWaypoint: (leg, finalFacing) =>
    set((state) => ({
      movementIntent: appendWaypointReducer(
        state.movementIntent,
        leg,
        finalFacing,
      ),
    })),
  popWaypoint: (restoredFinalFacing) =>
    set((state) => ({
      movementIntent: popWaypointReducer(
        state.movementIntent,
        restoredFinalFacing,
      ),
    })),
  setFinalFacing: (finalFacing) =>
    set((state) => ({
      movementIntent: setFinalFacingReducer(state.movementIntent, finalFacing),
    })),
  resetComposition: () => set({ movementIntent: resetCompositionReducer() }),
  lockIn: (mode) =>
    set((state) => ({
      movementIntent: lockInReducer(state.movementIntent, mode),
    })),
  commitComposedMovement: (intent, lockedMode) => {
    const { interactiveSession, ui } = get();
    if (!interactiveSession || !ui.selectedUnitId) return;

    const unitId = ui.selectedUnitId;
    const unitState =
      interactiveSession.getSession().currentState.units[unitId];
    if (!unitState) return;

    // Translate the composed intent into the single applyMovement-shaped
    // declaration, using the unit's current hex/facing as the path anchor.
    const declaration = intentToMovementDeclaration(
      intent,
      lockedMode,
      unitState.position,
      unitState.facing,
    );
    if (!declaration) {
      // Nothing to commit — still reset the composition so a stale intent
      // never lingers into the next activation.
      set({ movementIntent: resetCompositionReducer() });
      return;
    }

    // Feed the EXISTING movement declaration path: stage the equivalent
    // planned movement, then delegate to the legacy commit so animation,
    // event emission, and phase reset stay byte-identical to a normal move.
    set({
      plannedMovement: {
        unitId,
        destination: declaration.destination,
        facing: declaration.facing,
        movementType: declaration.movementType,
        path: declaration.path,
      },
    });
    commitPlannedMovementLogic(get, set);
    set({ movementIntent: resetCompositionReducer() });
  },
}));

// ---------------------------------------------------------------------------
// Selector hooks
// ---------------------------------------------------------------------------

/**
 * Subscribe to the currently selected unit's projection. Selects the
 * three primitives (id / session) separately so Zustand's
 * shallow-equality only re-renders when the relevant inputs change —
 * `projectSelectedUnit` then composes them into the projected shape.
 */
export function useSelectedUnit(): ISelectedUnitProjection | null {
  const id = useGameplayStore((s) => s.ui.selectedUnitId);
  const session = useGameplayStore((s) => s.session);
  return projectSelectedUnit(id, session);
}

/**
 * Hook form of `selectIsGameCompleted` for components that prefer
 * the named-hook idiom over passing the selector directly.
 */
export function useIsGameCompleted(): boolean {
  return useGameplayStore(selectIsGameCompleted);
}

// ---------------------------------------------------------------------------
// Selector helper (perf pattern POC)
// ---------------------------------------------------------------------------
//
// Components should pull individual fields via this helper (or call
// `useGameplayStore(selector)` directly) instead of destructuring the
// full store. Destructuring the full store causes the component to
// re-render on ANY state mutation, even when the consumed fields
// haven't changed. Per-field selectors with primitive returns get
// Zustand's reference-equality short-circuit and skip re-renders for
// unrelated mutations.
//
// Pattern:
//   const session = useGameplaySelector((s) => s.session);
//   const phase  = useGameplaySelector((s) => s.interactivePhase);
//
// Note: Zustand's `useStore(selector)` already implements this — the
// helper exists purely to give a named, store-scoped convention so
// follow-up rollouts to other stores can ship matching helpers
// (`selectFromCustomizerStore`, etc.) and grep cleanly.
//
// CAUTION: prefer primitive-returning selectors. If the selector
// returns an object (e.g. `(s) => s.user`) Zustand's default
// reference-equality will re-render on every store mutation that
// recreates the object — use `zustand/shallow` or split into multiple
// primitive selectors to avoid the trap.
export function useGameplaySelector<T>(
  selector: (state: GameplayStore) => T,
): T {
  return useGameplayStore(selector);
}

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
