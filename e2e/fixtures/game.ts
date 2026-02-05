import { Page } from '@playwright/test';

/**
 * Game phase enum values (mirrors GamePhase from types)
 */
export type GamePhase =
  | 'initiative'
  | 'movement'
  | 'weapon_attack'
  | 'physical_attack'
  | 'heat'
  | 'end';

/**
 * Game status enum values
 */
export type GameStatus = 'setup' | 'active' | 'completed' | 'abandoned';

/**
 * Game side enum values
 */
export type GameSide = 'player' | 'opponent';

/**
 * Unit game state interface (simplified for E2E)
 */
export interface E2EUnitGameState {
  id: string;
  side: GameSide;
  position: { q: number; r: number };
  facing: number;
  heat: number;
  destroyed: boolean;
  pilotWounds: number;
}

/**
 * Game session interface (simplified for E2E)
 */
export interface E2EGameSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  config: {
    mapRadius: number;
    turnLimit: number;
  };
  units: Array<{
    id: string;
    name: string;
    side: GameSide;
    gunnery: number;
    piloting: number;
  }>;
  currentState: {
    gameId: string;
    status: GameStatus;
    turn: number;
    phase: GamePhase;
    initiativeWinner?: GameSide;
    firstMover?: GameSide;
    units: Record<string, E2EUnitGameState>;
    result?: {
      winner: GameSide | 'draw';
      reason: string;
    };
  };
}

/**
 * Gameplay store state interface (simplified for E2E)
 */
export interface E2EGameplayState {
  session: E2EGameSession | null;
  ui: {
    selectedUnitId: string | null;
    targetUnitId: string | null;
    queuedWeaponIds: string[];
    showMovementOverlay: boolean;
    showAttackOverlay: boolean;
  };
  isLoading: boolean;
  error: string | null;
}

/**
 * Waits for the gameplay store to be ready (not loading).
 *
 * @param page - Playwright page object
 * @param timeout - Max wait time in ms (default 10000)
 */
export async function waitForGameplayStoreReady(
  page: Page,
  timeout: number = 10000,
): Promise<void> {
  await page.waitForFunction(
    () => {
      const stores = (
        window as unknown as {
          __ZUSTAND_STORES__?: {
            gameplay?: {
              getState: () => { isLoading: boolean; session: unknown | null };
            };
          };
        }
      ).__ZUSTAND_STORES__;
      if (!stores?.gameplay) return false;
      const state = stores.gameplay.getState();
      return !state.isLoading && state.session !== null;
    },
    { timeout },
  );
}

/**
 * Creates a demo game session via the gameplay store.
 * This loads the built-in demo session (Atlas vs Hunchback).
 *
 * @param page - Playwright page object
 * @throws Error if gameplay store is not exposed
 *
 * @example
 * ```typescript
 * await page.goto('/gameplay/games/demo');
 * await createDemoSession(page);
 * ```
 */
export async function createDemoSession(page: Page): Promise<void> {
  await page.evaluate(() => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          gameplay?: {
            getState: () => {
              createDemoSession: () => void;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.gameplay) {
      throw new Error(
        'Gameplay store not exposed. Ensure window.__ZUSTAND_STORES__.gameplay is set in your app for E2E testing.',
      );
    }

    stores.gameplay.getState().createDemoSession();
  });
}

/**
 * Gets the current game session from the store.
 *
 * @param page - Playwright page object
 * @returns The current game session or null
 */
export async function getGameSession(
  page: Page,
): Promise<E2EGameSession | null> {
  return page.evaluate(() => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          gameplay?: {
            getState: () => { session: E2EGameSession | null };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.gameplay) {
      throw new Error('Gameplay store not exposed');
    }

    return stores.gameplay.getState().session;
  });
}

/**
 * Gets the current gameplay state (session + UI).
 *
 * @param page - Playwright page object
 * @returns The current gameplay state
 */
export async function getGameplayState(
  page: Page,
): Promise<E2EGameplayState | null> {
  return page.evaluate(() => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          gameplay?: {
            getState: () => E2EGameplayState;
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.gameplay) {
      throw new Error('Gameplay store not exposed');
    }

    const state = stores.gameplay.getState();
    return {
      session: state.session,
      ui: state.ui,
      isLoading: state.isLoading,
      error: state.error,
    };
  });
}

/**
 * Selects a unit in the game.
 *
 * @param page - Playwright page object
 * @param unitId - The unit ID to select (or null to deselect)
 */
export async function selectUnit(
  page: Page,
  unitId: string | null,
): Promise<void> {
  await page.evaluate((id) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          gameplay?: {
            getState: () => {
              selectUnit: (id: string | null) => void;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.gameplay) {
      throw new Error('Gameplay store not exposed');
    }

    stores.gameplay.getState().selectUnit(id);
  }, unitId);
}

/**
 * Sets the target unit for attacks.
 *
 * @param page - Playwright page object
 * @param unitId - The target unit ID (or null to clear)
 */
export async function setTarget(
  page: Page,
  unitId: string | null,
): Promise<void> {
  await page.evaluate((id) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          gameplay?: {
            getState: () => {
              setTarget: (id: string | null) => void;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.gameplay) {
      throw new Error('Gameplay store not exposed');
    }

    stores.gameplay.getState().setTarget(id);
  }, unitId);
}

/**
 * Triggers an action from the action bar.
 *
 * @param page - Playwright page object
 * @param actionId - Action ID: 'lock', 'undo', 'skip', 'next-turn', 'concede', 'clear'
 */
