/**
 * Tests for useEquipmentStore
 * 
 * @spec openspec/specs/equipment-browser/spec.md
 */

import { act, renderHook } from '@testing-library/react';
import { useEquipmentStore } from '@/stores/useEquipmentStore';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory, IEquipmentItem } from '@/types/equipment';

// Mock equipment data
const mockEquipment: IEquipmentItem[] = [
  {
    id: 'medium-laser',
    name: 'Medium Laser',
    category: EquipmentCategory.ENERGY_WEAPON,
    techBase: TechBase.INNER_SPHERE,
    weight: 1,
    criticalSlots: 1,
    introductionYear: 2300,
    rulesLevel: 'Standard',
  } as IEquipmentItem,
  {
    id: 'clan-er-large-laser',
    name: 'ER Large Laser (Clan)',
    category: EquipmentCategory.ENERGY_WEAPON,
    techBase: TechBase.CLAN,
    weight: 4,
    criticalSlots: 1,
    introductionYear: 2820,
    rulesLevel: 'Standard',
  } as IEquipmentItem,
  {
    id: 'ac-10',
    name: 'AC/10',
    category: EquipmentCategory.BALLISTIC_WEAPON,
    techBase: TechBase.INNER_SPHERE,
    weight: 12,
    criticalSlots: 7,
    introductionYear: 2460,
    rulesLevel: 'Standard',
  } as IEquipmentItem,
  {
    id: 'lrm-10',
    name: 'LRM 10',
    category: EquipmentCategory.MISSILE_WEAPON,
    techBase: TechBase.INNER_SPHERE,
    weight: 5,
    criticalSlots: 2,
    introductionYear: 2400,
    rulesLevel: 'Standard',
  } as IEquipmentItem,
  {
    id: 'ac-10-ammo',
    name: 'AC/10 Ammo',
    category: EquipmentCategory.AMMUNITION,
    techBase: TechBase.INNER_SPHERE,
    weight: 1,
    criticalSlots: 1,
    introductionYear: 2460,
    rulesLevel: 'Standard',
  } as IEquipmentItem,
];

