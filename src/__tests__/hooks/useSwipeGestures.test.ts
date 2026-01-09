import { renderHook, act } from '@testing-library/react';
import { useSwipeGestures, useTabSwipeGestures, useBackSwipeGesture } from '../../hooks/useSwipeGestures';

// Mock touch events
function createTouchEvent(type: string, coordinates: { clientX: number; clientY: number }) {
  return {
    bubbles: true,
    cancelable: true,
    touches: [{ clientX: coordinates.clientX, clientY: coordinates.clientY }],
  };
}

describe('useSwipeGestures', () => {
  describe('horizontal swipe detection', () => {
    it('should detect swipe right', () => {
      const onSwipeRight = jest.fn();
      const { result } = renderHook(() =>
        useSwipeGestures({ onSwipeRight, swipeThreshold: 50 })
      );

      act(() => {
        // Touch start
        const touchStart = createTouchEvent('touchstart', { clientX: 100, clientY: 100 });
        result.current.onTouchStart(touchStart as any);

        // Touch move
        const touchMove = createTouchEvent('touchmove', { clientX: 200, clientY: 100 });
        result.current.onTouchMove(touchMove as any);

        // Touch end
        result.current.onTouchEnd();
      });

      expect(onSwipeRight).toHaveBeenCalledTimes(1);
    });

    it('should detect swipe left', () => {
      const onSwipeLeft = jest.fn();
      const { result } = renderHook(() =>
        useSwipeGestures({ onSwipeLeft, swipeThreshold: 50 })
      );

      act(() => {
        const touchStart = createTouchEvent('touchstart', { clientX: 200, clientY: 100 });
        result.current.onTouchStart(touchStart as any);

        const touchMove = createTouchEvent('touchmove', { clientX: 100, clientY: 100 });
        result.current.onTouchMove(touchMove as any);

        result.current.onTouchEnd();
      });

      expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    });

    it('should not trigger swipe if movement is below threshold', () => {
      const onSwipeRight = jest.fn();
      const { result } = renderHook(() =>
        useSwipeGestures({ onSwipeRight, swipeThreshold: 50 })
      );

      act(() => {
        const touchStart = createTouchEvent('touchstart', { clientX: 100, clientY: 100 });
        result.current.onTouchStart(touchStart as any);

        const touchMove = createTouchEvent('touchmove', { clientX: 140, clientY: 100 });
        result.current.onTouchMove(touchMove as any);

        result.current.onTouchEnd();
      });

      expect(onSwipeRight).not.toHaveBeenCalled();
    });

    it('should use default threshold of 50px', () => {
      const onSwipeRight = jest.fn();
      const { result } = renderHook(() =>
        useSwipeGestures({ onSwipeRight })
      );

      act(() => {
        const touchStart = createTouchEvent('touchstart', { clientX: 100, clientY: 100 });
        result.current.onTouchStart(touchStart as any);

        const touchMove = createTouchEvent('touchmove', { clientX: 151, clientY: 100 });
        result.current.onTouchMove(touchMove as any);

        result.current.onTouchEnd();
      });

      expect(onSwipeRight).toHaveBeenCalledTimes(1);
    });
  });

  describe('vertical swipe detection', () => {
    it('should detect swipe up', () => {
      const onSwipeUp = jest.fn();
      const { result } = renderHook(() =>
        useSwipeGestures({ onSwipeUp, swipeThreshold: 50 })
      );

      act(() => {
        const touchStart = createTouchEvent('touchstart', { clientX: 100, clientY: 200 });
        result.current.onTouchStart(touchStart as any);

        const touchMove = createTouchEvent('touchmove', { clientX: 100, clientY: 100 });
        result.current.onTouchMove(touchMove as any);

        result.current.onTouchEnd();
      });

      expect(onSwipeUp).toHaveBeenCalledTimes(1);
    });

    it('should detect swipe down', () => {
      const onSwipeDown = jest.fn();
      const { result } = renderHook(() =>
        useSwipeGestures({ onSwipeDown, swipeThreshold: 50 })
      );

      act(() => {
        const touchStart = createTouchEvent('touchstart', { clientX: 100, clientY: 100 });
        result.current.onTouchStart(touchStart as any);

        const touchMove = createTouchEvent('touchmove', { clientX: 100, clientY: 200 });
        result.current.onTouchMove(touchMove as any);

        result.current.onTouchEnd();
      });

      expect(onSwipeDown).toHaveBeenCalledTimes(1);
    });
  });

  describe('distinguishing swipe from scroll', () => {
    it('should cancel horizontal swipe if vertical movement exceeds threshold', () => {
      const onSwipeRight = jest.fn();
      const { result } = renderHook(() =>
        useSwipeGestures({ onSwipeRight, swipeThreshold: 50, verticalThreshold: 75 })
      );

      act(() => {
        const touchStart = createTouchEvent('touchstart', { clientX: 100, clientY: 100 });
        result.current.onTouchStart(touchStart as any);

        // Move both horizontally and vertically, but vertical exceeds threshold
        const touchMove = createTouchEvent('touchmove', { clientX: 200, clientY: 200 });
        result.current.onTouchMove(touchMove as any);

        result.current.onTouchEnd();
      });

      expect(onSwipeRight).not.toHaveBeenCalled();
    });

    it('should allow horizontal swipe if vertical movement is below threshold', () => {
      const onSwipeRight = jest.fn();
      const { result } = renderHook(() =>
        useSwipeGestures({ onSwipeRight, swipeThreshold: 50, verticalThreshold: 75 })
      );

      act(() => {
        const touchStart = createTouchEvent('touchstart', { clientX: 100, clientY: 100 });
        result.current.onTouchStart(touchStart as any);

        // Move horizontally more than vertically
        const touchMove = createTouchEvent('touchmove', { clientX: 200, clientY: 150 });
        result.current.onTouchMove(touchMove as any);

        result.current.onTouchEnd();
      });

      expect(onSwipeRight).toHaveBeenCalledTimes(1);
    });

    it('should detect vertical swipe even with horizontal drift', () => {
      const onSwipeUp = jest.fn();
      const { result } = renderHook(() =>
        useSwipeGestures({ onSwipeUp, swipeThreshold: 50 })
      );

      act(() => {
        const touchStart = createTouchEvent('touchstart', { clientX: 100, clientY: 200 });
        result.current.onTouchStart(touchStart as any);

        // Vertical movement is dominant
        const touchMove = createTouchEvent('touchmove', { clientX: 120, clientY: 100 });
        result.current.onTouchMove(touchMove as any);

        result.current.onTouchEnd();
      });

      expect(onSwipeUp).toHaveBeenCalledTimes(1);
    });
  });

  describe('left edge detection', () => {
    it('should only detect swipe from left edge when enabled', () => {
      const onSwipeRight = jest.fn();
      const { result } = renderHook(() =>
        useSwipeGestures({ onSwipeRight, leftEdgeOnly: true, edgeWidth: 20, swipeThreshold: 100 })
      );

      act(() => {
        // Start within edge width
        const touchStart = createTouchEvent('touchstart', { clientX: 15, clientY: 100 });
        result.current.onTouchStart(touchStart as any);

        const touchMove = createTouchEvent('touchmove', { clientX: 150, clientY: 100 });
        result.current.onTouchMove(touchMove as any);

        result.current.onTouchEnd();
      });

      expect(onSwipeRight).toHaveBeenCalledTimes(1);
    });

    it('should not trigger when start is outside edge width', () => {
      const onSwipeRight = jest.fn();
      const { result } = renderHook(() =>
        useSwipeGestures({ onSwipeRight, leftEdgeOnly: true, edgeWidth: 20, swipeThreshold: 100 })
      );

      act(() => {
        // Start outside edge width
        const touchStart = createTouchEvent('touchstart', { clientX: 50, clientY: 100 });
        result.current.onTouchStart(touchStart as any);

        const touchMove = createTouchEvent('touchmove', { clientX: 200, clientY: 100 });
        result.current.onTouchMove(touchMove as any);

        result.current.onTouchEnd();
      });

      expect(onSwipeRight).not.toHaveBeenCalled();
    });

    it('should use default edge width of 20px', () => {
      const onSwipeRight = jest.fn();
      const { result } = renderHook(() =>
        useSwipeGestures({ onSwipeRight, leftEdgeOnly: true, swipeThreshold: 100 })
      );

      act(() => {
        // Start at exactly 20px (should trigger)
        const touchStart = createTouchEvent('touchstart', { clientX: 20, clientY: 100 });
        result.current.onTouchStart(touchStart as any);

        const touchMove = createTouchEvent('touchmove', { clientX: 150, clientY: 100 });
        result.current.onTouchMove(touchMove as any);

        result.current.onTouchEnd();
      });

      expect(onSwipeRight).toHaveBeenCalledTimes(1);
    });
  });

  describe('callback invocation', () => {
    it('should not call callbacks when not provided', () => {
      const { result } = renderHook(() =>
        useSwipeGestures({ swipeThreshold: 50 })
      );

      expect(() => {
        act(() => {
          const touchStart = createTouchEvent('touchstart', { clientX: 100, clientY: 100 });
          result.current.onTouchStart(touchStart as any);

          const touchMove = createTouchEvent('touchmove', { clientX: 200, clientY: 100 });
          result.current.onTouchMove(touchMove as any);

          result.current.onTouchEnd();
        });
      }).not.toThrow();
    });

    it('should call all provided callbacks for respective directions', () => {
      const onSwipeLeft = jest.fn();
      const onSwipeRight = jest.fn();
      const onSwipeUp = jest.fn();
      const onSwipeDown = jest.fn();
      const { result } = renderHook(() =>
        useSwipeGestures({
          onSwipeLeft,
          onSwipeRight,
          onSwipeUp,
          onSwipeDown,
          swipeThreshold: 50,
        })
      );

      // Test swipe right
      act(() => {
        const touchStart = createTouchEvent('touchstart', { clientX: 100, clientY: 100 });
        result.current.onTouchStart(touchStart as any);

        const touchMove = createTouchEvent('touchmove', { clientX: 200, clientY: 100 });
        result.current.onTouchMove(touchMove as any);

        result.current.onTouchEnd();
      });

      expect(onSwipeRight).toHaveBeenCalledTimes(1);
      expect(onSwipeLeft).not.toHaveBeenCalled();
      expect(onSwipeUp).not.toHaveBeenCalled();
      expect(onSwipeDown).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle touch end without move', () => {
      const onSwipeRight = jest.fn();
      const { result } = renderHook(() =>
        useSwipeGestures({ onSwipeRight })
      );

      act(() => {
        const touchStart = createTouchEvent('touchstart', { clientX: 100, clientY: 100 });
        result.current.onTouchStart(touchStart as any);

        result.current.onTouchEnd();
      });

      expect(onSwipeRight).not.toHaveBeenCalled();
    });

    it('should handle touch without start', () => {
      const onSwipeRight = jest.fn();
      const { result } = renderHook(() =>
        useSwipeGestures({ onSwipeRight })
      );

      act(() => {
        const touchMove = createTouchEvent('touchmove', { clientX: 200, clientY: 100 });
        result.current.onTouchMove(touchMove as any);

        result.current.onTouchEnd();
      });

      expect(onSwipeRight).not.toHaveBeenCalled();
    });

    it('should handle multiple swipes in sequence', () => {
      const onSwipeRight = jest.fn();
      const { result } = renderHook(() =>
        useSwipeGestures({ onSwipeRight, swipeThreshold: 50 })
      );

      // First swipe
      act(() => {
        const touchStart = createTouchEvent('touchstart', { clientX: 100, clientY: 100 });
        result.current.onTouchStart(touchStart as any);

        const touchMove = createTouchEvent('touchmove', { clientX: 200, clientY: 100 });
        result.current.onTouchMove(touchMove as any);

        result.current.onTouchEnd();
      });

      // Second swipe
      act(() => {
        const touchStart = createTouchEvent('touchstart', { clientX: 100, clientY: 100 });
        result.current.onTouchStart(touchStart as any);

        const touchMove = createTouchEvent('touchmove', { clientX: 200, clientY: 100 });
        result.current.onTouchMove(touchMove as any);

        result.current.onTouchEnd();
      });

      expect(onSwipeRight).toHaveBeenCalledTimes(2);
    });

    it('should use custom swipe threshold', () => {
      const onSwipeRight = jest.fn();
      const { result } = renderHook(() =>
        useSwipeGestures({ onSwipeRight, swipeThreshold: 100 })
      );

      act(() => {
        const touchStart = createTouchEvent('touchstart', { clientX: 100, clientY: 100 });
        result.current.onTouchStart(touchStart as any);

        const touchMove = createTouchEvent('touchmove', { clientX: 250, clientY: 100 });
        result.current.onTouchMove(touchMove as any);

        result.current.onTouchEnd();
      });

      expect(onSwipeRight).toHaveBeenCalledTimes(1);
    });

    it('should handle zero threshold', () => {
      const onSwipeRight = jest.fn();
      const { result } = renderHook(() =>
        useSwipeGestures({ onSwipeRight, swipeThreshold: 0 })
      );

      act(() => {
        const touchStart = createTouchEvent('touchstart', { clientX: 100, clientY: 100 });
        result.current.onTouchStart(touchStart as any);

        const touchMove = createTouchEvent('touchmove', { clientX: 101, clientY: 100 });
        result.current.onTouchMove(touchMove as any);

        result.current.onTouchEnd();
      });

      expect(onSwipeRight).toHaveBeenCalledTimes(1);
    });
  });

  describe('useTabSwipeGestures', () => {
    it('should use pre-configured threshold of 50px', () => {
      const onSwipeLeft = jest.fn();
      const { result } = renderHook(() =>
        useTabSwipeGestures({ onSwipeLeft })
      );

      act(() => {
        const touchStart = createTouchEvent('touchstart', { clientX: 200, clientY: 100 });
        result.current.onTouchStart(touchStart as any);

        const touchMove = createTouchEvent('touchmove', { clientX: 100, clientY: 100 });
        result.current.onTouchMove(touchMove as any);

        result.current.onTouchEnd();
      });

      expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    });

    it('should not trigger with movement below 50px', () => {
      const onSwipeLeft = jest.fn();
      const { result } = renderHook(() =>
        useTabSwipeGestures({ onSwipeLeft })
      );

      act(() => {
        const touchStart = createTouchEvent('touchstart', { clientX: 200, clientY: 100 });
        result.current.onTouchStart(touchStart as any);

        const touchMove = createTouchEvent('touchmove', { clientX: 160, clientY: 100 });
        result.current.onTouchMove(touchMove as any);

        result.current.onTouchEnd();
      });

      expect(onSwipeLeft).not.toHaveBeenCalled();
    });
  });

  describe('useBackSwipeGesture', () => {
    it('should use pre-configured settings for back swipe', () => {
      const onSwipeRight = jest.fn();
      const { result } = renderHook(() =>
        useBackSwipeGesture({ onSwipeRight })
      );

      act(() => {
        // Start within 20px edge
        const touchStart = createTouchEvent('touchstart', { clientX: 15, clientY: 100 });
        result.current.onTouchStart(touchStart as any);

        // Move more than 100px (exceeds threshold)
        const touchMove = createTouchEvent('touchmove', { clientX: 120, clientY: 100 });
        result.current.onTouchMove(touchMove as any);

        result.current.onTouchEnd();
      });

      expect(onSwipeRight).toHaveBeenCalledTimes(1);
    });

    it('should not trigger when starting outside edge', () => {
      const onSwipeRight = jest.fn();
      const { result } = renderHook(() =>
        useBackSwipeGesture({ onSwipeRight })
      );

      act(() => {
        // Start outside 20px edge
        const touchStart = createTouchEvent('touchstart', { clientX: 50, clientY: 100 });
        result.current.onTouchStart(touchStart as any);

        const touchMove = createTouchEvent('touchmove', { clientX: 200, clientY: 100 });
        result.current.onTouchMove(touchMove as any);

        result.current.onTouchEnd();
      });

      expect(onSwipeRight).not.toHaveBeenCalled();
    });

    it('should not trigger when movement below 100px threshold', () => {
      const onSwipeRight = jest.fn();
      const { result } = renderHook(() =>
        useBackSwipeGesture({ onSwipeRight })
      );

      act(() => {
        const touchStart = createTouchEvent('touchstart', { clientX: 10, clientY: 100 });
        result.current.onTouchStart(touchStart as any);

        const touchMove = createTouchEvent('touchmove', { clientX: 80, clientY: 100 });
        result.current.onTouchMove(touchMove as any);

        result.current.onTouchEnd();
      });

      expect(onSwipeRight).not.toHaveBeenCalled();
    });
  });
});