export async function handleAction(
  page: Page,
  actionId: string,
): Promise<void> {
  await page.evaluate((id) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          gameplay?: {
            getState: () => {
              handleAction: (id: string) => void;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.gameplay) {
      throw new Error('Gameplay store not exposed');
    }

    stores.gameplay.getState().handleAction(id);
  }, actionId);
}

/**
 * Toggles a weapon in the queued weapons list.
 *
 * @param page - Playwright page object
 * @param weaponId - The weapon ID to toggle
 */
export async function toggleWeapon(
  page: Page,
  weaponId: string,
): Promise<void> {
  await page.evaluate((id) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          gameplay?: {
            getState: () => {
              toggleWeapon: (id: string) => void;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.gameplay) {
      throw new Error('Gameplay store not exposed');
    }

    stores.gameplay.getState().toggleWeapon(id);
  }, weaponId);
}

/**
 * Resets the gameplay store to initial state.
 *
 * @param page - Playwright page object
 */
export async function resetGameplay(page: Page): Promise<void> {
  await page.evaluate(() => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          gameplay?: {
            getState: () => {
              reset: () => void;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.gameplay) {
      throw new Error('Gameplay store not exposed');
    }

    stores.gameplay.getState().reset();
  });
}

/**
 * Gets the currently selected unit ID.
 *
 * @param page - Playwright page object
 * @returns The selected unit ID or null
 */
export async function getSelectedUnitId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          gameplay?: {
            getState: () => {
              ui: { selectedUnitId: string | null };
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.gameplay) {
      throw new Error('Gameplay store not exposed');
    }

    return stores.gameplay.getState().ui.selectedUnitId;
  });
}

/**
 * Demo session constants for testing.
 * These match the values from src/__fixtures__/gameplay.ts
 */
export const DEMO_UNITS = {
  PLAYER: {
    id: 'unit-player-1',
    name: 'Atlas AS7-D',
    designation: 'AS7-D',
    pilotName: 'Captain Marcus Chen',
    gunnery: 4,
    piloting: 5,
    heatSinks: 20,
    initialHeat: 5,
    pilotWounds: 0,
  },
  OPPONENT: {
    id: 'unit-opponent-1',
    name: 'Hunchback HBK-4G',
    designation: 'HBK-4G',
    pilotName: 'Lieutenant Sarah Walsh',
    gunnery: 4,
    piloting: 5,
    heatSinks: 10,
    initialHeat: 8,
    pilotWounds: 1,
  },
} as const;

/**
 * Demo session initial state.
 * Turn 3, WeaponAttack phase, player has initiative.
 * Note: Session ID is 'demo-game-001', not 'demo'
 */
export const DEMO_INITIAL_STATE = {
  id: 'demo-game-001',
  turn: 3,
  phase: 'weapon_attack' as GamePhase,
  status: 'active' as GameStatus,
} as const;

/**
 * Available actions per phase for testing.
 * Based on getPhaseActions() in GameplayUIInterfaces.ts
 */
export const PHASE_ACTIONS = {
  movement: ['lock', 'undo', 'skip'],
  weapon_attack: ['lock', 'clear', 'skip'],
  heat: ['continue'],
  end: ['next-turn', 'concede'],
  initiative: [],
  physical_attack: [],
} as const;

// =============================================================================
// Combat UI Helper Functions
// =============================================================================

/**
 * Gets the unit game state for a specific unit from the store.
 *
 * @param page - Playwright page object
 * @param unitId - The unit ID to get state for
 * @returns The unit state or null if not found
 */
export async function getUnitState(
  page: Page,
  unitId: string,
): Promise<E2EUnitGameState | null> {
  return page.evaluate((id) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          gameplay?: {
            getState: () => {
              session: {
                currentState: {
                  units: Record<string, E2EUnitGameState>;
                };
              } | null;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.gameplay) {
      throw new Error('Gameplay store not exposed');
    }

    const state = stores.gameplay.getState();
    return state.session?.currentState.units[id] ?? null;
  }, unitId);
}

/**
 * Demo unit armor values - matches demoSession.ts
 */
export const DEMO_ARMOR = {
  'unit-player-1': {
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
  'unit-opponent-1': {
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
} as const;

/**
 * Demo unit max armor values - matches demoSession.ts
 */
export const DEMO_MAX_ARMOR = {
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
} as const;

/**
 * Demo unit structure values - matches demoSession.ts
 */
export const DEMO_STRUCTURE = {
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
} as const;

/**
 * Demo unit weapons - matches demoSession.ts
 */
export const DEMO_WEAPONS = {
  'unit-player-1': [
    { id: 'weapon-1', name: 'AC/20', heat: 7, damage: 20, ammo: 10 },
    { id: 'weapon-2', name: 'LRM 20', heat: 6, damage: '1/missile', ammo: 12 },
    { id: 'weapon-3', name: 'Medium Laser', heat: 3, damage: 5 },
    { id: 'weapon-4', name: 'SRM 6', heat: 4, damage: '2/missile', ammo: 15 },
  ],
  'unit-opponent-1': [
    { id: 'weapon-5', name: 'AC/20', heat: 7, damage: 20, ammo: 5 },
    { id: 'weapon-6', name: 'Medium Laser', heat: 3, damage: 5 },
    { id: 'weapon-7', name: 'Small Laser', heat: 1, damage: 3 },
  ],
} as const;
