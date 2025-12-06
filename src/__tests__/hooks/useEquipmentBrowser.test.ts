/**
 * Tests for useEquipmentBrowser Hook
 * 
 * @spec openspec/specs/equipment-browser/spec.md
 */

import { renderHook, act } from '@testing-library/react';
import { useEquipmentBrowser } from '@/hooks/useEquipmentBrowser';
import { useEquipmentStore, SortColumn } from '@/stores/useEquipmentStore';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';

// Mock the equipment store
jest.mock('@/stores/useEquipmentStore', () => ({
  useEquipmentStore: jest.fn(),
  SortColumn: {
    NAME: 'name',
    DAMAGE: 'damage',
    HEAT: 'heat',
    WEIGHT: 'weight',
  },
}));

// Mock getAllEquipmentItems
jest.mock('@/types/equipment', () => {
  const actualModule = jest.requireActual<typeof import('@/types/equipment')>('@/types/equipment');
  return {
    ...actualModule,
    getAllEquipmentItems: jest.fn().mockReturnValue([
      { id: 'eq-1', name: 'Medium Laser', category: 'Energy' },
      { id: 'eq-2', name: 'AC/20', category: 'Ballistic' },
      { id: 'eq-3', name: 'LRM 10', category: 'Missile' },
    ]),
  };
});

