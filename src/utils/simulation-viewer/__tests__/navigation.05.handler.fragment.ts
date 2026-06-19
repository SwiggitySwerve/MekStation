import {
  navigationManager,
  createDrillDownHandler,
  IDrillDownContext,
  TabType,
} from '../navigation';

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
