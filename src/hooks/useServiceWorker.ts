import { useEffect, useState, useCallback } from 'react';

import { logger } from '@/utils/logger';

export interface ServiceWorkerState {
  isSupported: boolean;
  isInstalled: boolean;
  isWaiting: boolean;
  isActivated: boolean;
  registration: ServiceWorkerRegistration | null;
}

export interface ServiceWorkerReturn extends ServiceWorkerState {
  skipWaiting: () => void;
  cacheUrls: (urls: string[]) => void;
}

export function useServiceWorker(): ServiceWorkerReturn {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: typeof window !== 'undefined' && 'serviceWorker' in navigator,
    isInstalled: false,
    isWaiting: false,
    isActivated: false,
    registration: null,
  });

  useEffect(() => {
    if (!state.isSupported) {
      return;
    }

    // Listen for service worker controller change
    // This fires when a new service worker becomes active
    const handleControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange,
    );

    // Register service worker
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        setState((prev) => ({
          ...prev,
          isInstalled: true,
          registration,
        }));

        // Check for waiting service worker
        if (registration.waiting) {
          setState((prev) => ({
            ...prev,
            isWaiting: true,
          }));
        }

        // Listen for waiting service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                setState((prev) => ({
                  ...prev,
                  isWaiting: true,
                }));
              }
            });
          }
        });
      })
      .catch((error) => {
        logger.error('Service worker registration failed:', error);
      });

    // Check if service worker is already controlling the page
    if (navigator.serviceWorker.controller) {
      setState((prev) => ({
        ...prev,
        isActivated: true,
      }));
    }

    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange,
      );
    };
  }, [state.isSupported]);

  /**
   * Skip waiting and activate the new service worker immediately
   */
  const skipWaiting = useCallback(() => {
    if (state.registration && state.registration.waiting) {
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [state.registration]);

  /**
   * Manually trigger cache update for specific URLs
   */
  const cacheUrls = useCallback(
    (urls: string[]) => {
      if (state.registration && state.registration.active) {
        state.registration.active.postMessage({
          type: 'CACHE_URLS',
          urls,
        });
      }
    },
    [state.registration],
  );

  return {
    ...state,
    skipWaiting,
    cacheUrls,
  };
}
