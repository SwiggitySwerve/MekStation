/**
 * Gameplay Store
 * Zustand store for game session state management.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import { create } from 'zustand';

import type { InteractiveSession } from '@/engine/GameEngine';

import {
  createDemoSession,
  createDemoWeapons,
  createDemoMaxArmor,
  createDemoMaxStructure,
  createDemoPilotNames,
  createDemoHeatSinks,
  createDemoUnitSpas,
} from '@/__fixtures__/gameplay';
import {
  IGameSession,
  IGameplayUIState,
  DEFAULT_UI_STATE,
  IWeaponStatus,
  IPilotSpaSummary,
  GamePhase,
  GameStatus,
} from '@/types/gameplay';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';
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
  handleActionLogic,
  InteractivePhase,
  runAITurnLogic,
  advanceInteractivePhaseLogic,
  handleInteractiveTokenClickLogic,
  skipPhaseLogic,
} from './useGameplayStore.helpers';

export { InteractivePhase };
export type { IPlannedMovement, IAttackPlan };

export interface SpectatorMode {
  enabled: boolean;
  playing: boolean;
  speed: 1 | 2 | 4;
}

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

  loadSession: async (sessionId: string) => {
    // If session is already loaded (e.g. from setSession via auto-resolve), skip
    const existing = get().session;
    if (existing && existing.id === sessionId) {
      set({ isLoading: false, error: null });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      if (sessionId === 'demo') {
        get().createDemoSession();
      } else {
        throw new Error('Session not found');
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load session',
        isLoading: false,
      });
    }
  },

  createDemoSession: () => {
    const session = createDemoSession();
    set({
      session,
      unitWeapons: createDemoWeapons(),
      maxArmor: createDemoMaxArmor(),
      maxStructure: createDemoMaxStructure(),
      pilotNames: createDemoPilotNames(),
      heatSinks: createDemoHeatSinks(),
      unitSpas: createDemoUnitSpas(),
      isLoading: false,
      error: null,
    });
  },

  setSession: (session: IGameSession) => {
    set({
      session,
      isLoading: false,
      error: null,
    });
  },

  setInteractiveSession: (interactiveSession: InteractiveSession) => {
    const session = interactiveSession.getSession();
    const phase = session.currentState.phase;

    let interactivePhase = InteractivePhase.SelectUnit;
    if (phase === GamePhase.Initiative)
      interactivePhase = InteractivePhase.SelectUnit;

    set({
      session,
      interactiveSession,
      interactivePhase,
      spectatorMode: null,
      isLoading: false,
      error: null,
    });
  },

  setSpectatorMode: (
    interactiveSession: InteractiveSession,
    spectatorMode: SpectatorMode,
  ) => {
    const session = interactiveSession.getSession();

    set({
      session,
      interactiveSession,
      interactivePhase: InteractivePhase.AITurn,
      spectatorMode,
      isLoading: false,
      error: null,
    });
  },

  selectUnit: (unitId: string | null) => {
    set((state) => ({
      ui: { ...state.ui, selectedUnitId: unitId },
    }));
  },

  setTarget: (unitId: string | null) => {
    set((state) => ({
      ui: { ...state.ui, targetUnitId: unitId },
    }));
  },

  handleAction: (actionId: string) => {
    const { session, ui } = get();
    handleActionLogic(actionId, session, ui, set);
  },

  selectUnitForMovement: (unitId: string) => {
    const { interactiveSession } = get();
    if (!interactiveSession) return;

    const actions = interactiveSession.getAvailableActions(unitId);

    set((state) => ({
      ui: { ...state.ui, selectedUnitId: unitId },
      interactivePhase: InteractivePhase.SelectMovement,
      validMovementHexes: actions.validMoves,
    }));
  },

  moveUnit: (unitId: string, targetHex: { q: number; r: number }) => {
    const { interactiveSession } = get();
    if (!interactiveSession) return;

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
  },

  selectWeapon: (weaponId: string) => {
    set((state) => {
      const current = state.ui.queuedWeaponIds;
      const newQueued = current.includes(weaponId)
        ? current.filter((id) => id !== weaponId)
        : [...current, weaponId];
      return {
        ui: { ...state.ui, queuedWeaponIds: newQueued },
      };
    });
  },

  selectAttackTarget: (targetUnitId: string) => {
    const { interactiveSession, ui } = get();
    if (!interactiveSession || !ui.selectedUnitId) return;

    const attackerState =
      interactiveSession.getState().units[ui.selectedUnitId];
    const targetState = interactiveSession.getState().units[targetUnitId];
    if (!attackerState || !targetState) return;

    const hitChance = 58; // Base hit chance (gunnery 4 = 58% on 2d6)

    // Per `add-combat-phase-ui-flows`: also seed the structured
    // `attackPlan.targetUnitId` so the new WeaponSelector and
    // ToHitForecastModal can read a single source of truth instead of
    // dual-tracking with the legacy `ui.targetUnitId` field.
    set((state) => ({
      ui: { ...state.ui, targetUnitId: targetUnitId },
      attackPlan: { ...state.attackPlan, targetUnitId },
      interactivePhase: InteractivePhase.SelectWeapons,
      hitChance,
    }));
  },

  fireWeapons: () => {
    const { interactiveSession, ui } = get();
    if (!interactiveSession || !ui.selectedUnitId || !ui.targetUnitId) return;

    const weaponIds =
      ui.queuedWeaponIds.length > 0 ? ui.queuedWeaponIds : ['medium-laser'];

    interactiveSession.applyAttack(
      ui.selectedUnitId,
      ui.targetUnitId,
      weaponIds,
    );

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
  },

  runAITurn: () => {
    const { interactiveSession } = get();
    runAITurnLogic(interactiveSession, set);
  },

  advanceInteractivePhase: () => {
    const { interactiveSession } = get();
    advanceInteractivePhaseLogic(interactiveSession, get, set);
  },

  handleInteractiveHexClick: (hex: { q: number; r: number }) => {
    const { interactivePhase, ui, interactiveSession, session, attackPlan } =
      get();
    if (!interactiveSession) return;

    if (
      interactivePhase === InteractivePhase.SelectMovement &&
      ui.selectedUnitId
    ) {
      get().moveUnit(ui.selectedUnitId, hex);
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
      const occupyingUnit = Object.values(session.currentState.units).find(
        (u) => u.position.q === hex.q && u.position.r === hex.r,
      );
      if (!occupyingUnit) {
        get().clearAttackPlan();
        set({ interactivePhase: InteractivePhase.SelectTarget });
        return;
      }
    }

    // Per `add-interactive-combat-core-ui` § 2 Scenario 2: when the
    // player clicks an empty hex during the default SelectUnit phase,
    // the current unit selection is cleared (the action panel then
    // shows the "Select a unit to view its status" placeholder). We
    // detect "empty" by checking the live `currentState.units` for any
    // unit whose position matches the clicked hex — matches the same
    // source of truth the hex map uses to render tokens.
    if (interactivePhase === InteractivePhase.SelectUnit && session) {
      const occupyingUnit = Object.values(session.currentState.units).find(
        (u) => u.position.q === hex.q && u.position.r === hex.r,
      );
      if (!occupyingUnit) {
        set((state) => ({
          ui: { ...state.ui, selectedUnitId: null },
        }));
      }
    }
  },

  handleInteractiveTokenClick: (unitId: string) => {
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

  toggleWeapon: (weaponId: string) => {
    set((state) => {
      const current = state.ui.queuedWeaponIds;
      const newQueued = current.includes(weaponId)
        ? current.filter((id) => id !== weaponId)
        : [...current, weaponId];
      return {
        ui: { ...state.ui, queuedWeaponIds: newQueued },
      };
    });
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set(initialState);
  },

  // Per `add-combat-phase-ui-flows`: planning flows live in
  // `useGameplayStore.combatFlows.ts` to keep this file under the
  // per-file line budget. Each store action is a thin pass-through.
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

/**
 * Per `add-interactive-combat-core-ui` task 2.4: derived selector that
 * projects the currently selected unit's full record (config-side
 * `IGameUnit` + live `IUnitGameState`) so consumers don't need to
 * re-derive by id from `currentState.units` + `session.units` on every
 * render.
 *
 * Returns `null` when no unit is selected, the session is missing, or
 * the selected id no longer exists (e.g., unit destroyed and removed
 * from state).
 */
