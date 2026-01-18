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
    <div className="min-h-[400px] flex items-center justify-center p-6 bg-surface-deep">
      <div className="max-w-md w-full bg-surface-base border border-border-theme-subtle rounded-lg p-6 space-y-4">
        {/* Error Icon */}
        <div className="flex items-center justify-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
            <svg 
              className="w-8 h-8 text-red-500" 
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
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-text-theme-primary">
            Something went wrong
          </h3>
          <p className="text-sm text-text-theme-secondary">
            {error.message || 'An unexpected error occurred'}
          </p>
          {componentName && (
            <p className="text-xs text-text-theme-tertiary">
              Component: {componentName}
            </p>
          )}
          {errorId && (
            <p className="text-xs text-text-theme-tertiary font-mono">
              Error ID: {errorId}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            onClick={resetErrorBoundary}
            className="flex-1 px-4 py-2 bg-accent text-surface-deep rounded-lg hover:bg-accent-hover transition-colors font-medium"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-4 py-2 bg-surface-raised text-text-theme-secondary rounded-lg hover:bg-surface-raised/80 border border-border-theme transition-colors"
          >
            Reload Page
          </button>
        </div>

        {/* Development Info */}
        {process.env.NODE_ENV === 'development' && (
          <details className="pt-2 border-t border-border-theme-subtle">
            <summary className="text-sm text-text-theme-secondary cursor-pointer hover:text-text-theme-primary">
              Error Details (Development)
            </summary>
            <pre className="mt-2 p-3 bg-surface-deep rounded text-xs text-text-theme-secondary overflow-auto max-h-40 border border-border-theme">
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
    <div className="p-4 bg-surface-raised border border-border-theme rounded-lg">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-red-500/10 rounded flex items-center justify-center">
          <svg 
            className="w-5 h-5 text-red-500" 
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
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-theme-primary mb-1">
            Error loading section
          </p>
          <p className="text-xs text-text-theme-secondary mb-2 break-words">
            {error.message}
          </p>
          <button
            onClick={resetErrorBoundary}
            className="text-xs px-3 py-1 bg-accent text-surface-deep rounded hover:bg-accent-hover transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
