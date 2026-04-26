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
 * type contract lives in `usePilotStore.types.ts`. Selectors live in
 * `usePilotStore.selectors.ts`. The split keeps each file under the
 * per-file LOC budget while leaving the public hook surface
 * (`usePilotStore`, `useFilteredPilots`, `usePilotById`) unchanged.
 *
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 */

import { create } from 'zustand';

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

export { useFilteredPilots, usePilotById } from './usePilotStore.selectors';
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
