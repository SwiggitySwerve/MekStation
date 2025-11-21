/**
 * Equipment Browser Hook - React hook for equipment browser functionality
 * Provides clean React integration for equipment browsing with all services
 * Follows React hooks best practices with proper state management and memoization
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { EquipmentObject } from '../../utils/criticalSlots/CriticalSlot';
import {
  EquipmentDataService,
  LocalEquipmentVariant,
  EquipmentFilterCriteria,
  PaginatedEquipmentResult
} from '../../utils/equipment/EquipmentDataService';

export interface UseEquipmentBrowserOptions {
  initialPageSize?: number;
  initialFilters?: Partial<EquipmentFilterCriteria>;
  enableKeyboardNavigation?: boolean;
  enableAutoRefresh?: boolean;
  refreshInterval?: number;
  onEquipmentAdd?: (equipment: EquipmentObject) => void;
  onEquipmentAction?: (action: string, equipment: EquipmentObject) => void;
  onError?: (error: string) => void;
  debounceMs?: number;
}

export interface UseEquipmentBrowserResult {
  // Current state
  equipment: LocalEquipmentVariant[];
  filteredEquipment: LocalEquipmentVariant[];
  paginatedEquipment: LocalEquipmentVariant[];
  
  // Filter state
  filters: EquipmentFilterCriteria;
  setFilters: (filters: Partial<EquipmentFilterCriteria>) => void;
  clearFilters: () => void;
  
  // Pagination state
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  
  // Pagination actions
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  
  // Data state
  isLoading: boolean;
  isRefreshing: boolean;
  hasError: boolean;
  error: string | null;
  
  // Data actions
  refresh: () => void;
  clearCache: () => void;
  
  // Search and utilities
  searchEquipment: (term: string, limit?: number) => LocalEquipmentVariant[];
  getEquipmentById: (id: string) => LocalEquipmentVariant | null;
  getStatistics: () => ReturnType<typeof EquipmentDataService.getEquipmentStatistics>;
  
  // Available options
  availableCategories: string[];
  availableTechBases: string[];
}

const DEFAULT_FILTERS: EquipmentFilterCriteria = {
  searchTerm: '',
  categoryFilter: 'all',
  techBaseFilter: 'all',
  sortBy: 'name',
  sortOrder: 'ASC'
};

export function useEquipmentBrowser(
  options: UseEquipmentBrowserOptions = {}
): UseEquipmentBrowserResult {
  const {
    initialPageSize = 25,
    initialFilters = {},
    enableKeyboardNavigation = false,
    enableAutoRefresh = false,
    refreshInterval = 300000, // 5 minutes
    onEquipmentAdd,
    onEquipmentAction,
    onError,
    debounceMs = 300
  } = options;

  // State management
  const [filters, setFiltersState] = useState<EquipmentFilterCriteria>({ ...DEFAULT_FILTERS, ...initialFilters });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PaginatedEquipmentResult | null>(null);

  // Refs for debouncing and intervals
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);
  const lastFilters = useRef<EquipmentFilterCriteria>(DEFAULT_FILTERS);

  // Load equipment data
  const loadEquipment = useCallback(async (isRefresh: boolean = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Validate filters
      const validation = EquipmentDataService.validateFilterCriteria(filters);
      const sanitizedFilters = validation.isValid ? filters : validation.sanitized;

      // Get filtered and paginated data
      const result = EquipmentDataService.getFilteredEquipment(
        sanitizedFilters,
        currentPage,
        pageSize
      );

      if (!result.isValid) {
        throw new Error(result.errors.join(', ') || 'Failed to load equipment data');
      }

      setData(result);

      // Report warnings to error handler
      if (result.warnings.length > 0 && onError) {
        result.warnings.forEach(warning => onError(warning));
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filters, currentPage, pageSize, onError]);

  // Debounced reload when filters change
  const debouncedReload = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      // Reset to first page when filters change
      if (JSON.stringify(filters) !== JSON.stringify(lastFilters.current)) {
        setCurrentPage(1);
        lastFilters.current = filters;
      }
      loadEquipment();
    }, debounceMs);
  }, [filters, loadEquipment, debounceMs]);

  // Initial load and filter changes
  useEffect(() => {
    debouncedReload();
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [debouncedReload]);

  // Page/size changes (immediate reload)
  useEffect(() => {
    if (data) { // Only reload if we have initial data
      loadEquipment();
    }
  }, [currentPage, pageSize]);

  // Auto-refresh setup
  useEffect(() => {
    if (enableAutoRefresh && refreshInterval > 0) {
      refreshTimer.current = setInterval(() => {
        loadEquipment(true);
      }, refreshInterval);

      return () => {
        if (refreshTimer.current) {
          clearInterval(refreshTimer.current);
        }
      };
    }
  }, [enableAutoRefresh, refreshInterval, loadEquipment]);

  // Keyboard navigation
  useEffect(() => {
    if (!enableKeyboardNavigation || !data) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          if (data.hasPreviousPage) {
            setCurrentPage(prev => prev - 1);
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (data.hasNextPage) {
            setCurrentPage(prev => prev + 1);
          }
          break;
        case 'Home':
          event.preventDefault();
          if (currentPage !== 1) {
            setCurrentPage(1);
          }
          break;
        case 'End':
          event.preventDefault();
          if (currentPage !== data.totalPages) {
            setCurrentPage(data.totalPages);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardNavigation, data, currentPage]);

  // Filter management
  const setFilters = useCallback((newFilters: Partial<EquipmentFilterCriteria>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  // Pagination actions
  const setPage = useCallback((page: number) => {
    if (data && page >= 1 && page <= data.totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  }, [data, currentPage]);

  const setPageSize = useCallback((size: number) => {
    if (size > 0 && size !== pageSize) {
      setPageSizeState(size);
      setCurrentPage(1); // Reset to first page
    }
  }, [pageSize]);

  const nextPage = useCallback(() => {
    if (data && data.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [data]);

  const previousPage = useCallback(() => {
    if (data && data.hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [data]);

  const firstPage = useCallback(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage]);

  const lastPage = useCallback(() => {
    if (data && currentPage !== data.totalPages) {
      setCurrentPage(data.totalPages);
    }
  }, [data, currentPage]);

  // Data actions
  const refresh = useCallback(() => {
    EquipmentDataService.clearCache();
    loadEquipment(true);
  }, [loadEquipment]);

  const clearCache = useCallback(() => {
    EquipmentDataService.clearCache();
  }, []);

  // Search and utilities
  const searchEquipment = useCallback((term: string, limit?: number) => {
    return EquipmentDataService.searchEquipment(term, limit);
  }, []);

  const getEquipmentById = useCallback((id: string) => {
    return EquipmentDataService.getEquipmentById(id);
  }, []);

  const getStatistics = useCallback(() => {
    return EquipmentDataService.getEquipmentStatistics();
  }, []);

  // Memoized values
  const equipment = useMemo(() => data?.equipment || [], [data]);
  const filteredEquipment = useMemo(() => data?.equipment || [], [data]);
  const paginatedEquipment = useMemo(() => data?.paginatedEquipment || [], [data]);
  const totalItems = useMemo(() => data?.totalCount || 0, [data]);
  const totalPages = useMemo(() => data?.totalPages || 0, [data]);
  const hasNextPage = useMemo(() => data?.hasNextPage || false, [data]);
  const hasPreviousPage = useMemo(() => data?.hasPreviousPage || false, [data]);
  const availableCategories = useMemo(() => data?.categories || [], [data]);
  const availableTechBases = useMemo(() => data?.techBases || [], [data]);
  const hasError = useMemo(() => !!error, [error]);

  return {
    // Current state
    equipment,
    filteredEquipment,
    paginatedEquipment,
    
    // Filter state
    filters,
    setFilters,
    clearFilters,
    
    // Pagination state
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    hasNextPage,
    hasPreviousPage,
    
    // Pagination actions
    setPage,
    setPageSize,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    
    // Data state
    isLoading,
    isRefreshing,
    hasError,
    error,
    
    // Data actions
    refresh,
    clearCache,
    
    // Search and utilities
    searchEquipment,
    getEquipmentById,
    getStatistics,
    
    // Available options
    availableCategories,
    availableTechBases
  };
}

/**
 * Simplified hook for basic equipment browsing
 */
