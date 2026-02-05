import {
  navigationManager,
  createDrillDownHandler,
  IDrillDownContext,
  TabType,
} from '../navigation';

describe('NavigationManager', () => {
  beforeEach(() => {
    navigationManager.reset();
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      writable: true,
      configurable: true,
    });
    window.scrollTo = jest.fn();
  });

  describe('navigateTo', () => {
    it('should save scroll position before navigating', () => {
      Object.defineProperty(window, 'scrollY', {
        value: 500,
        writable: true,
        configurable: true,
      });

      const context: IDrillDownContext = {
        sourceTab: 'campaign-dashboard',
        targetTab: 'encounter-history',
      };

      navigationManager.navigateTo(context);

      expect(navigationManager.getScrollPosition('campaign-dashboard')).toBe(
        500,
      );
    });

    it('should add breadcrumb when navigating', () => {
      const context: IDrillDownContext = {
        sourceTab: 'campaign-dashboard',
        targetTab: 'encounter-history',
      };

      navigationManager.navigateTo(context);

      const breadcrumbs = navigationManager.getBreadcrumbs();
      expect(breadcrumbs).toHaveLength(1);
      expect(breadcrumbs[0].tab).toBe('campaign-dashboard');
      expect(breadcrumbs[0].label).toBe('Campaign Dashboard');
    });

    it('should include filters in breadcrumb', () => {
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

    it('should handle multiple navigations', () => {
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

      const breadcrumbs = navigationManager.getBreadcrumbs();
      expect(breadcrumbs).toHaveLength(2);
      expect(breadcrumbs[0].tab).toBe('campaign-dashboard');
      expect(breadcrumbs[1].tab).toBe('encounter-history');
    });

    it('should handle undefined filters gracefully', () => {
      const context: IDrillDownContext = {
        sourceTab: 'campaign-dashboard',
        targetTab: 'encounter-history',
      };

      navigationManager.navigateTo(context);

      const breadcrumbs = navigationManager.getBreadcrumbs();
      expect(breadcrumbs[0].filters).toBeUndefined();
    });

    it('should work without window object (SSR)', () => {
      const originalWindow = global.window;
      // @ts-ignore - intentionally removing window for SSR test
      delete global.window;

      const context: IDrillDownContext = {
        sourceTab: 'campaign-dashboard',
        targetTab: 'encounter-history',
      };

      expect(() => navigationManager.navigateTo(context)).not.toThrow();

      global.window = originalWindow;
    });
  });

  describe('navigateBack', () => {
    it('should restore scroll position when navigating back', () => {
      Object.defineProperty(window, 'scrollY', {
        value: 500,
        writable: true,
        configurable: true,
      });

      const context: IDrillDownContext = {
        sourceTab: 'campaign-dashboard',
        targetTab: 'encounter-history',
      };

      navigationManager.navigateTo(context);
      navigationManager.navigateBack();

      expect(window.scrollTo).toHaveBeenCalledWith(0, 500);
    });

    it('should remove breadcrumb when navigating back', () => {
      const context: IDrillDownContext = {
        sourceTab: 'campaign-dashboard',
        targetTab: 'encounter-history',
      };

      navigationManager.navigateTo(context);
      navigationManager.navigateBack();

      const breadcrumbs = navigationManager.getBreadcrumbs();
      expect(breadcrumbs).toHaveLength(0);
    });

    it('should return the breadcrumb of the tab navigating back to', () => {
      const context: IDrillDownContext = {
        sourceTab: 'campaign-dashboard',
        targetTab: 'encounter-history',
      };

      navigationManager.navigateTo(context);
      const result = navigationManager.navigateBack();

      expect(result).not.toBeNull();
      expect(result?.tab).toBe('campaign-dashboard');
      expect(result?.label).toBe('Campaign Dashboard');
    });

    it('should return null when no breadcrumbs exist', () => {
      const result = navigationManager.navigateBack();
      expect(result).toBeNull();
    });

    it('should handle multiple back navigations', () => {
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
      navigationManager.navigateBack();

      const breadcrumbs = navigationManager.getBreadcrumbs();
      expect(breadcrumbs).toHaveLength(0);
    });

    it('should restore scroll position of 0 for unknown tab', () => {
      const context: IDrillDownContext = {
        sourceTab: 'campaign-dashboard',
        targetTab: 'encounter-history',
      };

      navigationManager.navigateTo(context);
      navigationManager.navigateBack();

      expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    });

    it('should work without window object (SSR)', () => {
      const originalWindow = global.window;

      const context: IDrillDownContext = {
        sourceTab: 'campaign-dashboard',
        targetTab: 'encounter-history',
      };

      navigationManager.navigateTo(context);

      // @ts-ignore - intentionally removing window for SSR test
      delete global.window;

      expect(() => navigationManager.navigateBack()).not.toThrow();

      global.window = originalWindow;
    });
  });

  describe('canNavigateBack', () => {
    it('should return true when breadcrumbs exist', () => {
      const context: IDrillDownContext = {
        sourceTab: 'campaign-dashboard',
        targetTab: 'encounter-history',
      };

      navigationManager.navigateTo(context);

      expect(navigationManager.canNavigateBack()).toBe(true);
    });

    it('should return false when no breadcrumbs exist', () => {
      expect(navigationManager.canNavigateBack()).toBe(false);
    });

    it('should return false after navigating back to empty state', () => {
      const context: IDrillDownContext = {
        sourceTab: 'campaign-dashboard',
        targetTab: 'encounter-history',
      };

      navigationManager.navigateTo(context);
      navigationManager.navigateBack();

      expect(navigationManager.canNavigateBack()).toBe(false);
    });

    it('should return true with multiple breadcrumbs', () => {
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

      expect(navigationManager.canNavigateBack()).toBe(true);
    });
  });

  describe('getBreadcrumbs', () => {
    it('should return a copy of breadcrumbs', () => {
      const context: IDrillDownContext = {
        sourceTab: 'campaign-dashboard',
        targetTab: 'encounter-history',
      };

      navigationManager.navigateTo(context);

      const breadcrumbs1 = navigationManager.getBreadcrumbs();
      const breadcrumbs2 = navigationManager.getBreadcrumbs();

      expect(breadcrumbs1).toEqual(breadcrumbs2);
      expect(breadcrumbs1).not.toBe(breadcrumbs2);
    });

    it('should return empty array when no breadcrumbs', () => {
      const breadcrumbs = navigationManager.getBreadcrumbs();
      expect(breadcrumbs).toEqual([]);
    });

    it('should return breadcrumbs in correct order', () => {
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

      const breadcrumbs = navigationManager.getBreadcrumbs();
      expect(breadcrumbs[0].tab).toBe('campaign-dashboard');
      expect(breadcrumbs[1].tab).toBe('encounter-history');
    });

    it('should not allow modification of returned breadcrumbs', () => {
      const context: IDrillDownContext = {
        sourceTab: 'campaign-dashboard',
        targetTab: 'encounter-history',
      };

      navigationManager.navigateTo(context);

      const breadcrumbs = navigationManager.getBreadcrumbs();
      breadcrumbs.pop();

      const breadcrumbsAfter = navigationManager.getBreadcrumbs();
      expect(breadcrumbsAfter).toHaveLength(1);
    });
  });

  describe('reset', () => {
    it('should clear all breadcrumbs', () => {
      const context: IDrillDownContext = {
        sourceTab: 'campaign-dashboard',
        targetTab: 'encounter-history',
      };

      navigationManager.navigateTo(context);
      navigationManager.reset();

      const breadcrumbs = navigationManager.getBreadcrumbs();
      expect(breadcrumbs).toHaveLength(0);
    });

    it('should clear all scroll positions', () => {
      Object.defineProperty(window, 'scrollY', {
        value: 500,
        writable: true,
        configurable: true,
      });

      const context: IDrillDownContext = {
        sourceTab: 'campaign-dashboard',
        targetTab: 'encounter-history',
      };

      navigationManager.navigateTo(context);
      navigationManager.reset();

      expect(navigationManager.getScrollPosition('campaign-dashboard')).toBe(0);
    });

    it('should allow navigation after reset', () => {
      const context: IDrillDownContext = {
        sourceTab: 'campaign-dashboard',
        targetTab: 'encounter-history',
      };

      navigationManager.navigateTo(context);
      navigationManager.reset();
      navigationManager.navigateTo(context);

      const breadcrumbs = navigationManager.getBreadcrumbs();
      expect(breadcrumbs).toHaveLength(1);
    });
  });

  describe('saveScrollPosition', () => {
    it('should save scroll position for a tab', () => {
      navigationManager.saveScrollPosition('campaign-dashboard', 250);

      expect(navigationManager.getScrollPosition('campaign-dashboard')).toBe(
        250,
      );
    });

    it('should overwrite previous scroll position', () => {
      navigationManager.saveScrollPosition('campaign-dashboard', 250);
      navigationManager.saveScrollPosition('campaign-dashboard', 500);

      expect(navigationManager.getScrollPosition('campaign-dashboard')).toBe(
        500,
      );
    });

    it('should handle multiple tabs', () => {
      navigationManager.saveScrollPosition('campaign-dashboard', 250);
      navigationManager.saveScrollPosition('encounter-history', 500);
      navigationManager.saveScrollPosition('analysis-bugs', 750);

      expect(navigationManager.getScrollPosition('campaign-dashboard')).toBe(
        250,
      );
      expect(navigationManager.getScrollPosition('encounter-history')).toBe(
        500,
      );
      expect(navigationManager.getScrollPosition('analysis-bugs')).toBe(750);
    });

    it('should handle zero position', () => {
      navigationManager.saveScrollPosition('campaign-dashboard', 0);

      expect(navigationManager.getScrollPosition('campaign-dashboard')).toBe(0);
    });

    it('should handle large position values', () => {
      navigationManager.saveScrollPosition('campaign-dashboard', 999999);

      expect(navigationManager.getScrollPosition('campaign-dashboard')).toBe(
        999999,
      );
    });
  });

  describe('getScrollPosition', () => {
    it('should return saved scroll position', () => {
      navigationManager.saveScrollPosition('campaign-dashboard', 300);

      expect(navigationManager.getScrollPosition('campaign-dashboard')).toBe(
        300,
      );
    });

    it('should return 0 for unknown tab', () => {
      expect(navigationManager.getScrollPosition('unknown-tab')).toBe(0);
    });

    it('should return 0 when no position saved', () => {
      expect(navigationManager.getScrollPosition('campaign-dashboard')).toBe(0);
    });

    it('should return correct position after multiple saves', () => {
      navigationManager.saveScrollPosition('campaign-dashboard', 100);
      navigationManager.saveScrollPosition('campaign-dashboard', 200);
      navigationManager.saveScrollPosition('campaign-dashboard', 300);

      expect(navigationManager.getScrollPosition('campaign-dashboard')).toBe(
        300,
      );
    });
  });
});

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

