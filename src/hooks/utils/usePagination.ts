/**
 * usePagination Hook
 *
 * A utility hook for managing pagination state.
 *
 * @module hooks/utils/usePagination
 */

import { useState, useMemo, useCallback, useEffect } from 'react';

/**
 * Options for usePagination
 */
export interface UsePaginationOptions {
  /** Total number of items */
  total: number;
  /** Initial page (1-indexed, defaults to 1) */
  initialPage?: number;
  /** Initial page size (defaults to 10) */
  initialPageSize?: number;
}

/**
 * Return type for usePagination
 */
export interface UsePaginationResult {
  /** Current page (1-indexed) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there are more pages after current */
  hasMore: boolean;

  /** Navigate to a specific page */
  goToPage: (page: number) => void;
  /** Go to next page */
  nextPage: () => void;
  /** Go to previous page */
  prevPage: () => void;
  /** Go to first page */
  firstPage: () => void;
  /** Go to last page */
  lastPage: () => void;
  /** Update page size (resets to page 1) */
  setPageSize: (size: number) => void;
  /** Update total items */
  setTotal: (total: number) => void;
  /** Get start and end indices for current page */
  getPageItems: () => { startIndex: number; endIndex: number };
  /** Reset to initial values */
  reset: () => void;
}

/**
 * Manage pagination state
 *
 * @param options - Configuration options
 * @returns Pagination state and actions
 *
 * @example
 * ```tsx
 * const {
 *   page,
 *   pageSize,
 *   totalPages,
 *   hasMore,
 *   goToPage,
 *   nextPage,
 *   prevPage,
 *   setPageSize,
 *   getPageItems,
 * } = usePagination({ total: items.length });
 *
 * const { startIndex, endIndex } = getPageItems();
 * const pageItems = items.slice(startIndex, endIndex);
 * ```
 */
export function usePagination(options: UsePaginationOptions): UsePaginationResult {
  const { total: initialTotal, initialPage = 1, initialPageSize = 10 } = options;

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [total, setTotalState] = useState(initialTotal);

  // Sync total when prop changes
  useEffect(() => {
    setTotalState(initialTotal);
  }, [initialTotal]);

  // Calculate derived values
  const totalPages = useMemo(() => {
    if (total <= 0) return 0;
    return Math.ceil(total / pageSize);
  }, [total, pageSize]);

  const hasMore = useMemo(() => {
    return page < totalPages;
  }, [page, totalPages]);

  // Clamp page to valid range when total/pageSize changes
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Navigation actions
  const goToPage = useCallback(
    (targetPage: number) => {
      const maxPage = Math.max(1, totalPages);
      const clampedPage = Math.max(1, Math.min(targetPage, maxPage));
      setPage(clampedPage);
    },
    [totalPages]
  );

  const nextPage = useCallback(() => {
    setPage((current) => Math.min(current + 1, Math.max(1, totalPages)));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((current) => Math.max(current - 1, 1));
  }, []);

  const firstPage = useCallback(() => {
    setPage(1);
  }, []);

  const lastPage = useCallback(() => {
    setPage(Math.max(1, totalPages));
  }, [totalPages]);

  // Update page size (resets to page 1)
  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  // Update total
  const setTotal = useCallback((newTotal: number) => {
    setTotalState(newTotal);
  }, []);

  // Get indices for slicing
  const getPageItems = useCallback(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, total);
    return { startIndex, endIndex };
  }, [page, pageSize, total]);

  // Reset to initial values
  const reset = useCallback(() => {
    setPage(initialPage);
    setPageSizeState(initialPageSize);
  }, [initialPage, initialPageSize]);

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasMore,
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    setPageSize,
    setTotal,
    getPageItems,
    reset,
  };
}

export default usePagination;