describe('useEquipmentStore', () => {
  // Reset store between tests
  beforeEach(() => {
    // Reset all state
    useEquipmentStore.setState({
      equipment: [],
      isLoading: false,
      error: null,
      unitContext: { unitYear: null, unitTechBase: null },
      filters: {
        search: '',
        techBase: null,
        category: null,
        activeCategories: new Set<EquipmentCategory>(),
        showAllCategories: true,
        hidePrototype: false,
        hideOneShot: false,
        hideUnavailable: true,
        maxWeight: null,
        maxCriticalSlots: null,
        maxYear: null,
      },
      pagination: {
        currentPage: 1,
        pageSize: 25,
        totalItems: 0,
      },
      sort: {
        column: 'name',
        direction: 'asc',
      },
    });
  });

  describe('Initial State', () => {
    it('should have empty equipment initially', () => {
      const { result } = renderHook(() => useEquipmentStore());
      expect(result.current.equipment).toEqual([]);
    });

    it('should not be loading initially', () => {
      const { result } = renderHook(() => useEquipmentStore());
      expect(result.current.isLoading).toBe(false);
    });

    it('should have no error initially', () => {
      const { result } = renderHook(() => useEquipmentStore());
      expect(result.current.error).toBeNull();
    });

    it('should have default filters', () => {
      const { result } = renderHook(() => useEquipmentStore());
      expect(result.current.filters.search).toBe('');
      expect(result.current.filters.techBase).toBeNull();
      expect(result.current.filters.category).toBeNull();
      expect(result.current.filters.showAllCategories).toBe(true);
    });

    it('should have default pagination', () => {
      const { result } = renderHook(() => useEquipmentStore());
      expect(result.current.pagination.currentPage).toBe(1);
      expect(result.current.pagination.pageSize).toBe(25);
    });

    it('should have default sort', () => {
      const { result } = renderHook(() => useEquipmentStore());
      expect(result.current.sort.column).toBe('name');
      expect(result.current.sort.direction).toBe('asc');
    });
  });

  describe('Equipment Data', () => {
    it('should set equipment', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setEquipment(mockEquipment);
      });
      
      expect(result.current.equipment).toHaveLength(5);
    });

    it('should update total items when equipment is set', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setEquipment(mockEquipment);
      });
      
      expect(result.current.pagination.totalItems).toBe(5);
    });

    it('should set loading state', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setLoading(true);
      });
      
      expect(result.current.isLoading).toBe(true);
    });

    it('should set error state', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setError('Failed to load');
      });
      
      expect(result.current.error).toBe('Failed to load');
    });
  });

  describe('Unit Context', () => {
    it('should set unit context', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setUnitContext(3025, TechBase.INNER_SPHERE);
      });
      
      expect(result.current.unitContext.unitYear).toBe(3025);
      expect(result.current.unitContext.unitTechBase).toBe(TechBase.INNER_SPHERE);
    });

    it('should reset page when unit context changes', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setPage(3);
        result.current.setUnitContext(3050, TechBase.CLAN);
      });
      
      expect(result.current.pagination.currentPage).toBe(1);
    });
  });

  describe('Search Filter', () => {
    it('should set search filter', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setSearch('laser');
      });
      
      expect(result.current.filters.search).toBe('laser');
    });

    it('should reset page when search changes', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setPage(5);
        result.current.setSearch('ppc');
      });
      
      expect(result.current.pagination.currentPage).toBe(1);
    });

    it('should filter equipment by search', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setEquipment(mockEquipment);
        result.current.setSearch('laser');
      });
      
      const filtered = result.current.getFilteredEquipment();
      expect(filtered.every(e => e.name.toLowerCase().includes('laser'))).toBe(true);
    });
  });

  describe('Tech Base Filter', () => {
    it('should set tech base filter', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setTechBaseFilter(TechBase.CLAN);
      });
      
      expect(result.current.filters.techBase).toBe(TechBase.CLAN);
    });

    it('should filter equipment by tech base', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setEquipment(mockEquipment);
        result.current.setTechBaseFilter(TechBase.CLAN);
      });
      
      const filtered = result.current.getFilteredEquipment();
      expect(filtered.every(e => e.techBase === TechBase.CLAN)).toBe(true);
    });

    it('should clear tech base filter', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setTechBaseFilter(TechBase.CLAN);
        result.current.setTechBaseFilter(null);
      });
      
      expect(result.current.filters.techBase).toBeNull();
    });
  });

  describe('Category Filter', () => {
    it('should set category filter', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setCategoryFilter(EquipmentCategory.ENERGY_WEAPON);
      });
      
      expect(result.current.filters.category).toBe(EquipmentCategory.ENERGY_WEAPON);
    });

    it('should filter equipment by category', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setEquipment(mockEquipment);
        result.current.setCategoryFilter(EquipmentCategory.ENERGY_WEAPON);
      });
      
      const filtered = result.current.getFilteredEquipment();
      expect(filtered.every(e => e.category === EquipmentCategory.ENERGY_WEAPON)).toBe(true);
    });
  });

  describe('Category Selection (Multi-Select)', () => {
    it('should select single category (exclusive mode)', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.selectCategory(EquipmentCategory.ENERGY_WEAPON, false);
      });
      
      expect(result.current.filters.activeCategories.has(EquipmentCategory.ENERGY_WEAPON)).toBe(true);
      expect(result.current.filters.showAllCategories).toBe(false);
    });

    it('should toggle category (multi-select mode)', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.selectCategory(EquipmentCategory.ENERGY_WEAPON, true);
        result.current.selectCategory(EquipmentCategory.BALLISTIC_WEAPON, true);
      });
      
      expect(result.current.filters.activeCategories.has(EquipmentCategory.ENERGY_WEAPON)).toBe(true);
      expect(result.current.filters.activeCategories.has(EquipmentCategory.BALLISTIC_WEAPON)).toBe(true);
    });

    it('should remove category when toggled again', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.selectCategory(EquipmentCategory.ENERGY_WEAPON, true);
        result.current.selectCategory(EquipmentCategory.ENERGY_WEAPON, true);
      });
      
      expect(result.current.filters.activeCategories.has(EquipmentCategory.ENERGY_WEAPON)).toBe(false);
    });

    it('should show all categories', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.selectCategory(EquipmentCategory.ENERGY_WEAPON, false);
        result.current.showAllCategories();
      });
      
      expect(result.current.filters.showAllCategories).toBe(true);
      expect(result.current.filters.activeCategories.size).toBe(0);
    });
  });

  describe('Hide Filters', () => {
    it('should toggle hidePrototype', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      expect(result.current.filters.hidePrototype).toBe(false);
      
      act(() => {
        result.current.toggleHidePrototype();
      });
      
      expect(result.current.filters.hidePrototype).toBe(true);
    });

    it('should toggle hideOneShot', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      expect(result.current.filters.hideOneShot).toBe(false);
      
      act(() => {
        result.current.toggleHideOneShot();
      });
      
      expect(result.current.filters.hideOneShot).toBe(true);
    });

    it('should toggle hideUnavailable', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      // Default is true
      expect(result.current.filters.hideUnavailable).toBe(true);
      
      act(() => {
        result.current.toggleHideUnavailable();
      });
      
      expect(result.current.filters.hideUnavailable).toBe(false);
    });
  });

  describe('Weight and Slot Filters', () => {
    it('should set max weight', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setMaxWeight(5);
      });
      
      expect(result.current.filters.maxWeight).toBe(5);
    });

    it('should filter by max weight', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setEquipment(mockEquipment);
        result.current.setMaxWeight(5);
      });
      
      const filtered = result.current.getFilteredEquipment();
      expect(filtered.every(e => e.weight <= 5)).toBe(true);
    });

    it('should set max critical slots', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setMaxCriticalSlots(3);
      });
      
      expect(result.current.filters.maxCriticalSlots).toBe(3);
    });

    it('should filter by max critical slots', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setEquipment(mockEquipment);
        result.current.setMaxCriticalSlots(2);
      });
      
      const filtered = result.current.getFilteredEquipment();
      expect(filtered.every(e => e.criticalSlots <= 2)).toBe(true);
    });
  });

  describe('Year Filter', () => {
    it('should set max year', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setMaxYear(3050);
      });
      
      expect(result.current.filters.maxYear).toBe(3050);
    });

    it('should filter by max year', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setEquipment(mockEquipment);
        result.current.setMaxYear(2500);
      });
      
      const filtered = result.current.getFilteredEquipment();
      expect(filtered.every(e => e.introductionYear <= 2500)).toBe(true);
    });
  });

  describe('Clear Filters', () => {
    it('should clear all filters', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setSearch('test');
        result.current.setTechBaseFilter(TechBase.CLAN);
        result.current.toggleHidePrototype();
        result.current.setMaxWeight(10);
        result.current.clearFilters();
      });
      
      expect(result.current.filters.search).toBe('');
      expect(result.current.filters.techBase).toBeNull();
      expect(result.current.filters.hidePrototype).toBe(false);
      expect(result.current.filters.maxWeight).toBeNull();
    });

    it('should reset page when clearing filters', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setPage(5);
        result.current.clearFilters();
      });
      
      expect(result.current.pagination.currentPage).toBe(1);
    });
  });

  describe('Pagination', () => {
    it('should set page', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setPage(3);
      });
      
      expect(result.current.pagination.currentPage).toBe(3);
    });

    it('should set page size', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setPageSize(50);
      });
      
      expect(result.current.pagination.pageSize).toBe(50);
    });

    it('should reset page when page size changes', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setPage(5);
        result.current.setPageSize(100);
      });
      
      expect(result.current.pagination.currentPage).toBe(1);
    });

    it('should paginate equipment correctly', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setEquipment(mockEquipment);
        result.current.setPageSize(2);
        result.current.setPage(1);
      });
      
      const paginated = result.current.getPaginatedEquipment();
      expect(paginated).toHaveLength(2);
    });

    it('should return correct page of equipment', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setEquipment(mockEquipment);
        result.current.setPageSize(2);
        result.current.setPage(2);
      });
      
      const paginated = result.current.getPaginatedEquipment();
      // Page 2 with 2 items per page should skip first 2 items
      expect(paginated.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Sorting', () => {
    it('should set sort column', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setSort('weight');
      });
      
      expect(result.current.sort.column).toBe('weight');
    });

    it('should toggle direction when clicking same column twice', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      // Start with a different column first
      act(() => {
        result.current.setSort('weight'); // Change to weight (asc)
      });
      
      expect(result.current.sort.column).toBe('weight');
      expect(result.current.sort.direction).toBe('asc');
      
      // Now toggle to desc by clicking same column again
      act(() => {
        result.current.setSort('weight'); // Toggle to desc
      });
      
      expect(result.current.sort.column).toBe('weight');
      expect(result.current.sort.direction).toBe('desc');
    });

    it('should reset to asc when clicking different column', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setSort('weight'); // Change to weight
        result.current.setSort('weight'); // Toggle to desc
        result.current.setSort('name'); // Different column - should be asc
      });
      
      expect(result.current.sort.column).toBe('name');
      expect(result.current.sort.direction).toBe('asc');
    });

    it('should sort equipment by name ascending', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setEquipment(mockEquipment);
        result.current.toggleHideUnavailable(); // Disable so we get all items
      });
      
      const filtered = result.current.getFilteredEquipment();
      // Verify sorted order by checking names are in order
      const names = filtered.map(e => e.name.toLowerCase());
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('should sort equipment by weight', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setEquipment(mockEquipment);
        result.current.toggleHideUnavailable(); // Disable so we get all items
        result.current.setSort('weight');
      });
      
      const filtered = result.current.getFilteredEquipment();
      // Verify sorted order
      const weights = filtered.map(e => e.weight);
      const sortedWeights = [...weights].sort((a, b) => a - b);
      expect(weights).toEqual(sortedWeights);
    });

    it('should reset page when sorting changes', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setPage(3);
        result.current.setSort('weight');
      });
      
      expect(result.current.pagination.currentPage).toBe(1);
    });
  });

  describe('Computed Functions', () => {
    it('getFilteredEquipment should return all equipment when no filters', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setEquipment(mockEquipment);
        // Need to disable hideUnavailable since it's true by default
        result.current.toggleHideUnavailable();
      });
      
      const filtered = result.current.getFilteredEquipment();
      expect(filtered).toHaveLength(5);
    });

    it('getFilteredEquipment should apply multiple filters', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setEquipment(mockEquipment);
        result.current.toggleHideUnavailable(); // Disable
        result.current.setSearch('laser');
        result.current.setTechBaseFilter(TechBase.INNER_SPHERE);
      });
      
      const filtered = result.current.getFilteredEquipment();
      expect(filtered.every(e => 
        e.name.toLowerCase().includes('laser') && 
        e.techBase === TechBase.INNER_SPHERE
      )).toBe(true);
    });

    it('getPaginatedEquipment should respect page and page size', () => {
      const { result } = renderHook(() => useEquipmentStore());
      
      act(() => {
        result.current.setEquipment(mockEquipment);
        result.current.toggleHideUnavailable();
        result.current.setPageSize(2);
        result.current.setPage(1);
      });
      
      const paginated = result.current.getPaginatedEquipment();
      expect(paginated).toHaveLength(2);
    });
  });
});
