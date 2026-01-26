/**
 * Missions Store Factory
 *
 * Creates isolated Zustand stores for campaign mission management.
 * Each campaign has its own store instance with independent persistence.
 *
 * Manages IMission/IContract entities with CRUD operations and query methods.
 * Manages IScenario entities with CRUD and mission-scoped queries.
 * Persists to IndexedDB via localStorage with Map serialization.
 */

import { create, StoreApi } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { IMission, IContract, isContract } from '@/types/campaign/Mission';
import { IScenario } from '@/types/campaign/Scenario';
import { MissionStatus } from '@/types/campaign/enums';

// =============================================================================
// Store State
// =============================================================================

interface MissionsState {
  /** All missions in the campaign, keyed by mission ID */
  missions: Map<string, IMission>;
  /** All scenarios in the campaign, keyed by scenario ID */
  scenarios: Map<string, IScenario>;
}

interface MissionsActions {
  // ===== Mission CRUD Operations =====

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

  // ===== Mission Query Methods =====

  /** Get all missions with ACTIVE status */
  getActiveMissions: () => IMission[];
  /** Get all missions with terminal success statuses (SUCCESS, PARTIAL, FAILED) */
  getCompletedMissions: () => IMission[];
  /** Get all missions matching a specific status */
  getMissionsByStatus: (status: MissionStatus) => IMission[];
  /** Get all contracts with ACTIVE status */
  getActiveContracts: () => IContract[];
  /** Get all contracts for a specific employer */
  getContractsByEmployer: (employerId: string) => IContract[];

  // ===== Scenario CRUD Operations =====

  /** Add a new scenario */
  addScenario: (scenario: IScenario) => void;
  /** Remove a scenario by ID */
  removeScenario: (id: string) => void;
  /** Update a scenario's data */
  updateScenario: (id: string, updates: Partial<IScenario>) => void;
  /** Get a scenario by ID */
  getScenario: (id: string) => IScenario | undefined;
  /** Get all scenarios belonging to a mission */
  getScenariosByMission: (missionId: string) => IScenario[];
  /** Clear all scenarios */
  clearScenarios: () => void;
}

export type MissionsStore = MissionsState & MissionsActions;

// =============================================================================
// Store Factory
// =============================================================================

/**
 * Create an isolated Zustand store for campaign missions
 *
 * Each campaign gets its own store instance that:
 * - Contains only that campaign's missions and scenarios
 * - Uses Map for efficient lookups
 * - Provides clean CRUD API with query methods
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
        scenarios: new Map(),

        // =================================================================
        // Mission CRUD Operations
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

        // =================================================================
        // Mission Query Methods
        // =================================================================

        getActiveMissions: () =>
          Array.from(get().missions.values()).filter(
            (m) => m.status === MissionStatus.ACTIVE
          ),

        getCompletedMissions: () =>
          Array.from(get().missions.values()).filter(
            (m) =>
              m.status === MissionStatus.SUCCESS ||
              m.status === MissionStatus.PARTIAL ||
              m.status === MissionStatus.FAILED
          ),

        getMissionsByStatus: (status) =>
          Array.from(get().missions.values()).filter(
            (m) => m.status === status
          ),

        getActiveContracts: () =>
          Array.from(get().missions.values()).filter(
            (m): m is IContract =>
              isContract(m) && m.status === MissionStatus.ACTIVE
          ),

        getContractsByEmployer: (employerId) =>
          Array.from(get().missions.values()).filter(
            (m): m is IContract =>
              isContract(m) && m.employerId === employerId
          ),

        // =================================================================
        // Scenario CRUD Operations
        // =================================================================

        addScenario: (scenario) =>
          set((state) => {
            const newMap = new Map(state.scenarios);
            newMap.set(scenario.id, scenario);
            return { scenarios: newMap };
          }),

        removeScenario: (id) =>
          set((state) => {
            const newMap = new Map(state.scenarios);
            newMap.delete(id);
            return { scenarios: newMap };
          }),

        updateScenario: (id, updates) =>
          set((state) => {
            const scenario = state.scenarios.get(id);
            if (!scenario) return state;

            const newMap = new Map(state.scenarios);
            newMap.set(id, {
              ...scenario,
              ...updates,
              updatedAt: new Date().toISOString(),
            });
            return { scenarios: newMap };
          }),

        getScenario: (id) => get().scenarios.get(id),

        getScenariosByMission: (missionId) =>
          Array.from(get().scenarios.values()).filter(
            (s) => s.missionId === missionId
          ),

        clearScenarios: () => set({ scenarios: new Map() }),
      }),
      {
        name: `missions-${campaignId}`,
        storage: createJSONStorage(() => clientSafeStorage),
        // Handle Map serialization: Map -> Array of entries for storage
        partialize: (state) => ({
          missions: Array.from(state.missions.entries()),
          scenarios: Array.from(state.scenarios.entries()),
        }),
        // Handle Map deserialization: Array of entries -> Map
        merge: (persisted: unknown, current) => {
          const persistedData = persisted as {
            missions?: [string, IMission][];
            scenarios?: [string, IScenario][];
          };
          return {
            ...current,
            missions: new Map(persistedData?.missions || []),
            scenarios: new Map(persistedData?.scenarios || []),
          };
        },
      }
    )
  );
}
