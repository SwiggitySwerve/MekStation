/**
 * Filter Persistence Store
 *
 * Manages filter state for Simulation Viewer tabs with localStorage persistence
 * and URL synchronization. Supports:
 * - Encounter History filters (outcome, sorting, key moments)
 * - Analysis & Bugs filters (severity, detector, battle ID, dismissed status)
 * - Automatic localStorage persistence via Zustand persist middleware
 * - URL query parameter synchronization
 * - Clear all functionality
 *
 * @example
 * const { encounterHistory, setEncounterHistoryFilters, clearAllFilters } = useFilterStore();
 * setEncounterHistoryFilters({ outcome: 'victory' });
 * clearAllFilters(); // Resets all filters and clears localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Encounter History filter options
 */
export interface IEncounterHistoryFilters {
  /** Battle outcome filter */
  outcome?: 'victory' | 'defeat' | 'draw';
  /** Sort by field */
  sortBy?: 'duration' | 'kills' | 'damage';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
  /** Key moment tier filter */
  keyMomentTier?: 'critical' | 'major' | 'minor';
  /** Key moment type filter */
  keyMomentType?: string;
}

/**
 * Analysis & Bugs filter options
 */
export interface IAnalysisBugsFilters {
  /** Bug severity filter */
  severity?: 'critical' | 'warning' | 'info';
  /** Bug detector type filter */
  detector?:
    | 'heat-suicide'
    | 'passive-unit'
    | 'no-progress'
    | 'long-game'
    | 'state-cycle';
  /** Battle ID filter */
  battleId?: string;
  /** Show dismissed bugs */
  showDismissed?: boolean;
}

/**
 * Filter state
 */
interface IFilterState {
  /** Encounter History filters */
  encounterHistory: IEncounterHistoryFilters;
  /** Analysis & Bugs filters */
  analysisBugs: IAnalysisBugsFilters;
}

/**
 * Filter actions
 */
interface IFilterActions {
  /**
   * Set Encounter History filters (merges with existing)
   * @param filters - Partial filters to merge
   */
  setEncounterHistoryFilters: (
    filters: Partial<IEncounterHistoryFilters>,
  ) => void;

  /**
   * Set Analysis & Bugs filters (merges with existing)
   * @param filters - Partial filters to merge
   */
  setAnalysisBugsFilters: (filters: Partial<IAnalysisBugsFilters>) => void;

  /**
   * Clear all Encounter History filters
   */
  clearEncounterHistoryFilters: () => void;

  /**
   * Clear all Analysis & Bugs filters
   */
  clearAnalysisBugsFilters: () => void;

  /**
   * Clear all filters across all tabs
   */
  clearAllFilters: () => void;

  /**
   * Sync filters from URL query parameters
   */
  syncFromURL: () => void;

  /**
   * Sync filters to URL query parameters
   */
  syncToURL: () => void;
}

/**
 * Complete filter store type
 */
export type IFilterStore = IFilterState & IFilterActions;

/**
 * Initial filter state
 */
const initialState: IFilterState = {
  encounterHistory: {},
  analysisBugs: {},
};

/**
 * Create the filter store with Zustand persist middleware
 *
 * Persists to localStorage under key 'simulation-viewer-filters'
 * Automatically syncs to URL query parameters on filter changes
 */
