/**
 * Missions Store Factory
 *
 * Creates isolated Zustand stores for campaign mission management.
 * Each campaign has its own store instance with independent persistence.
 *
 * Manages IMission entities with CRUD operations.
 * Persists to IndexedDB via localStorage with Map serialization.
 *
 * This is a stub implementation for MVP - full mission system will be
 * implemented in a future task.
 */

import { create, StoreApi } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { IMission } from '@/types/campaign/Campaign';

// =============================================================================
// Store State
// =============================================================================

interface MissionsState {
  /** All missions in the campaign, keyed by mission ID */
  missions: Map<string, IMission>;
}

interface MissionsActions {
  // CRUD Operations
  /** Add a new mission to the campaign */
  addMission: (mission: IMission) => void;
  /** Remove a mission from the campaign */
  removeMission: (id: string) => void;
  /** Update a mission's data */
  updateMission: (id: string, updates: Partial<IMission>) => void;
  /** Get a mission by ID */
  getMission: (id: string) => IMission | undefined;
  /** Get all missions */
  getAllMissions: () => IMission[];
  /** Clear all missions */
  clear: () => void;
}

export type MissionsStore = MissionsState & MissionsActions;

// =============================================================================
// Store Factory
// =============================================================================

/**
 * Create an isolated Zustand store for campaign missions
 *
 * Each campaign gets its own store instance that:
 * - Contains only that campaign's missions
 * - Uses Map for efficient lookups
 * - Provides clean CRUD API
 *
 * @param campaignId - Unique identifier for the campaign
 * @returns A Zustand store instance
 *
 * @example
 * const store = createMissionsStore('campaign-001');
 * const addMission = store.getState().addMission;
 * addMission(newMission);
 */
export function createMissionsStore(campaignId: string): StoreApi<MissionsStore> {
  return create<MissionsStore>()(
    persist(
      (set, get) => ({
        // Initial state
        missions: new Map(),

        // =================================================================
        // CRUD Operations
        // =================================================================

        addMission: (mission) =>
          set((state) => {
            const newMap = new Map(state.missions);
            newMap.set(mission.id, mission);
            return { missions: newMap };
          }),

        removeMission: (id) =>
          set((state) => {
            const newMap = new Map(state.missions);
            newMap.delete(id);
            return { missions: newMap };
          }),

        updateMission: (id, updates) =>
          set((state) => {
            const mission = state.missions.get(id);
            if (!mission) return state;

            const newMap = new Map(state.missions);
            newMap.set(id, {
              ...mission,
              ...updates,
              updatedAt: new Date().toISOString(),
            });
            return { missions: newMap };
          }),

        getMission: (id) => get().missions.get(id),

        getAllMissions: () => Array.from(get().missions.values()),

        clear: () => set({ missions: new Map() }),
      }),
      {
        name: `missions-${campaignId}`,
        storage: createJSONStorage(() => clientSafeStorage),
        // Handle Map serialization: Map -> Array of entries for storage
        partialize: (state) => ({
          missions: Array.from(state.missions.entries()),
        }),
        // Handle Map deserialization: Array of entries -> Map
        merge: (persisted: unknown, current) => {
          const persistedData = persisted as { missions?: [string, IMission][] };
          return {
            ...current,
            missions: new Map(persistedData?.missions || []),
          };
        },
      }
    )
  );
}
