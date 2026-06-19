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
