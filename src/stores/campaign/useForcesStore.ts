/**
 * Forces Store Factory
 *
 * Creates isolated Zustand stores for campaign force management.
 * Each campaign has its own store instance with independent persistence.
 *
 * Manages IForce entities with CRUD operations and query methods.
 * Persists to IndexedDB via localStorage with Map serialization.
 */

import { create, StoreApi } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { IForce } from '@/types/campaign/Force';

// =============================================================================
// Store State
// =============================================================================

interface ForcesState {
  /** All forces in the campaign, keyed by force ID */
  forces: Map<string, IForce>;
}

interface ForcesActions {
  // CRUD Operations
  /** Add a new force to the campaign */
  addForce: (force: IForce) => void;
  /** Remove a force from the campaign */
  removeForce: (id: string) => void;
  /** Update a force's data */
  updateForce: (id: string, updates: Partial<IForce>) => void;
  /** Get a force by ID */
  getForce: (id: string) => IForce | undefined;
  /** Get all forces */
  getAllForces: () => IForce[];
  /** Clear all forces */
  clear: () => void;

  // Query Methods
  /** Get all sub-forces of a parent force */
  getSubForces: (parentId: string) => IForce[];
  /** Get the root force (force with no parent) */
  getRootForce: () => IForce | undefined;
}

export type ForcesStore = ForcesState & ForcesActions;

// =============================================================================
// Store Factory
// =============================================================================

/**
 * Create an isolated Zustand store for campaign forces
 *
 * Each campaign gets its own store instance that:
 * - Contains only that campaign's forces
 * - Uses Map for efficient lookups
 * - Provides clean CRUD API
 *
 * @param campaignId - Unique identifier for the campaign
 * @returns A Zustand store instance
 *
 * @example
 * const store = createForcesStore('campaign-001');
 * const addForce = store.getState().addForce;
 * addForce(newForce);
 */
export function createForcesStore(campaignId: string): StoreApi<ForcesStore> {
  return create<ForcesStore>()(
    persist(
      (set, get) => ({
        // Initial state
        forces: new Map(),

        // =================================================================
        // CRUD Operations
        // =================================================================

        addForce: (force) =>
          set((state) => {
            const newMap = new Map(state.forces);
            newMap.set(force.id, force);
            return { forces: newMap };
          }),

        removeForce: (id) =>
          set((state) => {
            const newMap = new Map(state.forces);
            newMap.delete(id);
            return { forces: newMap };
          }),

        updateForce: (id, updates) =>
          set((state) => {
            const force = state.forces.get(id);
            if (!force) return state;

            const newMap = new Map(state.forces);
            newMap.set(id, {
              ...force,
              ...updates,
              updatedAt: new Date().toISOString(),
            });
            return { forces: newMap };
          }),

        getForce: (id) => get().forces.get(id),

        getAllForces: () => Array.from(get().forces.values()),

        clear: () => set({ forces: new Map() }),

        // =================================================================
        // Query Methods
        // =================================================================

        getSubForces: (parentId) =>
          Array.from(get().forces.values()).filter(
            (f) => f.parentForceId === parentId,
          ),

        getRootForce: () =>
          Array.from(get().forces.values()).find(
            (f) => f.parentForceId === undefined,
          ),
      }),
      {
        name: `forces-${campaignId}`,
        storage: createJSONStorage(() => clientSafeStorage),
        // Handle Map serialization: Map -> Array of entries for storage
        partialize: (state) => ({
          forces: Array.from(state.forces.entries()),
        }),
        // Handle Map deserialization: Array of entries -> Map
        merge: (persisted: unknown, current) => {
          const persistedData = persisted as { forces?: [string, IForce][] };
          return {
            ...current,
            forces: new Map(persistedData?.forces || []),
          };
        },
      },
    ),
  );
}
