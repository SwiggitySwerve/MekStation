/**
 * Virtual Keyboard Detection Hook
 *
 * Detects virtual keyboard appearance using the Visual Viewport API.
 * Provides keyboard visibility state and height for UI adjustments.
 *
 * @module hooks/useVirtualKeyboard
 */

import { useState, useEffect, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * Virtual keyboard state
 */
export interface VirtualKeyboardState {
  /** Whether the virtual keyboard is currently visible */
  isKeyboardVisible: boolean;
  /** Height of the virtual keyboard in pixels (0 when hidden) */
  keyboardHeight: number;
  /** Available viewport height with keyboard visible */
  visibleHeight: number;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Minimum height difference to consider keyboard as visible
 * This helps filter out small viewport changes from browser chrome
 */
const KEYBOARD_THRESHOLD_PX = 150;

/**
 * Debounce delay for viewport changes (in milliseconds)
 */
const VIEWPORT_DEBOUNCE_MS = 100;

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to detect virtual keyboard appearance and height.
 *
 * Uses the Visual Viewport API to detect when the visible viewport shrinks,
 * which typically indicates a virtual keyboard has appeared.
 *
 * @returns Virtual keyboard state with visibility and height
 *
 * @example
 * ```tsx
 * const { isKeyboardVisible, keyboardHeight, visibleHeight } = useVirtualKeyboard();
 *
 * // Adjust UI when keyboard is visible
 * const containerStyle = {
 *   paddingBottom: isKeyboardVisible ? keyboardHeight : 0,
 * };
 *
 * // Or use visibleHeight to constrain content
 * const maxHeight = visibleHeight - headerHeight;
 * ```
 *
 * @example With input scrolling
 * ```tsx
 * const { isKeyboardVisible } = useVirtualKeyboard();
 *
 * useEffect(() => {
 *   if (isKeyboardVisible && document.activeElement) {
 *     // Scroll focused input into view
 *     document.activeElement.scrollIntoView({
 *       behavior: 'smooth',
 *       block: 'center'
 *     });
 *   }
 * }, [isKeyboardVisible]);
 * ```
 */
export function useVirtualKeyboard(): VirtualKeyboardState {
  const [state, setState] = useState<VirtualKeyboardState>({
    isKeyboardVisible: false,
    keyboardHeight: 0,
    visibleHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  // Calculate keyboard state from viewport dimensions
  const calculateKeyboardState = useCallback((): VirtualKeyboardState => {
    if (typeof window === 'undefined') {
      return {
        isKeyboardVisible: false,
        keyboardHeight: 0,
        visibleHeight: 0,
      };
    }

    // Use Visual Viewport API if available
    const visualViewport = window.visualViewport;

    if (visualViewport) {
      const windowHeight = window.innerHeight;
      const viewportHeight = visualViewport.height;
      const heightDifference = windowHeight - viewportHeight;

      // Consider keyboard visible if there's a significant height difference
      const isKeyboardVisible = heightDifference > KEYBOARD_THRESHOLD_PX;

      return {
        isKeyboardVisible,
        keyboardHeight: isKeyboardVisible ? heightDifference : 0,
        visibleHeight: viewportHeight,
      };
    }

    // Fallback for browsers without Visual Viewport API
    // Use window.innerHeight as the visible height
    return {
      isKeyboardVisible: false,
      keyboardHeight: 0,
      visibleHeight: window.innerHeight,
    };
  }, []);

  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') {
      return;
    }

    const visualViewport = window.visualViewport;

    // Initial calculation
    setState(calculateKeyboardState());

    // Debounced handler for viewport changes
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleViewportChange = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setState(calculateKeyboardState());
      }, VIEWPORT_DEBOUNCE_MS);
    };

    // Listen to Visual Viewport events if available
    if (visualViewport) {
      visualViewport.addEventListener('resize', handleViewportChange);
      visualViewport.addEventListener('scroll', handleViewportChange);

      return () => {
        visualViewport.removeEventListener('resize', handleViewportChange);
        visualViewport.removeEventListener('scroll', handleViewportChange);
        clearTimeout(timeoutId);
      };
    }

    // Fallback: listen to window resize and focus events
    const handleFocus = () => {
      // On focus, re-check after a delay (keyboard animation)
      setTimeout(handleViewportChange, 300);
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('focusin', handleFocus);
    window.addEventListener('focusout', handleViewportChange);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('focusin', handleFocus);
      window.removeEventListener('focusout', handleViewportChange);
      clearTimeout(timeoutId);
    };
  }, [calculateKeyboardState]);

  return state;
}

/**
 * Check if the Visual Viewport API is supported
 */
export function isVisualViewportSupported(): boolean {
  return typeof window !== 'undefined' && 'visualViewport' in window;
}

/**
 * Get the current visual viewport dimensions
 * Useful for one-off checks without setting up listeners
 */
export function getVisualViewport(): {
  width: number;
  height: number;
  offsetTop: number;
  offsetLeft: number;
  scale: number;
} {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0, offsetTop: 0, offsetLeft: 0, scale: 1 };
  }

  const visualViewport = window.visualViewport;

  if (visualViewport) {
    return {
      width: visualViewport.width,
      height: visualViewport.height,
      offsetTop: visualViewport.offsetTop,
      offsetLeft: visualViewport.offsetLeft,
      scale: visualViewport.scale,
    };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
    offsetTop: 0,
    offsetLeft: 0,
    scale: 1,
  };
}

export default useVirtualKeyboard;
