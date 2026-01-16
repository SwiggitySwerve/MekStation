/**
 * useBalancedGrid - Calculates optimal column count for balanced row distribution
 * 
 * When items wrap to multiple rows, this ensures rows have roughly equal item counts.
 * Example: 8 items → 4+4 (not 7+1), 11 items → 4+4+3 (not 8+3)
 */

import { useState, useEffect, useCallback, RefObject } from 'react';

interface BalancedGridOptions {
  /** Minimum width per item in pixels */
  minItemWidth: number;
  /** Gap between items in pixels */
  gap?: number;
  /** Total number of items */
  itemCount: number;
}

interface BalancedGridResult {
  /** Optimal number of columns for balanced distribution */
  columns: number;
  /** Whether the calculation is ready (container has been measured) */
  ready: boolean;
}

/**
 * Calculate the most balanced column count for a given number of items and max columns.
 * 
 * For N items that need R rows, we want columns C such that:
 * - C * R >= N (all items fit)
 * - R = ceil(N / C) (number of rows needed)
 * - Minimize the difference between row sizes
 */
function calculateBalancedColumns(itemCount: number, maxColumns: number): number {
  if (itemCount <= 0) return 1;
  if (itemCount <= maxColumns) return itemCount; // All fit in one row
  
  // Find the column count that creates the most balanced rows
  let bestColumns = maxColumns;
  let bestScore = Infinity;
  
  for (let cols = 2; cols <= maxColumns; cols++) {
    const rows = Math.ceil(itemCount / cols);
    const itemsInLastRow = itemCount % cols || cols;
    const difference = cols - itemsInLastRow;
    
    // Score: prefer smaller differences and fewer rows
    // Weight difference more heavily to avoid very unbalanced last rows
    const score = difference * 2 + rows * 0.5;
    
    if (score < bestScore) {
      bestScore = score;
      bestColumns = cols;
    }
  }
  
  return bestColumns;
}

/**
 * Hook that calculates optimal column count for balanced row distribution
 */
export function useBalancedGrid(
  containerRef: RefObject<HTMLElement | null>,
  options: BalancedGridOptions
): BalancedGridResult {
  const { minItemWidth, gap = 4, itemCount } = options;
  // Start with 0 columns to indicate "not ready" - avoids hydration mismatch
  // since server doesn't know container width
  const [columns, setColumns] = useState(0);
  const [ready, setReady] = useState(false);
  
  const calculateColumns = useCallback(() => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    if (containerWidth === 0) return;
    
    // Calculate max columns that can fit
    // Formula: (containerWidth + gap) / (minItemWidth + gap)
    const maxColumns = Math.floor((containerWidth + gap) / (minItemWidth + gap));
    const safeMaxColumns = Math.max(1, Math.min(maxColumns, itemCount));
    
    // Find optimal balanced column count
    const optimalColumns = calculateBalancedColumns(itemCount, safeMaxColumns);
    
    setColumns(optimalColumns);
    setReady(true);
  }, [containerRef, minItemWidth, gap, itemCount]);
  
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM has painted before measuring
    // This fixes the issue where offsetWidth returns 0 on initial render
    const rafId = requestAnimationFrame(() => {
      calculateColumns();
    });
    
    // Use ResizeObserver for responsive updates
    const resizeObserver = new ResizeObserver(() => {
      calculateColumns();
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, [containerRef, calculateColumns]);
  
  return { columns, ready };
}

export default useBalancedGrid;
