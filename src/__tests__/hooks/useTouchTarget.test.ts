import { renderHook } from '@testing-library/react';
import { useTouchTarget, useTouchTargetClass } from '../../hooks/useTouchTarget';

describe('useTouchTarget', () => {
  describe('with no config', () => {
    it('should return className touch-target', () => {
      const { result } = renderHook(() => useTouchTarget());

      expect(result.current.className).toBe('touch-target');
    });

    it('should return empty style object', () => {
      const { result } = renderHook(() => useTouchTarget());

      expect(result.current.style).toEqual({});
    });
  });

  describe('with content dimensions provided', () => {
    it('should calculate padding for small width', () => {
      const { result } = renderHook(() =>
        useTouchTarget({ contentWidth: 20 })
      );

      expect(result.current.style.paddingLeft).toBe(12);
      expect(result.current.style.paddingRight).toBe(12);
      expect(result.current.style.marginLeft).toBe(-12);
      expect(result.current.style.marginRight).toBe(-12);
    });

    it('should calculate padding for small height', () => {
      const { result } = renderHook(() =>
        useTouchTarget({ contentHeight: 20 })
      );

      expect(result.current.style.paddingTop).toBe(12);
      expect(result.current.style.paddingBottom).toBe(12);
      expect(result.current.style.marginTop).toBe(-12);
      expect(result.current.style.marginBottom).toBe(-12);
    });

    it('should calculate padding for both dimensions', () => {
      const { result } = renderHook(() =>
        useTouchTarget({ contentWidth: 20, contentHeight: 20 })
      );

      expect(result.current.style.paddingLeft).toBe(12);
      expect(result.current.style.paddingRight).toBe(12);
      expect(result.current.style.marginLeft).toBe(-12);
      expect(result.current.style.marginRight).toBe(-12);
      expect(result.current.style.paddingTop).toBe(12);
      expect(result.current.style.paddingBottom).toBe(12);
      expect(result.current.style.marginTop).toBe(-12);
      expect(result.current.style.marginBottom).toBe(-12);
    });

    it('should not add padding for width at or above minimum', () => {
      const { result } = renderHook(() =>
        useTouchTarget({ contentWidth: 44 })
      );

      expect(result.current.style.paddingLeft).toBeUndefined();
      expect(result.current.style.paddingRight).toBeUndefined();
      expect(result.current.style.marginLeft).toBeUndefined();
      expect(result.current.style.marginRight).toBeUndefined();
    });

    it('should not add padding for height at or above minimum', () => {
      const { result } = renderHook(() =>
        useTouchTarget({ contentHeight: 44 })
      );

      expect(result.current.style.paddingTop).toBeUndefined();
      expect(result.current.style.paddingBottom).toBeUndefined();
      expect(result.current.style.marginTop).toBeUndefined();
      expect(result.current.style.marginBottom).toBeUndefined();
    });

    it('should not add padding for width above minimum', () => {
      const { result } = renderHook(() =>
        useTouchTarget({ contentWidth: 60 })
      );

      expect(result.current.style.paddingLeft).toBeUndefined();
      expect(result.current.style.paddingRight).toBeUndefined();
    });

    it('should not add padding for height above minimum', () => {
      const { result } = renderHook(() =>
        useTouchTarget({ contentHeight: 60 })
      );

      expect(result.current.style.paddingTop).toBeUndefined();
      expect(result.current.style.paddingBottom).toBeUndefined();
    });

    it('should add padding only for dimension below minimum', () => {
      const { result } = renderHook(() =>
        useTouchTarget({ contentWidth: 20, contentHeight: 60 })
      );

      // Width should have padding
      expect(result.current.style.paddingLeft).toBe(12);
      expect(result.current.style.paddingRight).toBe(12);

      // Height should not have padding
      expect(result.current.style.paddingTop).toBeUndefined();
      expect(result.current.style.paddingBottom).toBeUndefined();
    });
  });

  describe('with custom minSize', () => {
    it('should use custom minimum size', () => {
      const { result } = renderHook(() =>
        useTouchTarget({ contentWidth: 30, minSize: 48 })
      );

      // (48 - 30) / 2 = 9
      expect(result.current.style.paddingLeft).toBe(9);
      expect(result.current.style.paddingRight).toBe(9);
    });

    it('should use custom minimum size for height', () => {
      const { result } = renderHook(() =>
        useTouchTarget({ contentHeight: 30, minSize: 48 })
      );

      // (48 - 30) / 2 = 9
      expect(result.current.style.paddingTop).toBe(9);
      expect(result.current.style.paddingBottom).toBe(9);
    });
  });

  describe('edge cases', () => {
    it('should handle zero content width', () => {
      const { result } = renderHook(() =>
        useTouchTarget({ contentWidth: 0 })
      );

      // (44 - 0) / 2 = 22
      expect(result.current.style.paddingLeft).toBe(22);
      expect(result.current.style.paddingRight).toBe(22);
    });

    it('should handle zero content height', () => {
      const { result } = renderHook(() =>
        useTouchTarget({ contentHeight: 0 })
      );

      // (44 - 0) / 2 = 22
      expect(result.current.style.paddingTop).toBe(22);
      expect(result.current.style.paddingBottom).toBe(22);
    });

    it('should handle very small content size', () => {
      const { result } = renderHook(() =>
        useTouchTarget({ contentWidth: 4, contentHeight: 4 })
      );

      // (44 - 4) / 2 = 20
      expect(result.current.style.paddingLeft).toBe(20);
      expect(result.current.style.paddingRight).toBe(20);
      expect(result.current.style.paddingTop).toBe(20);
      expect(result.current.style.paddingBottom).toBe(20);
    });

    it('should handle odd-sized content width', () => {
      const { result } = renderHook(() =>
        useTouchTarget({ contentWidth: 21 })
      );

      // (44 - 21) / 2 = 11.5
      expect(result.current.style.paddingLeft).toBe(11.5);
      expect(result.current.style.paddingRight).toBe(11.5);
    });

    it('should handle odd minimum size', () => {
      const { result } = renderHook(() =>
        useTouchTarget({ contentWidth: 20, minSize: 45 })
      );

      // (45 - 20) / 2 = 12.5
      expect(result.current.style.paddingLeft).toBe(12.5);
      expect(result.current.style.paddingRight).toBe(12.5);
    });

    it('should handle content exactly at minimum', () => {
      const { result } = renderHook(() =>
        useTouchTarget({ contentWidth: 44, contentHeight: 44 })
      );

      expect(result.current.style).toEqual({});
    });
  });

  describe('useTouchTargetClass', () => {
    it('should return touch-target className', () => {
      const { result } = renderHook(() => useTouchTargetClass());

      expect(result.current).toBe('touch-target');
    });

    it('should return same className on multiple calls', () => {
      const { result: result1 } = renderHook(() => useTouchTargetClass());
      const { result: result2 } = renderHook(() => useTouchTargetClass());

      expect(result1.current).toBe(result2.current);
      expect(result1.current).toBe('touch-target');
    });
  });

  describe('memoization', () => {
    it('should memoize style object', () => {
      const { result, rerender } = renderHook(() =>
        useTouchTarget({ contentWidth: 20, contentHeight: 20 })
      );

      const initialStyle = result.current.style;

      rerender();

      expect(result.current.style).toBe(initialStyle);
    });

    it('should recalculate when dimensions change', () => {
      const { result, rerender } = renderHook(
        ({ contentWidth }) => useTouchTarget({ contentWidth }),
        { initialProps: { contentWidth: 20 } }
      );

      expect(result.current.style.paddingLeft).toBe(12);

      rerender({ contentWidth: 30 });

      expect(result.current.style.paddingLeft).toBe(7);
    });

    it('should recalculate when minSize changes', () => {
      const { result, rerender } = renderHook(
        ({ minSize }) => useTouchTarget({ contentWidth: 20, minSize }),
        { initialProps: { minSize: 44 } }
      );

      expect(result.current.style.paddingLeft).toBe(12);

      rerender({ minSize: 48 });

      expect(result.current.style.paddingLeft).toBe(14);
    });
  });

  describe('practical scenarios', () => {
    it('should handle icon button (16x16)', () => {
      const { result } = renderHook(() =>
        useTouchTarget({ contentWidth: 16, contentHeight: 16 })
      );

      expect(result.current.style.paddingLeft).toBe(14);
      expect(result.current.style.paddingRight).toBe(14);
      expect(result.current.style.paddingTop).toBe(14);
      expect(result.current.style.paddingBottom).toBe(14);
    });

    it('should handle close button (24x24)', () => {
      const { result } = renderHook(() =>
        useTouchTarget({ contentWidth: 24, contentHeight: 24 })
      );

      expect(result.current.style.paddingLeft).toBe(10);
      expect(result.current.style.paddingRight).toBe(10);
      expect(result.current.style.paddingTop).toBe(10);
      expect(result.current.style.paddingBottom).toBe(10);
    });

    it('should handle small checkbox (12x12)', () => {
      const { result } = renderHook(() =>
        useTouchTarget({ contentWidth: 12, contentHeight: 12 })
      );

      expect(result.current.style.paddingLeft).toBe(16);
      expect(result.current.style.paddingRight).toBe(16);
      expect(result.current.style.paddingTop).toBe(16);
      expect(result.current.style.paddingBottom).toBe(16);
    });

    it('should handle text link that needs vertical expansion', () => {
      const { result } = renderHook(() =>
        useTouchTarget({ contentHeight: 16 })
      );

      expect(result.current.style.paddingTop).toBe(14);
      expect(result.current.style.paddingBottom).toBe(14);
      expect(result.current.style.paddingLeft).toBeUndefined();
      expect(result.current.style.paddingRight).toBeUndefined();
    });
  });
});
