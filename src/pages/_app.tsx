import type { AppProps } from 'next/app'
import { useState, useEffect } from 'react'
import '../styles/globals.css'
import Layout from '../components/common/Layout'
import Sidebar from '../components/common/Sidebar'
import { InstallPrompt } from '../components/pwa/InstallPrompt'
import { useServiceWorker } from '../hooks/useServiceWorker'
import { GlobalStyleProvider } from '../components/GlobalStyleProvider'
// Import only browser-safe services directly to avoid Node.js-only SQLite
import { getEquipmentRegistry } from '../services/equipment/EquipmentRegistry'
import { indexedDBService } from '../services/persistence/IndexedDBService'

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

export default function App({ Component, pageProps }: AppProps): React.ReactElement {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [servicesReady, setServicesReady] = useState(false)

  // Initialize browser services on app mount
  useEffect(() => {
    initializeBrowserServices()
      .then(() => setServicesReady(true))
      .catch(() => {
        // Browser service initialization failed - app will work with reduced functionality
      });
  }, []);

  // Register service worker
  const sw = useServiceWorker();

  return (
    <GlobalStyleProvider>
      <Layout
        sidebarComponent={
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
          />
        }
        isSidebarCollapsed={isSidebarCollapsed}
      >
        <Component {...pageProps} servicesReady={servicesReady} />

        {/* PWA Install Prompt */}
        {sw.isSupported && <InstallPrompt />}
      </Layout>
    </GlobalStyleProvider>
  )
}
