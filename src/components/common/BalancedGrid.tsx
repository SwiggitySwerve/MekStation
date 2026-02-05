/**
 * BalancedGrid - Responsive grid that distributes items evenly across rows
 *
 * When items wrap to multiple rows, ensures balanced distribution.
 * Example: 8 items → 4+4 (not 7+1), 11 items → 4+4+3 (not 8+3)
 *
 * Usage:
 * <BalancedGrid minItemWidth={60} gap={6}>
 *   {items.map(item => <Item key={item.id} />)}
 * </BalancedGrid>
 */

import React, { useRef, Children, ReactNode } from 'react';

import { useBalancedGrid } from '@/hooks/useBalancedGrid';

export interface BalancedGridProps {
  /** Child elements to distribute in the grid */
  children: ReactNode;
  /** Minimum width per item in pixels */
  minItemWidth: number;
  /** Gap between items in pixels (default: 4) */
  gap?: number;
  /** Fallback grid template when not ready (default: auto-fill minmax based on minItemWidth) */
  fallbackColumns?: string;
  /** Additional CSS class names */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * A grid container that automatically calculates optimal column count
 * for balanced row distribution based on available space.
 */
export function BalancedGrid({
  children,
  minItemWidth,
  gap = 4,
  fallbackColumns,
  className = '',
  'data-testid': testId,
}: BalancedGridProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  // Count actual children for balanced calculation
  // Use toArray to exclude false/null/undefined from conditional renders like {condition && <Child />}
  const itemCount = Children.toArray(children).length;

  const { columns, ready } = useBalancedGrid(containerRef, {
    minItemWidth,
    gap,
    itemCount,
  });

  // Compute fallback - uses auto-fill with minmax if not provided
  const fallback =
    fallbackColumns ?? `repeat(auto-fill, minmax(${minItemWidth}px, 1fr))`;

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns:
      ready && columns > 0 ? `repeat(${columns}, 1fr)` : fallback,
    gap: `${gap}px`,
  };

  return (
    <div
      ref={containerRef}
      style={gridStyle}
      className={className}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

export default BalancedGrid;
