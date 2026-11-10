import { renderHook, act } from '@testing-library/react';

import { useServiceWorker } from '../useServiceWorker';

function workerDouble(overrides: Partial<ServiceWorker> = {}): ServiceWorker {
  return {
    scriptURL: `${window.location.origin}/service-worker.js?build=old`,
    state: 'activated',
    onstatechange: null,
    onerror: null,
    postMessage: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(() => true),
    ...overrides,
  };
}

// Minimal mock for service worker - set up before any imports
const mockNavigator = {
  serviceWorker: {
    register: jest.fn(
      (): Promise<Partial<ServiceWorkerRegistration>> =>
        Promise.resolve({
          installing: null,
          waiting: null,
          active: null,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        }),
    ),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    controller: null as ServiceWorker | null,
  },
};

// Set up navigator before importing the hook
Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true,
});

describe('useServiceWorker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset controller
    mockNavigator.serviceWorker.controller = null;
    Reflect.deleteProperty(window, '__NEXT_DATA__');
    mockNavigator.serviceWorker.register.mockResolvedValue({
      installing: null,
      waiting: null,
      active: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });
  });

  describe('Service Worker Support Detection', () => {
    it('should detect service worker support when available', () => {
      // This test verifies the hook initializes correctly
      // when serviceWorker is supported
      const { result } = renderHook(() => useServiceWorker());

      expect(result.current.isSupported).toBe(true);
      expect(result.current).toBeDefined();
    });
  });

  describe('Service Worker Registration', () => {
    it('registers a distinct script URL for the Next build', () => {
      Object.defineProperty(window, '__NEXT_DATA__', {
        configurable: true,
        value: { buildId: 'build-A' },
      });
      renderHook(() => useServiceWorker());
      expect(mockNavigator.serviceWorker.register).toHaveBeenCalledWith(
        '/service-worker.js?build=build-A',
      );
    });

    it.each([
      ['build-A', false],
      ['build-B', true],
    ])(
      'only activates a waiting update after this page has loaded its build: %s',
      async (buildId, shouldActivate) => {
        Object.defineProperty(window, '__NEXT_DATA__', {
          configurable: true,
          value: { buildId },
        });
        const postMessage = jest.fn();
        const waiting = workerDouble({
          scriptURL: `${window.location.origin}/service-worker.js?build=build-B`,
          postMessage,
        });
        mockNavigator.serviceWorker.register.mockResolvedValueOnce({
          waiting,
          addEventListener: jest.fn(),
        });
        const { result } = renderHook(() => useServiceWorker());
        await act(async () => undefined);
        expect(result.current.isWaiting).toBe(true);
        expect(postMessage).toHaveBeenCalledTimes(shouldActivate ? 1 : 0);
        act(() => result.current.skipWaiting());
        expect(postMessage).toHaveBeenLastCalledWith({ type: 'SKIP_WAITING' });
      },
    );

    it('reports the loaded page build to its controller before reloading on takeover', () => {
      Object.defineProperty(window, '__NEXT_DATA__', {
        configurable: true,
        value: { buildId: 'build-B' },
      });
      const postMessage = jest.fn();
      mockNavigator.serviceWorker.controller = workerDouble({ postMessage });
      const reload = jest.fn(() => {
        expect(postMessage).toHaveBeenCalledWith({
          type: 'BUILD_READY',
          build: 'build-B',
        });
      });
      renderHook(() => useServiceWorker(reload));
      const handler =
        mockNavigator.serviceWorker.addEventListener.mock.calls.find(
          (call: unknown[]) => call[0] === 'controllerchange',
        )?.[1];
      expect(handler).toBeDefined();
      act(() => handler());
      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('keeps an updatefound worker waiting on an old page and reports its build after a worker restart', async () => {
      Object.defineProperty(window, '__NEXT_DATA__', {
        configurable: true,
        value: { buildId: 'build-A' },
      });
      const report = jest.fn();
      mockNavigator.serviceWorker.controller = workerDouble({
        postMessage: report,
      });
      const registrationListeners = new Map<string, () => void>();
      const workerListener = jest.fn();
      const activate = jest.fn();
      const installing = workerDouble({
        state: 'installed',
        scriptURL: `${window.location.origin}/service-worker.js?build=build-B`,
        postMessage: activate,
        addEventListener: workerListener,
      });
      mockNavigator.serviceWorker.register.mockResolvedValueOnce({
        installing,
        waiting: null,
        addEventListener: jest.fn((name: string, callback: () => void) =>
          registrationListeners.set(name, callback),
        ),
      });
      const { result, unmount } = renderHook(() => useServiceWorker());
      await act(async () => undefined);
      act(() => registrationListeners.get('updatefound')?.());
      act(() =>
        workerListener.mock.calls.find(
          (call: unknown[]) => call[0] === 'statechange',
        )?.[1](),
      );
      expect(result.current.isWaiting).toBe(true);
      expect(activate).not.toHaveBeenCalled();
      report.mockClear();
      const messageHandler =
        mockNavigator.serviceWorker.addEventListener.mock.calls.find(
          (call: unknown[]) => call[0] === 'message',
        )?.[1];
      act(() => messageHandler({ data: { type: 'REPORT_BUILD' } }));
      expect(report).toHaveBeenCalledWith({
        type: 'BUILD_READY',
        build: 'build-A',
      });
      unmount();
      expect(
        mockNavigator.serviceWorker.removeEventListener,
      ).toHaveBeenCalledWith('message', messageHandler);
    });

    it.each([undefined, null, '', 123])(
      'registers without a build when bootstrap identity is absent or not a string: %s',
      (buildId) => {
        Object.defineProperty(window, '__NEXT_DATA__', {
          configurable: true,
          value: { buildId },
        });
        renderHook(() => useServiceWorker());
        expect(mockNavigator.serviceWorker.register).toHaveBeenCalledWith(
          '/service-worker.js',
        );
      },
    );
    it('should attempt to register service worker on mount', () => {
      renderHook(() => useServiceWorker());

      expect(mockNavigator.serviceWorker.register).toHaveBeenCalledWith(
        '/service-worker.js',
      );
    });

    it('should call serviceWorker.register only once', () => {
      renderHook(() => useServiceWorker());

      expect(mockNavigator.serviceWorker.register).toHaveBeenCalledTimes(1);
    });

    it('keeps registration stable after asynchronous state updates and rerenders', async () => {
      const { rerender, unmount } = renderHook(() => useServiceWorker());
      await act(async () => undefined);
      rerender();
      await act(async () => undefined);
      expect(mockNavigator.serviceWorker.register).toHaveBeenCalledTimes(1);
      unmount();
    });
  });

  describe('Hook Interface', () => {
    it('should provide all required methods and state', async () => {
      const { result } = renderHook(() => useServiceWorker());

      // Wait for registration to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // State properties
      expect(result.current).toHaveProperty('isSupported', expect.any(Boolean));
      expect(result.current).toHaveProperty('isInstalled', expect.any(Boolean));
      expect(result.current).toHaveProperty('isWaiting', expect.any(Boolean));
      expect(result.current).toHaveProperty('isActivated', expect.any(Boolean));
      expect(result.current).toHaveProperty('registration', expect.anything());

      // Methods
      expect(result.current).toHaveProperty(
        'skipWaiting',
        expect.any(Function),
      );
      expect(result.current).toHaveProperty('cacheUrls', expect.any(Function));
    });

    it('should have skipWaiting method that does not throw', () => {
      const { result } = renderHook(() => useServiceWorker());

      expect(() => {
        result.current.skipWaiting();
      }).not.toThrow();
    });

    it('should have cacheUrls method that does not throw', () => {
      const { result } = renderHook(() => useServiceWorker());

      expect(() => {
        result.current.cacheUrls(['/test']);
      }).not.toThrow();
    });
  });

  describe('Controller Detection', () => {
    it('should detect when service worker is controlling the page', () => {
      mockNavigator.serviceWorker.controller = workerDouble();

      const { result } = renderHook(() => useServiceWorker());

      expect(result.current.isActivated).toBe(true);
    });

    it('should set up controllerchange event listener', () => {
      renderHook(() => useServiceWorker());

      expect(mockNavigator.serviceWorker.addEventListener).toHaveBeenCalledWith(
        'controllerchange',
        expect.any(Function),
      );
    });
  });

  describe('Controller-change reload policy (e2e triage RC9/RC14)', () => {
    /** Grab the controllerchange handler the hook registered. */
    function registeredControllerChangeHandler(): () => void {
      const call = mockNavigator.serviceWorker.addEventListener.mock.calls.find(
        (c: unknown[]) => c[0] === 'controllerchange',
      );
      expect(call).toBeDefined();
      return call![1] as () => void;
    }

    it('does NOT reload on the first install (no pre-existing controller)', () => {
      // First visit: no controller yet. The SW's clients.claim() still
      // fires controllerchange — reloading here dumps every fresh
      // visitor's first interaction seconds after first paint (and made
      // every fresh-context Playwright test reload mid-test).
      mockNavigator.serviceWorker.controller = null;
      const reloadPage = jest.fn();

      renderHook(() => useServiceWorker(reloadPage));
      act(() => {
        registeredControllerChangeHandler()();
      });

      expect(reloadPage).not.toHaveBeenCalled();
    });

    it('reloads when an existing controller is replaced (SW update)', () => {
      mockNavigator.serviceWorker.controller = workerDouble();
      const reloadPage = jest.fn();

      renderHook(() => useServiceWorker(reloadPage));
      act(() => {
        registeredControllerChangeHandler()();
      });

      expect(reloadPage).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle unmount gracefully', () => {
      const { unmount } = renderHook(() => useServiceWorker());

      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useServiceWorker());
      const { result: result2 } = renderHook(() => useServiceWorker());

      expect(result1.current.isSupported).toBe(true);
      expect(result2.current.isSupported).toBe(true);
    });

    it('should handle registration errors gracefully', () => {
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockNavigator.serviceWorker.register = jest.fn(() =>
        Promise.reject(new Error('Registration failed')),
      );

      expect(() => {
        renderHook(() => useServiceWorker());
      }).not.toThrow();

      consoleError.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const { unmount } = renderHook(() => useServiceWorker());

      unmount();

      expect(
        mockNavigator.serviceWorker.removeEventListener,
      ).toHaveBeenCalledWith('controllerchange', expect.any(Function));
    });
  });
});
