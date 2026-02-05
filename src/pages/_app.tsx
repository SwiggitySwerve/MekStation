import type { AppProps } from 'next/app';

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
// Import only browser-safe services directly to avoid Node.js-only SQLite
import { getEquipmentRegistry } from '../services/equipment/EquipmentRegistry';
import { indexedDBService } from '../services/persistence/IndexedDBService';

/**
 * Initialize browser-safe services
 * This avoids importing SQLite which is Node.js-only
 */
async function initializeBrowserServices(): Promise<void> {
  // Initialize IndexedDB (browser-safe)
  await indexedDBService.initialize();

  // Initialize equipment registry (browser-safe)
  const registry = getEquipmentRegistry();
  await registry.initialize();
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
  // Initialize offline indicator
  useOfflineIndicator();

  // Register service worker
  const sw = useServiceWorker();

  return (
    <ErrorBoundary componentName="App">
      <Layout topBarComponent={<TopBar />}>
        <Component
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
      .then(() => setServicesReady(true))
      .catch(() => {
        // Browser service initialization failed - app will work with reduced functionality
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
