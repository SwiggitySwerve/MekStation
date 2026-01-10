/**
 * useResponsive Hook
 *
 * Provides reactive breakpoint detection matching Tailwind CSS breakpoints.
 * Use for conditional rendering and responsive behavior.
 *
 * Breakpoints (matching Tailwind):
 * - base: < 640px (phones, primary mobile target)
 * - sm: >= 640px (large phones, small tablets landscape)
 * - md: >= 768px (tablets like iPad)
 * - lg: >= 1024px (desktops, large tablets)
 * - xl: >= 1280px (large desktops)
 * - 2xl: >= 1536px (extra large screens)
 *
 * @example
 * const { isMobile, isTablet, isDesktop, breakpoint } = useResponsive();
 * if (isMobile) {
 *   return <MobileLayout />;
 * }
 */

import { useState, useEffect, useCallback } from 'react';

/** Tailwind CSS breakpoint values in pixels */
export const Breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type BreakpointKey = 'base' | keyof typeof Breakpoints;

export interface ResponsiveState {
  /** Current viewport width in pixels */
  width: number;
  /** Current viewport height in pixels */
  height: number;
  /** Current breakpoint name */
  breakpoint: BreakpointKey;
  /** True for screens < 640px (base breakpoint) */
  isMobile: boolean;
  /** True for screens >= 640px and < 1024px */
  isTablet: boolean;
  /** True for screens >= 1024px */
  isDesktop: boolean;
  /** True for screens < 768px (mobile + small tablets) */
  isMobileOrSmallTablet: boolean;
  /** True for screens >= 768px */
  isTabletOrLarger: boolean;
}

const getBreakpoint = (width: number): BreakpointKey => {
  if (width >= Breakpoints['2xl']) return '2xl';
  if (width >= Breakpoints.xl) return 'xl';
  if (width >= Breakpoints.lg) return 'lg';
  if (width >= Breakpoints.md) return 'md';
  if (width >= Breakpoints.sm) return 'sm';
  return 'base';
};

const getResponsiveState = (width: number, height: number): ResponsiveState => {
  const breakpoint = getBreakpoint(width);

  return {
    width,
    height,
    breakpoint,
    isMobile: width < Breakpoints.sm,
    isTablet: width >= Breakpoints.sm && width < Breakpoints.lg,
    isDesktop: width >= Breakpoints.lg,
    isMobileOrSmallTablet: width < Breakpoints.md,
    isTabletOrLarger: width >= Breakpoints.md,
  };
};

const getInitialState = (): ResponsiveState => {
  // Server-side rendering fallback (assume desktop)
  if (typeof window === 'undefined') {
    return getResponsiveState(1280, 800);
  }
  return getResponsiveState(window.innerWidth, window.innerHeight);
};

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(getInitialState);

  const handleResize = useCallback(() => {
    const newState = getResponsiveState(window.innerWidth, window.innerHeight);
    setState((prev) => {
      // Only update if values actually changed to prevent unnecessary re-renders
      if (
        prev.width !== newState.width ||
        prev.height !== newState.height ||
        prev.breakpoint !== newState.breakpoint
      ) {
        return newState;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Update on mount (may differ from SSR values)
    handleResize();

    // Debounced resize handler for better performance
    let timeoutId: ReturnType<typeof setTimeout>;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);

    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, [handleResize]);

  return state;
}

/**
 * Check if current viewport matches or exceeds a breakpoint
 */
export function useBreakpoint(breakpoint: BreakpointKey): boolean {
  const { width } = useResponsive();

  if (breakpoint === 'base') return true;
  return width >= Breakpoints[breakpoint];
}

/**
 * Get the appropriate value based on current breakpoint
 * Similar to Tailwind's responsive utilities but for JS
 *
 * @example
 * const columns = useBreakpointValue({ base: 1, sm: 2, lg: 3 });
 */
export function useBreakpointValue<T>(values: Partial<Record<BreakpointKey, T>>): T | undefined {
  const { breakpoint } = useResponsive();

  // Find the appropriate value by checking from current breakpoint down
  const breakpointOrder: BreakpointKey[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'base'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);

  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }

  return undefined;
}

export default useResponsive;
