/**
 * BattleTech Search Engine
 * 
 * Wraps MiniSearch to provide BattleTech-specific search functionality
 * with year-based filtering, tech base discrimination, and category filtering.
 */

import MiniSearch from 'minisearch'
import { TechBase } from '../../types/core/TechBase'

/**
 * Search criteria for BattleTech items
 */
export interface SearchCriteria {
  // Text search
  text?: string
  
  // Required filter (primary discriminator)
  techBase: TechBase  // 'Inner Sphere' | 'Clan'
  
  // Year-based availability (CRITICAL for BattleTech)
  availableByYear?: number  // Show only items available by this year
  ignoreYearRestrictions?: boolean  // Override to see all items
  
  // Optional filters
  category?: string[]  // Equipment categories or component types
  componentType?: string[]  // Specific component types
  rulesLevel?: string[]  // Complexity filter
  
  // Range filters
  weightRange?: [number, number]
  damageRange?: [number, number]
  critRange?: [number, number]
  heatRange?: [number, number]
  
  // Sorting & Pagination
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

/**
 * Search result with pagination
 */
export interface SearchResult<T> {
  items: T[]
  totalCount: number
  currentPage: number
  pageSize: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

/**
 * Searchable item interface (minimum required fields)
 */
export interface SearchableItem {
  id: string
  name: string
  techBase: TechBase
  introductionYear: number
  category?: string
  rulesLevel?: string
  weight?: number
  damage?: number
  crits?: number
  heat?: number
  [key: string]: any
}

/**
 * BattleTech Search Engine using MiniSearch
 */
export class BattleTechSearchEngine<T extends SearchableItem> {
  private searchIndex: MiniSearch<T>
  private allDocuments: T[] = []

  constructor(
    searchFields: (keyof T)[],
    storeFields: (keyof T)[]
  ) {
    this.searchIndex = new MiniSearch<T>({
      fields: searchFields as string[],
      storeFields: storeFields as string[],
      idField: 'id',
      searchOptions: {
        fuzzy: 0.2,  // Typo tolerance
        prefix: true,  // Prefix matching ("Med" matches "Medium Laser")
        combineWith: 'AND',
        boost: {
          name: 2  // Boost name field importance
        }
      }
    })
  }

  /**
   * Index documents for searching
   */
  indexDocuments(documents: T[]): void {
    this.allDocuments = documents
    this.searchIndex.removeAll()
    this.searchIndex.addAll(documents)
  }

  /**
   * Add more documents to the index
   */
  addDocuments(documents: T[]): void {
    this.allDocuments = [...this.allDocuments, ...documents]
    this.searchIndex.addAll(documents)
  }

  /**
   * Search with BattleTech-specific filters
   */
  search(criteria: SearchCriteria): SearchResult<T> {
    let results: T[]

    // Text search using MiniSearch
    if (criteria.text && criteria.text.trim()) {
      const searchResults = this.searchIndex.search(criteria.text, {
        filter: (result) => {
          // Get the full document
          const doc = this.allDocuments.find(d => d.id === result.id)
          return doc ? this.matchesBasicFilters(doc, criteria) : false
        }
      })
      results = searchResults.map(result => {
        return this.allDocuments.find(d => d.id === result.id)!
      })
    } else {
      // No text search, filter all documents
      results = this.allDocuments.filter(doc => 
        this.matchesBasicFilters(doc, criteria)
      )
    }

    // Apply all filters
    results = this.applyFilters(results, criteria)

    // Sort results
    results = this.sortResults(results, criteria.sortBy, criteria.sortOrder)

    // Paginate
    return this.paginate(results, criteria.page, criteria.pageSize)
  }

  /**
   * Get item by ID
   */
  getById(id: string): T | undefined {
    return this.allDocuments.find(doc => doc.id === id)
  }

  /**
   * Get all indexed documents
   */
  getAllDocuments(): T[] {
    return [...this.allDocuments]
  }

  /**
   * Check if document matches basic filters (for MiniSearch filter callback)
   */
  private matchesBasicFilters(doc: T, criteria: SearchCriteria): boolean {
    // Tech base is REQUIRED and checked first
    if (doc.techBase !== criteria.techBase) {
      return false
    }

    // Year-based filtering (CRITICAL for BattleTech)
    if (criteria.availableByYear && !criteria.ignoreYearRestrictions) {
      if (doc.introductionYear > criteria.availableByYear) {
        return false
      }
    }

    return true
  }

