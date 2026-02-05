import { renderHook, act } from '@testing-library/react';

import { useServiceWorker } from '../useServiceWorker';

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
