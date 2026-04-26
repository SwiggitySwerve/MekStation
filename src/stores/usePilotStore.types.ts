/**
 * Type definitions for `usePilotStore` extracted to keep the main
 * store file under the per-file line budget. Imported by the store
 * itself and by the per-domain slice modules so each slice can typecheck
 * its `set` / `get` signatures against the same shared shape.
 *
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 */

import {
  IPilot,
  IPilotStatblock,
  PilotExperienceLevel,
  IPilotIdentity,
  ICreatePilotOptions,
} from '@/types/pilot';

// =============================================================================
// API Response Types (used by the api / skills slices)
// =============================================================================

export interface ListPilotsResponse {
  pilots: IPilot[];
  count: number;
}

export interface CreatePilotResponse {
  success: boolean;
  id?: string;
  pilot?: IPilot;
  error?: string;
}

export interface UpdatePilotResponse {
  success: boolean;
  pilot?: IPilot;
  error?: string;
}

export interface DeletePilotResponse {
  success: boolean;
  error?: string;
}

/** Generic shape for endpoints that just report success/failure. */
export interface SuccessResponse {
  success: boolean;
  error?: string;
}

// =============================================================================
// Store State + Actions
// =============================================================================

export interface PilotStoreState {
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

export interface PilotStoreActions {
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
  /**
   * Purchase a Phase 5 SPA. Hits the unified endpoint with `spaId`,
   * forwarding designation + creation-flow flags. Returns true on
   * success and refreshes the pilot list so the panel sees the new XP
   * pool / ability roster.
   */
  purchaseSPA: (
    pilotId: string,
    spaId: string,
    options?: {
      designation?: import('@/types/pilot').IPilotAbilityDesignation;
      isCreationFlow?: boolean;
    },
  ) => Promise<boolean>;
  /** Remove an SPA from a pilot (creation flow only). Refunds XP. */
  removeSPA: (
    pilotId: string,
    spaId: string,
    options?: { isCreationFlow?: boolean },
  ) => Promise<boolean>;
  /** Set filter */
  setShowActiveOnly: (value: boolean) => void;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Clear error */
  clearError: () => void;
}

export type PilotStore = PilotStoreState & PilotStoreActions;

// =============================================================================
// Slice helper types (used by the api / skills slices)
// =============================================================================

/**
 * Zustand `set` signature scoped to the pilot store. Slices accept
 * this directly so they can update state via either a partial object
 * or an updater function.
 */
export type PilotSetFn = {
  (partial: Partial<PilotStore>): void;
  (fn: (state: PilotStore) => Partial<PilotStore>): void;
};

/** Zustand `get` signature scoped to the pilot store. */
export type PilotGetFn = () => PilotStore;
