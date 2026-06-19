/**
 * useEquipmentBrowser Hook Tests
 *
 * Tests for the equipment browser hook that provides filtering,
 * sorting, and pagination functionality.
 */

import { act, renderHook, waitFor } from '@testing-library/react';

import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';

import {
  createMockStoreState,
  mockEquipmentList,
  mockEquipmentLookupService,
  mockUseEquipmentStore,
  setupEquipmentBrowserTest,
} from './useEquipmentBrowser.test-helpers';

const { useEquipmentBrowser } =
  require('../useEquipmentBrowser') as typeof import('../useEquipmentBrowser');

describe('useEquipmentBrowser', () => {
  let mockStoreState: ReturnType<typeof createMockStoreState>;

  beforeEach(() => {
    mockStoreState = setupEquipmentBrowserTest();
  });

  describe('initial state', () => {
    it('should return correct initial state values', () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      expect(result.current.equipment).toEqual(mockEquipmentList);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.currentPage).toBe(1);
      expect(result.current.pageSize).toBe(25);
      expect(result.current.search).toBe('');
      expect(result.current.techBaseFilter).toBeNull();
      expect(result.current.categoryFilter).toBeNull();
      expect(result.current.sortColumn).toBe('name');
      expect(result.current.sortDirection).toBe('asc');
    });

    it('should return unit context values as null when no context', () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      expect(result.current.unitYear).toBeNull();
      expect(result.current.unitTechBase).toBeNull();
    });

    it('should return toggle filter states', () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      expect(result.current.hidePrototype).toBe(false);
      expect(result.current.hideOneShot).toBe(false);
      expect(result.current.hideUnavailable).toBe(false);
      expect(result.current.hideAmmoWithoutWeapon).toBe(false);
    });
  });

  describe('equipment loading', () => {
    it('should load equipment on mount when equipment is empty', async () => {
      const emptyState = createMockStoreState();
      emptyState.equipment = [];
      mockUseEquipmentStore.mockReturnValue(emptyState);

      renderHook(() => useEquipmentBrowser());

      await waitFor(() => {
        expect(mockEquipmentLookupService.initialize).toHaveBeenCalled();
      });
    });

    it('should not load equipment when already loaded', () => {
      renderHook(() => useEquipmentBrowser());

      expect(mockEquipmentLookupService.initialize).not.toHaveBeenCalled();
    });

    it('should set loading state during equipment load', async () => {
      const emptyState = createMockStoreState();
      emptyState.equipment = [];
      mockUseEquipmentStore.mockReturnValue(emptyState);

      renderHook(() => useEquipmentBrowser());

      await waitFor(() => {
        expect(emptyState.setLoading).toHaveBeenCalledWith(true);
      });
    });

    it('should handle equipment load error', async () => {
      const emptyState = createMockStoreState();
      emptyState.equipment = [];
      mockUseEquipmentStore.mockReturnValue(emptyState);
      mockEquipmentLookupService.initialize = jest
        .fn()
        .mockRejectedValue(new Error('Load failed'));

      renderHook(() => useEquipmentBrowser());

      await waitFor(() => {
        expect(emptyState.setError).toHaveBeenCalledWith('Load failed');
      });
    });

    it('should set equipment after successful load', async () => {
      const emptyState = createMockStoreState();
      emptyState.equipment = [];
      mockUseEquipmentStore.mockReturnValue(emptyState);

      renderHook(() => useEquipmentBrowser());

      await waitFor(() => {
        expect(emptyState.setEquipment).toHaveBeenCalledWith(mockEquipmentList);
      });
    });
  });

  describe('filter actions', () => {
    it('should expose setSearch action', () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      act(() => {
        result.current.setSearch('laser');
      });

      expect(mockStoreState.setSearch).toHaveBeenCalledWith('laser');
    });

    it('should expose setTechBaseFilter action', () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      act(() => {
        result.current.setTechBaseFilter(TechBase.CLAN);
      });

      expect(mockStoreState.setTechBaseFilter).toHaveBeenCalledWith(
        TechBase.CLAN,
      );
    });

    it('should expose setCategoryFilter action', () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      act(() => {
        result.current.setCategoryFilter(EquipmentCategory.ENERGY_WEAPON);
      });

      expect(mockStoreState.setCategoryFilter).toHaveBeenCalledWith(
        EquipmentCategory.ENERGY_WEAPON,
      );
    });

    it('should expose selectCategory action', () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      act(() => {
        result.current.selectCategory(
          EquipmentCategory.BALLISTIC_WEAPON,
          false,
        );
      });

      expect(mockStoreState.selectCategory).toHaveBeenCalledWith(
        EquipmentCategory.BALLISTIC_WEAPON,
        false,
      );
    });

    it('should expose selectCategory with multi-select', () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      act(() => {
        result.current.selectCategory(EquipmentCategory.MISSILE_WEAPON, true);
      });

      expect(mockStoreState.selectCategory).toHaveBeenCalledWith(
        EquipmentCategory.MISSILE_WEAPON,
        true,
      );
    });

    it('should expose showAll action', () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      act(() => {
        result.current.showAll();
      });

      expect(mockStoreState.showAllCategories).toHaveBeenCalled();
    });

    it('should expose clearFilters action', () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      act(() => {
        result.current.clearFilters();
      });

      expect(mockStoreState.clearFilters).toHaveBeenCalled();
    });
  });

  describe('toggle filter actions', () => {
    it('should expose toggleHidePrototype action', () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      act(() => {
        result.current.toggleHidePrototype();
      });

      expect(mockStoreState.toggleHidePrototype).toHaveBeenCalled();
    });

    it('should expose toggleHideOneShot action', () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      act(() => {
        result.current.toggleHideOneShot();
      });

      expect(mockStoreState.toggleHideOneShot).toHaveBeenCalled();
    });

    it('should expose toggleHideUnavailable action', () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      act(() => {
        result.current.toggleHideUnavailable();
      });

      expect(mockStoreState.toggleHideUnavailable).toHaveBeenCalled();
    });

    it('should expose toggleHideAmmoWithoutWeapon action', () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      act(() => {
        result.current.toggleHideAmmoWithoutWeapon();
      });

      expect(mockStoreState.toggleHideAmmoWithoutWeapon).toHaveBeenCalled();
    });
  });

  describe('pagination', () => {
    it('should expose setPage action', () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      act(() => {
        result.current.setPage(3);
      });

      expect(mockStoreState.setPage).toHaveBeenCalledWith(3);
    });

    it('should expose setPageSize action', () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      act(() => {
        result.current.setPageSize(50);
      });

      expect(mockStoreState.setPageSize).toHaveBeenCalledWith(50);
    });

    it('should expose goToFirstPage action', () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      act(() => {
        result.current.goToFirstPage();
      });

      expect(mockStoreState.setPage).toHaveBeenCalledWith(1);
    });

    it('should expose goToLastPage action', () => {
      // Setup state with multiple pages
      const paginatedState = createMockStoreState();
      paginatedState.pagination.pageSize = 2;
      paginatedState.getFilteredEquipment = jest.fn(() => mockEquipmentList);
      mockUseEquipmentStore.mockReturnValue(paginatedState);

      const { result } = renderHook(() => useEquipmentBrowser());

      act(() => {
        result.current.goToLastPage();
      });

      // 5 items / 2 per page = 3 pages
      expect(paginatedState.setPage).toHaveBeenCalledWith(3);
    });

    it('should expose goToPreviousPage action', () => {
      const paginatedState = createMockStoreState();
      paginatedState.pagination.currentPage = 3;
      mockUseEquipmentStore.mockReturnValue(paginatedState);

      const { result } = renderHook(() => useEquipmentBrowser());

      act(() => {
        result.current.goToPreviousPage();
      });

      expect(paginatedState.setPage).toHaveBeenCalledWith(2);
    });

    it('should not go below page 1 on goToPreviousPage', () => {
      const paginatedState = createMockStoreState();
      paginatedState.pagination.currentPage = 1;
      mockUseEquipmentStore.mockReturnValue(paginatedState);

      const { result } = renderHook(() => useEquipmentBrowser());

      act(() => {
        result.current.goToPreviousPage();
      });

      expect(paginatedState.setPage).toHaveBeenCalledWith(1);
    });

    it('should expose goToNextPage action', () => {
      const paginatedState = createMockStoreState();
      paginatedState.pagination.currentPage = 1;
      paginatedState.pagination.pageSize = 2;
      paginatedState.getFilteredEquipment = jest.fn(() => mockEquipmentList);
      mockUseEquipmentStore.mockReturnValue(paginatedState);

      const { result } = renderHook(() => useEquipmentBrowser());

      act(() => {
        result.current.goToNextPage();
      });

      expect(paginatedState.setPage).toHaveBeenCalledWith(2);
    });

    it('should not exceed total pages on goToNextPage', () => {
      const paginatedState = createMockStoreState();
      paginatedState.pagination.currentPage = 3;
      paginatedState.pagination.pageSize = 2;
      paginatedState.getFilteredEquipment = jest.fn(() => mockEquipmentList);
      mockUseEquipmentStore.mockReturnValue(paginatedState);

      const { result } = renderHook(() => useEquipmentBrowser());

      act(() => {
        result.current.goToNextPage();
      });

      // Already at last page (3), should stay at 3
      expect(paginatedState.setPage).toHaveBeenCalledWith(3);
    });

    it('should calculate totalPages correctly', () => {
      const paginatedState = createMockStoreState();
      paginatedState.pagination.pageSize = 2;
      paginatedState.getFilteredEquipment = jest.fn(() => mockEquipmentList);
      mockUseEquipmentStore.mockReturnValue(paginatedState);

      const { result } = renderHook(() => useEquipmentBrowser());

      // 5 items / 2 per page = 3 pages (rounded up)
      expect(result.current.totalPages).toBe(3);
    });

    it('should calculate totalItems correctly', () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      expect(result.current.totalItems).toBe(mockEquipmentList.length);
    });
  });

  describe('sorting', () => {
    it('should expose setSort action', () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      act(() => {
        result.current.setSort('weight');
      });

      expect(mockStoreState.setSort).toHaveBeenCalledWith('weight');
    });

    it('should return current sort column', () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      expect(result.current.sortColumn).toBe('name');
    });

    it('should return current sort direction', () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      expect(result.current.sortDirection).toBe('asc');
    });
  });

  describe('refresh functionality', () => {
    it('should expose refresh action', async () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockEquipmentLookupService.initialize).toHaveBeenCalled();
      expect(mockStoreState.setEquipment).toHaveBeenCalledWith(
        mockEquipmentList,
      );
    });

    it('should set loading state during refresh', async () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockStoreState.setLoading).toHaveBeenCalledWith(true);
      expect(mockStoreState.setLoading).toHaveBeenCalledWith(false);
    });

    it('should clear error before refresh', async () => {
      const { result } = renderHook(() => useEquipmentBrowser());

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockStoreState.setError).toHaveBeenCalledWith(null);
    });
  });

  describe('filtered and paginated equipment', () => {
    it('should return filtered equipment from store', () => {
      const filteredList = [mockEquipmentList[0], mockEquipmentList[1]];
      mockStoreState.getFilteredEquipment = jest.fn(() => filteredList);

      const { result } = renderHook(() => useEquipmentBrowser());

      expect(result.current.filteredEquipment).toEqual(filteredList);
    });

    it('should return paginated equipment from store', () => {
      const paginatedList = [mockEquipmentList[0]];
      mockStoreState.getPaginatedEquipment = jest.fn(() => paginatedList);

      const { result } = renderHook(() => useEquipmentBrowser());

      expect(result.current.paginatedEquipment).toEqual(paginatedList);
    });
  });

  describe('active categories', () => {
    it('should return activeCategories from store', () => {
      const categories = new Set([
        EquipmentCategory.ENERGY_WEAPON,
        EquipmentCategory.BALLISTIC_WEAPON,
      ]);
      mockStoreState.filters.activeCategories = categories;

      const { result } = renderHook(() => useEquipmentBrowser());

      expect(result.current.activeCategories).toEqual(categories);
    });

    it('should return showAllCategories from store', () => {
      mockStoreState.filters.showAllCategories = false;

      const { result } = renderHook(() => useEquipmentBrowser());

      expect(result.current.showAllCategories).toBe(false);
    });
  });
});
