import Link from 'next/link';
/**
 * PageLayout Component
 * Consistent page layout wrapper with optional back navigation.
 */
import React from 'react';

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
  const normalizedBackLink =
    typeof backLink === 'string'
      ? { href: backLink, label: backLabel }
      : backLink;

  const BackIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="mr-2 h-4 w-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
      />
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
        {showBackLink &&
          (onBack ? (
            <button
              onClick={onBack}
              className="text-text-theme-secondary hover:text-accent mb-6 inline-flex items-center transition-colors"
            >
              <BackIcon />
              {normalizedBackLink?.label || backLabel}
            </button>
          ) : (
            normalizedBackLink && (
              <Link
                href={normalizedBackLink.href}
                className="text-text-theme-secondary hover:text-accent mb-6 inline-flex items-center transition-colors"
              >
                <BackIcon />
                {normalizedBackLink.label}
              </Link>
            )
          ))}

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1
                className="text-text-theme-primary mb-2 text-3xl font-bold"
                data-testid="page-title"
              >
                {title}
              </h1>
              {subtitle && (
                <p className="text-text-theme-secondary">{subtitle}</p>
              )}
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
export function PageLoading({
  message = 'Loading...',
}: {
  message?: string;
}): React.ReactElement {
  return (
    <div className="bg-surface-deep flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="border-accent mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
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
    <div className="bg-surface-deep flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md rounded-xl border border-red-600/30 bg-red-900/20 p-8 text-center">
        <h2 className="mb-2 text-xl font-semibold text-red-400">{title}</h2>
        <p className="text-text-theme-secondary mb-6">{message}</p>
        {backLink && (
          <Link
            href={backLink}
            className="bg-surface-raised hover:bg-border-theme text-text-theme-primary inline-block rounded-lg px-6 py-2 transition-colors"
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

export function EmptyState({
  icon,
  title,
  message,
  action,
  'data-testid': testId,
}: EmptyStateProps): React.ReactElement {
  return (
    <div
      className="bg-surface-raised/30 text-text-theme-secondary border-border-theme rounded-lg border border-dashed p-8 text-center"
      data-testid={testId}
    >
      {icon && <div className="mb-3">{icon}</div>}
      <p className="font-medium">{title}</p>
      {message && <p className="mt-1 text-sm">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default PageLayout;
