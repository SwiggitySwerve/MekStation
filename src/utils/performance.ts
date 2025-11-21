// Performance optimization utilities

import { useCallback, useRef, useEffect, useMemo } from 'react';

/**
 * Simple debounce function (non-hook version)
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Creates a debounced version of a function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 */
export function useDebounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(func);

  // Update the callback ref when func changes
  useEffect(() => {
    callbackRef.current = func;
  }, [func]);

  const debouncedFunc = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, wait);
    },
    [wait]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedFunc;
}

/**
 * Memoization helper for expensive calculations
 */
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    
    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }

    return result;
  }) as T;
}

/**
 * Hook for memoizing expensive calculations based on dependencies
 */
export function useMemoizedCalculation<T>(
  calculate: () => T,
  deps: React.DependencyList
): T {
  return useMemo(calculate, deps);
}

/**
 * Throttle function that ensures func is called at most once per limit milliseconds
 */
export function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  const inThrottle = useRef(false);
  const lastArgs = useRef<Parameters<T> | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(func);

  // Update the callback ref when func changes
  useEffect(() => {
    callbackRef.current = func;
  }, [func]);

  const throttledFunc = useCallback(
    (...args: Parameters<T>) => {
      lastArgs.current = args;

      if (!inThrottle.current) {
        callbackRef.current(...args);
        inThrottle.current = true;

        timeoutRef.current = setTimeout(() => {
          inThrottle.current = false;
          
          // If there were calls during throttle period, execute the last one
          if (lastArgs.current) {
            throttledFunc(...lastArgs.current);
            lastArgs.current = null;
          }
        }, limit);
      }
    },
    [limit]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledFunc;
}

/**
 * Request animation frame based throttling for smooth UI updates
 */
export function useRAFThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  const rafId = useRef<number | null>(null);
  const callbackRef = useRef(func);

  // Update the callback ref when func changes
  useEffect(() => {
    callbackRef.current = func;
  }, [func]);

  const throttledFunc = useCallback((...args: Parameters<T>) => {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      callbackRef.current(...args);
      rafId.current = null;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return throttledFunc;
}

/**
 * Batch multiple state updates to reduce re-renders
 */
export class BatchUpdater<T> {
  private updates: Partial<T>[] = [];
  private timeoutId: NodeJS.Timeout | null = null;
  private callback: (updates: Partial<T>) => void;
  private delay: number;

  constructor(callback: (updates: Partial<T>) => void, delay: number = 16) {
    this.callback = callback;
    this.delay = delay;
  }

  add(update: Partial<T>) {
    this.updates.push(update);
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.flush();
    }, this.delay);
  }

  flush() {
    if (this.updates.length === 0) return;

    // Merge all updates
    const merged = this.updates.reduce((acc, update) => ({
      ...acc,
      ...update
    }), {} as Partial<T>);

    this.callback(merged);
    this.updates = [];
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  clear() {
    this.updates = [];
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
