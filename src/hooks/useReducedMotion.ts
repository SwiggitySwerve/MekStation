import { useEffect, useState } from 'react';

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

interface MatchMediaTarget {
  readonly matchMedia?: (query: string) => MediaQueryList;
}

export function getPrefersReducedMotion(
  target: MatchMediaTarget | undefined = browserWindow(),
): boolean {
  const media = target?.matchMedia?.(REDUCED_MOTION_QUERY);
  return media?.matches ?? false;
}

export function subscribePrefersReducedMotion(
  callback: (enabled: boolean) => void,
  target: MatchMediaTarget | undefined = browserWindow(),
): () => void {
  const media = target?.matchMedia?.(REDUCED_MOTION_QUERY);
  if (!media) return () => undefined;

  const listener = (event: MediaQueryListEvent) => {
    callback(event.matches);
  };

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }

  media.addListener(listener);
  return () => media.removeListener(listener);
}

export function usePrefersReducedMotion(): boolean {
  const [enabled, setEnabled] = useState(() => getPrefersReducedMotion());

  useEffect(() => subscribePrefersReducedMotion(setEnabled), []);

  return enabled;
}

function browserWindow(): MatchMediaTarget | undefined {
  return typeof window === 'undefined' ? undefined : window;
}
