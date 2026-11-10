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

export function useServiceWorker(
  /**
   * Injectable reload action (tests pass a spy; production uses the
   * default `window.location.reload`).
   */
  reloadPage?: () => void,
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

    const build = window.__NEXT_DATA__?.buildId;
    const workerPath =
      typeof build === 'string' && build.length > 0
        ? `/service-worker.js?build=${encodeURIComponent(build)}`
        : '/service-worker.js';
    const workerUrl = new URL(workerPath, window.location.href).href;
    const reportLoadedBuild = () => {
      navigator.serviceWorker.controller?.postMessage({
        type: 'BUILD_READY',
        build,
      });
    };
    const handleWorkerMessage = (event: MessageEvent<unknown>) => {
      if (
        typeof event.data === 'object' &&
        event.data !== null &&
        'type' in event.data &&
        event.data.type === 'REPORT_BUILD'
      )
        reportLoadedBuild();
    };
    const offerUpdate = (worker: ServiceWorker | null) => {
      if (!worker) return;
      setState((prev) => ({ ...prev, isWaiting: true }));
      // A page already loaded from the network can safely activate its build.
      // An old page keeps the update waiting until reload or skipWaiting().
      if (worker.scriptURL === workerUrl) {
        worker.postMessage({ type: 'SKIP_WAITING' });
      }
    };

    // Reload ONLY when an EXISTING controller is replaced — i.e. a new
    // service worker took over after an update. On the very first install
    // there is no previous controller, but the SW's `clients.claim()`
    // still fires `controllerchange`; the old
    // unconditional reload threw away every fresh visitor's first
    // interaction seconds after first paint — and poisoned e2e runs,
    // where every Playwright test opens a fresh browser context and the
    // first-install reload landed mid-test (e2e triage RC9/RC14).
    let hadController = Boolean(navigator.serviceWorker.controller);
    const handleControllerChange = () => {
      reportLoadedBuild();
      if (!hadController) {
        // First install just claimed the page — keep it, no reload.
        hadController = true;
        return;
      }
      if (reloadPage) {
        reloadPage();
      } else {
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange,
    );
    navigator.serviceWorker.addEventListener('message', handleWorkerMessage);

    // Register service worker
    navigator.serviceWorker
      .register(workerPath)
      .then((registration) => {
        setState((prev) => ({
          ...prev,
          isInstalled: true,
          registration,
        }));

        // Check for waiting service worker
        reportLoadedBuild();
        offerUpdate(registration.waiting);

        // Listen for waiting service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                offerUpdate(newWorker);
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
      navigator.serviceWorker.removeEventListener(
        'message',
        handleWorkerMessage,
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
