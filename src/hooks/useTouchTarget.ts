import { CSSProperties, useMemo } from 'react';

/**
 * Touch target configuration
 */
interface TouchTargetConfig {
  /** Width of the element's visual content in pixels */
  contentWidth?: number;
  /** Height of the element's visual content in pixels */
  contentHeight?: number;
  /** Minimum touch target size (default: 44px per iOS/Android guidelines) */
  minSize?: number;
}

/**
 * Touch target styles result
 */
interface TouchTargetStyles {
  /** CSS styles to apply to the element */
  style: CSSProperties;
  /** Additional class name for touch target sizing */
  className: string;
}

/**
 * Minimum touch target size per iOS and Android accessibility guidelines
 */
const DEFAULT_MIN_SIZE = 44;

/**
 * Hook to ensure interactive elements meet minimum touch target size.
 *
 * Expands the hit area to 44x44px minimum without affecting visual layout
 * by combining positive padding (expands hit area) with negative margin
 * (maintains layout position).
 *
 * @example
 * ```tsx
 * const { style, className } = useTouchTarget({
 *   contentWidth: 20,
 *   contentHeight: 20,
 * });
 *
 * <button style={style} className={className}>
 *   <Icon name="close" />
 * </button>
 * ```
 *
 * @example With automatic sizing (uses min-width/min-height)
 * ```tsx
 * const { className } = useTouchTarget();
 *
 * <button className={className}>
 *   Delete
 * </button>
 * ```
 */
export function useTouchTarget(
  config: TouchTargetConfig = {},
): TouchTargetStyles {
  const { contentWidth, contentHeight, minSize = DEFAULT_MIN_SIZE } = config;

  const styles = useMemo(() => {
    const style: CSSProperties = {};
    const className = 'touch-target';

    // If content dimensions are provided, calculate padding/margin to expand hit area
    if (contentWidth !== undefined || contentHeight !== undefined) {
      const paddingX =
        contentWidth !== undefined && contentWidth < minSize
          ? (minSize - contentWidth) / 2
          : 0;

      const paddingY =
        contentHeight !== undefined && contentHeight < minSize
          ? (minSize - contentHeight) / 2
          : 0;

      if (paddingX > 0) {
        style.paddingLeft = paddingX;
        style.paddingRight = paddingX;
        style.marginLeft = -paddingX;
        style.marginRight = -paddingX;
      }

      if (paddingY > 0) {
        style.paddingTop = paddingY;
        style.paddingBottom = paddingY;
        style.marginTop = -paddingY;
        style.marginBottom = -paddingY;
      }
    }

    return { style, className };
  }, [contentWidth, contentHeight, minSize]);

  return styles;
}

/**
 * Hook variant that returns only className for simple cases.
 *
 * Use this when you just need min-width/min-height classes
 * and don't need dynamic padding calculation.
 *
 * @example
 * ```tsx
 * const className = useTouchTargetClass();
 *
 * <button className={className}>Click me</button>
 * ```
 */
export function useTouchTargetClass(): string {
  return 'touch-target';
}
