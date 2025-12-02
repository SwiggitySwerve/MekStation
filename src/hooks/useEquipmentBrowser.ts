/**
 * useEquipmentBrowser Hook
 * 
 * Provides equipment browsing functionality with filtering,
 * sorting, and pagination.
 * 
 * @spec openspec/specs/equipment-browser/spec.md
 */

import { useEffect, useMemo, useCallback } from 'react';
import { useEquipmentStore, SortColumn } from '@/stores/useEquipmentStore';
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
  readonly toggleCategory: (category: EquipmentCategory) => void;
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
    setSearch,
    setTechBaseFilter,
    setCategoryFilter,
    toggleCategory,
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
  const filteredEquipment = useMemo(() => getFilteredEquipment(), [getFilteredEquipment]);
  const paginatedEquipment = useMemo(() => getPaginatedEquipment(), [getPaginatedEquipment]);
  
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
    toggleCategory,
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

