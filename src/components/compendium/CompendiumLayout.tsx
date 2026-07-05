import Link from 'next/link';
/**
 * CompendiumLayout Component
 * Provides consistent layout and breadcrumb navigation for all compendium pages.
 */
import React from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface CompendiumLayoutProps {
  /** Page title displayed in header */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Breadcrumb trail - last item is current page (no href) */
  breadcrumbs?: BreadcrumbItem[];
  /** Page content */
  children: React.ReactNode;
  /** Optional header actions (right side) */
  headerActions?: React.ReactNode;
  /** Max width variant */
  maxWidth?: 'default' | 'wide' | 'full';
}

const maxWidthClasses = {
  default: 'max-w-5xl',
  wide: 'max-w-7xl',
  full: 'max-w-full',
};

export function CompendiumLayout({
  title,
  subtitle,
  breadcrumbs = [],
  children,
  headerActions,
  maxWidth = 'default',
}: CompendiumLayoutProps): React.ReactElement {
  // Default breadcrumbs start with Compendium
  const fullBreadcrumbs: BreadcrumbItem[] = [
    { label: 'Compendium', href: '/compendium' },
    ...breadcrumbs,
  ];

  return (
    <div className="from-surface-deep via-surface-base to-surface-deep min-h-screen bg-gradient-to-br">
      <div className={`${maxWidthClasses[maxWidth]} mx-auto px-4 py-6 sm:px-6`}>
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex items-center gap-2 text-sm">
            {fullBreadcrumbs.map((crumb, index) => {
              const isLast = index === fullBreadcrumbs.length - 1;
              const isFirst = index === 0;

              return (
                <li key={index} className="flex items-center gap-2">
                  {!isFirst && (
                    <ChevronIcon className="text-text-theme-muted h-3 w-3" />
                  )}
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="text-text-theme-secondary hover:text-accent transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={
                        isLast
                          ? 'text-text-theme-primary font-medium'
                          : 'text-text-theme-secondary'
                      }
                    >
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Page Header */}
        <header className="mb-6">
          <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-text-theme-primary text-2xl font-bold tracking-wide break-words">
                {title}
              </h1>
              {subtitle && (
                <p className="text-text-theme-secondary mt-1 break-words">
                  {subtitle}
                </p>
              )}
            </div>
            {headerActions && (
              <div className="min-w-0 sm:flex-shrink-0">{headerActions}</div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main>{children}</main>
      </div>
    </div>
  );
}

function ChevronIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 4.5l7.5 7.5-7.5 7.5"
      />
    </svg>
  );
}

export default CompendiumLayout;
