/**
 * Gesture Feedback Utilities
 *
 * Visual and haptic feedback utilities for touch interactions.
 * Provides consistent pressed state styles and touch feedback patterns.
 *
 * @module utils/touch/gestureFeedback
 */

import { CSSProperties } from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * Pressed state style configuration
 */
export interface PressedStateStyles {
  /** CSS properties to apply when pressed */
  style: CSSProperties;
  /** Tailwind classes for pressed state */
  className: string;
}

/**
 * Feedback type for different interactions
 */
export type FeedbackType = 'light' | 'medium' | 'heavy' | 'selection' | 'error';

/**
 * Touch feedback configuration
 */
export interface TouchFeedbackConfig {
  /** Enable haptic feedback */
  haptic?: boolean;
  /** Enable visual feedback */
  visual?: boolean;
  /** Feedback intensity */
  intensity?: FeedbackType;
  /** Custom scale factor for pressed state (default: 0.97) */
  scaleFactor?: number;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default pressed state scale factor
 */
const DEFAULT_SCALE_FACTOR = 0.97;

/**
 * Vibration patterns for different feedback types (in milliseconds)
 */
const VIBRATION_PATTERNS: Record<FeedbackType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  selection: [10, 30, 10],
  error: [50, 50, 50],
};

/**
 * Tailwind classes for pressed states
 */
const PRESSED_CLASSES = {
  /** Scale down slightly on press */
  scale: 'active:scale-[0.97]',
  /** Reduce opacity slightly on press */
  opacity: 'active:opacity-90',
  /** Combined scale and opacity */
  default: 'active:scale-[0.97] active:opacity-90',
  /** Darken background on press */
  darken: 'active:brightness-90',
  /** Lighten background on press */
  lighten: 'active:brightness-110',
} as const;

// =============================================================================
// Haptic Feedback
// =============================================================================

/**
 * Check if the Vibration API is supported
 */
export function isVibrationSupported(): boolean {
  return typeof window !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Trigger haptic feedback using the Vibration API
 *
 * @param type - Type of feedback to provide
 * @returns true if vibration was triggered, false if not supported
 *
 * @example
 * ```ts
 * // Light tap feedback
 * triggerHaptic('light');
 *
 * // Error feedback with pattern
 * triggerHaptic('error');
 * ```
 */
export function triggerHaptic(type: FeedbackType = 'light'): boolean {
  if (!isVibrationSupported()) {
    return false;
  }

  const pattern = VIBRATION_PATTERNS[type];
  return navigator.vibrate(pattern);
}

/**
 * Stop any ongoing vibration
 */
export function stopHaptic(): void {
  if (isVibrationSupported()) {
    navigator.vibrate(0);
  }
}

// =============================================================================
// Visual Feedback
// =============================================================================

/**
 * Get CSS properties for pressed state
 *
 * @param config - Optional configuration
 * @returns CSS properties to apply during press
 *
 * @example
 * ```tsx
 * const pressedStyle = getPressedStyles({ scaleFactor: 0.95 });
 *
 * <button
 *   onTouchStart={() => setPressed(true)}
 *   onTouchEnd={() => setPressed(false)}
 *   style={pressed ? pressedStyle.style : undefined}
 * >
 *   Press Me
 * </button>
 * ```
 */
export function getPressedStyles(config?: {
  scaleFactor?: number;
  opacity?: number;
}): PressedStateStyles {
  const scale = config?.scaleFactor ?? DEFAULT_SCALE_FACTOR;
  const opacity = config?.opacity ?? 0.9;

  return {
    style: {
      transform: `scale(${scale})`,
      opacity,
      transition: 'transform 0.1s ease-out, opacity 0.1s ease-out',
    },
    className: PRESSED_CLASSES.default,
  };
}

/**
 * Get Tailwind classes for pressed/active states
 *
 * @param variant - Style variant to apply
 * @returns Tailwind class string
 *
 * @example
 * ```tsx
 * <button className={`btn ${getPressedClass('default')}`}>
 *   Click Me
 * </button>
 * ```
 */
export function getPressedClass(
  variant: keyof typeof PRESSED_CLASSES = 'default',
): string {
  return PRESSED_CLASSES[variant];
}

/**
 * Get combined classes for touch-friendly buttons
 *
 * Includes:
 * - Minimum touch target size (44px)
 * - Pressed state visual feedback
 * - Focus-visible ring for accessibility
 *
 * @returns Tailwind class string
 *
 * @example
 * ```tsx
 * <button className={getTouchButtonClasses()}>
 *   Touch-Friendly Button
 * </button>
 * ```
 */
export function getTouchButtonClasses(): string {
  return [
    // Touch target minimum size
    'min-w-touch min-h-touch',
    // Pressed state feedback
    'active:scale-[0.97] active:opacity-90',
    // Focus visible ring for accessibility
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800',
    // Smooth transitions
    'transition-all duration-100',
  ].join(' ');
}

/**
 * Get classes for icon buttons with touch-safe tap areas
 *
 * @param size - Visual size of the icon button ('sm' | 'md' | 'lg')
 * @returns Tailwind class string
 *
 * @example
 * ```tsx
 * <button className={getIconButtonClasses('md')}>
 *   <IconComponent />
 * </button>
 * ```
 */
export function getIconButtonClasses(size: 'sm' | 'md' | 'lg' = 'md'): string {
  const sizeClasses = {
    sm: 'p-2',
    md: 'p-2.5',
    lg: 'p-3',
  };

  return [
    // Touch target minimum size
    'min-w-touch min-h-touch',
    // Center content
    'flex items-center justify-center',
    // Size-specific padding
    sizeClasses[size],
    // Pressed state feedback
    'active:scale-[0.95] active:opacity-90',
    // Focus visible ring
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
    // Smooth transitions
    'transition-all duration-100',
    // Rounded for touch
    'rounded-lg',
  ].join(' ');
}

// =============================================================================
// Combined Feedback
// =============================================================================

/**
 * Trigger combined visual and haptic feedback
 *
 * @param config - Feedback configuration
 *
 * @example
 * ```tsx
 * const handlePress = () => {
 *   triggerFeedback({ haptic: true, intensity: 'medium' });
 *   // ... handle press
 * };
 * ```
 */
export function triggerFeedback(config: TouchFeedbackConfig = {}): void {
  const { haptic = true, intensity = 'light' } = config;

  if (haptic) {
    triggerHaptic(intensity);
  }
}

/**
 * Create a feedback handler that combines haptic and callback
 *
 * @param callback - Function to call on interaction
 * @param config - Feedback configuration
 * @returns Wrapped handler function
 *
 * @example
 * ```tsx
 * const handleClick = withFeedback(
 *   () => console.log('Clicked!'),
 *   { haptic: true, intensity: 'medium' }
 * );
 *
 * <button onClick={handleClick}>Click Me</button>
 * ```
 */
export function withFeedback<T extends unknown[]>(
  callback: (...args: T) => void,
  config: TouchFeedbackConfig = {},
): (...args: T) => void {
  return (...args: T) => {
    triggerFeedback(config);
    callback(...args);
  };
}

// =============================================================================
// Exports
// =============================================================================

export { PRESSED_CLASSES, DEFAULT_SCALE_FACTOR, VIBRATION_PATTERNS };
