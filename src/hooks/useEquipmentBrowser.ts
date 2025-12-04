/**
 * useEquipmentBrowser Hook
 * 
 * Provides equipment browsing functionality with filtering,
 * sorting, and pagination.
 * 
 * Automatically syncs with the active unit's year and tech base
 * for availability filtering.
 * 
 * @spec openspec/specs/equipment-browser/spec.md
 */

import { useEffect, useMemo, useCallback, useContext, useState } from 'react';
import { useEquipmentStore, SortColumn } from '@/stores/useEquipmentStore';
import { UnitStoreContext, type UnitStore } from '@/stores/useUnitStore';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory, getAllEquipmentItems, IEquipmentItem } from '@/types/equipment';

/**
 * Equipment browser state and actions
 */
export interface EquipmentBrowserState {
  // Data
  readonly equipment: readonly IEquipmentItem[];
  readonly filteredEquipment: readonly IEquipmentItem[];
  readonly paginatedEquipment: readonly IEquipmentItem[];
  readonly isLoading: boolean;
  readonly error: string | null;
  
  // Unit context
  readonly unitYear: number | null;
  readonly unitTechBase: TechBase | null;
  
  // Pagination
  readonly currentPage: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly totalItems: number;
  
  // Filters
  readonly search: string;
  readonly techBaseFilter: TechBase | null;
  readonly categoryFilter: EquipmentCategory | null;
  readonly activeCategories: Set<EquipmentCategory>;
  readonly showAllCategories: boolean;
  readonly hidePrototype: boolean;
  readonly hideOneShot: boolean;
  readonly hideUnavailable: boolean;
  
  // Sort
  readonly sortColumn: SortColumn;
  readonly sortDirection: 'asc' | 'desc';
  
  // Filter actions
  readonly setSearch: (search: string) => void;
  readonly setTechBaseFilter: (techBase: TechBase | null) => void;
  readonly setCategoryFilter: (category: EquipmentCategory | null) => void;
  /** Select category - exclusive by default, multi-select with Ctrl+click */
  readonly selectCategory: (category: EquipmentCategory, isMultiSelect: boolean) => void;
  readonly showAll: () => void;
  readonly toggleHidePrototype: () => void;
  readonly toggleHideOneShot: () => void;
  readonly toggleHideUnavailable: () => void;
  readonly clearFilters: () => void;
  
  // Pagination actions
  readonly setPage: (page: number) => void;
  readonly setPageSize: (size: number) => void;
  readonly goToFirstPage: () => void;
  readonly goToLastPage: () => void;
  readonly goToPreviousPage: () => void;
  readonly goToNextPage: () => void;
  
  // Sort actions
  readonly setSort: (column: SortColumn) => void;
  
  // Utility
  readonly refresh: () => void;
}

/**
 * Hook to safely get unit store values if within a unit context
 * Uses subscription pattern to avoid conditional hook calls
 */
function useUnitContextValues(): { year: number | null; techBase: TechBase | null } {
  const unitStore = useContext(UnitStoreContext);
  const [values, setValues] = useState<{ year: number | null; techBase: TechBase | null }>({
    year: null,
    techBase: null,
  });
  
  useEffect(() => {
    if (!unitStore) {
      setValues({ year: null, techBase: null });
      return;
    }
    
    // Get initial values
    const state = unitStore.getState();
    setValues({ year: state.year, techBase: state.techBase });
    
    // Subscribe to changes
    const unsubscribe = unitStore.subscribe((state: UnitStore) => {
      setValues({ year: state.year, techBase: state.techBase });
    });
    
    return unsubscribe;
  }, [unitStore]);
  
  return values;
}

/**
 * Hook for equipment browser functionality
 */
