import React, { ReactNode } from 'react';
import Head from 'next/head';
import { useMobileSidebarStore } from '@/stores/useNavigationStore';
import { HamburgerIcon } from './icons/NavigationIcons';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  sidebarComponent?: ReactNode; // Global sidebar component
  isSidebarCollapsed?: boolean; // Prop for controlling sidebar width/margins on desktop
  secondarySidebar?: ReactNode; // Optional page-specific sidebar
  /** Hide the mobile header (useful for pages with their own mobile navigation like customizer) */
  hideMobileHeader?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  title = 'MekStation',
  sidebarComponent,
  isSidebarCollapsed,
  secondarySidebar,
  hideMobileHeader = false,
}) => {
  const openMobileSidebar = useMobileSidebarStore((s) => s.open);
  
  // Determine margin based on sidebar presence and state
  // Sidebar widths: collapsed = w-16 (4rem/64px), expanded = w-56 (14rem/224px)
  // On mobile (<lg): no margin, sidebar is an overlay
  // On desktop (lg+): margin applied to push content
  const hasSidebar = !!sidebarComponent;
  const contentAndFooterMargin = hasSidebar 
    ? (isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-56')
    : '';

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>

      <div className="flex flex-col h-screen bg-surface-deep overflow-hidden">
        {/* Mobile header - shown on mobile only, hidden on desktop */}
        {hasSidebar && !hideMobileHeader && (
          <header className="lg:hidden flex items-center justify-between h-12 px-3 bg-surface-base border-b border-border-theme-subtle print:hidden">
            <span className="text-sm font-semibold text-text-theme-primary truncate">
              {title}
            </span>
            <button
              onClick={openMobileSidebar}
              className="p-2 -mr-2 rounded-lg text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised/50 transition-colors"
              aria-label="Open navigation menu"
            >
              <HamburgerIcon />
            </button>
          </header>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Global sidebar - fixed position component */}
          {sidebarComponent && <div className="print:hidden">{sidebarComponent}</div>}

          {/* Main content area with optional secondary sidebar */}
          <div className={`flex-1 flex ${contentAndFooterMargin} transition-all duration-300 ease-in-out overflow-hidden`}>
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
