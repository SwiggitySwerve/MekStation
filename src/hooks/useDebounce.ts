/**
 * Debounce Hooks
 *
 * React hooks for debouncing values and callbacks to prevent excessive updates
 * during rapid user input.
 *
 * @module hooks/useDebounce
 */

import { useState, useEffect, useRef } from 'react';
import { debounce } from '@/utils/debounce';

/**
 * Debounces a value by delaying updates until after the specified delay
 * has elapsed since the last change.
 *
 * @template T - Value type
 * @param value - The value to debounce
 * @param delay - The number of milliseconds to delay (default: 300)
 * @returns The debounced value
 *
 * @example
 * ```typescript
 * function SearchInput() {
 *   const [query, setQuery] = useState('');
 *   const debouncedQuery = useDebounce(query, 300);
 *
 *   // This effect only runs 300ms after the user stops typing
 *   useEffect(() => {
 *     if (debouncedQuery) {
 *       performSearch(debouncedQuery);
 *     }
 *   }, [debouncedQuery]);
 *
 *   return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
 * }
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up timeout to update debounced value
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: cancel pending update on value change or unmount
    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Creates a debounced version of a callback function that delays execution
 * until after the specified delay has elapsed since the last invocation.
 *
 * @template T - Callback function type
 * @param callback - The callback function to debounce
 * @param delay - The number of milliseconds to delay (default: 300)
 * @returns Debounced callback with stable reference and cancel method
 *
 * @example
 * ```typescript
 * function ValidationPanel() {
 *   const validate = useDebouncedCallback((unit: Unit) => {
 *     console.log('Validating:', unit);
 *     // Expensive validation logic
 *   }, 300);
 *
 *   useEffect(() => {
 *     validate(currentUnit);
 *
 *     // Cancel pending validation on unmount
 *     return () => validate.cancel();
 *   }, [currentUnit]);
 *
 *   return <div>Validation Panel</div>;
 * }
 * ```
 */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number = 300
): T & { cancel: () => void } {
  const callbackRef = useRef(callback);

  // Update ref when callback changes (but don't recreate debounced function)
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Create stable debounced function that uses latest callback via ref
  const debouncedCallback = useRef(
    debounce((...args: Parameters<T>) => {
      callbackRef.current(...args);
    }, delay)
  );

  // Update delay if it changes
  useEffect(() => {
    debouncedCallback.current.cancel();
    debouncedCallback.current = debounce((...args: Parameters<T>) => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);

  // Cleanup: cancel pending execution on unmount
  useEffect(() => {
    return () => {
      debouncedCallback.current.cancel();
    };
  }, []);

  return debouncedCallback.current as T & { cancel: () => void };
}
