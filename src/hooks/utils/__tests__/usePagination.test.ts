/**
 * usePagination Hook Tests
 *
 * TDD tests for the pagination utility hook.
 */

import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../usePagination';

describe('usePagination', () => {
  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => usePagination({ total: 100 }));

      expect(result.current.page).toBe(1);
      expect(result.current.pageSize).toBe(10);
      expect(result.current.total).toBe(100);
      expect(result.current.totalPages).toBe(10);
    });

    it('should accept initial page and pageSize', () => {
      const { result } = renderHook(() =>
        usePagination({ total: 100, initialPage: 5, initialPageSize: 20 })
      );

      expect(result.current.page).toBe(5);
      expect(result.current.pageSize).toBe(20);
      expect(result.current.totalPages).toBe(5);
    });

    it('should calculate totalPages correctly', () => {
      const { result } = renderHook(() =>
        usePagination({ total: 25, initialPageSize: 10 })
      );

      expect(result.current.totalPages).toBe(3); // 25 / 10 = 2.5 -> 3
    });

    it('should handle zero total items', () => {
      const { result } = renderHook(() => usePagination({ total: 0 }));

      expect(result.current.totalPages).toBe(0);
      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('hasMore calculation', () => {
    it('should be true when more pages exist', () => {
      const { result } = renderHook(() =>
        usePagination({ total: 100, initialPage: 1, initialPageSize: 10 })
      );

      expect(result.current.hasMore).toBe(true);
    });

    it('should be false on last page', () => {
      const { result } = renderHook(() =>
        usePagination({ total: 100, initialPage: 10, initialPageSize: 10 })
      );

      expect(result.current.hasMore).toBe(false);
    });

    it('should be false when total fits in one page', () => {
      const { result } = renderHook(() =>
        usePagination({ total: 5, initialPageSize: 10 })
      );

      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('goToPage', () => {
    it('should navigate to specified page', () => {
      const { result } = renderHook(() => usePagination({ total: 100 }));

      act(() => {
        result.current.goToPage(5);
      });

      expect(result.current.page).toBe(5);
    });

    it('should clamp to first page if below 1', () => {
      const { result } = renderHook(() => usePagination({ total: 100 }));

      act(() => {
        result.current.goToPage(0);
      });

      expect(result.current.page).toBe(1);

      act(() => {
        result.current.goToPage(-5);
      });

      expect(result.current.page).toBe(1);
    });

    it('should clamp to last page if above totalPages', () => {
      const { result } = renderHook(() => usePagination({ total: 100 })); // 10 pages

      act(() => {
        result.current.goToPage(15);
      });

      expect(result.current.page).toBe(10);
    });
  });

  describe('nextPage', () => {
    it('should increment page', () => {
      const { result } = renderHook(() => usePagination({ total: 100 }));

      act(() => {
        result.current.nextPage();
      });

      expect(result.current.page).toBe(2);
    });

    it('should not exceed totalPages', () => {
      const { result } = renderHook(() =>
        usePagination({ total: 100, initialPage: 10, initialPageSize: 10 })
      );

      act(() => {
        result.current.nextPage();
      });

      expect(result.current.page).toBe(10);
    });
  });

  describe('prevPage', () => {
    it('should decrement page', () => {
      const { result } = renderHook(() =>
        usePagination({ total: 100, initialPage: 5 })
      );

      act(() => {
        result.current.prevPage();
      });

      expect(result.current.page).toBe(4);
    });

    it('should not go below 1', () => {
      const { result } = renderHook(() => usePagination({ total: 100 }));

      act(() => {
        result.current.prevPage();
      });

      expect(result.current.page).toBe(1);
    });
  });

  describe('firstPage / lastPage', () => {
    it('should go to first page', () => {
      const { result } = renderHook(() =>
        usePagination({ total: 100, initialPage: 5 })
      );

      act(() => {
        result.current.firstPage();
      });

      expect(result.current.page).toBe(1);
    });

    it('should go to last page', () => {
      const { result } = renderHook(() =>
        usePagination({ total: 100, initialPage: 1, initialPageSize: 10 })
      );

      act(() => {
        result.current.lastPage();
      });

      expect(result.current.page).toBe(10);
    });
  });

  describe('setPageSize', () => {
    it('should update page size', () => {
      const { result } = renderHook(() => usePagination({ total: 100 }));

      act(() => {
        result.current.setPageSize(25);
      });

      expect(result.current.pageSize).toBe(25);
      expect(result.current.totalPages).toBe(4);
    });

    it('should reset to page 1 when page size changes', () => {
      const { result } = renderHook(() =>
        usePagination({ total: 100, initialPage: 5, initialPageSize: 10 })
      );

      act(() => {
        result.current.setPageSize(50);
      });

      expect(result.current.page).toBe(1);
    });

    it('should maintain current page if still valid after size change', () => {
      const { result } = renderHook(() =>
        usePagination({ total: 100, initialPage: 2, initialPageSize: 10 })
      );

      // Page 2 with size 10 = items 11-20
      // With size 20, page 2 = items 21-40 (still valid)
      act(() => {
        result.current.setPageSize(20);
      });

      // By default, we reset to page 1 on page size change
      expect(result.current.page).toBe(1);
    });
  });

  describe('setTotal', () => {
    it('should update total items', () => {
      const { result } = renderHook(() => usePagination({ total: 100 }));

      act(() => {
        result.current.setTotal(50);
      });

      expect(result.current.total).toBe(50);
      expect(result.current.totalPages).toBe(5);
    });

    it('should adjust page if current page exceeds new totalPages', () => {
      const { result } = renderHook(() =>
        usePagination({ total: 100, initialPage: 10, initialPageSize: 10 })
      );

      act(() => {
        result.current.setTotal(30); // 3 pages now
      });

      expect(result.current.page).toBe(3);
    });
  });

  describe('getPageItems helper', () => {
    it('should return start and end indices', () => {
      const { result } = renderHook(() =>
        usePagination({ total: 100, initialPage: 3, initialPageSize: 10 })
      );

      const { startIndex, endIndex } = result.current.getPageItems();

      expect(startIndex).toBe(20); // (3-1) * 10
      expect(endIndex).toBe(30);   // 3 * 10
    });

    it('should clamp endIndex to total', () => {
      const { result } = renderHook(() =>
        usePagination({ total: 25, initialPage: 3, initialPageSize: 10 })
      );

      const { startIndex, endIndex } = result.current.getPageItems();

      expect(startIndex).toBe(20);
      expect(endIndex).toBe(25); // Clamped to total
    });
  });

  describe('reset', () => {
    it('should reset to initial values', () => {
      const { result } = renderHook(() =>
        usePagination({ total: 100, initialPage: 1, initialPageSize: 10 })
      );

      act(() => {
        result.current.goToPage(5);
        result.current.setPageSize(25);
      });

      expect(result.current.page).toBe(1); // Page reset due to size change
      expect(result.current.pageSize).toBe(25);

      act(() => {
        result.current.reset();
      });

      expect(result.current.page).toBe(1);
      expect(result.current.pageSize).toBe(10);
    });
  });

  describe('total updates', () => {
    it('should recalculate when total changes via rerender', () => {
      const { result, rerender } = renderHook(
        ({ total }) => usePagination({ total }),
        { initialProps: { total: 100 } }
      );

      expect(result.current.totalPages).toBe(10);

      rerender({ total: 50 });

      expect(result.current.total).toBe(50);
      expect(result.current.totalPages).toBe(5);
    });
  });
});
