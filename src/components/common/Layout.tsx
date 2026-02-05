import Head from 'next/head';
import React, { ReactNode } from 'react';

import { MobileBottomNav } from './MobileBottomNav';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  topBarComponent?: ReactNode; // Global top bar navigation component
  secondarySidebar?: ReactNode; // Optional page-specific sidebar
}

const Layout: React.FC<LayoutProps> = ({
  children,
  title = 'MekStation',
  topBarComponent,
  secondarySidebar,
}) => {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>

      <div className="bg-surface-deep flex h-screen flex-col overflow-hidden">
        {/* Top bar navigation */}
        {topBarComponent}

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Optional page-specific secondary sidebar */}
          {secondarySidebar && (
            <aside className="bg-surface-base border-border-theme-subtle w-64 overflow-auto border-r print:hidden">
              {secondarySidebar}
            </aside>
          )}

          {/* Main content */}
          <main className="bg-surface-deep flex-1 overflow-auto pb-16 md:pb-0">
            {children}
          </main>
        </div>

        {/* Mobile bottom navigation */}
        <MobileBottomNav />
      </div>
    </>
  );
};

export default Layout;
