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
  timeout: number = 10000
): Promise<void> {
  await page.waitForFunction(
    () => {
      const stores = (window as unknown as {
        __ZUSTAND_STORES__?: {
          gameplay?: {
            getState: () => { isLoading: boolean; session: unknown | null };
          };
        };
      }).__ZUSTAND_STORES__;
      if (!stores?.gameplay) return false;
      const state = stores.gameplay.getState();
      return !state.isLoading && state.session !== null;
    },
    { timeout }
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
        'Gameplay store not exposed. Ensure window.__ZUSTAND_STORES__.gameplay is set in your app for E2E testing.'
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
  page: Page
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
  page: Page
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
  unitId: string | null
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
  unitId: string | null
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
  actionId: string
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
  weaponId: string
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
  },
  OPPONENT: {
    id: 'unit-opponent-1',
    name: 'Hunchback HBK-4G',
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
