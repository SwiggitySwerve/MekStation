import type { AppProps } from 'next/app'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import '../styles/globals.css'
import Layout from '../components/common/Layout'
import Sidebar from '../components/common/Sidebar'
import { InstallPrompt } from '../components/pwa/InstallPrompt'
import { useServiceWorker } from '../hooks/useServiceWorker'
import { GlobalStyleProvider } from '../components/GlobalStyleProvider'
import { ToastProvider } from '../components/shared/Toast'
import { usePersistedState, STORAGE_KEYS } from '../hooks/usePersistedState'
import { useMobileSidebarStore } from '../stores/useNavigationStore'
// Import only browser-safe services directly to avoid Node.js-only SQLite
import { getEquipmentRegistry } from '../services/equipment/EquipmentRegistry'
import { indexedDBService } from '../services/persistence/IndexedDBService'

/** Breakpoint for mobile (below this = auto-collapse on navigation) */
const MOBILE_BREAKPOINT = 768;

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
  const router = useRouter();
  
  // Persist sidebar collapsed state to localStorage
  const [isSidebarCollapsed, setIsSidebarCollapsed] = usePersistedState(
    STORAGE_KEYS.SIDEBAR_COLLAPSED,
    false // Default: expanded on desktop
  );
  
// Mobile sidebar drawer state from store (shared across app)
  const { close: closeMobileSidebar } = useMobileSidebarStore();
  
  const [servicesReady, setServicesReady] = useState(false)
  
  // Auto-collapse/close sidebar on mobile after navigation
  const handleRouteChange = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT) {
      setIsSidebarCollapsed(true);
      closeMobileSidebar();
    }
  }, [setIsSidebarCollapsed, closeMobileSidebar]);
  
  // Listen for route changes to auto-collapse on mobile
  useEffect(() => {
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events, handleRouteChange]);

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

  // Mobile header is now shown on ALL pages for consistency
  // Previously customizer had hideMobileHeader=true, but that caused jarring UX 
  // with menu button appearing in different positions

  return (
    <GlobalStyleProvider>
      <ToastProvider>
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
      </ToastProvider>
    </GlobalStyleProvider>
  )
}
