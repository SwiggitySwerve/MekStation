/**
 * Equipment Hook
 * 
 * React hook wrapper around EquipmentGateway for easy use in components.
 */

import { useState, useCallback, useMemo } from 'react'
import { EquipmentGateway, EquipmentSearchCriteria, LocalEquipmentVariant } from '../../services/equipment/EquipmentGateway'
import { TechBase } from '../../types/core/TechBase'
import { SearchResult } from '../../services/common/SearchEngine'

export interface UseEquipmentOptions {
  defaultTechBase?: TechBase
  defaultPageSize?: number
}

export interface UseEquipmentReturn {
  search: (criteria: Omit<EquipmentSearchCriteria, 'techBase'> & { techBase?: TechBase }) => SearchResult<LocalEquipmentVariant>
  getById: (id: string, techBase?: TechBase) => LocalEquipmentVariant | null
  getCategories: (techBase?: TechBase) => string[]
  searchByText: (text: string, limit?: number, techBase?: TechBase) => LocalEquipmentVariant[]
  getByYear: (year: number, category?: string, techBase?: TechBase) => LocalEquipmentVariant[]
  getStatistics: (techBase?: TechBase) => any
  refreshCache: () => void
}

/**
 * Hook for accessing equipment data through the gateway
 */
export const useEquipment = (options: UseEquipmentOptions = {}): UseEquipmentReturn => {
  const { defaultTechBase = 'Inner Sphere', defaultPageSize = 25 } = options

  /**
   * Search equipment with criteria
   */
  const search = useCallback((
    criteria: Omit<EquipmentSearchCriteria, 'techBase'> & { techBase?: TechBase }
  ): SearchResult<LocalEquipmentVariant> => {
    const searchCriteria: EquipmentSearchCriteria = {
      ...criteria,
      techBase: criteria.techBase || defaultTechBase,
      pageSize: criteria.pageSize || defaultPageSize
    }

    return EquipmentGateway.search(searchCriteria)
  }, [defaultTechBase, defaultPageSize])

  /**
   * Get equipment by ID
   */
  const getById = useCallback((id: string, techBase?: TechBase): LocalEquipmentVariant | null => {
    return EquipmentGateway.getById(id, techBase)
  }, [])

  /**
   * Get all categories for a tech base
   */
  const getCategories = useCallback((techBase?: TechBase): string[] => {
    return EquipmentGateway.getCategories(techBase || defaultTechBase)
  }, [defaultTechBase])

  /**
   * Simple text search (convenience wrapper)
   */
  const searchByText = useCallback((
    text: string,
    limit = 20,
    techBase?: TechBase
  ): LocalEquipmentVariant[] => {
    return EquipmentGateway.searchByText(text, techBase || defaultTechBase, limit)
  }, [defaultTechBase])

  /**
   * Get equipment available by specific year
   */
  const getByYear = useCallback((
    year: number,
    category?: string,
    techBase?: TechBase
  ): LocalEquipmentVariant[] => {
    return EquipmentGateway.getEquipmentByYear(year, techBase || defaultTechBase, category)
  }, [defaultTechBase])

  /**
   * Get statistics about equipment
   */
  const getStatistics = useCallback((techBase?: TechBase) => {
    return EquipmentGateway.getStatistics(techBase)
  }, [])

  /**
   * Refresh the equipment cache
   */
  const refreshCache = useCallback(() => {
    EquipmentGateway.refreshCache()
  }, [])

  return {
    search,
    getById,
    getCategories,
    searchByText,
    getByYear,
    getStatistics,
    refreshCache
  }
}

/**
 * Hook for paginated equipment browsing with state management
 */
export const useEquipmentBrowser = (initialTechBase: TechBase = 'Inner Sphere') => {
  const equipment = useEquipment({ defaultTechBase: initialTechBase })
  
  const [techBase, setTechBase] = useState<TechBase>(initialTechBase)
  const [searchText, setSearchText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  /**
   * Perform search with current state
   */
  const searchResults = useMemo(() => {
    return equipment.search({
      techBase,
      text: searchText || undefined,
      category: selectedCategory ? [selectedCategory] : undefined,
      page: currentPage,
      pageSize
    })
  }, [equipment, techBase, searchText, selectedCategory, currentPage, pageSize])

  /**
   * Get available categories for current tech base
   */
  const categories = useMemo(() => {
    return equipment.getCategories(techBase)
  }, [equipment, techBase])

  /**
   * Reset filters
   */
  const resetFilters = useCallback(() => {
    setSearchText('')
    setSelectedCategory(undefined)
    setCurrentPage(1)
  }, [])

  /**
   * Go to next page
   */
  const nextPage = useCallback(() => {
    if (searchResults.hasNextPage) {
      setCurrentPage(p => p + 1)
    }
  }, [searchResults.hasNextPage])

  /**
   * Go to previous page
   */
  const previousPage = useCallback(() => {
    if (searchResults.hasPreviousPage) {
      setCurrentPage(p => p - 1)
    }
  }, [searchResults.hasPreviousPage])

  /**
   * Go to specific page
   */
  const goToPage = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  return {
    // Data
    items: searchResults.items,
    totalCount: searchResults.totalCount,
    currentPage: searchResults.currentPage,
    totalPages: searchResults.totalPages,
    hasNextPage: searchResults.hasNextPage,
    hasPreviousPage: searchResults.hasPreviousPage,
    categories,

    // Filters
    techBase,
    searchText,
    selectedCategory,
    pageSize,

    // Actions
    setTechBase,
    setSearchText,
    setSelectedCategory,
    setPageSize,
    resetFilters,
    nextPage,
    previousPage,
    goToPage,

    // Direct access
    equipment
  }
}