describe('Scroll Position Preservation', () => {
  beforeEach(() => {
    navigationManager.reset();
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      writable: true,
      configurable: true,
    });
    window.scrollTo = jest.fn();
  });

  it('should save scroll position on navigation', () => {
    Object.defineProperty(window, 'scrollY', {
      value: 500,
      writable: true,
      configurable: true,
    });

    const context: IDrillDownContext = {
      sourceTab: 'campaign-dashboard',
      targetTab: 'encounter-history',
    };

    navigationManager.navigateTo(context);

    expect(navigationManager.getScrollPosition('campaign-dashboard')).toBe(500);
  });

  it('should restore scroll position on back navigation', () => {
    Object.defineProperty(window, 'scrollY', {
      value: 500,
      writable: true,
      configurable: true,
    });

    const context: IDrillDownContext = {
      sourceTab: 'campaign-dashboard',
      targetTab: 'encounter-history',
    };

    navigationManager.navigateTo(context);
    navigationManager.navigateBack();

    expect(window.scrollTo).toHaveBeenCalledWith(0, 500);
  });

  it('should persist scroll position across multiple navigations', () => {
    Object.defineProperty(window, 'scrollY', {
      value: 300,
      writable: true,
      configurable: true,
    });

    const context1: IDrillDownContext = {
      sourceTab: 'campaign-dashboard',
      targetTab: 'encounter-history',
    };

    navigationManager.navigateTo(context1);

    Object.defineProperty(window, 'scrollY', {
      value: 600,
      writable: true,
      configurable: true,
    });

    const context2: IDrillDownContext = {
      sourceTab: 'encounter-history',
      targetTab: 'analysis-bugs',
    };

    navigationManager.navigateTo(context2);

    expect(navigationManager.getScrollPosition('campaign-dashboard')).toBe(300);
    expect(navigationManager.getScrollPosition('encounter-history')).toBe(600);
  });

  it('should handle window undefined (SSR)', () => {
    const originalWindow = global.window;

    const context: IDrillDownContext = {
      sourceTab: 'campaign-dashboard',
      targetTab: 'encounter-history',
    };

    // @ts-ignore - intentionally removing window for SSR test
    delete global.window;

    expect(() => navigationManager.navigateTo(context)).not.toThrow();

    global.window = originalWindow;
  });
});