export const useFilterStore = create<IFilterStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * Set Encounter History filters
       */
      setEncounterHistoryFilters: (
        filters: Partial<IEncounterHistoryFilters>,
      ) => {
        set((state) => ({
          ...state,
          encounterHistory: { ...state.encounterHistory, ...filters },
        }));
        get().syncToURL();
      },

      /**
       * Set Analysis & Bugs filters
       */
      setAnalysisBugsFilters: (filters: Partial<IAnalysisBugsFilters>) => {
        set((state) => ({
          ...state,
          analysisBugs: { ...state.analysisBugs, ...filters },
        }));
        get().syncToURL();
      },

      /**
       * Clear Encounter History filters
       */
      clearEncounterHistoryFilters: () => {
        set((state) => ({
          ...state,
          encounterHistory: {},
        }));
        get().syncToURL();
      },

      /**
       * Clear Analysis & Bugs filters
       */
      clearAnalysisBugsFilters: () => {
        set((state) => ({
          ...state,
          analysisBugs: {},
        }));
        get().syncToURL();
      },

      /**
       * Clear all filters
       */
      clearAllFilters: () => {
        set((state) => ({
          ...state,
          encounterHistory: {},
          analysisBugs: {},
        }));
        get().syncToURL();
      },

      /**
       * Sync filters from URL query parameters
       */
      syncFromURL: () => {
        if (typeof window === 'undefined') return;

        const params = new URLSearchParams(window.location.search);

        // Encounter History filters
        const ehFilters: Partial<IEncounterHistoryFilters> = {};
        if (params.has('eh_outcome')) {
          ehFilters.outcome = params.get('eh_outcome') as
            | 'victory'
            | 'defeat'
            | 'draw';
        }
        if (params.has('eh_sortBy')) {
          ehFilters.sortBy = params.get('eh_sortBy') as
            | 'duration'
            | 'kills'
            | 'damage';
        }
        if (params.has('eh_sortOrder')) {
          ehFilters.sortOrder = params.get('eh_sortOrder') as 'asc' | 'desc';
        }
        if (params.has('eh_kmTier')) {
          ehFilters.keyMomentTier = params.get('eh_kmTier') as
            | 'critical'
            | 'major'
            | 'minor';
        }
        if (params.has('eh_kmType')) {
          ehFilters.keyMomentType = params.get('eh_kmType') as string;
        }

        // Analysis & Bugs filters
        const abFilters: Partial<IAnalysisBugsFilters> = {};
        if (params.has('ab_severity')) {
          abFilters.severity = params.get('ab_severity') as
            | 'critical'
            | 'warning'
            | 'info';
        }
        if (params.has('ab_detector')) {
          abFilters.detector = params.get('ab_detector') as
            | 'heat-suicide'
            | 'passive-unit'
            | 'no-progress'
            | 'long-game'
            | 'state-cycle';
        }
        if (params.has('ab_battleId')) {
          abFilters.battleId = params.get('ab_battleId') as string;
        }
        if (params.has('ab_showDismissed')) {
          abFilters.showDismissed = params.get('ab_showDismissed') === 'true';
        }

        set((state) => {
          const newState = { ...state };
          if (Object.keys(ehFilters).length > 0) {
            newState.encounterHistory = {
              ...state.encounterHistory,
              ...ehFilters,
            };
          }
          if (Object.keys(abFilters).length > 0) {
            newState.analysisBugs = { ...state.analysisBugs, ...abFilters };
          }
          return newState;
        });
      },

      /**
       * Sync filters to URL query parameters
       */
      syncToURL: () => {
        if (typeof window === 'undefined') return;

        const { encounterHistory, analysisBugs } = get();
        const url = new URL(window.location.href);

        // Clear existing filter params
        Array.from(url.searchParams.keys()).forEach((key) => {
          if (key.startsWith('eh_') || key.startsWith('ab_')) {
            url.searchParams.delete(key);
          }
        });

        // Encounter History filters
        Object.entries(encounterHistory).forEach(([key, value]) => {
          if (value !== undefined) {
            url.searchParams.set(`eh_${key}`, String(value));
          }
        });

        // Analysis & Bugs filters
        Object.entries(analysisBugs).forEach(([key, value]) => {
          if (value !== undefined) {
            url.searchParams.set(`ab_${key}`, String(value));
          }
        });

        window.history.replaceState({}, '', url.toString());
      },
    }),
    {
      name: 'simulation-viewer-filters',
      version: 1,
    },
  ),
);
