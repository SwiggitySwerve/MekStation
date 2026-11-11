import type { StoreApi } from 'zustand';

import { renderHook, act } from '@testing-library/react';

import type { CampaignSaveState } from '@/stores/campaign/campaignSaveState';

import { useServiceWorker } from '../useServiceWorker';

jest.mock('@/stores/campaign/useCampaignPersistenceStore', () => {
  const { create } = jest.requireActual<typeof import('zustand')>('zustand');
  return {
    useCampaignPersistenceStore: create<{
      dirty: boolean;
      saveState: CampaignSaveState;
    }>(() => ({ dirty: false, saveState: 'saved' })),
  };
});

const { useCampaignPersistenceStore } = jest.requireMock<{
  useCampaignPersistenceStore: StoreApi<{
    dirty: boolean;
    saveState: CampaignSaveState;
  }>;
}>('@/stores/campaign/useCampaignPersistenceStore');

// Minimal mock for service worker - set up before any imports
const mockNavigator = {
  serviceWorker: {
    register: jest.fn(() =>
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
    useCampaignPersistenceStore.setState({ dirty: false, saveState: 'saved' });
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
      mockNavigator.serviceWorker.controller = {} as ServiceWorker;

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
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());
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
      mockNavigator.serviceWorker.controller = {} as ServiceWorker;
      const reloadPage = jest.fn();

      renderHook(() => useServiceWorker(reloadPage));
      act(() => {
        registeredControllerChangeHandler()();
      });

      expect(reloadPage).toHaveBeenCalledTimes(1);
    });

    it('waits through debounce and an in-flight save until the latest edits are acknowledged', () => {
      mockNavigator.serviceWorker.controller = {} as ServiceWorker;
      // Before PR 2 an edit can leave the badge state saved while dirty is true.
      useCampaignPersistenceStore.setState({ dirty: true, saveState: 'saved' });
      const reloadPage = jest.fn();
      renderHook(() => useServiceWorker(reloadPage));
      act(() => registeredControllerChangeHandler()());
      act(() => jest.advanceTimersByTime(2_000));
      expect(reloadPage).not.toHaveBeenCalled();
      act(() => useCampaignPersistenceStore.setState({ saveState: 'saving' }));
      // An acknowledgement of an older edit still leaves a newer edit dirty.
      act(() => useCampaignPersistenceStore.setState({ saveState: 'idle' }));
      expect(reloadPage).not.toHaveBeenCalled();
      act(() =>
        useCampaignPersistenceStore.setState({
          dirty: false,
          saveState: 'saved',
        }),
      );
      act(() => registeredControllerChangeHandler()());
      expect(reloadPage).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('reloads only once for repeated clean controller replacements', () => {
      mockNavigator.serviceWorker.controller = {} as ServiceWorker;
      const reloadPage = jest.fn();
      renderHook(() => useServiceWorker(reloadPage));
      act(() => {
        registeredControllerChangeHandler()();
        registeredControllerChangeHandler()();
      });
      expect(reloadPage).toHaveBeenCalledTimes(1);
    });

    it.each(['error', 'conflict'] as const)(
      'cancels the reload on save %s and preserves dirty edits',
      (saveState) => {
        mockNavigator.serviceWorker.controller = {} as ServiceWorker;
        useCampaignPersistenceStore.setState({
          dirty: true,
          saveState: 'idle',
        });
        const reloadPage = jest.fn();
        renderHook(() => useServiceWorker(reloadPage));
        act(() => registeredControllerChangeHandler()());
        act(() => useCampaignPersistenceStore.setState({ saveState }));
        expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
        expect(reloadPage).not.toHaveBeenCalled();
        expect(jest.getTimerCount()).toBe(0);
        act(() =>
          useCampaignPersistenceStore.setState({
            dirty: false,
            saveState: 'saved',
          }),
        );
        expect(reloadPage).not.toHaveBeenCalled();
      },
    );

    it('abandons the automatic reload after 10 seconds without discarding edits or reloading on a late save', () => {
      mockNavigator.serviceWorker.controller = {} as ServiceWorker;
      useCampaignPersistenceStore.setState({
        dirty: true,
        saveState: 'saving',
      });
      const reloadPage = jest.fn();
      renderHook(() => useServiceWorker(reloadPage));
      act(() => registeredControllerChangeHandler()());
      act(() => jest.advanceTimersByTime(10_000));
      expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
      expect(reloadPage).not.toHaveBeenCalled();
      act(() =>
        useCampaignPersistenceStore.setState({
          dirty: false,
          saveState: 'saved',
        }),
      );
      expect(reloadPage).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('removes the save subscription and timeout on unmount', () => {
      mockNavigator.serviceWorker.controller = {} as ServiceWorker;
      useCampaignPersistenceStore.setState({
        dirty: true,
        saveState: 'saving',
      });
      const reloadPage = jest.fn();
      const { unmount } = renderHook(() => useServiceWorker(reloadPage));
      act(() => registeredControllerChangeHandler()());
      unmount();
      act(() =>
        useCampaignPersistenceStore.setState({
          dirty: false,
          saveState: 'saved',
        }),
      );
      expect(reloadPage).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });

    it.each(['error', 'conflict'] as const)(
      'keeps an already dirty %s page open without starting a wait',
      (saveState) => {
        mockNavigator.serviceWorker.controller = {} as ServiceWorker;
        useCampaignPersistenceStore.setState({ dirty: true, saveState });
        const reloadPage = jest.fn();
        renderHook(() => useServiceWorker(reloadPage));
        act(() => registeredControllerChangeHandler()());
        expect(reloadPage).not.toHaveBeenCalled();
        expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
        expect(jest.getTimerCount()).toBe(0);
      },
    );
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
