import { useState, useEffect, useCallback } from 'react';

/**
 * Screen size breakpoints (in pixels)
 */
const BREAKPOINTS = {
  /** Mobile: < 768px */
  mobile: 768,
  /** Tablet: >= 768px and < 1024px */
  tablet: 1024,
} as const;

/**
 * Debounce delay for resize listener (in milliseconds)
 */
const RESIZE_DEBOUNCE_MS = 150;

/**
 * Device type detection result
 */
export interface DeviceType {
  /** Device is mobile-sized (< 768px) */
  isMobile: boolean;
  /** Device is tablet-sized (768px - 1023px) */
  isTablet: boolean;
  /** Device is desktop-sized (>= 1024px) */
  isDesktop: boolean;
  /** Device has touch capability */
  isTouch: boolean;
  /** Device has mouse/trackpad with hover capability */
  hasMouse: boolean;
  /** Device is a hybrid with both touch and mouse */
  isHybrid: boolean;
  /** Current viewport width */
  viewportWidth: number;
}

/**
 * Hook to detect device type for adaptive UI rendering.
 *
 * Detects:
 * - Screen size breakpoints (mobile/tablet/desktop) with resize listener
 * - Touch capability via 'ontouchstart' in window
 * - Mouse/hover capability via (hover: hover) media query
 * - Hybrid devices with both touch and mouse
 *
 * Includes debounced resize listener to update on viewport changes.
 * Returns safe defaults during SSR (all false, width 0).
 *
 * @example
 * ```tsx
 * const { isMobile, isTablet, isTouch } = useDeviceType();
 *
 * // Render different UI based on device
 * if (isMobile && isTouch) {
 *   return <MobileUI />;
 * }
 * return <DesktopUI />;
 * ```
 */
export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isTouch: false,
    hasMouse: false,
    isHybrid: false,
    viewportWidth: 0,
  });

  // Compute device type from current window state
  const computeDeviceType = useCallback((): DeviceType => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: false,
        isTouch: false,
        hasMouse: false,
        isHybrid: false,
        viewportWidth: 0,
      };
    }

    const width = window.innerWidth;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const hasMouse = window.matchMedia('(hover: hover)').matches;

    const isMobile = width < BREAKPOINTS.mobile;
    const isTablet = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
    const isDesktop = width >= BREAKPOINTS.tablet;

    return {
      isMobile,
      isTablet,
      isDesktop,
      isTouch,
      hasMouse,
      isHybrid: isTouch && hasMouse,
      viewportWidth: width,
    };
  }, []);

  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') {
      return;
    }

    // Initial computation
    setDeviceType(computeDeviceType());

    // Debounced resize handler
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setDeviceType(computeDeviceType());
      }, RESIZE_DEBOUNCE_MS);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [computeDeviceType]);

  return deviceType;
}

export default useDeviceType;
