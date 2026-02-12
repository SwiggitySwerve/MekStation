/**
 * Gameplay Store
 * Zustand store for game session state management.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import { create } from 'zustand';

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
// Types
// =============================================================================

interface GameplayState {
  /** Current game session */
  session: IGameSession | null;
  /** UI state */
  ui: IGameplayUIState;
  /** Is loading */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Unit weapons lookup */
  unitWeapons: Record<string, readonly IWeaponStatus[]>;
  /** Max armor values lookup */
  maxArmor: Record<string, Record<string, number>>;
  /** Max structure values lookup */
  maxStructure: Record<string, Record<string, number>>;
  /** Pilot names lookup */
  pilotNames: Record<string, string>;
  /** Heat sinks lookup */
  heatSinks: Record<string, number>;
}

interface GameplayActions {
  /** Load a game session */
  loadSession: (sessionId: string) => Promise<void>;
  /** Create a demo session for testing */
  createDemoSession: () => void;
  /** Set a completed game session (e.g. from GameEngine auto-resolve) */
  setSession: (session: IGameSession) => void;
  /** Select a unit */
  selectUnit: (unitId: string | null) => void;
  /** Set target unit */
  setTarget: (unitId: string | null) => void;
  /** Handle action from action bar */
  handleAction: (actionId: string) => void;
  /** Toggle weapon selection */
  toggleWeapon: (weaponId: string) => void;
  /** Clear error */
  clearError: () => void;
  /** Reset store */
  reset: () => void;
}

type GameplayStore = GameplayState & GameplayActions;

// =============================================================================
// Initial State
// =============================================================================

const initialState: GameplayState = {
  session: null,
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
    set({ isLoading: true, error: null });
    try {
      // TODO: Load from API
      // For now, create demo session if requested
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
