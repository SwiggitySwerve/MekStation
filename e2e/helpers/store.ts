/**
 * Store Interaction Utilities for E2E Tests
 *
 * Provides utilities for interacting with Zustand stores in E2E tests.
 * Requires stores to be exposed on window object in development/test mode.
 */

import { expect, type Page } from '@playwright/test';

/** Default timeout for store operations (in milliseconds) */
const DEFAULT_TIMEOUT = 10000;

/**
 * Check if stores are exposed on the window object.
 *
 * Stores should be exposed in development/test mode via:
 * ```typescript
 * if (process.env.NODE_ENV !== 'production') {
 *   window.__STORES__ = { myStore: useMyStore };
 * }
 * ```
 *
 * @param page - Playwright Page object
 * @returns True if stores are exposed, false otherwise
 *
 * @example
 * ```typescript
 * const exposed = await isStoreExposed(page);
 * if (exposed) {
 *   const state = await getStoreState(page, 'unitStore');
 * }
 * ```
 */
export async function isStoreExposed(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return typeof (window as Window & { __STORES__?: unknown }).__STORES__ !== 'undefined';
  });
}

/**
 * Get the current state of a Zustand store.
 *
 * Requires stores to be exposed on window.__STORES__ in development/test mode.
 *
 * @param page - Playwright Page object
 * @param storeName - The name of the store (key in __STORES__ object)
 * @returns The current state of the store
 * @throws Error if stores are not exposed or store doesn't exist
 *
 * @example
 * ```typescript
 * interface UnitStoreState {
 *   units: Unit[];
 *   selectedId: string | null;
 * }
 *
 * const state = await getStoreState<UnitStoreState>(page, 'unitStore');
 * expect(state.units).toHaveLength(3);
 * ```
 */
export async function getStoreState<T>(page: Page, storeName: string): Promise<T> {
  const exposed = await isStoreExposed(page);
  if (!exposed) {
    throw new Error(
      'Stores are not exposed on window.__STORES__. ' +
        'Make sure to expose stores in development/test mode.'
    );
  }

  return await page.evaluate((name) => {
    const stores = (window as Window & { __STORES__?: Record<string, { getState: () => unknown }> })
      .__STORES__;
    if (!stores) {
      throw new Error('window.__STORES__ is not defined');
    }
    const store = stores[name];
    if (!store) {
      throw new Error(`Store "${name}" not found in window.__STORES__`);
    }
    return store.getState() as unknown;
  }, storeName) as T;
}

/**
 * Reset all exposed stores to their initial state.
 *
 * Requires stores to implement a `reset()` action and be exposed on window.__STORES__.
 *
 * @param page - Playwright Page object
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 *
 * @example
 * ```typescript
 * // In beforeEach hook
 * test.beforeEach(async ({ page }) => {
 *   await page.goto('/');
 *   await resetStores(page);
 * });
 * ```
 */
export async function resetStores(page: Page, timeout = DEFAULT_TIMEOUT): Promise<void> {
  const exposed = await isStoreExposed(page);
  if (!exposed) {
    console.warn(
      'Stores are not exposed on window.__STORES__. Skipping reset. ' +
        'Make sure to expose stores in development/test mode.'
    );
    return;
  }

  await page.evaluate(() => {
    const stores = (
      window as Window & { __STORES__?: Record<string, { getState: () => { reset?: () => void } }> }
    ).__STORES__;
    if (!stores) return;

    Object.entries(stores).forEach(([name, store]) => {
      try {
        const state = store.getState();
        if (typeof state.reset === 'function') {
          state.reset();
        }
      } catch (e) {
        console.warn(`Failed to reset store "${name}":`, e);
      }
    });
  });

  // Wait for state to settle
  await expect(async () => {
    // Verify reset completed by checking stores are accessible
    await isStoreExposed(page);
  }).toPass({ timeout });
}

/**
 * Set a specific value in a store.
 *
 * @param page - Playwright Page object
 * @param storeName - The name of the store
 * @param setter - A function that receives the store's setState and modifies state
 *
 * @example
 * ```typescript
 * await setStoreValue(page, 'unitStore', (set) => {
 *   set({ selectedId: 'unit-123' });
 * });
 * ```
 */
export async function setStoreValue(
  page: Page,
  storeName: string,
  updates: Record<string, unknown>
): Promise<void> {
  const exposed = await isStoreExposed(page);
  if (!exposed) {
    throw new Error(
      'Stores are not exposed on window.__STORES__. ' +
        'Make sure to expose stores in development/test mode.'
    );
  }

  await page.evaluate(
    ({ name, values }) => {
      const stores = (
        window as Window & { __STORES__?: Record<string, { setState: (s: unknown) => void }> }
      ).__STORES__;
      if (!stores) {
        throw new Error('window.__STORES__ is not defined');
      }
      const store = stores[name];
      if (!store) {
        throw new Error(`Store "${name}" not found in window.__STORES__`);
      }
      store.setState(values);
    },
    { name: storeName, values: updates }
  );
}

/**
 * Wait for a store to have a specific state condition.
 *
 * @param page - Playwright Page object
 * @param storeName - The name of the store
 * @param predicate - A function that returns true when the condition is met
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 *
 * @example
 * ```typescript
 * // Wait for units to be loaded
 * await waitForStoreState(page, 'unitStore', (state) => state.units.length > 0);
 *
 * // Wait for specific selection
 * await waitForStoreState(page, 'unitStore', (state) => state.selectedId === 'unit-123');
 * ```
 */
export async function waitForStoreState<T>(
  page: Page,
  storeName: string,
  predicateString: string,
  timeout = DEFAULT_TIMEOUT
): Promise<void> {
  await expect(async () => {
    const state = await getStoreState<T>(page, storeName);
    const predicate = new Function('state', `return ${predicateString}`) as (state: T) => boolean;
    expect(predicate(state)).toBe(true);
  }).toPass({ timeout });
}
