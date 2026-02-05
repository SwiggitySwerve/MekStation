/**
 * Pilot Store
 *
 * Zustand store for managing pilot state in the UI.
 * Uses API routes for persistence to avoid bundling SQLite in the browser.
 *
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 */

import { create } from 'zustand';

import {
  IPilot,
  IPilotStatblock,
  PilotStatus,
  PilotExperienceLevel,
  IPilotIdentity,
  ICreatePilotOptions,
  PilotType,
} from '@/types/pilot';

// =============================================================================
// API Response Types
// =============================================================================

interface ListPilotsResponse {
  pilots: IPilot[];
  count: number;
}

interface CreatePilotResponse {
  success: boolean;
  id?: string;
  pilot?: IPilot;
  error?: string;
}

interface UpdatePilotResponse {
  success: boolean;
  pilot?: IPilot;
  error?: string;
}

interface DeletePilotResponse {
  success: boolean;
  error?: string;
}

// =============================================================================
// Store State
// =============================================================================

interface PilotStoreState {
  /** All loaded pilots */
  pilots: IPilot[];
  /** Currently selected pilot ID */
  selectedPilotId: string | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Filter: show only active pilots */
  showActiveOnly: boolean;
  /** Search query */
  searchQuery: string;
}

interface PilotStoreActions {
  /** Load all pilots from API */
  loadPilots: () => Promise<void>;
  /** Create a new pilot */
  createPilot: (options: ICreatePilotOptions) => Promise<string | null>;
  /** Create pilot from template */
  createFromTemplate: (
    level: PilotExperienceLevel,
    identity: IPilotIdentity,
  ) => Promise<string | null>;
  /** Create random pilot */
  createRandom: (identity: IPilotIdentity) => Promise<string | null>;
  /** Create statblock pilot (not persisted) */
  createStatblock: (statblock: IPilotStatblock) => IPilot;
  /** Update a pilot */
  updatePilot: (id: string, updates: Partial<IPilot>) => Promise<boolean>;
  /** Delete a pilot */
  deletePilot: (id: string) => Promise<boolean>;
  /** Select a pilot */
  selectPilot: (id: string | null) => void;
  /** Get selected pilot */
  getSelectedPilot: () => IPilot | null;
  /** Improve gunnery skill */
  improveGunnery: (pilotId: string) => Promise<boolean>;
  /** Improve piloting skill */
  improvePiloting: (pilotId: string) => Promise<boolean>;
  /** Apply wound to pilot */
  applyWound: (pilotId: string) => Promise<boolean>;
  /** Heal pilot wounds */
  healWounds: (pilotId: string) => Promise<boolean>;
  /** Purchase an ability for a pilot */
  purchaseAbility: (
    pilotId: string,
    abilityId: string,
    xpCost: number,
  ) => Promise<boolean>;
  /** Set filter */
  setShowActiveOnly: (value: boolean) => void;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Clear error */
  clearError: () => void;
}

type PilotStore = PilotStoreState & PilotStoreActions;

// =============================================================================
// Store Implementation
// =============================================================================