  /**
   * Apply all additional filters
   */
  private applyFilters(results: T[], criteria: SearchCriteria): T[] {
    let filtered = results

    // Category filters
    if (criteria.category && criteria.category.length > 0) {
      filtered = filtered.filter(item =>
        item.category && criteria.category!.includes(item.category)
      )
    }

    // Component type filters
    if (criteria.componentType && criteria.componentType.length > 0) {
      filtered = filtered.filter(item =>
        criteria.componentType!.some(type => 
          item.category === type || item.type === type
        )
      )
    }

    // Rules level filters
    if (criteria.rulesLevel && criteria.rulesLevel.length > 0) {
      filtered = filtered.filter(item =>
        item.rulesLevel && criteria.rulesLevel!.includes(item.rulesLevel)
      )
    }

    // Weight range filter
    if (criteria.weightRange && criteria.weightRange.length === 2) {
      filtered = filtered.filter(item =>
        item.weight !== undefined &&
        item.weight >= criteria.weightRange![0] &&
        item.weight <= criteria.weightRange![1]
      )
    }

    // Damage range filter
    if (criteria.damageRange && criteria.damageRange.length === 2) {
      filtered = filtered.filter(item =>
        item.damage !== undefined &&
        item.damage >= criteria.damageRange![0] &&
        item.damage <= criteria.damageRange![1]
      )
    }

    // Crit range filter
    if (criteria.critRange && criteria.critRange.length === 2) {
      filtered = filtered.filter(item =>
        item.crits !== undefined &&
        item.crits >= criteria.critRange![0] &&
        item.crits <= criteria.critRange![1]
      )
    }

    // Heat range filter
    if (criteria.heatRange && criteria.heatRange.length === 2) {
      filtered = filtered.filter(item =>
        item.heat !== undefined &&
        item.heat >= criteria.heatRange![0] &&
        item.heat <= criteria.heatRange![1]
      )
    }

    return filtered
  }

  /**
   * Sort results
   */
  private sortResults(results: T[], sortBy?: string, order: 'asc' | 'desc' = 'asc'): T[] {
    if (!sortBy) return results

    return [...results].sort((a, b) => {
      const aVal = a[sortBy]
      const bVal = b[sortBy]

      // Handle undefined values
      if (aVal === undefined && bVal === undefined) return 0
      if (aVal === undefined) return 1
      if (bVal === undefined) return -1

      // String comparison
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.localeCompare(bVal)
        return order === 'asc' ? comparison : -comparison
      }

      // Numeric comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'asc' ? aVal - bVal : bVal - aVal
      }

      return 0
    })
  }

  /**
   * Paginate results
   */
  private paginate(results: T[], page = 1, pageSize = 25): SearchResult<T> {
    const totalCount = results.length
    const totalPages = Math.ceil(totalCount / pageSize) || 1
    const currentPage = Math.max(1, Math.min(page, totalPages))
    const start = (currentPage - 1) * pageSize
    const items = results.slice(start, start + pageSize)

    return {
      items,
      totalCount,
      currentPage,
      pageSize,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1
    }
  }

  /**
   * Get statistics about indexed documents
   */
  getStatistics(): {
    total: number
    byTechBase: Record<string, number>
    byCategory: Record<string, number>
    byRulesLevel: Record<string, number>
  } {
    const stats = {
      total: this.allDocuments.length,
      byTechBase: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byRulesLevel: {} as Record<string, number>
    }

    this.allDocuments.forEach(doc => {
      // Tech base
      stats.byTechBase[doc.techBase] = (stats.byTechBase[doc.techBase] || 0) + 1

      // Category
      if (doc.category) {
        stats.byCategory[doc.category] = (stats.byCategory[doc.category] || 0) + 1
      }

      // Rules level
      if (doc.rulesLevel) {
        stats.byRulesLevel[doc.rulesLevel] = (stats.byRulesLevel[doc.rulesLevel] || 0) + 1
      }
    })

    return stats
  }
}






