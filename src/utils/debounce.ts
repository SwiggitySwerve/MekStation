/**
 * Debounce Utility
 *
 * Creates a debounced version of a function that delays execution until after
 * a specified delay has elapsed since the last invocation.
 *
 * @module utils/debounce
 */

/**
 * Creates a debounced function that delays invoking func until after delay
 * milliseconds have elapsed since the last time the debounced function was invoked.
 *
 * @template T - Function type
 * @param func - The function to debounce
 * @param delay - The number of milliseconds to delay
 * @returns Debounced function with cancel method
 *
 * @example
 * ```typescript
 * const search = debounce((query: string) => {
 *   console.log('Searching for:', query);
 * }, 300);
 *
 * search('a');
 * search('ab');
 * search('abc'); // Only this will execute after 300ms
 *
 * // Cancel pending execution
 * search.cancel();
 * ```
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  delay: number,
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = function (
    this: ThisParameterType<T>,
    ...args: Parameters<T>
  ) {
    // Clear existing timeout
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    // Schedule new execution
    timeoutId = setTimeout(() => {
      timeoutId = null;
      func.apply(this, args);
    }, delay);
  } as T & { cancel: () => void };

  // Add cancel method to clear pending execution
  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}
