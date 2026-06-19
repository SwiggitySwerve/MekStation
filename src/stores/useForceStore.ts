/**
 * Force Store
 *
 * Zustand store for managing force state in the UI.
 * Uses API routes for persistence to avoid bundling SQLite in the browser.
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import { create } from 'zustand';

import { createForceApiActions } from './useForceStore.apiActions';
import { getForceSummariesLogic } from './useForceStore.helpers';
import { ForceStore } from './useForceStore.types';

// =============================================================================
// Store Implementation
// =============================================================================

export const useForceStore = create<ForceStore>((set, get) => ({
  forces: [],
  selectedForceId: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  validations: new Map(),
  ...createForceApiActions(set, get),

  getForce: (id: string) => {
    return get().forces.find((f) => f.id === id);
  },

  // Select a force
  selectForce: (id: string | null) => {
    set({ selectedForceId: id });
  },

  // Get selected force
  getSelectedForce: () => {
    const { selectedForceId, forces } = get();
    if (!selectedForceId) return null;
    return forces.find((f) => f.id === selectedForceId) ?? null;
  },

  // Set search query
  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  // Get filtered forces
  getFilteredForces: () => {
    const { forces, searchQuery } = get();
    if (!searchQuery) return forces;

    const lowerQuery = searchQuery.toLowerCase();
    return forces.filter(
      (f) =>
        f.name.toLowerCase().includes(lowerQuery) ||
        f.affiliation?.toLowerCase().includes(lowerQuery) ||
        f.description?.toLowerCase().includes(lowerQuery),
    );
  },

  getForceSummaries: () => {
    return getForceSummariesLogic(get().forces);
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));

export function useForceSelector<T>(selector: (state: ForceStore) => T): T {
  return useForceStore(selector);
}
