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
  GameSide,
} from '@/types/gameplay';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';
import {
  lockMovement,
  advancePhase,
  canAdvancePhase,
  rollInitiative,
  endGame,
  replayToSequence,
} from '@/utils/gameplay/gameSession';
import { logger } from '@/utils/logger';

// =============================================================================
// Interactive Mode Phases
// =============================================================================

export enum InteractivePhase {
  None = 'none',
  SelectUnit = 'select_unit',
  SelectMovement = 'select_movement',
  SelectTarget = 'select_target',
  SelectWeapons = 'select_weapons',
  AITurn = 'ai_turn',
  GameOver = 'game_over',
}

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
      // TODO: Load from API
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
    if (!session) return;

    const { phase } = session.currentState;

    switch (actionId) {
      case 'lock': {
        // Lock current action for selected unit
        const unitId = ui.selectedUnitId;
        if (!unitId) return;

        if (phase === GamePhase.Movement) {
          const updatedSession = lockMovement(session, unitId);
          set({ session: updatedSession });
        }
        // TODO: Add lockAttacks when combat phase is active
        break;
      }
      case 'undo': {
        // Replay to previous event (remove last event)
        if (session.events.length <= 1) return; // Keep at least the created event
        const previousSequence = session.events.length - 2;
        const replayedState = replayToSequence(session, previousSequence);
        const updatedSession: IGameSession = {
          ...session,
          events: session.events.slice(0, -1),
          currentState: replayedState,
          updatedAt: new Date().toISOString(),
        };
        set({ session: updatedSession });
        break;
      }
      case 'skip': {
        // Advance to next phase
        if (canAdvancePhase(session)) {
          const updatedSession = advancePhase(session);
          set({ session: updatedSession });
        }
        break;
      }
      case 'clear':
        set((state) => ({
          ui: { ...state.ui, queuedWeaponIds: [] },
        }));
        break;
      case 'next-turn': {
        // Roll initiative and advance to next turn
        if (phase === GamePhase.End || phase === GamePhase.Initiative) {
          let updatedSession = session;
          // If at end phase, advance to initiative first
          if (phase === GamePhase.End) {
            updatedSession = advancePhase(updatedSession);
          }
          // Roll initiative
          updatedSession = rollInitiative(updatedSession);
          // Advance to movement phase
          updatedSession = advancePhase(updatedSession);
          set({ session: updatedSession });
        }
        break;
      }
      case 'concede': {
        // End game with concession
        const updatedSession = endGame(session, GameSide.Opponent, 'concede');
        set({ session: updatedSession });
        break;
      }
      default:
        logger.warn('Unknown action:', actionId);
    }
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
    if (!interactiveSession) return;

    set({ interactivePhase: InteractivePhase.AITurn });

    const state = interactiveSession.getState();

    if (state.phase === GamePhase.Movement) {
      interactiveSession.runAITurn(GameSide.Opponent);
      interactiveSession.advancePhase(); // → WeaponAttack
    }

    if (interactiveSession.getState().phase === GamePhase.WeaponAttack) {
      interactiveSession.runAITurn(GameSide.Opponent);
      interactiveSession.advancePhase(); // → Heat
    }

    if (interactiveSession.getState().phase === GamePhase.Heat) {
      interactiveSession.advancePhase(); // → End
    }

    if (interactiveSession.getState().phase === GamePhase.End) {
      interactiveSession.advancePhase(); // → Initiative (next turn)
    }

    const gameOver = interactiveSession.isGameOver();

    set({
      session: interactiveSession.getSession(),
      interactivePhase: gameOver
        ? InteractivePhase.GameOver
        : InteractivePhase.SelectUnit,
    });
  },

  advanceInteractivePhase: () => {
    const { interactiveSession, session } = get();
    if (!interactiveSession || !session) return;

    const { phase } = interactiveSession.getState();

    if (phase === GamePhase.Initiative) {
      interactiveSession.advancePhase(); // rolls initiative, goes to Movement
    } else if (phase === GamePhase.Movement) {
      interactiveSession.advancePhase(); // → WeaponAttack
    } else if (phase === GamePhase.WeaponAttack) {
      interactiveSession.advancePhase(); // resolves attacks → Heat
    } else if (phase === GamePhase.Heat) {
      interactiveSession.advancePhase(); // → End
    } else if (phase === GamePhase.End) {
      interactiveSession.advancePhase(); // → Initiative (next turn)
    }

    const gameOver = interactiveSession.isGameOver();

    set({
      session: interactiveSession.getSession(),
      interactivePhase: gameOver
        ? InteractivePhase.GameOver
        : InteractivePhase.SelectUnit,
      validMovementHexes: [],
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
    if (!interactiveSession) return;

    const state = interactiveSession.getState();
    const unit = state.units[unitId];
    if (!unit || unit.destroyed) return;

    const { phase } = state;
    const currentInteractivePhase = interactivePhase as InteractivePhase;

    if (phase === GamePhase.Movement && unit.side === GameSide.Player) {
      get().selectUnitForMovement(unitId);
    } else if (phase === GamePhase.WeaponAttack) {
      if (
        unit.side === GameSide.Player &&
        currentInteractivePhase === InteractivePhase.SelectUnit
      ) {
        set((s) => ({
          ui: { ...s.ui, selectedUnitId: unitId },
          interactivePhase: InteractivePhase.SelectTarget,
          validTargetIds: Object.entries(state.units)
            .filter(([, u]) => u.side === GameSide.Opponent && !u.destroyed)
            .map(([id]) => id),
        }));
      } else if (
        unit.side === GameSide.Opponent &&
        currentInteractivePhase === InteractivePhase.SelectTarget
      ) {
        get().selectAttackTarget(unitId);
      }
    } else if (
      unit.side === GameSide.Player &&
      currentInteractivePhase === InteractivePhase.SelectUnit
    ) {
      get().selectUnitForMovement(unitId);
    }
  },

  skipPhase: () => {
    const { interactiveSession } = get();
    if (!interactiveSession) return;

    interactiveSession.advancePhase();

    const gameOver = interactiveSession.isGameOver();

    set({
      session: interactiveSession.getSession(),
      interactivePhase: gameOver
        ? InteractivePhase.GameOver
        : InteractivePhase.SelectUnit,
      validMovementHexes: [],
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
