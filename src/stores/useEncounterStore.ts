/**
 * Encounter Store
 *
 * Zustand store for managing encounter state in the UI.
 * Uses API routes for persistence to avoid bundling SQLite in the browser.
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import { create } from 'zustand';

import { EncounterStatus } from '@/types/encounter';

export type { RawForceIdsByEncounterId } from './useEncounterStoreTypes';
import type { EncounterStore } from './useEncounterStoreTypes';

import { createEncounterApiActions } from './useEncounterStore.apiActions';

export const useEncounterStore = create<EncounterStore>((set, get) => ({
  encounters: [],
  rawForceIds: {},
  selectedEncounterId: null,
  isLoading: false,
  error: null,
  statusFilter: 'all',
  searchQuery: '',
  validations: new Map(),
  ...createEncounterApiActions(set, get),

  getEncounter: (id: string) => get().encounters.find((e) => e.id === id),

  getEncounterRawForceIds: (id: string) => get().rawForceIds[id] ?? null,

  selectEncounter: (id: string | null) => {
    set({ selectedEncounterId: id });
  },

  getSelectedEncounter: () => {
    const { selectedEncounterId, encounters } = get();
    if (!selectedEncounterId) return null;
    return encounters.find((e) => e.id === selectedEncounterId) ?? null;
  },

  setStatusFilter: (status: EncounterStatus | 'all') => {
    set({ statusFilter: status });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  getFilteredEncounters: () => {
    const { encounters, statusFilter, searchQuery } = get();
    let filtered = encounters;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((e) => e.status === statusFilter);
    }

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

  clearError: () => {
    set({ error: null });
  },
}));

export function useEncounterSelector<T>(
  selector: (state: EncounterStore) => T,
): T {
  return useEncounterStore(selector);
}
