/**
 * Tab Navigation Store
 *
 * Manages tab navigation state for the Simulation Viewer with URL synchronization.
 * Supports browser back/forward navigation and persistent tab state via URL query params.
 *
 * @example
 * const { activeTab, setActiveTab, canGoBack, goBack } = useTabNavigationStore();
 * setActiveTab('encounter-history'); // Updates URL to ?tab=encounter-history
 * goBack(); // Navigate to previous tab
 */

import React from 'react';
import { create } from 'zustand';

/**
 * Valid tab identifiers for the Simulation Viewer
 */
export type SimulationViewerTab =
  | 'campaign-dashboard'
  | 'encounter-history'
  | 'analysis-bugs';

/**
 * Tab navigation state
 */
interface ITabNavigationState {
  /** Currently active tab */
  activeTab: SimulationViewerTab;
  /** History of visited tabs for back/forward navigation */
  history: SimulationViewerTab[];
}

/**
 * Tab navigation actions
 */
interface ITabNavigationActions {
  /**
   * Set the active tab and update URL
   * @param tab - The tab to activate
   */
  setActiveTab: (tab: SimulationViewerTab) => void;

  /**
   * Navigate to the previous tab in history
   */
  goBack: () => void;

  /**
   * Check if back navigation is available
   * @returns true if history has more than one entry
   */
  canGoBack: () => boolean;

  /**
   * Reset to initial state
   */
  reset: () => void;
}

/**
 * Complete tab navigation store type
 */
export type ITabNavigationStore = ITabNavigationState & ITabNavigationActions;

/**
 * Initial state
 */
const initialState: ITabNavigationState = {
  activeTab: 'campaign-dashboard',
  history: ['campaign-dashboard'],
};

/**
 * Valid tab values for validation
 */
const VALID_TABS: SimulationViewerTab[] = [
  'campaign-dashboard',
  'encounter-history',
  'analysis-bugs',
];

/**
 * Check if a value is a valid tab
 */
function isValidTab(value: unknown): value is SimulationViewerTab {
  return (
    typeof value === 'string' &&
    VALID_TABS.includes(value as SimulationViewerTab)
  );
}

/**
 * Create the tab navigation store with Zustand
 */
export const useTabNavigationStore = create<ITabNavigationStore>(
  (set, get) => ({
    ...initialState,

    /**
     * Set active tab and update URL
     */
    setActiveTab: (tab: SimulationViewerTab) => {
      set((state) => ({
        activeTab: tab,
        history: [...state.history, tab],
      }));

      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tab);
        window.history.pushState({}, '', url.toString());
      }
    },

    /**
     * Navigate to previous tab
     */
    goBack: () => {
      const { history } = get();
      if (history.length > 1) {
        const newHistory = history.slice(0, -1);
        set({
          history: newHistory,
          activeTab: newHistory[newHistory.length - 1],
        });

        if (typeof window !== 'undefined') {
          window.history.back();
        }
      }
    },

    /**
     * Check if back navigation is available
     */
    canGoBack: () => {
      return get().history.length > 1;
    },

    /**
     * Reset to initial state
     */
    reset: () => {
      set({
        activeTab: initialState.activeTab,
        history: [...initialState.history],
      });
    },
  }),
);

/**
 * Hook to initialize tab from URL on mount
 *
 * Reads the ?tab query parameter and sets the active tab if valid.
 * Should be called once on component mount.
 *
 * @example
 * useInitTabFromURL();
 */
export const useInitTabFromURL = (): void => {
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');

      if (tabParam && isValidTab(tabParam)) {
        useTabNavigationStore.setState({
          activeTab: tabParam,
          history: [tabParam],
        });
      }
    }
  }, []);
};

/**
 * Hook to sync tab changes with URL via browser back/forward
 *
 * Listens for popstate events (browser back/forward) and updates
 * the store without triggering additional pushState calls.
 *
 * @example
 * useSyncTabWithURL();
 */
export const useSyncTabWithURL = (): void => {
  React.useEffect(() => {
    const handlePopState = (): void => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');

        if (tabParam && isValidTab(tabParam)) {
          useTabNavigationStore.setState({ activeTab: tabParam });
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
};
