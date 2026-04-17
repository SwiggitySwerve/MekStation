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
} from '@/__fixtures__/gameplay';
import {
  IGameSession,
  IGameplayUIState,
  DEFAULT_UI_STATE,
  IWeaponStatus,
  GamePhase,
} from '@/types/gameplay';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';
import { logger } from '@/utils/logger';

import {
  handleActionLogic,
  InteractivePhase,
  runAITurnLogic,
  advanceInteractivePhaseLogic,
  handleInteractiveTokenClickLogic,
  skipPhaseLogic,
} from './useGameplayStore.helpers';

export { InteractivePhase };

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

    set((state) => ({
      ui: { ...state.ui, targetUnitId: targetUnitId },
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
    const { interactivePhase, ui, interactiveSession } = get();
    if (!interactiveSession) return;

    if (
      interactivePhase === InteractivePhase.SelectMovement &&
      ui.selectedUnitId
    ) {
      get().moveUnit(ui.selectedUnitId, hex);
    }
  },

  handleInteractiveTokenClick: (unitId: string) => {
    const { interactivePhase, interactiveSession } = get();
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
