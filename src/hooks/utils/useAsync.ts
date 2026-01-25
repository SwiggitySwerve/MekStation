/**
 * useAsync Hook
 *
 * A utility hook for managing async operations with loading, error, and data states.
 *
 * @module hooks/utils/useAsync
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Status of an async operation
 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Options for useAsync
 */
export interface UseAsyncOptions<T> {
  /** Initial data value */
  initialData?: T;
  /** Execute immediately on mount */
  immediate?: boolean;
  /** Callback on success */
  onSuccess?: (data: T) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Return type for useAsync
 */
export interface UseAsyncResult<T, Args extends unknown[]> {
  /** Current status */
  status: AsyncStatus;
  /** Whether the operation is loading */
  isLoading: boolean;
  /** Whether the operation is idle */
  isIdle: boolean;
  /** Whether the operation succeeded */
  isSuccess: boolean;
  /** Whether the operation failed */
  isError: boolean;
  /** The result data */
  data: T | undefined;
  /** The error if failed */
  error: Error | null;

  /** Execute the async function */
  execute: (...args: Args) => Promise<T | undefined>;
  /** Retry the last execution */
  retry: () => Promise<T | undefined>;
  /** Reset to initial state */
  reset: () => void;
  /** Manually set data */
  setData: (data: T | undefined) => void;
}

/**
 * Manage an async operation with loading, error, and data states
 *
 * @param asyncFn - The async function to execute
 * @param options - Configuration options
 * @returns Async state and actions
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, execute } = useAsync(fetchUser);
 *
 * useEffect(() => {
 *   execute(userId);
 * }, [userId, execute]);
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <Error message={error.message} />;
 * return <UserProfile user={data} />;
 * ```
 *
 * @example
 * ```tsx
 * // With immediate execution
 * const { data, isLoading } = useAsync(fetchData, { immediate: true });
 * ```
 *
 * @example
 * ```tsx
 * // With callbacks
 * const { execute } = useAsync(saveData, {
 *   onSuccess: (data) => toast.success('Saved!'),
 *   onError: (error) => toast.error(error.message),
 * });
 * ```
 */
export function useAsync<T, Args extends unknown[] = []>(
  asyncFn: (...args: Args) => Promise<T>,
  options: UseAsyncOptions<T> = {}
): UseAsyncResult<T, Args> {
  const { initialData, immediate = false, onSuccess, onError } = options;

  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [data, setData] = useState<T | undefined>(initialData);
  const [error, setError] = useState<Error | null>(null);

  // Track mounted state for cleanup
  const mountedRef = useRef(true);
  // Store last execution function for retry
  const lastExecutionRef = useRef<(() => Promise<T | undefined>) | null>(null);
  // Store initial data for reset
  const initialDataRef = useRef(initialData);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: Args): Promise<T | undefined> => {
      // Store this execution for potential retry
      const doExecute = async (): Promise<T | undefined> => {
        setStatus('loading');
        setError(null);

        try {
          const result = await asyncFn(...args);

          // Only update state if still mounted
          if (mountedRef.current) {
            setData(result);
            setStatus('success');
            onSuccess?.(result);
          }

          return result;
        } catch (err) {
          // Convert to Error if needed
          const error = err instanceof Error ? err : new Error(String(err));

          // Only update state if still mounted
          if (mountedRef.current) {
            setError(error);
            setStatus('error');
            onError?.(error);
          }

          throw error;
        }
      };

      lastExecutionRef.current = doExecute;
      return doExecute();
    },
    [asyncFn, onSuccess, onError]
  );

  const retry = useCallback(async (): Promise<T | undefined> => {
    if (lastExecutionRef.current) {
      return lastExecutionRef.current();
    }
    // No previous execution, just return undefined
    return undefined;
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setData(initialDataRef.current);
    setError(null);
  }, []);

  // Immediate execution - only works when Args is empty tuple
  useEffect(() => {
    if (immediate) {
      // Call with no arguments - this assumes the async function takes no args
      // when immediate is used
      (execute as () => Promise<T | undefined>)();
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    isLoading: status === 'loading',
    isIdle: status === 'idle',
    isSuccess: status === 'success',
    isError: status === 'error',
    data,
    error,
    execute,
    retry,
    reset,
    setData,
  };
}

export default useAsync;
