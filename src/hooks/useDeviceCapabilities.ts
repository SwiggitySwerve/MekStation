import { useState, useEffect } from 'react';

/**
 * Device capability detection result
 */
interface DeviceCapabilities {
  /** Device has touch input capability */
  hasTouch: boolean;
  /** Device has mouse/trackpad input capability */
  hasMouse: boolean;
  /** Viewport is mobile-sized (< 768px) */
  isMobile: boolean;
}

/**
 * Hook to detect device capabilities for dual-mode interaction patterns.
 *
 * Detects:
 * - Touch capability via 'ontouchstart' in window
 * - Mouse capability via (hover: hover) media query
 * - Mobile viewport via window.innerWidth < 768
 *
 * Values are computed once on mount and remain stable.
 * Returns safe defaults (all false) during SSR.
 *
 * @example
 * ```tsx
 * const { hasTouch, hasMouse, isMobile } = useDeviceCapabilities();
 *
 * if (hasTouch && !hasMouse) {
 *   // Mobile-only device - use touch patterns
 * }
 * ```
 */
export function useDeviceCapabilities(): DeviceCapabilities {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    hasTouch: false,
    hasMouse: false,
    isMobile: false,
  });

  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') {
      return;
    }

    // Detect touch capability
    const hasTouch = 'ontouchstart' in window;

    // Detect mouse capability via hover media query
    const hasMouse = window.matchMedia('(hover: hover)').matches;

    // Detect mobile viewport
    const isMobile = window.innerWidth < 768;

    setCapabilities({ hasTouch, hasMouse, isMobile });
  }, []);

  return capabilities;
}
