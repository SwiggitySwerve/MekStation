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
});
