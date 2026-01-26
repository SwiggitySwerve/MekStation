/**
 * Personnel Store Factory
 *
 * Creates isolated Zustand stores for campaign personnel management.
 * Each campaign has its own store instance with independent persistence.
 *
 * Manages IPerson entities with CRUD operations and query methods.
 * Persists to IndexedDB via localStorage with Map serialization.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { IPerson } from '@/types/campaign/Person';
import { PersonnelStatus, CampaignPersonnelRole } from '@/types/campaign/enums';

// =============================================================================
// Store State
// =============================================================================

interface PersonnelState {
  /** All personnel in the campaign, keyed by person ID */
  personnel: Map<string, IPerson>;
}

interface PersonnelActions {
  // CRUD Operations
  /** Add a new person to the campaign */
  addPerson: (person: IPerson) => void;
  /** Remove a person from the campaign */
  removePerson: (id: string) => void;
  /** Update a person's data */
  updatePerson: (id: string, updates: Partial<IPerson>) => void;
  /** Get a person by ID */
  getPerson: (id: string) => IPerson | undefined;
  /** Get all personnel */
  getAll: () => IPerson[];
  /** Clear all personnel */
  clear: () => void;

  // Query Methods
  /** Get all personnel with a specific status */
  getByStatus: (status: PersonnelStatus) => IPerson[];
  /** Get all personnel with a specific role (primary or secondary) */
  getByRole: (role: CampaignPersonnelRole) => IPerson[];
  /** Get all personnel assigned to a specific unit */
  getByUnit: (unitId: string) => IPerson[];
  /** Get all active personnel */
  getActive: () => IPerson[];
}

export type PersonnelStore = PersonnelState & PersonnelActions;

// =============================================================================
// Store Factory
// =============================================================================

/**
 * Create an isolated Zustand store for campaign personnel
 *
 * Each campaign gets its own store instance that:
 * - Contains only that campaign's personnel
 * - Uses Map for efficient lookups
 * - Provides clean CRUD API
 *
 * @param campaignId - Unique identifier for the campaign
 * @returns A Zustand store instance
 *
 * @example
 * const store = createPersonnelStore('campaign-001');
 * const addPerson = store.getState().addPerson;
 * addPerson(newPerson);
 */
export function createPersonnelStore(campaignId: string) {
  return create<PersonnelStore>()(
    persist(
      (set, get) => ({
        // Initial state
        personnel: new Map(),

        // =================================================================
        // CRUD Operations
        // =================================================================

        addPerson: (person) =>
          set((state) => {
            const newMap = new Map(state.personnel);
            newMap.set(person.id, person);
            return { personnel: newMap };
          }),

        removePerson: (id) =>
          set((state) => {
            const newMap = new Map(state.personnel);
            newMap.delete(id);
            return { personnel: newMap };
          }),

        updatePerson: (id, updates) =>
          set((state) => {
            const person = state.personnel.get(id);
            if (!person) return state;

            const newMap = new Map(state.personnel);
            newMap.set(id, {
              ...person,
              ...updates,
              updatedAt: new Date().toISOString(),
            });
            return { personnel: newMap };
          }),

        getPerson: (id) => get().personnel.get(id),

        getAll: () => Array.from(get().personnel.values()),

        clear: () => set({ personnel: new Map() }),

        // =================================================================
        // Query Methods
        // =================================================================

        getByStatus: (status) =>
          Array.from(get().personnel.values()).filter((p) => p.status === status),

        getByRole: (role) =>
          Array.from(get().personnel.values()).filter(
            (p) => p.primaryRole === role || p.secondaryRole === role
          ),

        getByUnit: (unitId) =>
          Array.from(get().personnel.values()).filter((p) => p.unitId === unitId),

        getActive: () =>
          Array.from(get().personnel.values()).filter(
            (p) => p.status === PersonnelStatus.ACTIVE
          ),
      }),
      {
        name: `personnel-${campaignId}`,
        storage: createJSONStorage(() => clientSafeStorage),
        // Handle Map serialization: Map -> Array of entries for storage
        partialize: (state) => ({
          personnel: Array.from(state.personnel.entries()),
        }),
        // Handle Map deserialization: Array of entries -> Map
        merge: (persisted: unknown, current) => {
          const persistedData = persisted as { personnel?: [string, IPerson][] };
          return {
            ...current,
            personnel: new Map(persistedData?.personnel || []),
          };
        },
      }
    )
  );
}