export interface ISelectedUnitProjection {
  readonly id: string;
  readonly unit: import('@/types/gameplay').IGameUnit;
  readonly state: import('@/types/gameplay').IUnitGameState;
}

/**
 * Implementation note: this hook returns a fresh object each call,
 * which would cause an infinite render loop with Zustand's default
 * reference-equality selector. We sidestep that by selecting the three
 * primitives (id / session / units record) separately and combining
 * them via `useMemo` — each primitive read uses Zustand's own
 * shallow-equality so re-renders only fire when the specific input
 * changes.
 */
export function useSelectedUnit(): ISelectedUnitProjection | null {
  const id = useGameplayStore((s) => s.ui.selectedUnitId);
  const session = useGameplayStore((s) => s.session);

  if (!id || !session) return null;
  const unit = session.units.find((u) => u.id === id);
  const state = session.currentState.units[id];
  if (!unit || !state) return null;
  return { id, unit, state };
}

// ---------------------------------------------------------------------------
// Game-completion selector (add-victory-and-post-battle-summary D7)
// ---------------------------------------------------------------------------

/**
 * Per `add-victory-and-post-battle-summary` design D7 + spec
 * `game-session-management` "Game Completed Store Projection": the
 * combat page reads this selector to decide when to redirect to the
 * victory screen. Centralized here so the redirect logic in
 * `/gameplay/games/[id]` is one line and the selector itself is
 * unit-testable in isolation. Returns `true` exactly when the
 * session's `currentState.status === GameStatus.Completed`.
 *
 * Selector form is a function that takes the entire store state and
 * returns the boolean — usable directly via
 * `useGameplayStore(selectIsGameCompleted)` in components.
 */
export const selectIsGameCompleted = (state: {
  session: IGameSession | null;
}): boolean => state.session?.currentState.status === GameStatus.Completed;

/**
 * Hook form of `selectIsGameCompleted` for components that prefer
 * the named-hook idiom over passing the selector directly.
 */
export function useIsGameCompleted(): boolean {
  return useGameplayStore(selectIsGameCompleted);
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
