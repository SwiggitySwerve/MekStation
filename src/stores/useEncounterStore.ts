/**
 * Encounter Store
 *
 * Zustand store for managing encounter state in the UI.
 * Uses API routes for persistence to avoid bundling SQLite in the browser.
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import { create } from 'zustand';

import {
  EncounterStatus,
  type ICreateEncounterInput,
  type IUpdateEncounterInput,
  ScenarioTemplateType,
} from '@/types/encounter';

export type { RawForceIdsByEncounterId } from './useEncounterStoreTypes';
import type {
  EncounterResponse,
  EncounterStore,
  LaunchEncounterOptions,
  LaunchResponse,
  ListEncountersResponse,
  SeedSamplesResponse,
  ValidationResponse,
} from './useEncounterStoreTypes';

// =============================================================================
// Store Implementation
// =============================================================================

export const useEncounterStore = create<EncounterStore>((set, get) => ({
  // State
  encounters: [],
  rawForceIds: {},
  selectedEncounterId: null,
  isLoading: false,
  error: null,
  statusFilter: 'all',
  searchQuery: '',
  validations: new Map(),

  // Load all encounters
  loadEncounters: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/encounters');
      if (!response.ok) {
        throw new Error('Failed to load encounters');
      }
      const data = (await response.json()) as ListEncountersResponse;
      // `rawForceIds` may be absent on older server builds; default to {}
      // so list-page broken-pill detection cleanly falls back to "no
      // missing refs" instead of crashing on undefined access.
      set({
        encounters: data.encounters,
        rawForceIds: data.rawForceIds ?? {},
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
    }
  },

  // Get an encounter by ID
  getEncounter: (id: string) => {
    return get().encounters.find((e) => e.id === id);
  },

  // Get raw stored force-id strings for the encounter. Used by the list
  // page to feed `encounterBrokenRefs` for broken-pill rendering.
  getEncounterRawForceIds: (id: string) => {
    return get().rawForceIds[id] ?? null;
  },

  // Create a new encounter
  createEncounter: async (input: ICreateEncounterInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/encounters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = (await response.json()) as EncounterResponse;
      if (!data.success || !data.id) {
        set({
          error: data.error ?? 'Failed to create encounter',
          isLoading: false,
        });
        return null;
      }
      await get().loadEncounters();
      return data.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  // Update an encounter
  updateEncounter: async (id: string, input: IUpdateEncounterInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/encounters/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = (await response.json()) as EncounterResponse;
      if (!data.success) {
        set({
          error: data.error ?? 'Failed to update encounter',
          isLoading: false,
        });
        return false;
      }
      await get().loadEncounters();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Delete an encounter
  deleteEncounter: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/encounters/${id}`, {
        method: 'DELETE',
      });
      const data = (await response.json()) as EncounterResponse;
      if (!data.success) {
        set({
          error: data.error ?? 'Failed to delete encounter',
          isLoading: false,
        });
        return false;
      }
      if (get().selectedEncounterId === id) {
        set({ selectedEncounterId: null });
      }
      await get().loadEncounters();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Select an encounter
  selectEncounter: (id: string | null) => {
    set({ selectedEncounterId: id });
  },

  // Get selected encounter
  getSelectedEncounter: () => {
    const { selectedEncounterId, encounters } = get();
    if (!selectedEncounterId) return null;
    return encounters.find((e) => e.id === selectedEncounterId) ?? null;
  },

  // Set player force
  setPlayerForce: async (encounterId: string, forceId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(
        `/api/encounters/${encounterId}/player-force`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ forceId }),
        },
      );
      const data = (await response.json()) as EncounterResponse;
      if (!data.success) {
        set({
          error: data.error ?? 'Failed to set player force',
          isLoading: false,
        });
        return false;
      }
      await get().loadEncounters();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Clear player force — DELETE /api/encounters/[id]/player-force.
  // The server-side handler updates the encounter with
  // `playerForceId: undefined`, which collapses to NULL in storage and
  // re-runs `recalculateStatus` so a previously-Ready encounter drops
  // back to Draft. Used by the detail-page repair banner.
  clearPlayerForce: async (encounterId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(
        `/api/encounters/${encounterId}/player-force`,
        {
          method: 'DELETE',
        },
      );
      const data = (await response.json()) as EncounterResponse;
      if (!data.success) {
        set({
          error: data.error ?? 'Failed to clear player force',
          isLoading: false,
        });
        return false;
      }
      await get().loadEncounters();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Set opponent force
  setOpponentForce: async (encounterId: string, forceId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(
        `/api/encounters/${encounterId}/opponent-force`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ forceId }),
        },
      );
      const data = (await response.json()) as EncounterResponse;
      if (!data.success) {
        set({
          error: data.error ?? 'Failed to set opponent force',
          isLoading: false,
        });
        return false;
      }
      await get().loadEncounters();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Clear opponent force
  clearOpponentForce: async (encounterId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(
        `/api/encounters/${encounterId}/opponent-force`,
        {
          method: 'DELETE',
        },
      );
      const data = (await response.json()) as EncounterResponse;
      if (!data.success) {
        set({
          error: data.error ?? 'Failed to clear opponent force',
          isLoading: false,
        });
        return false;
      }
      await get().loadEncounters();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Seed 4 sample encounters via POST /api/encounters/seed-samples.
  // The route creates one encounter per ScenarioTemplateType value
  // (Duel/Skirmish/Battle/Custom), then we refresh the local list so
  // the empty state flips to a populated grid.
  seedSampleEncounters: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/encounters/seed-samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = (await response.json()) as SeedSamplesResponse;
      if (!data.success || !data.ids) {
        set({
          error: data.error ?? 'Failed to seed sample encounters',
          isLoading: false,
        });
        return null;
      }
      await get().loadEncounters();
      return data.ids;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  // Apply template
  applyTemplate: async (
    encounterId: string,
    template: ScenarioTemplateType,
  ) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/encounters/${encounterId}/template`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template }),
      });
      const data = (await response.json()) as EncounterResponse;
      if (!data.success) {
        set({
          error: data.error ?? 'Failed to apply template',
          isLoading: false,
        });
        return false;
      }
      await get().loadEncounters();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Validate encounter
  validateEncounter: async (id: string) => {
    try {
      const response = await fetch(`/api/encounters/${id}/validate`);
      if (!response.ok) {
        return null;
      }
      const data = (await response.json()) as ValidationResponse;
      const validations = new Map(get().validations);
      validations.set(id, data.validation);
      set({ validations });
      return data.validation;
    } catch {
      return null;
    }
  },

  launchEncounter: async (id: string, options?: LaunchEncounterOptions) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/encounters/${id}/launch`, {
        method: 'POST',
        headers: options ? { 'Content-Type': 'application/json' } : undefined,
        body: options ? JSON.stringify(options) : undefined,
      });
      const data = (await response.json()) as LaunchResponse;
      if (!data.success) {
        set({
          error: data.error ?? 'Failed to launch encounter',
          isLoading: false,
        });
        return null;
      }
      await get().loadEncounters();
      return data.gameSessionId ?? null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  // Clone encounter
  cloneEncounter: async (id: string, newName: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/encounters/${id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName }),
      });
      const data = (await response.json()) as EncounterResponse;
      if (!data.success || !data.id) {
        set({
          error: data.error ?? 'Failed to clone encounter',
          isLoading: false,
        });
        return null;
      }
      await get().loadEncounters();
      return data.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  // Set status filter
  setStatusFilter: (status: EncounterStatus | 'all') => {
    set({ statusFilter: status });
  },

  // Set search query
  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  // Get filtered encounters
  getFilteredEncounters: () => {
    const { encounters, statusFilter, searchQuery } = get();
    let filtered = encounters;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((e) => e.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(lowerQuery) ||
          e.description?.toLowerCase().includes(lowerQuery) ||
          e.playerForce?.forceName.toLowerCase().includes(lowerQuery) ||
          e.opponentForce?.forceName.toLowerCase().includes(lowerQuery),
      );
    }

    return filtered;
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));

export function useEncounterSelector<T>(
  selector: (state: EncounterStore) => T,
): T {
  return useEncounterStore(selector);
}
