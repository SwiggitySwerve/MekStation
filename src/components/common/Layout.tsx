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
  title = 'MekStation',
  sidebarComponent,
  isSidebarCollapsed,
  secondarySidebar,
}) => {
  // Determine margin based on sidebar presence and state
  // Sidebar widths: collapsed = w-16 (4rem), expanded = w-56 (14rem)
  const hasSidebar = !!sidebarComponent;
  const contentAndFooterMargin = hasSidebar 
    ? (isSidebarCollapsed ? 'md:ml-16' : 'md:ml-56')
    : 'ml-0';

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>

      <div className="flex flex-col h-screen bg-surface-deep overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          {/* Global sidebar - fixed position component */}
          {sidebarComponent && <div className="print:hidden">{sidebarComponent}</div>}

          {/* Main content area with optional secondary sidebar */}
          <div className={`flex-1 flex ml-0 ${contentAndFooterMargin} transition-all duration-300 ease-in-out overflow-hidden`}>
            {/* Optional page-specific secondary sidebar */}
            {secondarySidebar && (
              <aside className="w-64 bg-surface-base border-r border-border-theme-subtle print:hidden overflow-auto">
                {secondarySidebar}
              </aside>
            )}

            {/* Main content */}
            <main className="flex-1 overflow-auto bg-surface-deep">
              {children}
            </main>
          </div>
        </div>
      </div>
    </>
  );
};

export default Layout;