export function useEquipmentBrowser(): EquipmentBrowserState {
  const {
    equipment,
    isLoading,
    error,
    filters,
    pagination,
    sort,
    setEquipment,
    setLoading,
    setError,
    setUnitContext,
    setSearch,
    setTechBaseFilter,
    setCategoryFilter,
    selectCategory,
    showAllCategories,
    toggleHidePrototype,
    toggleHideOneShot,
    toggleHideUnavailable,
    clearFilters,
    setPage,
    setPageSize,
    setSort,
    getFilteredEquipment,
    getPaginatedEquipment,
  } = useEquipmentStore();
  
  // Get unit year and tech base from unit store context (if available)
  const { year: unitYear, techBase: unitTechBase } = useUnitContextValues();
  
  // Sync unit context with equipment store when unit changes
  useEffect(() => {
    setUnitContext(unitYear, unitTechBase);
  }, [unitYear, unitTechBase, setUnitContext]);
  
  // Load equipment on mount
  useEffect(() => {
    if (equipment.length === 0 && !isLoading) {
      loadEquipment();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const loadEquipment = useCallback(() => {
    setLoading(true);
    setError(null);
    
    try {
      const items = getAllEquipmentItems();
      setEquipment(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load equipment');
    } finally {
      setLoading(false);
    }
  }, [setEquipment, setLoading, setError]);
  
  // Memoized filtered and paginated equipment
  // Include filter values in dependencies to trigger re-computation when filters change
  const filteredEquipment = useMemo(
    () => getFilteredEquipment(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      getFilteredEquipment,
      equipment,
      filters.search,
      filters.techBase,
      filters.category,
      filters.activeCategories,
      filters.showAllCategories,
      filters.hidePrototype,
      filters.hideOneShot,
      filters.hideUnavailable,
      sort.column,
      sort.direction,
      // Unit context affects filtering when hideUnavailable is true
      unitYear,
      unitTechBase,
    ]
  );
  const paginatedEquipment = useMemo(
    () => getPaginatedEquipment(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getPaginatedEquipment, filteredEquipment, pagination.currentPage, pagination.pageSize]
  );
  
  // Total pages calculation
  const totalPages = useMemo(
    () => Math.ceil(filteredEquipment.length / pagination.pageSize),
    [filteredEquipment.length, pagination.pageSize]
  );
  
  // Pagination helpers
  const goToFirstPage = useCallback(() => setPage(1), [setPage]);
  const goToLastPage = useCallback(() => setPage(totalPages), [setPage, totalPages]);
  const goToPreviousPage = useCallback(
    () => setPage(Math.max(1, pagination.currentPage - 1)),
    [setPage, pagination.currentPage]
  );
  const goToNextPage = useCallback(
    () => setPage(Math.min(totalPages, pagination.currentPage + 1)),
    [setPage, pagination.currentPage, totalPages]
  );
  
  return {
    // Data
    equipment,
    filteredEquipment,
    paginatedEquipment,
    isLoading,
    error,
    
    // Unit context
    unitYear,
    unitTechBase,
    
    // Pagination
    currentPage: pagination.currentPage,
    pageSize: pagination.pageSize,
    totalPages,
    totalItems: filteredEquipment.length,
    
    // Filters
    search: filters.search,
    techBaseFilter: filters.techBase,
    categoryFilter: filters.category,
    activeCategories: filters.activeCategories,
    showAllCategories: filters.showAllCategories,
    hidePrototype: filters.hidePrototype,
    hideOneShot: filters.hideOneShot,
    hideUnavailable: filters.hideUnavailable,
    
    // Sort
    sortColumn: sort.column,
    sortDirection: sort.direction,
    
    // Filter actions
    setSearch,
    setTechBaseFilter,
    setCategoryFilter,
    selectCategory,
    showAll: showAllCategories,
    toggleHidePrototype,
    toggleHideOneShot,
    toggleHideUnavailable,
    clearFilters,
    
    // Pagination actions
    setPage,
    setPageSize,
    goToFirstPage,
    goToLastPage,
    goToPreviousPage,
    goToNextPage,
    
    // Sort actions
    setSort,
    
    // Utility
    refresh: loadEquipment,
  };
}

