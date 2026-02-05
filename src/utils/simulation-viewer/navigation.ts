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

/**
 * NavigationManager handles drill-down navigation between tabs.
 * Maintains breadcrumb trail, scroll positions, and filter context.
 */
class NavigationManager {
  private state: INavigationState = {
    breadcrumbs: [],
    scrollPositions: new Map(),
  };

  /**
   * Navigate to a target tab with drill-down context.
   * Saves current scroll position, adds breadcrumb, and applies filters.
   *
   * @param context - Drill-down navigation context
   */
  navigateTo(context: IDrillDownContext): void {
    // Save current scroll position before navigating
    if (typeof window !== 'undefined') {
      this.state.scrollPositions.set(context.sourceTab, window.scrollY);
    }

    // Add breadcrumb for the source tab
    this.state.breadcrumbs.push({
      tab: context.sourceTab,
      label: this.getTabLabel(context.sourceTab),
      filters: context.filters,
    });

    // Note: Filter application and tab navigation are handled by
    // the filter store and tab navigation store respectively
  }

  /**
   * Navigate back to the previous tab in breadcrumb trail.
   * Restores scroll position and filters from the previous state.
   *
   * @returns The breadcrumb of the tab we're navigating back to
   */
  navigateBack(): IBreadcrumb | null {
    if (this.state.breadcrumbs.length === 0) {
      return null;
    }

    const previous = this.state.breadcrumbs.pop()!;

    // Restore scroll position
    if (typeof window !== 'undefined') {
      const scrollY = this.state.scrollPositions.get(previous.tab) || 0;
      window.scrollTo(0, scrollY);
    }

    return previous;
  }

  /**
   * Check if navigation back is possible.
   *
   * @returns True if there are breadcrumbs to navigate back to
   */
  canNavigateBack(): boolean {
    return this.state.breadcrumbs.length > 0;
  }

  /**
   * Get a copy of the current breadcrumb trail.
   *
   * @returns Array of breadcrumbs in navigation history
   */
  getBreadcrumbs(): IBreadcrumb[] {
    return [...this.state.breadcrumbs];
  }

  /**
   * Clear all navigation history and scroll positions.
   */
  reset(): void {
    this.state.breadcrumbs = [];
    this.state.scrollPositions.clear();
  }

  /**
   * Save scroll position for a specific tab.
   *
   * @param tab - Tab identifier
   * @param position - Scroll Y position
   */
  saveScrollPosition(tab: string, position: number): void {
    this.state.scrollPositions.set(tab, position);
  }

  /**
   * Get saved scroll position for a tab.
   *
   * @param tab - Tab identifier
   * @returns Scroll Y position, or 0 if not found
   */
  getScrollPosition(tab: string): number {
    return this.state.scrollPositions.get(tab) || 0;
  }

  /**
   * Get human-readable label for a tab.
   *
   * @param tab - Tab identifier
   * @returns Display label for the tab
   */
  private getTabLabel(tab: string): string {
    const labels: Record<string, string> = {
      'campaign-dashboard': 'Campaign Dashboard',
      'encounter-history': 'Encounter History',
      'analysis-bugs': 'Analysis & Bugs',
    };
    return labels[tab] || tab;
  }
}

// Singleton instance for global navigation management
export const navigationManager = new NavigationManager();

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
