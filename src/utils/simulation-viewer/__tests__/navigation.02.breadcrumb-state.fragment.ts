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
});
