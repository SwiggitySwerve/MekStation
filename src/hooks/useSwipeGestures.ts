import { useRef, useCallback, useEffect } from 'react';

/**
 * Swipe gesture configuration
 */
export interface SwipeGestureConfig {
  /** Callback when swipe left is detected */
  onSwipeLeft?: () => void;
  /** Callback when swipe right is detected */
  onSwipeRight?: () => void;
  /** Callback when swipe up is detected */
  onSwipeUp?: () => void;
  /** Callback when swipe down is detected */
  onSwipeDown?: () => void;
  /** Minimum horizontal distance in pixels to trigger swipe (default: 50) */
  swipeThreshold?: number;
  /** Maximum vertical movement allowed before swipe is cancelled (default: 75) */
  verticalThreshold?: number;
  /** If true, only detect swipes from left edge (for back gestures) */
  leftEdgeOnly?: boolean;
  /** Distance from left edge to start gesture detection (default: 20) */
  edgeWidth?: number;
}

/**
 * Touch coordinates
 */
interface TouchCoordinates {
  x: number;
  y: number;
}

/**
 * Swipe gesture handlers
 */
export interface SwipeGestureHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

/**
 * Hook to detect swipe gestures on touch devices
 *
 * Detects horizontal and vertical swipe gestures with configurable thresholds.
 * Distinguishes between swipes and vertical scrolling.
 *
 * @example
 * ```tsx
 * const handlers = useSwipeGestures({
 *   onSwipeLeft: () => logger.debug('Swiped left'),
 *   onSwipeRight: () => logger.debug('Swiped right'),
 *   swipeThreshold: 50,
 * });
 *
 * <div {...handlers}>Swipeable content</div>
 * ```
 *
 * @example Back gesture from left edge
 * ```tsx
 * const handlers = useSwipeGestures({
 *   onSwipeRight: () => navigation.goBack(),
 *   leftEdgeOnly: true,
 *   edgeWidth: 20,
 *   swipeThreshold: 100,
 * });
 * ```
 */
export function useSwipeGestures(
  config: SwipeGestureConfig = {},
): SwipeGestureHandlers {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    swipeThreshold = 50,
    verticalThreshold = 75,
    leftEdgeOnly = false,
    edgeWidth = 20,
  } = config;

  const touchStartRef = useRef<TouchCoordinates | null>(null);
  const touchEndRef = useRef<TouchCoordinates | null>(null);

  const minSwipeDistance = swipeThreshold;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchEndRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchEndRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStartRef.current || !touchEndRef.current) {
      return;
    }

    const startX = touchStartRef.current.x;
    const startY = touchStartRef.current.y;
    const endX = touchEndRef.current.x;
    const endY = touchEndRef.current.y;

    const deltaX = endX - startX;
    const deltaY = endY - startY;

    // Check if this is an edge-only gesture
    if (leftEdgeOnly && startX > edgeWidth) {
      touchStartRef.current = null;
      touchEndRef.current = null;
      return;
    }

    // Determine if this is a horizontal or vertical gesture
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

    // Check if vertical movement exceeds threshold (cancel if it's a scroll)
    if (Math.abs(deltaY) > verticalThreshold && isHorizontalSwipe) {
      touchStartRef.current = null;
      touchEndRef.current = null;
      return;
    }

    if (isHorizontalSwipe) {
      // Horizontal swipe
      if (Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          // Swipe right
          onSwipeRight?.();
        } else {
          // Swipe left
          onSwipeLeft?.();
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > minSwipeDistance) {
        if (deltaY > 0) {
          // Swipe down
          onSwipeDown?.();
        } else {
          // Swipe up
          onSwipeUp?.();
        }
      }
    }

    // Reset refs
    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    minSwipeDistance,
    verticalThreshold,
    leftEdgeOnly,
    edgeWidth,
  ]);

  // Clean up refs on unmount
  useEffect(() => {
    return () => {
      touchStartRef.current = null;
      touchEndRef.current = null;
    };
  }, []);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}

/**
 * Hook variant for detecting swipes for tab navigation
 *
 * Pre-configured for tab switching with 50px threshold.
 *
 * @example
 * ```tsx
 * const handlers = useTabSwipeGestures({
 *   onSwipeLeft: () => nextTab(),
 *   onSwipeRight: () => previousTab(),
 * });
 *
 * <div {...handlers}>Tab content</div>
 * ```
 */
export function useTabSwipeGestures(
  config: Pick<SwipeGestureConfig, 'onSwipeLeft' | 'onSwipeRight'> = {},
): SwipeGestureHandlers {
  return useSwipeGestures({
    ...config,
    swipeThreshold: 50,
    verticalThreshold: 75,
  });
}

/**
 * Hook variant for detecting back swipe from left edge
 *
 * Pre-configured for iOS-style back gesture with 100px threshold.
 *
 * @example
 * ```tsx
 * const handlers = useBackSwipeGesture({
 *   onSwipeRight: () => navigation.goBack(),
 * });
 *
 * <div {...handlers}>Panel content</div>
 * ```
 */
export function useBackSwipeGesture(
  config: Pick<SwipeGestureConfig, 'onSwipeRight'>,
): SwipeGestureHandlers {
  return useSwipeGestures({
    onSwipeRight: config.onSwipeRight,
    leftEdgeOnly: true,
    edgeWidth: 20,
    swipeThreshold: 100,
    verticalThreshold: 100,
  });
}
