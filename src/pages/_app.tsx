import type { AppProps } from 'next/app'
import { useState, useEffect } from 'react'
import '../styles/globals.css'
import Layout from '../components/common/Layout'
import Sidebar from '../components/common/Sidebar'
import { initializeWeaponRangeValidation } from '../utils/weaponRangeValidation'

export default function App({ Component, pageProps }: AppProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Initialize weapon range validation on app startup
  useEffect(() => {
    try {
      initializeWeaponRangeValidation();
      console.log('✓ Weapon range validation completed successfully');
    } catch (error) {
      console.error('CRITICAL: Application startup failed due to weapon range validation:', error);
      // In a production app, you might want to show an error screen here
      // For now, we'll just log the error but allow the app to continue
    }
  }, []);

  return (
    <Layout
      sidebarComponent={
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
      }
      isSidebarCollapsed={isSidebarCollapsed}
    >
      <Component {...pageProps} />
    </Layout>
  )
}
