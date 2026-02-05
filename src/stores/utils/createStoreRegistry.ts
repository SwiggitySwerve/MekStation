/**
 * Store Registry Factory
 *
 * Creates type-safe store registries with common operations:
 * - get, has, getAll, count
 * - register, unregister, clear
 * - hydrateOrCreate (localStorage integration)
 * - delete (with localStorage cleanup)
 *
 * @example
 * ```typescript
 * const registry = createStoreRegistry<UnitStore, UnitState, CreateUnitOptions>({
 *   storageKeyPrefix: 'megamek-unit',
 *   registryName: 'UnitStoreRegistry',
 *   createStore: (state) => createUnitStore(state),
 *   createDefaultState: (options, id) => createDefaultUnitState({ ...options, id }),
 *   getIdFromState: (state) => state.id,
 * });
 * ```
 */

import { StoreApi } from 'zustand';

import { isValidUUID, generateUUID } from '@/utils/uuid';

// =============================================================================
// SSR-Safe Storage Helpers
// =============================================================================

/**
 * Safely get item from localStorage (returns null during SSR)
 */
function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

/**
 * Safely remove item from localStorage (no-op during SSR)
 */
function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

// =============================================================================
// Types
// =============================================================================

/**
 * Base state interface - all states must have an id
 */
export interface BaseStoreState {
  readonly id: string;
}

/**
 * Configuration for creating a store registry
 */
export interface StoreRegistryConfig<
  TStore extends BaseStoreState,
  TState extends BaseStoreState,
  TOptions,
> {
  /** Prefix for localStorage keys (e.g., 'megamek-unit') */
  readonly storageKeyPrefix: string;

  /** Name for logging (e.g., 'UnitStoreRegistry') */
  readonly registryName: string;

  /** Create a store from a full state object */
  readonly createStore: (state: TState) => StoreApi<TStore>;

  /** Create a new store with options (generates new ID internally) */
  readonly createNewStore: (options: TOptions) => StoreApi<TStore>;

  /** Create default state from options and a validated ID */
  readonly createDefaultState: (options: TOptions, id: string) => TState;

  /** Get the ID from a store's state */
  readonly getIdFromState: (state: TStore) => string;

  /** Optional: merge saved state with default state during hydration */
  readonly mergeState?: (
    defaultState: TState,
    savedState: Partial<TState>,
    id: string,
  ) => TState;
}

/**
 * Store registry interface
 */
export interface StoreRegistry<TStore extends BaseStoreState, TOptions> {
  /** Get a store by ID */
  get: (id: string) => StoreApi<TStore> | undefined;

  /** Check if a store exists */
  has: (id: string) => boolean;

  /** Get all store IDs */
  getAllIds: () => string[];

  /** Get store count */
  getCount: () => number;

  /** Register an existing store */
  register: (store: StoreApi<TStore>) => void;

  /** Create and register a new store */
  createAndRegister: (options: TOptions) => StoreApi<TStore>;

  /** Hydrate from localStorage or create new */
  hydrateOrCreate: (id: string, fallbackOptions: TOptions) => StoreApi<TStore>;

  /** Unregister a store (keeps localStorage) */
  unregister: (id: string) => boolean;

  /** Delete a store and its localStorage entry */
  delete: (id: string) => boolean;

  /** Clear all stores */
  clearAll: (clearStorage?: boolean) => void;

  /** Validate an ID, returning a valid UUID */
  ensureValidId: (id: string | undefined | null, context: string) => string;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a store registry with common operations
 */
export function createStoreRegistry<
  TStore extends BaseStoreState,
  TState extends BaseStoreState,
  TOptions,
>(
  config: StoreRegistryConfig<TStore, TState, TOptions>,
): StoreRegistry<TStore, TOptions> {
  const {
    storageKeyPrefix,
    registryName,
    createStore,
    createNewStore,
    createDefaultState,
    getIdFromState,
    mergeState,
  } = config;

  // Internal store map
  const stores = new Map<string, StoreApi<TStore>>();

  /**
   * Validate and potentially repair an ID
   */
  function ensureValidId(
    id: string | undefined | null,
    context: string,
  ): string {
    if (id && isValidUUID(id)) {
      return id;
    }

    const newId = generateUUID();
    console.warn(
      `[${registryName}] ${context}: Invalid ID "${id || '(missing)'}" replaced with "${newId}"`,
    );
    return newId;
  }

  /**
   * Get storage key for an ID
   */
  function getStorageKey(id: string): string {
    return `${storageKeyPrefix}-${id}`;
  }

  return {
    get: (id: string) => stores.get(id),

    has: (id: string) => stores.has(id),

    getAllIds: () => Array.from(stores.keys()),

    getCount: () => stores.size,

    register: (store: StoreApi<TStore>) => {
      const state = store.getState();
      const id = getIdFromState(state);
      stores.set(id, store);
    },

    createAndRegister: (options: TOptions) => {
      const store = createNewStore(options);
      const state = store.getState();
      const id = getIdFromState(state);
      stores.set(id, store);
      return store;
    },

    hydrateOrCreate: (id: string, fallbackOptions: TOptions) => {
      const validId = ensureValidId(id, 'hydrateOrCreate');

      // Check if already in registry
      const existing = stores.get(validId);
      if (existing) {
        return existing;
      }

      // Try to load from localStorage
      const storageKey = getStorageKey(validId);
      const savedState = safeGetItem(storageKey);

      if (savedState) {
        try {
          const parsed = JSON.parse(savedState) as { state?: Partial<TState> };
          const state = parsed.state;

          if (state) {
            // Validate the ID from localStorage as well
            ensureValidId(state.id, 'localStorage state');

            // Create store with saved state merged with defaults
            const defaultState = createDefaultState(fallbackOptions, validId);

            const finalState = mergeState
              ? mergeState(defaultState, state, validId)
              : ({
                  ...defaultState,
                  ...state,
                  id: validId,
                } as TState);

            const store = createStore(finalState);
            stores.set(validId, store);
            return store;
          }
        } catch (e) {
          console.warn(
            `Failed to hydrate ${registryName} ${validId}, creating new:`,
            e,
          );
        }
      }

      // Create new store with fallback options
      const store = createNewStore({
        ...fallbackOptions,
        id: validId,
      } as TOptions);
      stores.set(validId, store);
      return store;
    },

    unregister: (id: string) => stores.delete(id),

    delete: (id: string) => {
      const removed = stores.delete(id);
      if (removed) {
        safeRemoveItem(getStorageKey(id));
      }
      return removed;
    },

    clearAll: (clearStorage = false) => {
      if (clearStorage) {
        Array.from(stores.keys()).forEach((id) => {
          safeRemoveItem(getStorageKey(id));
        });
      }
      stores.clear();
    },

    ensureValidId,
  };
}
