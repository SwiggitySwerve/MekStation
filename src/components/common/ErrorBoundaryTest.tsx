/**
 * ErrorBoundary Test Component
 *
 * Utility component for testing ErrorBoundary functionality.
 * Only available in development mode.
 *
 * Usage:
 * 1. Import this component into any page/component
 * 2. Add <ErrorBoundaryTest /> anywhere in the JSX
 * 3. Click "Trigger Error" button to test error boundary
 */

import React, { useState } from 'react';

interface ErrorBoundaryTestProps {
  /** Custom error message to throw */
  errorMessage?: string;
  /** Position of the test button */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Test component that throws an error when triggered
 * Only renders in development mode
 */
export function ErrorBoundaryTest({
  errorMessage = 'Test error triggered by ErrorBoundaryTest component',
  position = 'bottom-right',
}: ErrorBoundaryTestProps): React.ReactElement | null {
  const [shouldThrow, setShouldThrow] = useState(false);

  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  // Throw error when triggered
  if (shouldThrow) {
    throw new Error(errorMessage);
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-[9999]`}>
      <button
        onClick={() => setShouldThrow(true)}
        className="rounded border border-red-400 bg-red-600 px-3 py-2 font-mono text-xs text-white shadow-lg transition-colors hover:bg-red-700"
        title="Click to trigger a test error"
      >
        🔥 Trigger Error
      </button>
    </div>
  );
}

/**
 * Error component that throws immediately (for testing error boundaries)
 */
export function ThrowError({
  message,
}: {
  message?: string;
}): React.ReactElement {
  throw new Error(message || 'Immediate test error');
}

/**
 * Hook to programmatically trigger errors for testing
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { triggerError } = useErrorTest();
 *
 *   return (
 *     <button onClick={() => triggerError('Test error')}>
 *       Test Error Boundary
 *     </button>
 *   );
 * }
 * ```
 */
export function useErrorTest(): {
  triggerError: (message?: string) => never;
  isDevMode: boolean;
} {
  const isDev = process.env.NODE_ENV === 'development';

  const triggerError = (message = 'Test error from useErrorTest'): never => {
    throw new Error(message);
  };

  return {
    triggerError,
    isDevMode: isDev,
  };
}

/**
 * Component that throws different types of errors for testing
 */
export function ErrorTypeTest(): React.ReactElement | null {
  const [errorType, setErrorType] = useState<string | null>(null);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (errorType === 'syntax') {
    throw new SyntaxError('Test SyntaxError - should be non-recoverable');
  }
  if (errorType === 'type') {
    throw new TypeError('Test TypeError - should be recoverable');
  }
  if (errorType === 'reference') {
    throw new ReferenceError('Test ReferenceError - should be recoverable');
  }
  if (errorType === 'range') {
    throw new RangeError('Test RangeError - should be recoverable');
  }
  if (errorType === 'generic') {
    throw new Error('Test generic Error - should be recoverable');
  }

  return (
    <div className="bg-surface-base border-border-theme fixed bottom-4 left-4 z-[9999] rounded-lg border p-3 shadow-lg">
      <p className="text-text-theme-primary mb-2 text-xs font-semibold">
        Test Error Types
      </p>
      <div className="flex flex-col gap-1">
        <button
          onClick={() => setErrorType('syntax')}
          className="rounded bg-red-600 px-2 py-1 text-xs text-white transition-colors hover:bg-red-700"
        >
          SyntaxError (non-recoverable)
        </button>
        <button
          onClick={() => setErrorType('type')}
          className="rounded bg-orange-600 px-2 py-1 text-xs text-white transition-colors hover:bg-orange-700"
        >
          TypeError (recoverable)
        </button>
        <button
          onClick={() => setErrorType('reference')}
          className="rounded bg-yellow-600 px-2 py-1 text-xs text-white transition-colors hover:bg-yellow-700"
        >
          ReferenceError (recoverable)
        </button>
        <button
          onClick={() => setErrorType('range')}
          className="rounded bg-blue-600 px-2 py-1 text-xs text-white transition-colors hover:bg-blue-700"
        >
          RangeError (recoverable)
        </button>
        <button
          onClick={() => setErrorType('generic')}
          className="rounded bg-purple-600 px-2 py-1 text-xs text-white transition-colors hover:bg-purple-700"
        >
          Generic Error (recoverable)
        </button>
      </div>
    </div>
  );
}
