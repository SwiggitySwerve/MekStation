import { useState, useEffect, useCallback } from 'react';

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.md - 1}px)`);
}

export function useIsTablet(): boolean {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,
  );
}

export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);
}

/** WCAG 2.5.5 minimum touch target size in px */
export const MIN_TOUCH_TARGET = 44;

export const TOUCH_TARGET_CLASSES = 'min-h-[44px] min-w-[44px]';

export function useCollapsible(defaultOpen = false): {
  isOpen: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
} {
  const [isOpen, setOpen] = useState(defaultOpen);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  return { isOpen, toggle, setOpen };
}