export function useSimpleEquipmentBrowser(
  initialFilters: Partial<EquipmentFilterCriteria> = {}
) {
  const {
    paginatedEquipment,
    filters,
    setFilters,
    isLoading,
    availableCategories,
    availableTechBases,
    totalItems
  } = useEquipmentBrowser({
    initialPageSize: 50,
    debounceMs: 500
  });

  // Apply initial filters
  useEffect(() => {
    if (Object.keys(initialFilters).length > 0) {
      setFilters(initialFilters);
    }
  }, []); // Only on mount

  return {
    equipment: paginatedEquipment,
    filters,
    setFilters,
    isLoading,
    categories: availableCategories,
    techBases: availableTechBases,
    total: totalItems
  };
}

/**
 * Hook for equipment search functionality
 */
export function useEquipmentSearch(
  onSelectEquipment?: (equipment: LocalEquipmentVariant) => void
) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<LocalEquipmentVariant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimer = useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = EquipmentDataService.searchEquipment(term, 20);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const debouncedSearch = useCallback((term: string) => {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    searchTimer.current = setTimeout(() => {
      performSearch(term);
    }, 300);
  }, [performSearch]);

  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    debouncedSearch(term);
  }, [debouncedSearch]);

  const handleSelectEquipment = useCallback((equipment: LocalEquipmentVariant) => {
    if (onSelectEquipment) {
      onSelectEquipment(equipment);
    }
    setSearchTerm('');
    setSearchResults([]);
  }, [onSelectEquipment]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
  }, []);

  return {
    searchTerm,
    searchResults,
    isSearching,
    setSearchTerm: handleSearchChange,
    selectEquipment: handleSelectEquipment,
    clearSearch
  };
}

/**
 * Equipment statistics hook
 */
export function useEquipmentStatistics() {
  const [statistics, setStatistics] = useState<ReturnType<typeof EquipmentDataService.getEquipmentStatistics> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stats = EquipmentDataService.getEquipmentStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load equipment statistics:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setIsLoading(true);
    try {
      EquipmentDataService.clearCache();
      const stats = EquipmentDataService.getEquipmentStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to refresh equipment statistics:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    statistics,
    isLoading,
    refresh
  };
}
