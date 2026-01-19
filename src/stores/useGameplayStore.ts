/**
 * Gameplay Store
 * Zustand store for game session state management.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import { create } from 'zustand';
import {
  IGameSession,
  IGameState,
  IGameEvent,
  GamePhase,
  GameStatus,
  GameSide,
  GameEventType,
  LockState,
  IGameplayUIState,
  DEFAULT_UI_STATE,
  IWeaponStatus,
  Facing,
  MovementType,
  ITurnStartedPayload,
} from '@/types/gameplay';

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
// Demo Session Factory
// =============================================================================

function createDemoSession(): IGameSession {
  const now = new Date().toISOString();
  const gameId = 'demo-game-001';

  // Create demo units
  const playerUnit = {
    id: 'unit-player-1',
    name: 'Atlas AS7-D',
    side: GameSide.Player,
    unitRef: 'AS7-D',
    pilotRef: 'pilot-1',
    gunnery: 4,
    piloting: 5,
  };

  const opponentUnit = {
    id: 'unit-opponent-1',
    name: 'Hunchback HBK-4G',
    side: GameSide.Opponent,
    unitRef: 'HBK-4G',
    pilotRef: 'pilot-2',
    gunnery: 4,
    piloting: 5,
  };

  // Create demo unit states
  const playerUnitState = {
    id: playerUnit.id,
    side: GameSide.Player,
    position: { q: -2, r: 0 },
    facing: Facing.Northeast,
    heat: 5,
    movementThisTurn: MovementType.Walk,
    hexesMovedThisTurn: 3,
    armor: {
      head: 9,
      center_torso: 40,
      center_torso_rear: 12,
      left_torso: 28,
      left_torso_rear: 8,
      right_torso: 28,
      right_torso_rear: 8,
      left_arm: 24,
      right_arm: 24,
      left_leg: 31,
      right_leg: 31,
    },
    structure: {
      head: 3,
      center_torso: 31,
      left_torso: 21,
      right_torso: 21,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    destroyedLocations: [] as string[],
    destroyedEquipment: [] as string[],
    ammo: {
      'ac20-ammo': 10,
      'lrm20-ammo': 12,
      'srm6-ammo': 15,
    },
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
  };

  const opponentUnitState = {
    id: opponentUnit.id,
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.Southwest,
    heat: 8,
    movementThisTurn: MovementType.Walk,
    hexesMovedThisTurn: 4,
    armor: {
      head: 8,
      center_torso: 22,
      center_torso_rear: 8,
      left_torso: 18,
      left_torso_rear: 6,
      right_torso: 18,
      right_torso_rear: 6,
      left_arm: 12,
      right_arm: 12,
      left_leg: 20,
      right_leg: 20,
    },
    structure: {
      head: 3,
      center_torso: 16,
      left_torso: 12,
      right_torso: 12,
      left_arm: 8,
      right_arm: 8,
      left_leg: 12,
      right_leg: 12,
    },
    destroyedLocations: [] as string[],
    destroyedEquipment: [] as string[],
    ammo: {
      'ac20-ammo': 5,
      'ml-ammo': 0,
    },
    pilotWounds: 1,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
  };

  // Create game state
  const gameState: IGameState = {
    gameId,
    status: GameStatus.Active,
    turn: 3,
    phase: GamePhase.WeaponAttack,
    initiativeWinner: GameSide.Player,
    firstMover: GameSide.Player,
    activationIndex: 0,
    units: {
      [playerUnit.id]: playerUnitState,
      [opponentUnit.id]: opponentUnitState,
    },
    turnEvents: [],
  };

  // Create demo events
  const events: IGameEvent[] = [
    {
      id: 'evt-1',
      gameId,
      sequence: 1,
      timestamp: now,
      type: GameEventType.TurnStarted,
      turn: 3,
      phase: GamePhase.Initiative,
      payload: {} as ITurnStartedPayload,
    },
    {
      id: 'evt-2',
      gameId,
      sequence: 2,
      timestamp: now,
      type: GameEventType.PhaseChanged,
      turn: 3,
      phase: GamePhase.Movement,
      payload: {
        fromPhase: GamePhase.Initiative,
        toPhase: GamePhase.Movement,
      },
    },
  ];

  return {
    id: gameId,
    createdAt: now,
    updatedAt: now,
    config: {
      mapRadius: 5,
      turnLimit: 0,
      victoryConditions: ['destroy_all'],
      optionalRules: [],
    },
    units: [playerUnit, opponentUnit],
    events,
    currentState: gameState,
  };
}

function createDemoWeapons(): Record<string, readonly IWeaponStatus[]> {
  return {
    'unit-player-1': [
      {
        id: 'weapon-1',
        name: 'AC/20',
        location: 'right_torso',
        destroyed: false,
        firedThisTurn: false,
        ammoRemaining: 10,
        heat: 7,
        damage: 20,
        ranges: { short: 3, medium: 6, long: 9 },
      },
      {
        id: 'weapon-2',
        name: 'LRM 20',
        location: 'left_torso',
        destroyed: false,
        firedThisTurn: false,
        ammoRemaining: 12,
        heat: 6,
        damage: '1/missile',
        ranges: { short: 7, medium: 14, long: 21, minimum: 6 },
      },
      {
        id: 'weapon-3',
        name: 'Medium Laser',
        location: 'center_torso',
        destroyed: false,
        firedThisTurn: false,
        heat: 3,
        damage: 5,
        ranges: { short: 3, medium: 6, long: 9 },
      },
      {
        id: 'weapon-4',
        name: 'SRM 6',
        location: 'left_torso',
        destroyed: false,
        firedThisTurn: false,
        ammoRemaining: 15,
        heat: 4,
        damage: '2/missile',
        ranges: { short: 3, medium: 6, long: 9 },
      },
    ],
    'unit-opponent-1': [
      {
        id: 'weapon-5',
        name: 'AC/20',
        location: 'right_torso',
        destroyed: false,
        firedThisTurn: false,
        ammoRemaining: 5,
        heat: 7,
        damage: 20,
        ranges: { short: 3, medium: 6, long: 9 },
      },
      {
        id: 'weapon-6',
        name: 'Medium Laser',
        location: 'head',
        destroyed: false,
        firedThisTurn: false,
        heat: 3,
        damage: 5,
        ranges: { short: 3, medium: 6, long: 9 },
      },
      {
        id: 'weapon-7',
        name: 'Small Laser',
        location: 'head',
        destroyed: false,
        firedThisTurn: false,
        heat: 1,
        damage: 3,
        ranges: { short: 1, medium: 2, long: 3 },
      },
    ],
  };
}

function createDemoMaxArmor(): Record<string, Record<string, number>> {
  return {
    'unit-player-1': {
      head: 9,
      center_torso: 47,
      center_torso_rear: 14,
      left_torso: 32,
      left_torso_rear: 10,
      right_torso: 32,
      right_torso_rear: 10,
      left_arm: 34,
      right_arm: 34,
      left_leg: 41,
      right_leg: 41,
    },
    'unit-opponent-1': {
      head: 9,
      center_torso: 24,
      center_torso_rear: 8,
      left_torso: 18,
      left_torso_rear: 6,
      right_torso: 18,
      right_torso_rear: 6,
      left_arm: 12,
      right_arm: 12,
      left_leg: 20,
      right_leg: 20,
    },
  };
}

function createDemoMaxStructure(): Record<string, Record<string, number>> {
  return {
    'unit-player-1': {
      head: 3,
      center_torso: 31,
      left_torso: 21,
      right_torso: 21,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    'unit-opponent-1': {
      head: 3,
      center_torso: 16,
      left_torso: 12,
      right_torso: 12,
      left_arm: 8,
      right_arm: 8,
      left_leg: 12,
      right_leg: 12,
    },
  };
}

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
      pilotNames: {
        'unit-player-1': 'Captain Marcus Chen',
        'unit-opponent-1': 'Lieutenant Sarah Walsh',
      },
      heatSinks: {
        'unit-player-1': 20,
        'unit-opponent-1': 10,
      },
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
