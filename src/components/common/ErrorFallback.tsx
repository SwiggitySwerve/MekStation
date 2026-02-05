/**
 * Error Fallback Component
 *
 * Reusable fallback UI for ErrorBoundary components.
 * Matches the app's dark theme visual style.
 */

import React from 'react';

export interface ErrorFallbackProps {
  /** The error that was caught */
  error: Error;
  /** Callback to reset the error boundary */
  resetErrorBoundary: () => void;
  /** Optional component name for context */
  componentName?: string;
  /** Optional error ID for tracking */
  errorId?: string;
}

/**
 * Default error fallback component with dark theme styling
 */
export function ErrorFallback({
  error,
  resetErrorBoundary,
  componentName,
  errorId,
}: ErrorFallbackProps): React.ReactElement {
  return (
    <div className="bg-surface-deep flex min-h-[400px] items-center justify-center p-6">
      <div className="bg-surface-base border-border-theme-subtle w-full max-w-md space-y-4 rounded-lg border p-6">
        {/* Error Icon */}
        <div className="flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <svg
              className="h-8 w-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-2 text-center">
          <h3 className="text-text-theme-primary text-xl font-semibold">
            Something went wrong
          </h3>
          <p className="text-text-theme-secondary text-sm">
            {error.message || 'An unexpected error occurred'}
          </p>
          {componentName && (
            <p className="text-text-theme-tertiary text-xs">
              Component: {componentName}
            </p>
          )}
          {errorId && (
            <p className="text-text-theme-tertiary font-mono text-xs">
              Error ID: {errorId}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <button
            onClick={resetErrorBoundary}
            className="bg-accent text-surface-deep hover:bg-accent-hover flex-1 rounded-lg px-4 py-2 font-medium transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="bg-surface-raised text-text-theme-secondary hover:bg-surface-raised/80 border-border-theme flex-1 rounded-lg border px-4 py-2 transition-colors"
          >
            Reload Page
          </button>
        </div>

        {/* Development Info */}
        {process.env.NODE_ENV === 'development' && (
          <details className="border-border-theme-subtle border-t pt-2">
            <summary className="text-text-theme-secondary hover:text-text-theme-primary cursor-pointer text-sm">
              Error Details (Development)
            </summary>
            <pre className="bg-surface-deep text-text-theme-secondary border-border-theme mt-2 max-h-40 overflow-auto rounded border p-3 text-xs">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

/**
 * Compact error fallback for smaller sections (e.g., sidebar widgets)
 */
export function CompactErrorFallback({
  error,
  resetErrorBoundary,
}: Omit<ErrorFallbackProps, 'componentName' | 'errorId'>): React.ReactElement {
  return (
    <div className="bg-surface-raised border-border-theme rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-red-500/10">
          <svg
            className="h-5 w-5 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-text-theme-primary mb-1 text-sm font-medium">
            Error loading section
          </p>
          <p className="text-text-theme-secondary mb-2 text-xs break-words">
            {error.message}
          </p>
          <button
            onClick={resetErrorBoundary}
            className="bg-accent text-surface-deep hover:bg-accent-hover rounded px-3 py-1 text-xs transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
