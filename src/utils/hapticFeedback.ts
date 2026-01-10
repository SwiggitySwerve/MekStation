/**
 * Haptic feedback patterns and utilities
 *
 * Uses the Vibration API to provide tactile feedback for touch interactions.
 * Gracefully degrades on devices without vibration support.
 */

/**
 * Check if vibration API is supported
 */
export function isVibrationSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'vibrate' in navigator &&
    typeof navigator.vibrate === 'function'
  );
}

/**
 * Trigger a short vibration pulse for subtle acknowledgment
 *
 * Use for: Equipment assignment, UI toggles, button taps
 *
 * @example
 * ```ts
 * import { tap } from '@/utils/hapticFeedback';
 *
 * function handleEquipmentDrop() {
 *   // ... equipment assignment logic
 *   tap(); // 50ms pulse
 * }
 * ```
 */
export function tap(): boolean {
  if (!isVibrationSupported()) {
    return false;
  }

  try {
    return navigator.vibrate(50);
  } catch {
    return false;
  }
}

/**
 * Trigger a confirmation vibration pattern for success feedback
 *
 * Use for: Save complete, form submission, successful operations
 * Pattern: 100ms on, 50ms off, 100ms on (double tap)
 *
 * @example
 * ```ts
 * import { success } from '@/utils/hapticFeedback';
 *
 * async function handleSave() {
 *   await saveUnit();
 *   success(); // Confirmation pattern
 * }
 * ```
 */
export function success(): boolean {
  if (!isVibrationSupported()) {
    return false;
  }

  try {
    return navigator.vibrate([100, 50, 100]);
  } catch {
    return false;
  }
}

/**
 * Trigger an error vibration pattern for failure feedback
 *
 * Use for: Validation errors, invalid operations, failures
 * Pattern: 200ms continuous (longer, distinctive from success)
 *
 * @example
 * ```ts
 * import { error } from '@/utils/hapticFeedback';
 *
 * function handleValidation() {
 *   if (!isValid) {
 *     error(); // Error pulse
 *     showErrorMessage();
 *   }
 * }
 * ```
 */
export function error(): boolean {
  if (!isVibrationSupported()) {
    return false;
  }

  try {
    return navigator.vibrate(200);
  } catch {
    return false;
  }
}

/**
 * Trigger a warning vibration pattern
 *
 * Use for: Warnings, cautions, destructive action confirmation
 * Pattern: 50ms on, 50ms off, 50ms on (short double tap)
 *
 * @example
 * ```ts
 * import { warning } from '@/utils/hapticFeedback';
 *
 * function handleDelete() {
 *   warning(); // Warning pattern
 *   confirmDelete();
 * }
 * ```
 */
export function warning(): boolean {
  if (!isVibrationSupported()) {
    return false;
  }

  try {
    return navigator.vibrate([50, 50, 50]);
  } catch {
    return false;
  }
}

/**
 * Trigger a light tap for subtle feedback
 *
 * Use for: Scroll to top, refresh, minor UI interactions
 * Pattern: 25ms (very subtle)
 *
 * @example
 * ```ts
 * import { light } from '@/utils/hapticFeedback';
 *
 * function handleRefresh() {
 *   light(); // Subtle tap
 *   refreshData();
 * }
 * ```
 */
export function light(): boolean {
  if (!isVibrationSupported()) {
    return false;
  }

  try {
    return navigator.vibrate(25);
  } catch {
    return false;
  }
}

/**
 * Trigger a heavy vibration for significant feedback
 *
 * Use for: Destructive actions, major milestones
 * Pattern: 300ms (strong, prolonged)
 *
 * @example
 * ```ts
 * import { heavy } from '@/utils/hapticFeedback';
 *
 * function handleFactoryReset() {
 *   heavy(); // Strong vibration
 *   performReset();
 * }
 * ```
 */
export function heavy(): boolean {
  if (!isVibrationSupported()) {
    return false;
  }

  try {
    return navigator.vibrate(300);
  } catch {
    return false;
  }
}

/**
 * Custom vibration pattern
 *
 * Use for: Custom haptic feedback needs
 *
 * @param pattern - Vibration pattern (ms duration or array of on/off durations)
 * @returns true if vibration was triggered, false otherwise
 *
 * @example
 * ```ts
 * import { custom } from '@/utils/hapticFeedback';
 *
 * function customFeedback() {
 *   custom([50, 100, 50, 100, 50]); // Morse code S-O-S pattern
 * }
 * ```
 */
export function custom(
  pattern: number | number[]
): boolean {
  if (!isVibrationSupported()) {
    return false;
  }

  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

/**
 * Cancel any ongoing vibration
 *
 * Use for: Stop vibration on component unmount, user cancel
 *
 * @example
 * ```ts
 * import { cancel } from '@/utils/hapticFeedback';
 *
 * useEffect(() => {
 *   return () => {
 *     cancel(); // Stop vibration when unmounting
 *   };
 * }, []);
 * ```
 */
export function cancel(): void {
  if (isVibrationSupported()) {
    try {
      navigator.vibrate(0);
    } catch {
      // Ignore errors when canceling
    }
  }
}
