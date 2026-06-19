import {
  navigationManager,
  createDrillDownHandler,
  IDrillDownContext,
  TabType,
} from '../navigation';

describe('Breadcrumb Trail', () => {
  beforeEach(() => {
    navigationManager.reset();
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      writable: true,
      configurable: true,
    });
    window.scrollTo = jest.fn();
  });

  it('should grow breadcrumb trail on navigation', () => {
    const context1: IDrillDownContext = {
      sourceTab: 'campaign-dashboard',
      targetTab: 'encounter-history',
    };

    const context2: IDrillDownContext = {
      sourceTab: 'encounter-history',
      targetTab: 'analysis-bugs',
    };

    navigationManager.navigateTo(context1);
    expect(navigationManager.getBreadcrumbs()).toHaveLength(1);

    navigationManager.navigateTo(context2);
    expect(navigationManager.getBreadcrumbs()).toHaveLength(2);
  });

  it('should shrink breadcrumb trail on back navigation', () => {
    const context1: IDrillDownContext = {
      sourceTab: 'campaign-dashboard',
      targetTab: 'encounter-history',
    };

    const context2: IDrillDownContext = {
      sourceTab: 'encounter-history',
      targetTab: 'analysis-bugs',
    };

    navigationManager.navigateTo(context1);
    navigationManager.navigateTo(context2);

    navigationManager.navigateBack();
    expect(navigationManager.getBreadcrumbs()).toHaveLength(1);

    navigationManager.navigateBack();
    expect(navigationManager.getBreadcrumbs()).toHaveLength(0);
  });

  it('should have correct labels in breadcrumb trail', () => {
    const context: IDrillDownContext = {
      sourceTab: 'campaign-dashboard',
      targetTab: 'encounter-history',
    };

    navigationManager.navigateTo(context);

    const breadcrumbs = navigationManager.getBreadcrumbs();
    expect(breadcrumbs[0].label).toBe('Campaign Dashboard');
  });

  it('should handle unknown tab labels gracefully', () => {
    // Create a context with an unknown tab type to test the fallback label
    const context = {
      sourceTab: 'campaign-dashboard' as TabType,
      targetTab: 'encounter-history' as TabType,
    };

    navigationManager.navigateTo(context);

    // Manually save a breadcrumb with unknown tab to test label fallback
    navigationManager.reset();
    navigationManager.saveScrollPosition('unknown-tab', 0);

    // Navigate with a known tab, then manually test the label by checking
    // that the breadcrumb system handles unknown tabs
    const unknownContext = {
      sourceTab: 'unknown-tab' as TabType,
      targetTab: 'campaign-dashboard' as TabType,
    };

    navigationManager.navigateTo(unknownContext);
    const breadcrumbs = navigationManager.getBreadcrumbs();
    expect(breadcrumbs[0].label).toBe('unknown-tab');
  });

  it('should preserve filters in breadcrumb trail', () => {
    const filters = { outcome: 'victory', difficulty: 'hard' };
    const context: IDrillDownContext = {
      sourceTab: 'campaign-dashboard',
      targetTab: 'encounter-history',
      filters,
    };

    navigationManager.navigateTo(context);

    const breadcrumbs = navigationManager.getBreadcrumbs();
    expect(breadcrumbs[0].filters).toEqual(filters);
  });

  it('should handle multiple drill-downs with different filters', () => {
    const context1: IDrillDownContext = {
      sourceTab: 'campaign-dashboard',
      targetTab: 'encounter-history',
      filters: { outcome: 'victory' },
    };

    const context2: IDrillDownContext = {
      sourceTab: 'encounter-history',
      targetTab: 'analysis-bugs',
      filters: { severity: 'critical' },
    };

    navigationManager.navigateTo(context1);
    navigationManager.navigateTo(context2);

    const breadcrumbs = navigationManager.getBreadcrumbs();
    expect(breadcrumbs[0].filters).toEqual({ outcome: 'victory' });
    expect(breadcrumbs[1].filters).toEqual({ severity: 'critical' });
  });
});
