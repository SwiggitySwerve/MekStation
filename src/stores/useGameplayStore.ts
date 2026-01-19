/**
 * Gameplay Store
 * Zustand store for game session state management.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import { create } from 'zustand';
import {
  IGameSession,
  IGameplayUIState,
  DEFAULT_UI_STATE,
  IWeaponStatus,
} from '@/types/gameplay';
import {
  createDemoSession,
  createDemoWeapons,
  createDemoMaxArmor,
  createDemoMaxStructure,
  createDemoPilotNames,
  createDemoHeatSinks,
} from '@/__fixtures__/gameplay';

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
    const { session } = get();
    if (!session) return;

    switch (actionId) {
      case 'lock':
        // Lock current action (movement or attacks)
        console.log('Locking action for phase:', session.currentState.phase);
        break;
      case 'undo':
        console.log('Undoing last action');
        break;
      case 'skip':
        console.log('Skipping phase');
        break;
      case 'clear':
        set((state) => ({
          ui: { ...state.ui, queuedWeaponIds: [] },
        }));
        break;
      case 'next-turn':
        console.log('Starting next turn');
        break;
      case 'concede':
        console.log('Conceding game');
        break;
      default:
        console.log('Unknown action:', actionId);
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
