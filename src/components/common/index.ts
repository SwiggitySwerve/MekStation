/**
 * Common Components Barrel Export
 *
 * Centralized exports for reusable common components.
 */

export {
  ErrorBoundary,
  withErrorBoundary,
  useErrorBoundary,
} from './ErrorBoundary';
export { ErrorFallback, CompactErrorFallback } from './ErrorFallback';
export {
  ErrorBoundaryTest,
  ThrowError,
  ErrorTypeTest,
  useErrorTest,
} from './ErrorBoundaryTest';