export const usePilotStore = create<PilotStore>((set, get) => ({
  // Initial state
  pilots: [],
  selectedPilotId: null,
  isLoading: false,
  error: null,
  showActiveOnly: false,
  searchQuery: '',

  // Actions
  loadPilots: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/pilots');
      if (!response.ok) {
        throw new Error(`Failed to load pilots: ${response.statusText}`);
      }
      const data = (await response.json()) as ListPilotsResponse;
      set({ pilots: data.pilots, isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load pilots';
      set({ error: message, isLoading: false });
    }
  },

  createPilot: async (options) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/pilots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'full', options }),
      });

      const data = (await response.json()) as CreatePilotResponse;

      if (data.success && data.id) {
        await get().loadPilots();
        set({ selectedPilotId: data.id, isLoading: false });
        return data.id;
      } else {
        set({
          error: data.error || 'Failed to create pilot',
          isLoading: false,
        });
        return null;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create pilot';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  createFromTemplate: async (level, identity) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/pilots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'template', template: level, identity }),
      });

      const data = (await response.json()) as CreatePilotResponse;

      if (data.success && data.id) {
        await get().loadPilots();
        set({ selectedPilotId: data.id, isLoading: false });
        return data.id;
      } else {
        set({
          error: data.error || 'Failed to create pilot',
          isLoading: false,
        });
        return null;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create pilot';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  createRandom: async (identity) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/pilots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'random', identity }),
      });

      const data = (await response.json()) as CreatePilotResponse;

      if (data.success && data.id) {
        await get().loadPilots();
        set({ selectedPilotId: data.id, isLoading: false });
        return data.id;
      } else {
        set({
          error: data.error || 'Failed to create pilot',
          isLoading: false,
        });
        return null;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create pilot';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  createStatblock: (statblock) => {
    // Statblocks are not persisted, just create in memory
    const now = new Date().toISOString();
    return {
      id: `statblock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: statblock.name,
      type: PilotType.Statblock,
      status: PilotStatus.Active,
      skills: {
        gunnery: statblock.gunnery,
        piloting: statblock.piloting,
      },
      wounds: 0,
      abilities: (statblock.abilityIds || []).map((id) => ({
        abilityId: id,
        acquiredDate: now,
      })),
      createdAt: now,
      updatedAt: now,
    };
  },

  updatePilot: async (id, updates) => {
    set({ error: null });

    try {
      const response = await fetch(`/api/pilots/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = (await response.json()) as UpdatePilotResponse;

      if (data.success) {
        await get().loadPilots();
        return true;
      } else {
        set({ error: data.error || 'Failed to update pilot' });
        return false;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update pilot';
      set({ error: message });
      return false;
    }
  },

  deletePilot: async (id) => {
    set({ error: null });

    try {
      const response = await fetch(`/api/pilots/${id}`, {
        method: 'DELETE',
      });

      const data = (await response.json()) as DeletePilotResponse;

      if (data.success) {
        const { selectedPilotId } = get();
        if (selectedPilotId === id) {
          set({ selectedPilotId: null });
        }
        await get().loadPilots();
        return true;
      } else {
        set({ error: data.error || 'Failed to delete pilot' });
        return false;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete pilot';
      set({ error: message });
      return false;
    }
  },

  selectPilot: (id) => {
    set({ selectedPilotId: id });
  },

  getSelectedPilot: () => {
    const { pilots, selectedPilotId } = get();
    if (!selectedPilotId) return null;
    return pilots.find((p) => p.id === selectedPilotId) || null;
  },

  improveGunnery: async (pilotId) => {
    set({ error: null });

    try {
      // Call dedicated endpoint that enforces XP cost via service
      const response = await fetch(`/api/pilots/${pilotId}/improve-gunnery`, {
        method: 'POST',
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (data.success) {
        await get().loadPilots();
        return true;
      } else {
        set({ error: data.error || 'Failed to improve gunnery' });
        return false;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to improve gunnery';
      set({ error: message });
      return false;
    }
  },

  improvePiloting: async (pilotId) => {
    set({ error: null });

    try {
      // Call dedicated endpoint that enforces XP cost via service
      const response = await fetch(`/api/pilots/${pilotId}/improve-piloting`, {
        method: 'POST',
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (data.success) {
        await get().loadPilots();
        return true;
      } else {
        set({ error: data.error || 'Failed to improve piloting' });
        return false;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to improve piloting';
      set({ error: message });
      return false;
    }
  },

  applyWound: async (pilotId) => {
    set({ error: null });

    try {
      const pilot = get().pilots.find((p) => p.id === pilotId);
      if (!pilot) {
        set({ error: 'Pilot not found' });
        return false;
      }

      const newWounds = pilot.wounds + 1;

      // Check for death or injury status
      let newStatus = pilot.status;
      if (newWounds >= 6) {
        newStatus = PilotStatus.KIA;
      } else if (newWounds >= 3) {
        newStatus = PilotStatus.Injured;
      }

      return get().updatePilot(pilotId, {
        wounds: newWounds,
        status: newStatus,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to apply wound';
      set({ error: message });
      return false;
    }
  },

  healWounds: async (pilotId) => {
    set({ error: null });

    try {
      const pilot = get().pilots.find((p) => p.id === pilotId);
      if (!pilot) {
        set({ error: 'Pilot not found' });
        return false;
      }

      if (pilot.status === PilotStatus.KIA) {
        set({ error: 'Cannot heal a KIA pilot' });
        return false;
      }

      return get().updatePilot(pilotId, {
        wounds: 0,
        status: PilotStatus.Active,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to heal wounds';
      set({ error: message });
      return false;
    }
  },

  purchaseAbility: async (pilotId, abilityId, _xpCost) => {
    set({ error: null });

    try {
      const response = await fetch(`/api/pilots/${pilotId}/purchase-ability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abilityId }),
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (data.success) {
        await get().loadPilots();
        return true;
      } else {
        set({ error: data.error || 'Failed to purchase ability' });
        return false;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to purchase ability';
      set({ error: message });
      return false;
    }
  },

  setShowActiveOnly: (value) => {
    set({ showActiveOnly: value });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// =============================================================================
// Selectors
// =============================================================================

/**
 * Get filtered pilots based on current filters.
 */
export function useFilteredPilots(): IPilot[] {
  const { pilots, showActiveOnly, searchQuery } = usePilotStore();

  let filtered = pilots;

  // Filter by status
  if (showActiveOnly) {
    filtered = filtered.filter((p) => p.status === PilotStatus.Active);
  }

  // Filter by search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.callsign?.toLowerCase().includes(query) ||
        p.affiliation?.toLowerCase().includes(query),
    );
  }

  return filtered;
}

/**
 * Get a pilot by ID.
 */
export function usePilotById(id: string | null): IPilot | null {
  const pilots = usePilotStore((state) => state.pilots);
  if (!id) return null;
  return pilots.find((p) => p.id === id) || null;
}
