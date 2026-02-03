/**
 * PageLayout Component
 * Consistent page layout wrapper with optional back navigation.
 */
import React from 'react';
import Link from 'next/link';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  maxWidth?: 'default' | 'narrow' | 'wide' | 'full';
  /** Breadcrumb navigation - when provided, replaces backLink */
  breadcrumbs?: BreadcrumbItem[];
  /** Back link - can be object for Link or string href. Ignored when breadcrumbs are provided. */
  backLink?: string | { href: string; label: string };
  /** Label for back link when backLink is a string */
  backLabel?: string;
  /** Callback for custom back navigation (e.g., state change instead of route) */
  onBack?: () => void;
  headerContent?: React.ReactNode;
  gradient?: boolean;
}

const maxWidthClasses: Record<string, string> = {
  default: 'max-w-7xl',
  narrow: 'max-w-5xl',
  wide: 'max-w-screen-2xl',
  full: 'max-w-full',
};

export function PageLayout({
  children,
  title,
  subtitle,
  maxWidth = 'default',
  breadcrumbs,
  backLink,
  backLabel = 'Back',
  onBack,
  headerContent,
  gradient = false,
}: PageLayoutProps): React.ReactElement {
  const bgClasses = gradient
    ? 'min-h-screen bg-gradient-to-br from-surface-deep via-surface-base to-surface-deep'
    : 'min-h-screen bg-surface-deep';

  // Normalize backLink
  const normalizedBackLink = typeof backLink === 'string' 
    ? { href: backLink, label: backLabel }
    : backLink;

  const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );

  const showBackLink = !breadcrumbs && (normalizedBackLink || onBack);

  return (
    <div className={`${bgClasses} p-6`}>
      <div className={`${maxWidthClasses[maxWidth]} mx-auto`}>
        {/* Breadcrumb navigation - replaces backLink when provided */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb items={breadcrumbs} className="mb-4" />
        )}

        {/* Back navigation - only shown when no breadcrumbs, button if onBack provided, Link otherwise */}
        {showBackLink && (
          onBack ? (
            <button
              onClick={onBack}
              className="inline-flex items-center text-text-theme-secondary hover:text-accent transition-colors mb-6"
            >
              <BackIcon />
              {normalizedBackLink?.label || backLabel}
            </button>
          ) : normalizedBackLink && (
            <Link
              href={normalizedBackLink.href}
              className="inline-flex items-center text-text-theme-secondary hover:text-accent transition-colors mb-6"
            >
              <BackIcon />
              {normalizedBackLink.label}
            </Link>
          )
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-text-theme-primary mb-2" data-testid="page-title">{title}</h1>
              {subtitle && <p className="text-text-theme-secondary">{subtitle}</p>}
            </div>
            {headerContent}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}

// Loading state component
export function PageLoading({ message = 'Loading...' }: { message?: string }): React.ReactElement {
  return (
    <div className="min-h-screen bg-surface-deep flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-theme-secondary">{message}</p>
      </div>
    </div>
  );
}

// Error state component
interface PageErrorProps {
  title?: string;
  message: string;
  backLink?: string;
  backLabel?: string;
}

export function PageError({
  title = 'Error',
  message,
  backLink,
  backLabel = 'Go Back',
}: PageErrorProps): React.ReactElement {
  return (
    <div className="min-h-screen bg-surface-deep flex items-center justify-center p-8">
      <div className="bg-red-900/20 border border-red-600/30 rounded-xl p-8 max-w-md text-center">
        <h2 className="text-xl font-semibold text-red-400 mb-2">{title}</h2>
        <p className="text-text-theme-secondary mb-6">{message}</p>
        {backLink && (
          <Link
            href={backLink}
            className="inline-block bg-surface-raised hover:bg-border-theme text-text-theme-primary px-6 py-2 rounded-lg transition-colors"
          >
            {backLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

// Empty state component
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
  'data-testid'?: string;
}

export function EmptyState({ icon, title, message, action, 'data-testid': testId }: EmptyStateProps): React.ReactElement {
  return (
    <div className="bg-surface-raised/30 rounded-lg p-8 text-center text-text-theme-secondary border border-dashed border-border-theme" data-testid={testId}>
      {icon && <div className="mb-3">{icon}</div>}
      <p className="font-medium">{title}</p>
      {message && <p className="text-sm mt-1">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default PageLayout;

