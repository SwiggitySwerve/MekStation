import { useCallback } from 'react';

/**
 * Haptic feedback patterns for different interactions
 */
export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

/**
 * Vibration patterns in milliseconds
 * Each array represents [vibrate, pause, vibrate, ...]
 */
const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  /** Light tap - for subtle feedback like button hover */
  light: 10,
  /** Medium tap - for button presses and selections */
  medium: 25,
  /** Heavy tap - for significant actions */
  heavy: 50,
  /** Success pattern - double tap */
  success: [25, 50, 25],
  /** Warning pattern - triple short tap */
  warning: [15, 30, 15, 30, 15],
  /** Error pattern - long buzz */
  error: [100],
  /** Selection pattern - quick feedback */
  selection: 15,
};

/**
 * Hook for triggering haptic feedback on mobile devices.
 *
 * Uses the Vibration API when available, gracefully degrades on unsupported devices.
 * Only triggers on devices that support vibration (typically mobile phones).
 *
 * @example
 * ```tsx
 * const { vibrate, isSupported } = useHaptics();
 *
 * const handlePress = () => {
 *   vibrate('medium');
 *   // ... handle action
 * };
 *
 * const handleSuccess = () => {
 *   vibrate('success');
 * };
 * ```
 */
interface UseHapticsReturn {
  vibrate: (pattern?: HapticPattern) => boolean;
  vibrateCustom: (pattern: number | number[]) => boolean;
  cancel: () => void;
  isSupported: boolean;
}

export function useHaptics(): UseHapticsReturn {
  /**
   * Check if the Vibration API is supported
   */
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  /**
   * Trigger haptic feedback with a predefined pattern
   *
   * @param pattern - The haptic pattern to trigger
   * @returns true if vibration was triggered, false otherwise
   */
  const vibrate = useCallback(
    (pattern: HapticPattern = 'medium'): boolean => {
      if (!isSupported) {
        return false;
      }

      try {
        const vibrationPattern = HAPTIC_PATTERNS[pattern];
        return navigator.vibrate(vibrationPattern);
      } catch {
        // Silently fail if vibration is blocked or unavailable
        return false;
      }
    },
    [isSupported]
  );

  /**
   * Trigger custom vibration pattern
   *
   * @param pattern - Array of durations [vibrate, pause, vibrate, ...] or single duration
   * @returns true if vibration was triggered, false otherwise
   */
  const vibrateCustom = useCallback(
    (pattern: number | number[]): boolean => {
      if (!isSupported) {
        return false;
      }

      try {
        return navigator.vibrate(pattern);
      } catch {
        return false;
      }
    },
    [isSupported]
  );

  /**
   * Cancel any ongoing vibration
   */
  const cancel = useCallback((): void => {
    if (isSupported) {
      try {
        navigator.vibrate(0);
      } catch {
        // Silently ignore
      }
    }
  }, [isSupported]);

  return {
    /** Trigger haptic feedback with a predefined pattern */
    vibrate,
    /** Trigger custom vibration pattern */
    vibrateCustom,
    /** Cancel any ongoing vibration */
    cancel,
    /** Whether the Vibration API is supported */
    isSupported,
  };
}

export default useHaptics;
