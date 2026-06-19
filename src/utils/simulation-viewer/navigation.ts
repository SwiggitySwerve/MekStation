/**
 * Drill-down navigation utility for simulation viewer.
 * Manages navigation between tabs with filter context, breadcrumb trails,
 * and scroll position preservation.
 */

/** Tab types for navigation */
export type TabType =
  | 'campaign-dashboard'
  | 'encounter-history'
  | 'analysis-bugs';

/**
 * Context for drill-down navigation between tabs.
 * Includes source/target tabs, filters, and optional highlight/scroll targets.
 */
export interface IDrillDownContext {
  sourceTab: TabType;
  targetTab: TabType;
  filters?: Record<string, unknown>;
  highlightId?: string;
  scrollToId?: string;
}

/**
 * Breadcrumb entry in navigation history.
 * Tracks the tab, label, and filters at the time of navigation.
 */
export interface IBreadcrumb {
  tab: TabType;
  label: string;
  filters?: Record<string, unknown>;
}

/**
 * Navigation state including breadcrumb trail and scroll positions.
 */
export interface INavigationState {
  breadcrumbs: IBreadcrumb[];
  scrollPositions: Map<string, number>;
}

export interface INavigationManager {
  navigateTo(context: IDrillDownContext): void;
  navigateBack(): IBreadcrumb | null;
  canNavigateBack(): boolean;
  getBreadcrumbs(): IBreadcrumb[];
  reset(): void;
  saveScrollPosition(tab: string, position: number): void;
  getScrollPosition(tab: string): number;
}

const TAB_LABELS: Readonly<Record<string, string>> = {
  'campaign-dashboard': 'Campaign Dashboard',
  'encounter-history': 'Encounter History',
  'analysis-bugs': 'Analysis & Bugs',
};

function getTabLabel(tab: string): string {
  return TAB_LABELS[tab] ?? tab;
}

function createNavigationManager(): INavigationManager {
  const state: INavigationState = {
    breadcrumbs: [],
    scrollPositions: new Map(),
  };

  return {
    navigateTo(context) {
      if (typeof window !== 'undefined') {
        state.scrollPositions.set(context.sourceTab, window.scrollY);
      }

      state.breadcrumbs.push({
        tab: context.sourceTab,
        label: getTabLabel(context.sourceTab),
        filters: context.filters,
      });
    },

    navigateBack() {
      if (state.breadcrumbs.length === 0) {
        return null;
      }

      const previous = state.breadcrumbs.pop()!;

      if (typeof window !== 'undefined') {
        const scrollY = state.scrollPositions.get(previous.tab) || 0;
        window.scrollTo(0, scrollY);
      }

      return previous;
    },

    canNavigateBack() {
      return state.breadcrumbs.length > 0;
    },

    getBreadcrumbs() {
      return [...state.breadcrumbs];
    },

    reset() {
      state.breadcrumbs = [];
      state.scrollPositions.clear();
    },

    saveScrollPosition(tab, position) {
      state.scrollPositions.set(tab, position);
    },

    getScrollPosition(tab) {
      return state.scrollPositions.get(tab) || 0;
    },
  };
}

// Singleton instance for global navigation management
export const navigationManager = createNavigationManager();

/**
 * Create a drill-down link handler function.
 * Returns a function that can be used as a click handler for drill-down links.
 *
 * @param context - Drill-down context (sourceTab is optional, defaults to 'campaign-dashboard')
 * @returns Handler function that triggers navigation
 *
 * @example
 * const handleDrillDown = createDrillDownHandler({
 *   sourceTab: 'campaign-dashboard',
 *   targetTab: 'encounter-history',
 *   filters: { outcome: 'victory' },
 * });
 * // Use in onClick handler
 * <button onClick={handleDrillDown}>View Encounters</button>
 */
export function createDrillDownHandler(
  context: Omit<IDrillDownContext, 'sourceTab'> & { sourceTab?: string },
): () => void {
  return () => {
    const sourceTab = (context.sourceTab || 'campaign-dashboard') as TabType;
    navigationManager.navigateTo({
      ...context,
      sourceTab,
    });
  };
}
