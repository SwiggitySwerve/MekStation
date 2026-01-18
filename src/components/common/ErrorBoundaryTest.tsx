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
        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-mono rounded shadow-lg border border-red-400 transition-colors"
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
export function ThrowError({ message }: { message?: string }): React.ReactElement {
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
    <div className="fixed bottom-4 left-4 z-[9999] bg-surface-base border border-border-theme rounded-lg shadow-lg p-3">
      <p className="text-xs font-semibold text-text-theme-primary mb-2">
        Test Error Types
      </p>
      <div className="flex flex-col gap-1">
        <button
          onClick={() => setErrorType('syntax')}
          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
        >
          SyntaxError (non-recoverable)
        </button>
        <button
          onClick={() => setErrorType('type')}
          className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded transition-colors"
        >
          TypeError (recoverable)
        </button>
        <button
          onClick={() => setErrorType('reference')}
          className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors"
        >
          ReferenceError (recoverable)
        </button>
        <button
          onClick={() => setErrorType('range')}
          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
        >
          RangeError (recoverable)
        </button>
        <button
          onClick={() => setErrorType('generic')}
          className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors"
        >
          Generic Error (recoverable)
        </button>
      </div>
    </div>
  );
}