describe('createDrillDownHandler', () => {
  beforeEach(() => {
    navigationManager.reset();
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      writable: true,
      configurable: true,
    });
    window.scrollTo = jest.fn();
  });

  it('should return a function', () => {
    const handler = createDrillDownHandler({
      targetTab: 'encounter-history',
    });

    expect(typeof handler).toBe('function');
  });

  it('should call navigationManager.navigateTo when handler is called', () => {
    const spy = jest.spyOn(navigationManager, 'navigateTo');

    const handler = createDrillDownHandler({
      sourceTab: 'campaign-dashboard',
      targetTab: 'encounter-history',
    });

    handler();

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should use default sourceTab if not provided', () => {
    const handler = createDrillDownHandler({
      targetTab: 'encounter-history',
    });

    handler();

    const breadcrumbs = navigationManager.getBreadcrumbs();
    expect(breadcrumbs[0].tab).toBe('campaign-dashboard');
  });

  it('should pass filters correctly to navigationManager', () => {
    const filters = { outcome: 'victory' };
    const spy = jest.spyOn(navigationManager, 'navigateTo');

    const handler = createDrillDownHandler({
      sourceTab: 'campaign-dashboard',
      targetTab: 'encounter-history',
      filters,
    });

    handler();

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        filters,
      }),
    );

    spy.mockRestore();
  });

  it('should handle multiple handler calls independently', () => {
    const handler1 = createDrillDownHandler({
      sourceTab: 'campaign-dashboard',
      targetTab: 'encounter-history',
    });

    const handler2 = createDrillDownHandler({
      sourceTab: 'encounter-history',
      targetTab: 'analysis-bugs',
    });

    handler1();
    handler2();

    const breadcrumbs = navigationManager.getBreadcrumbs();
    expect(breadcrumbs).toHaveLength(2);
    expect(breadcrumbs[0].tab).toBe('campaign-dashboard');
    expect(breadcrumbs[1].tab).toBe('encounter-history');
  });
});
