import { useCallback, useRef } from 'react';

/**
 * Long press configuration options
 */
interface UseLongPressOptions {
  /** Duration in milliseconds to trigger long press (default: 500) */
  delay?: number;
  /** Callback when long press is triggered */
  onLongPress: (event: React.TouchEvent | React.MouseEvent) => void;
  /** Optional callback for regular press/click */
  onClick?: (event: React.TouchEvent | React.MouseEvent) => void;
  /** Movement threshold in pixels before canceling (default: 10) */
  moveThreshold?: number;
  /** Whether to prevent context menu on long press (default: true) */
  preventContextMenu?: boolean;
}

/**
 * Event handlers returned by useLongPress hook
 */
interface UseLongPressHandlers {
  onTouchStart: (event: React.TouchEvent) => void;
  onTouchEnd: (event: React.TouchEvent) => void;
  onTouchMove: (event: React.TouchEvent) => void;
  onMouseDown: (event: React.MouseEvent) => void;
  onMouseUp: (event: React.MouseEvent) => void;
  onMouseMove: (event: React.MouseEvent) => void;
  onMouseLeave: (event: React.MouseEvent) => void;
  onContextMenu: (event: React.MouseEvent) => void;
}

/**
 * Hook to detect long press gestures on both touch and mouse devices.
 *
 * Works on:
 * - Touch devices (iOS/Android) via touch events
 * - Desktop via mouse events (hold left click)
 * - Hybrid devices (both touch and mouse)
 *
 * Features:
 * - Configurable delay threshold (default 500ms)
 * - Movement tolerance before canceling
 * - Optional regular click callback
 * - Prevents accidental context menu on touch
 *
 * @example
 * ```tsx
 * const longPressHandlers = useLongPress({
 *   delay: 500,
 *   onLongPress: (e) => setShowActions(true),
 *   onClick: (e) => handleSelect(),
 * });
 *
 * return <div {...longPressHandlers}>Press and hold</div>;
 * ```
 */
export function useLongPress({
  delay = 500,
  onLongPress,
  onClick,
  moveThreshold = 10,
  preventContextMenu = true,
}: UseLongPressOptions): UseLongPressHandlers {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressRef = useRef(false);
  const isTouchRef = useRef(false);

  // Clear the long press timeout
  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    startPosRef.current = null;
  }, []);

  // Start tracking for long press
  const start = useCallback(
    (event: React.TouchEvent | React.MouseEvent, clientX: number, clientY: number) => {
      isLongPressRef.current = false;
      startPosRef.current = { x: clientX, y: clientY };

      timeoutRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        onLongPress(event);
      }, delay);
    },
    [delay, onLongPress]
  );

  // Check if movement exceeds threshold
  const checkMovement = useCallback(
    (clientX: number, clientY: number): boolean => {
      if (!startPosRef.current) return false;

      const deltaX = Math.abs(clientX - startPosRef.current.x);
      const deltaY = Math.abs(clientY - startPosRef.current.y);

      return deltaX > moveThreshold || deltaY > moveThreshold;
    },
    [moveThreshold]
  );

  // Touch event handlers
  const onTouchStart = useCallback(
    (event: React.TouchEvent) => {
      isTouchRef.current = true;
      const touch = event.touches[0];
      start(event, touch.clientX, touch.clientY);
    },
    [start]
  );

  const onTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      const wasLongPress = isLongPressRef.current;
      clear();

      // If it wasn't a long press, trigger regular click
      if (!wasLongPress && onClick) {
        onClick(event);
      }
    },
    [clear, onClick]
  );

  const onTouchMove = useCallback(
    (event: React.TouchEvent) => {
      const touch = event.touches[0];
      if (checkMovement(touch.clientX, touch.clientY)) {
        clear();
      }
    },
    [checkMovement, clear]
  );

  // Mouse event handlers
  const onMouseDown = useCallback(
    (event: React.MouseEvent) => {
      // Skip if this was preceded by a touch event (hybrid device)
      if (isTouchRef.current) {
        isTouchRef.current = false;
        return;
      }

      // Only left click
      if (event.button !== 0) return;

      start(event, event.clientX, event.clientY);
    },
    [start]
  );

  const onMouseUp = useCallback(
    (event: React.MouseEvent) => {
      const wasLongPress = isLongPressRef.current;
      clear();

      // If it wasn't a long press, trigger regular click
      if (!wasLongPress && onClick) {
        onClick(event);
      }
    },
    [clear, onClick]
  );

  const onMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (checkMovement(event.clientX, event.clientY)) {
        clear();
      }
    },
    [checkMovement, clear]
  );

  const onMouseLeave = useCallback(() => {
    clear();
  }, [clear]);

  // Context menu handler (prevent on long press)
  const onContextMenu = useCallback(
    (event: React.MouseEvent) => {
      if (preventContextMenu && isLongPressRef.current) {
        event.preventDefault();
      }
    },
    [preventContextMenu]
  );

  return {
    onTouchStart,
    onTouchEnd,
    onTouchMove,
    onMouseDown,
    onMouseUp,
    onMouseMove,
    onMouseLeave,
    onContextMenu,
  };
}

export default useLongPress;
