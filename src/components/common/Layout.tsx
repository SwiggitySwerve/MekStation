import React, { ReactNode } from 'react';
import Head from 'next/head';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  sidebarComponent?: ReactNode; // Global sidebar component
  isSidebarCollapsed?: boolean; // New prop for controlling margins
  secondarySidebar?: ReactNode; // Optional page-specific sidebar
}

const Layout: React.FC<LayoutProps> = ({
  children,
  title = 'BattleTech Editor',
  sidebarComponent,
  isSidebarCollapsed,
  secondarySidebar,
}) => {
  // Determine margin based on sidebar presence and state for md screens and up
  // Only apply margins when sidebar components are actually provided
  const hasSidebar = !!sidebarComponent;
  const contentAndFooterMargin = hasSidebar 
    ? (isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64')
    : 'ml-0';

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        {/* Add other meta tags, favicons etc. here */}
      </Head>

      <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          {/* Global sidebar is expected to be a fixed position component, rendered here */}
          {sidebarComponent && <div className="print:hidden">{sidebarComponent}</div>}

          {/* Main content area with optional secondary sidebar */}
          <div className={`flex-1 flex ml-0 ${contentAndFooterMargin} transition-all duration-300 ease-in-out overflow-hidden`}>
            {/* Optional page-specific secondary sidebar */}
            {secondarySidebar && (
              <aside className="w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 print:hidden overflow-auto">
                {secondarySidebar}
              </aside>
            )}
            
            {/* Main content */}
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </div>
    </>
  );
};

export default Layout;
