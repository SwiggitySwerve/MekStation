/**
 * Pilot Store
 *
 * Zustand store for managing pilot state in the UI. Persists to disk via
 * the `/api/pilots` REST surface (so the store stays browser-safe — no
 * SQLite in the bundle).
 *
 * The store body is intentionally a thin composition layer: the actual
 * REST/CRUD logic lives in `usePilotStore.api.ts`, the skill / wound /
 * ability mutations live in `usePilotStore.skills.ts`, and the shared
 * type contract lives in `usePilotStore.types.ts`. Selector hooks live
 * inline at the bottom of this file (NOT in a sibling file) to avoid a
 * store <-> selectors circular import — same pattern as
 * useGameplayStore. Public hook surface is `usePilotStore`,
 * `useFilteredPilots`, `usePilotById`.
 *
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 */

import { create } from 'zustand';

import { IPilot, PilotStatus } from '@/types/pilot';

import type { PilotStore } from './usePilotStore.types';

import {
  createFromTemplateLogic,
  createPilotLogic,
  createRandomLogic,
  createStatblockLogic,
  deletePilotLogic,
  loadPilotsLogic,
  updatePilotLogic,
} from './usePilotStore.api';
import {
  applyWoundLogic,
  healWoundsLogic,
  improveGunneryLogic,
  improvePilotingLogic,
  purchaseAbilityLogic,
  purchaseSPALogic,
  removeSPALogic,
} from './usePilotStore.skills';

export type {
  CreatePilotResponse,
  DeletePilotResponse,
  ListPilotsResponse,
  PilotStore,
  PilotStoreActions,
  PilotStoreState,
  UpdatePilotResponse,
} from './usePilotStore.types';

// =============================================================================
// Store Implementation
// =============================================================================

export const usePilotStore = create<PilotStore>((set, get) => ({
  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------
  pilots: [],
  selectedPilotId: null,
  isLoading: false,
  error: null,
  showActiveOnly: false,
  searchQuery: '',

  // -------------------------------------------------------------------------
  // CRUD actions (delegated to usePilotStore.api)
  // -------------------------------------------------------------------------
  loadPilots: () => loadPilotsLogic(set),
  createPilot: (options) => createPilotLogic(options, set, get),
  createFromTemplate: (level, identity) =>
    createFromTemplateLogic(level, identity, set, get),
  createRandom: (identity) => createRandomLogic(identity, set, get),
  createStatblock: (statblock) => createStatblockLogic(statblock),
  updatePilot: (id, updates) => updatePilotLogic(id, updates, set, get),
  deletePilot: (id) => deletePilotLogic(id, set, get),

  // -------------------------------------------------------------------------
  // Selection
  // -------------------------------------------------------------------------
  selectPilot: (id) => {
    set({ selectedPilotId: id });
  },

  getSelectedPilot: () => {
    const { pilots, selectedPilotId } = get();
    if (!selectedPilotId) return null;
    return pilots.find((p) => p.id === selectedPilotId) || null;
  },

  // -------------------------------------------------------------------------
  // Skill / wound / ability mutations (delegated to usePilotStore.skills)
  // -------------------------------------------------------------------------
  improveGunnery: (pilotId) => improveGunneryLogic(pilotId, set, get),
  improvePiloting: (pilotId) => improvePilotingLogic(pilotId, set, get),
  applyWound: (pilotId) => applyWoundLogic(pilotId, set, get),
  healWounds: (pilotId) => healWoundsLogic(pilotId, set, get),
  purchaseAbility: (pilotId, abilityId, xpCost) =>
    purchaseAbilityLogic(pilotId, abilityId, xpCost, set, get),
  purchaseSPA: (pilotId, spaId, options) =>
    purchaseSPALogic(pilotId, spaId, options, set, get),
  removeSPA: (pilotId, spaId, options) =>
    removeSPALogic(pilotId, spaId, options, set, get),

  // -------------------------------------------------------------------------
  // UI filters
  // -------------------------------------------------------------------------
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
// Selector Hooks
// =============================================================================
// Live in this file (instead of usePilotStore.selectors.ts) to avoid a
// store <-> selectors circular import. Same pattern as useGameplayStore.

export function usePilotSelector<T>(selector: (state: PilotStore) => T): T {
  return usePilotStore(selector);
}

/**
 * Get filtered pilots based on current filters (status + search query).
 */
export function useFilteredPilots(): IPilot[] {
  const pilots = usePilotSelector((state) => state.pilots);
  const showActiveOnly = usePilotSelector((state) => state.showActiveOnly);
  const searchQuery = usePilotSelector((state) => state.searchQuery);

  let filtered = pilots;
  if (showActiveOnly) {
    filtered = filtered.filter((p) => p.status === PilotStatus.Active);
  }
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
 * Get a pilot by ID. Returns `null` for null ids or unknown ids so
 * callers can pass an optional id straight from URL params.
 */
export function usePilotById(id: string | null): IPilot | null {
  const pilots = usePilotSelector((state) => state.pilots);
  if (!id) return null;
  return pilots.find((p) => p.id === id) || null;
}
