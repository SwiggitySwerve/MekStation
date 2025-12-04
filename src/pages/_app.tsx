import type { AppProps } from 'next/app'
import { useState } from 'react'
import '../styles/globals.css'
import Layout from '../components/common/Layout'
import Sidebar from '../components/common/Sidebar'

export default function App({ Component, pageProps }: AppProps): React.ReactElement {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

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
