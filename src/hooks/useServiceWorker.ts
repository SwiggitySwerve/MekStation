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

/**
 * Default page-reload action — module-level constant so the effect
 * dependency stays referentially stable when no override is injected.
 */
const defaultReloadPage = (): void => {
  window.location.reload();
};

export function useServiceWorker(
  /**
   * Injectable reload action (tests pass a spy; production uses the
   * default `window.location.reload`).
   */
  reloadPage: () => void = defaultReloadPage,
): ServiceWorkerReturn {
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

    // Reload ONLY when an EXISTING controller is replaced — i.e. a new
    // service worker took over after an update. On the very first install
    // there is no previous controller, but the SW's `clients.claim()`
    // (service-worker.js:39) still fires `controllerchange`; the old
    // unconditional reload threw away every fresh visitor's first
    // interaction seconds after first paint — and poisoned e2e runs,
    // where every Playwright test opens a fresh browser context and the
    // first-install reload landed mid-test (e2e triage RC9/RC14).
    let hadController = Boolean(navigator.serviceWorker.controller);
    const handleControllerChange = () => {
      if (!hadController) {
        // First install just claimed the page — keep it, no reload.
        hadController = true;
        return;
      }
      reloadPage();
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
  }, [state.isSupported, reloadPage]);

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
