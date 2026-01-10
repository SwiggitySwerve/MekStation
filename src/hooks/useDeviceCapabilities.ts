/**
 * useDeviceCapabilities Hook
 *
 * Detects device input capabilities for adaptive UI patterns.
 * Used to switch between desktop and mobile interaction modes.
 *
 * @example
 * const { isTouchDevice, hasHover, prefersMouse } = useDeviceCapabilities();
 * if (isTouchDevice && !prefersMouse) {
 *   // Use tap-to-place instead of drag-and-drop
 * }
 */

import { useState, useEffect, useCallback } from 'react';

export interface DeviceCapabilities {
  /** Device has touch capability */
  isTouchDevice: boolean;
  /** Device has precise pointer (mouse/trackpad) */
  hasHover: boolean;
  /** Current interaction prefers mouse over touch */
  prefersMouse: boolean;
  /** Device is in portrait orientation */
  isPortrait: boolean;
  /** Device supports haptic feedback (Vibration API) */
  hasHaptics: boolean;
  /** Device is a standalone PWA (installed) */
  isStandalone: boolean;
  /** Device is currently online */
  isOnline: boolean;
  /** Safe area insets for notched devices */
  safeAreaInsets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

const getInitialCapabilities = (): DeviceCapabilities => {
  // Server-side rendering fallback
  if (typeof window === 'undefined') {
    return {
      isTouchDevice: false,
      hasHover: true,
      prefersMouse: true,
      isPortrait: false,
      hasHaptics: false,
      isStandalone: false,
      isOnline: true,
      safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
    };
  }

  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const hasHover = window.matchMedia('(hover: hover)').matches;
  const isPortrait = window.matchMedia('(orientation: portrait)').matches;
  const hasHaptics = 'vibrate' in navigator;
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const isOnline = navigator.onLine;

  // Get safe area insets from CSS environment variables
  const computedStyle = getComputedStyle(document.documentElement);
  const safeAreaInsets = {
    top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10) || 0,
    right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10) || 0,
    bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10) || 0,
    left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10) || 0,
  };

  return {
    isTouchDevice,
    hasHover,
    prefersMouse: hasHover && !isTouchDevice,
    isPortrait,
    hasHaptics,
    isStandalone,
    isOnline,
    safeAreaInsets,
  };
};

export function useDeviceCapabilities(): DeviceCapabilities {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>(getInitialCapabilities);

  // Track last pointer type to determine preference
  const handlePointerDown = useCallback((event: PointerEvent) => {
    const isMousePointer = event.pointerType === 'mouse';
    setCapabilities((prev) => ({
      ...prev,
      prefersMouse: isMousePointer,
    }));
  }, []);

  // Track online/offline status
  const handleOnline = useCallback(() => {
    setCapabilities((prev) => ({ ...prev, isOnline: true }));
  }, []);

  const handleOffline = useCallback(() => {
    setCapabilities((prev) => ({ ...prev, isOnline: false }));
  }, []);

  // Track orientation changes
  const handleOrientationChange = useCallback(() => {
    const isPortrait = window.matchMedia('(orientation: portrait)').matches;
    setCapabilities((prev) => ({ ...prev, isPortrait }));
  }, []);

  // Track display mode changes (PWA install/uninstall)
  const handleDisplayModeChange = useCallback((event: MediaQueryListEvent) => {
    setCapabilities((prev) => ({ ...prev, isStandalone: event.matches }));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Update capabilities on mount (may differ from SSR values)
    setCapabilities(getInitialCapabilities());

    // Set up CSS custom properties for safe area insets
    document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top)');
    document.documentElement.style.setProperty('--sar', 'env(safe-area-inset-right)');
    document.documentElement.style.setProperty('--sab', 'env(safe-area-inset-bottom)');
    document.documentElement.style.setProperty('--sal', 'env(safe-area-inset-left)');

    // Event listeners
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Media query listeners
    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    displayModeQuery.addEventListener('change', handleDisplayModeChange);

    const orientationQuery = window.matchMedia('(orientation: portrait)');
    orientationQuery.addEventListener('change', handleOrientationChange);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('orientationchange', handleOrientationChange);
      displayModeQuery.removeEventListener('change', handleDisplayModeChange);
      orientationQuery.removeEventListener('change', handleOrientationChange);
    };
  }, [handlePointerDown, handleOnline, handleOffline, handleOrientationChange, handleDisplayModeChange]);

  return capabilities;
}

/**
 * Trigger haptic feedback if available
 */
export function triggerHaptic(pattern: number | number[] = 10): boolean {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    return navigator.vibrate(pattern);
  }
  return false;
}

/**
 * Haptic feedback patterns
 */
export const HapticPatterns = {
  /** Short tap feedback */
  tap: 10,
  /** Equipment assignment success */
  success: [10, 50, 10],
  /** Error or invalid action */
  error: [30, 20, 30],
  /** Long press confirmation */
  longPress: 50,
  /** Selection change */
  selection: 5,
} as const;

export default useDeviceCapabilities;
