import type { AppProps } from 'next/app';

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

import '../styles/globals.css';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import Layout from '../components/common/Layout';
import TopBar from '../components/common/TopBar';
import { GlobalStyleProvider } from '../components/GlobalStyleProvider';
import { InstallPrompt } from '../components/pwa/InstallPrompt';
import { ToastProvider } from '../components/shared/Toast';
import { useOfflineIndicator } from '../hooks/useOfflineIndicator';
import { useServiceWorker } from '../hooks/useServiceWorker';
import { exposeStoresForE2E } from '../lib/e2e/storeExposure';
import { installMatchLogMaintenance } from '../lib/p2p/matchLogMaintenance';
// Import only browser-safe services directly to avoid Node.js-only SQLite
import { getEquipmentRegistry } from '../services/equipment/EquipmentRegistry';
import { getIndexedDBService } from '../services/persistence/IndexedDBService';
import { logger } from '../utils/logger';

/**
 * Initialize browser-safe services
 * This avoids importing SQLite which is Node.js-only
 */
async function initializeBrowserServices(): Promise<void> {
  // Initialize IndexedDB (browser-safe)
  await getIndexedDBService().initialize();

  // Initialize equipment registry (browser-safe)
  const registry = getEquipmentRegistry();
  await registry.initialize();
}

function useProductionRouteTransitionRecovery(): void {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return undefined;
    }

    let fallbackTimer: number | undefined;

    const clearFallback = () => {
      if (fallbackTimer) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = undefined;
      }
    };

    const handleRouteChangeStart = (url: string) => {
      clearFallback();

      fallbackTimer = window.setTimeout(() => {
        const targetUrl = new URL(url, window.location.origin);
        window.location.assign(targetUrl.href);
      }, 3000);
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', clearFallback);
    router.events.on('routeChangeError', clearFallback);

    return () => {
      clearFallback();
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', clearFallback);
      router.events.off('routeChangeError', clearFallback);
    };
  }, [router.events]);
}

/**
 * App content wrapper that uses hooks requiring ToastProvider
 */
function AppContent({
  Component,
  pageProps,
  servicesReady,
}: {
  Component: AppProps['Component'];
  pageProps: Record<string, unknown>;
  servicesReady: boolean;
}): React.ReactElement {
  const router = useRouter();
  const pageKey = router.route || router.pathname;

  // Initialize offline indicator
  useOfflineIndicator();
  useProductionRouteTransitionRecovery();

  // Register service worker
  const sw = useServiceWorker();

  return (
    <ErrorBoundary key={pageKey} componentName={`App:${pageKey}`}>
      <Layout topBarComponent={<TopBar />}>
        <Component
          key={pageKey}
          {...(pageProps as AppProps['pageProps'])}
          servicesReady={servicesReady}
        />

        {/* PWA Install Prompt */}
        {sw.isSupported && <InstallPrompt />}
      </Layout>
    </ErrorBoundary>
  );
}

export default function App({
  Component,
  pageProps,
}: AppProps): React.ReactElement {
  const [servicesReady, setServicesReady] = useState(false);

  // Initialize browser services on app mount
  useEffect(() => {
    initializeBrowserServices()
      .then(() => {
        installMatchLogMaintenance();
        setServicesReady(true);
      })
      .catch((error) => {
        logger.error('Browser service initialization failed', error);
      });
  }, []);

  // Expose stores for E2E testing (only when NEXT_PUBLIC_E2E_MODE=true)
  useEffect(() => {
    exposeStoresForE2E();
  }, []);

  return (
    <GlobalStyleProvider>
      <ToastProvider>
        <AppContent
          Component={Component}
          pageProps={pageProps as Record<string, unknown>}
          servicesReady={servicesReady}
        />
      </ToastProvider>
    </GlobalStyleProvider>
  );
}