describe('useEquipmentBrowser Hook', () => {
  const mockEquipment = [
    { id: 'eq-1', name: 'Medium Laser', category: 'Energy' },
    { id: 'eq-2', name: 'AC/20', category: 'Ballistic' },
    { id: 'eq-3', name: 'LRM 10', category: 'Missile' },
  ];

  const createMockStore = (overrides = {}) => ({
    equipment: mockEquipment,
    isLoading: false,
    error: null,
    filters: {
      search: '',
      techBase: null,
      category: null,
      activeCategories: new Set<EquipmentCategory>(),
      showAllCategories: true,
      hidePrototype: false,
      hideOneShot: false,
      hideUnavailable: false,
      unitYear: null,
      unitTechBase: null,
    },
    pagination: {
      currentPage: 1,
      pageSize: 20,
    },
    sort: {
      column: 'name' as SortColumn,
      direction: 'asc' as const,
    },
    setEquipment: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
    setUnitContext: jest.fn(),
    setSearch: jest.fn(),
    setTechBaseFilter: jest.fn(),
    setCategoryFilter: jest.fn(),
    selectCategory: jest.fn(),
    showAllCategories: jest.fn(),
    toggleHidePrototype: jest.fn(),
    toggleHideOneShot: jest.fn(),
    toggleHideUnavailable: jest.fn(),
    clearFilters: jest.fn(),
    setPage: jest.fn(),
    setPageSize: jest.fn(),
    setSort: jest.fn(),
    getFilteredEquipment: jest.fn().mockReturnValue(mockEquipment),
    getPaginatedEquipment: jest.fn().mockReturnValue(mockEquipment),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (useEquipmentStore as jest.Mock).mockReturnValue(createMockStore());
  });

  describe('Data Loading', () => {
    it('should return equipment list', () => {
      const { result } = renderHook(() => useEquipmentBrowser());
      
      expect(result.current.equipment).toEqual(mockEquipment);
    });

    it('should return filtered equipment', () => {
      const { result } = renderHook(() => useEquipmentBrowser());
      
      expect(result.current.filteredEquipment).toEqual(mockEquipment);
    });

    it('should return paginated equipment', () => {
      const { result } = renderHook(() => useEquipmentBrowser());
      
      expect(result.current.paginatedEquipment).toEqual(mockEquipment);
    });

    it('should return loading state', () => {
      const { result } = renderHook(() => useEquipmentBrowser());
      
      expect(result.current.isLoading).toBe(false);
    });

    it('should return error state', () => {
      const { result } = renderHook(() => useEquipmentBrowser());
      
      expect(result.current.error).toBeNull();
    });
  });

  describe('Pagination', () => {
    it('should return pagination state', () => {
      const { result } = renderHook(() => useEquipmentBrowser());
      
      expect(result.current.currentPage).toBe(1);
      expect(result.current.pageSize).toBe(20);
    });

    it('should calculate total pages', () => {
      const mockStore = createMockStore();
      mockStore.getFilteredEquipment.mockReturnValue(mockEquipment);
      (useEquipmentStore as jest.Mock).mockReturnValue(mockStore);
      
      const { result } = renderHook(() => useEquipmentBrowser());
      
      expect(result.current.totalPages).toBe(1); // 3 items / 20 per page = 1 page
    });

    it('should return total items', () => {
      const { result } = renderHook(() => useEquipmentBrowser());
      
      expect(result.current.totalItems).toBe(3);
    });

    it('should call setPage', () => {
      const mockStore = createMockStore();
      (useEquipmentStore as jest.Mock).mockReturnValue(mockStore);
      
      const { result } = renderHook(() => useEquipmentBrowser());
      
      act(() => {
        result.current.setPage(2);
      });
      
      expect(mockStore.setPage).toHaveBeenCalledWith(2);
    });

    it('should call setPageSize', () => {
      const mockStore = createMockStore();
      (useEquipmentStore as jest.Mock).mockReturnValue(mockStore);
      
      const { result } = renderHook(() => useEquipmentBrowser());
      
      act(() => {
        result.current.setPageSize(50);
      });
      
      expect(mockStore.setPageSize).toHaveBeenCalledWith(50);
    });

    it('should go to first page', () => {
      const mockStore = createMockStore();
      (useEquipmentStore as jest.Mock).mockReturnValue(mockStore);
      
      const { result } = renderHook(() => useEquipmentBrowser());
      
      act(() => {
        result.current.goToFirstPage();
      });
      
      expect(mockStore.setPage).toHaveBeenCalledWith(1);
    });

    it('should go to previous page', () => {
      const mockStore = createMockStore({
        pagination: { currentPage: 3, pageSize: 20 },
      });
      (useEquipmentStore as jest.Mock).mockReturnValue(mockStore);
      
      const { result } = renderHook(() => useEquipmentBrowser());
      
      act(() => {
        result.current.goToPreviousPage();
      });
      
      expect(mockStore.setPage).toHaveBeenCalledWith(2);
    });

    it('should go to next page', () => {
      const mockStore = createMockStore({
        pagination: { currentPage: 1, pageSize: 1 },
      });
      mockStore.getFilteredEquipment.mockReturnValue(mockEquipment);
      (useEquipmentStore as jest.Mock).mockReturnValue(mockStore);
      
      const { result } = renderHook(() => useEquipmentBrowser());
      
      act(() => {
        result.current.goToNextPage();
      });
      
      expect(mockStore.setPage).toHaveBeenCalledWith(2);
    });
  });

  describe('Filters', () => {
    it('should return search filter', () => {
      const mockStore = createMockStore({
        filters: { ...createMockStore().filters, search: 'laser' },
      });
      (useEquipmentStore as jest.Mock).mockReturnValue(mockStore);
      
      const { result } = renderHook(() => useEquipmentBrowser());
      
      expect(result.current.search).toBe('laser');
    });

    it('should call setSearch', () => {
      const mockStore = createMockStore();
      (useEquipmentStore as jest.Mock).mockReturnValue(mockStore);
      
      const { result } = renderHook(() => useEquipmentBrowser());
      
      act(() => {
        result.current.setSearch('ppc');
      });
      
      expect(mockStore.setSearch).toHaveBeenCalledWith('ppc');
    });

    it('should return tech base filter', () => {
      const mockStore = createMockStore({
        filters: { ...createMockStore().filters, techBase: TechBase.CLAN },
      });
      (useEquipmentStore as jest.Mock).mockReturnValue(mockStore);
      
      const { result } = renderHook(() => useEquipmentBrowser());
      
      expect(result.current.techBaseFilter).toBe(TechBase.CLAN);
    });

    it('should call setTechBaseFilter', () => {
      const mockStore = createMockStore();
      (useEquipmentStore as jest.Mock).mockReturnValue(mockStore);
      
      const { result } = renderHook(() => useEquipmentBrowser());
      
      act(() => {
        result.current.setTechBaseFilter(TechBase.INNER_SPHERE);
      });
      
      expect(mockStore.setTechBaseFilter).toHaveBeenCalledWith(TechBase.INNER_SPHERE);
    });

    it('should call toggleHidePrototype', () => {
      const mockStore = createMockStore();
      (useEquipmentStore as jest.Mock).mockReturnValue(mockStore);
      
      const { result } = renderHook(() => useEquipmentBrowser());
      
      act(() => {
        result.current.toggleHidePrototype();
      });
      
      expect(mockStore.toggleHidePrototype).toHaveBeenCalled();
    });

    it('should call toggleHideUnavailable', () => {
      const mockStore = createMockStore();
      (useEquipmentStore as jest.Mock).mockReturnValue(mockStore);
      
      const { result } = renderHook(() => useEquipmentBrowser());
      
      act(() => {
        result.current.toggleHideUnavailable();
      });
      
      expect(mockStore.toggleHideUnavailable).toHaveBeenCalled();
    });

    it('should call clearFilters', () => {
      const mockStore = createMockStore();
      (useEquipmentStore as jest.Mock).mockReturnValue(mockStore);
      
      const { result } = renderHook(() => useEquipmentBrowser());
      
      act(() => {
        result.current.clearFilters();
      });
      
      expect(mockStore.clearFilters).toHaveBeenCalled();
    });
  });

  describe('Sorting', () => {
    it('should return sort state', () => {
      const { result } = renderHook(() => useEquipmentBrowser());
      
      expect(result.current.sortColumn).toBe('name');
      expect(result.current.sortDirection).toBe('asc');
    });

    it('should call setSort', () => {
      const mockStore = createMockStore();
      (useEquipmentStore as jest.Mock).mockReturnValue(mockStore);
      
      const { result } = renderHook(() => useEquipmentBrowser());
      
      act(() => {
        result.current.setSort('damage' as SortColumn);
      });
      
      expect(mockStore.setSort).toHaveBeenCalledWith('damage');
    });
  });

  describe('Unit Context', () => {
    it('should return unit context values', () => {
      const { result } = renderHook(() => useEquipmentBrowser());
      
      expect(result.current.unitYear).toBeNull();
      expect(result.current.unitTechBase).toBeNull();
    });
  });

  describe('Refresh', () => {
    it('should have refresh function', () => {
      const { result } = renderHook(() => useEquipmentBrowser());
      
      expect(result.current.refresh).toBeDefined();
      expect(typeof result.current.refresh).toBe('function');
    });
  });

  describe('Category Selection', () => {
    it('should call selectCategory', () => {
      const mockStore = createMockStore();
      (useEquipmentStore as jest.Mock).mockReturnValue(mockStore);
      
      const { result } = renderHook(() => useEquipmentBrowser());
      
      act(() => {
        result.current.selectCategory('Energy' as EquipmentCategory, false);
      });
      
      expect(mockStore.selectCategory).toHaveBeenCalledWith('Energy', false);
    });

    it('should call showAll', () => {
      const mockStore = createMockStore();
      (useEquipmentStore as jest.Mock).mockReturnValue(mockStore);
      
      const { result } = renderHook(() => useEquipmentBrowser());
      
      act(() => {
        result.current.showAll();
      });
      
      expect(mockStore.showAllCategories).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should show error when loading fails', () => {
      const mockStore = createMockStore({
        error: 'Failed to load equipment',
      });
      (useEquipmentStore as jest.Mock).mockReturnValue(mockStore);
      
      const { result } = renderHook(() => useEquipmentBrowser());
      
      expect(result.current.error).toBe('Failed to load equipment');
    });

    it('should show loading state', () => {
      const mockStore = createMockStore({
        isLoading: true,
      });
      (useEquipmentStore as jest.Mock).mockReturnValue(mockStore);
      
      const { result } = renderHook(() => useEquipmentBrowser());
      
      expect(result.current.isLoading).toBe(true);
    });
  });
});
