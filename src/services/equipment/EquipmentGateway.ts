/**
 * Equipment Gateway
 * 
 * Single entry point for all equipment operations.
 * Uses EquipmentDataService for data access and SearchEngine for queries.
 */

import { EquipmentDataService, LocalEquipmentVariant, EquipmentFilterCriteria } from '../../utils/equipment/EquipmentDataService'
import { BattleTechSearchEngine, SearchCriteria, SearchResult, SearchableItem } from '../common/SearchEngine'
import { TechBase, TechBaseUtil } from '../../types/core/TechBase'

/**
 * Equipment search criteria (standardized)
 */
export interface EquipmentSearchCriteria {
  techBase: TechBase  // Required
  text?: string
  category?: string[]
  weightRange?: [number, number]
  critRange?: [number, number]
  damageRange?: [number, number]
  heatRange?: [number, number]
  rulesLevel?: string[]
  requiresAmmo?: boolean
  availableByYear?: number
  ignoreYearRestrictions?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

/**
 * Equipment item for search
 */
interface EquipmentSearchItem extends SearchableItem {
  id: string
  name: string
  category: string
  techBase: TechBase
  weight: number
  crits: number
  introductionYear: number
  rulesLevel: string
  damage?: number
  heat?: number
  requiresAmmo: boolean
  baseType?: string
  description?: string
}

/**
 * Search engine singleton
 */
let searchEngine: BattleTechSearchEngine<EquipmentSearchItem> | null = null

/**
 * Initialize search engine with equipment data
 */
function ensureSearchEngineInitialized(): BattleTechSearchEngine<EquipmentSearchItem> {
  if (!searchEngine) {
    searchEngine = new BattleTechSearchEngine<EquipmentSearchItem>(
      ['name', 'category', 'baseType', 'description'],
      ['id', 'name', 'category', 'techBase', 'weight', 'crits', 'introductionYear', 'rulesLevel', 'damage', 'heat', 'requiresAmmo']
    )

    // Load all equipment into search engine
    const result = EquipmentDataService.getAllEquipment()
    if (result.isValid) {
      const searchItems: EquipmentSearchItem[] = result.equipment.map(eq => ({
        id: eq.id,
        name: eq.name,
        category: eq.category,
        techBase: TechBaseUtil.normalize(eq.techBase) as TechBase,
        weight: eq.weight,
        crits: eq.crits,
        introductionYear: eq.introductionYear,
        rulesLevel: eq.rulesLevel,
        damage: eq.damage ?? undefined,
        heat: eq.heat ?? undefined,
        requiresAmmo: eq.requiresAmmo,
        baseType: eq.baseType,
        description: eq.description
      }))
      searchEngine.indexDocuments(searchItems)
    }
  }
  return searchEngine
}

/**
 * Equipment Gateway
 */
export const EquipmentGateway = {
  /**
   * Search equipment with criteria
   */
  search(criteria: EquipmentSearchCriteria): SearchResult<LocalEquipmentVariant> {
    const engine = ensureSearchEngineInitialized()

    // Convert to search engine criteria
    const searchCriteria: SearchCriteria = {
      text: criteria.text,
      techBase: criteria.techBase,
      category: criteria.category,
      weightRange: criteria.weightRange,
      critRange: criteria.critRange,
      damageRange: criteria.damageRange,
      heatRange: criteria.heatRange,
      rulesLevel: criteria.rulesLevel,
      availableByYear: criteria.availableByYear,
      ignoreYearRestrictions: criteria.ignoreYearRestrictions,
      sortBy: criteria.sortBy,
      sortOrder: criteria.sortOrder,
      page: criteria.page,
      pageSize: criteria.pageSize
    }

    // Perform search
    const searchResult = engine.search(searchCriteria)

    // Convert search items back to full equipment variants
    const allEquipment = EquipmentDataService.getAllEquipment()
    const equipmentMap = new Map(allEquipment.equipment.map(eq => [eq.id, eq]))

    const items = searchResult.items
      .map(item => equipmentMap.get(item.id))
      .filter((eq): eq is LocalEquipmentVariant => eq !== undefined)

    // Apply requiresAmmo filter if specified
    let filteredItems = items
    if (criteria.requiresAmmo !== undefined) {
      filteredItems = filteredItems.filter(eq => eq.requiresAmmo === criteria.requiresAmmo)
    }

    return {
      ...searchResult,
      items: filteredItems,
      totalCount: filteredItems.length
    }
  },

  /**
   * Get equipment by ID
   */
  getById(id: string, techBase?: TechBase): LocalEquipmentVariant | null {
    const equipment = EquipmentDataService.getEquipmentById(id)
    
    if (equipment && techBase) {
      // Filter by tech base if specified
      const normalizedTechBase = TechBaseUtil.normalize(equipment.techBase)
      if (normalizedTechBase !== techBase) {
        return null
      }
    }

    return equipment
  },

  /**
   * Get all equipment categories for a tech base
   */
  getCategories(techBase: TechBase): string[] {
    const result = EquipmentDataService.getAllEquipment()
    if (!result.isValid) return []

    const categories = new Set<string>()
    result.equipment
      .filter(eq => TechBaseUtil.normalize(eq.techBase) === techBase)
      .forEach(eq => categories.add(eq.category))

    return Array.from(categories).sort()
  },

  /**
   * Get statistics about equipment
   */
  getStatistics(techBase?: TechBase) {
    const engine = ensureSearchEngineInitialized()
    const stats = engine.getStatistics()

    if (techBase) {
      // Filter stats by tech base
      const techBaseKey = techBase as string
      return {
        total: stats.byTechBase[techBaseKey] || 0,
        byCategory: stats.byCategory,
        byRulesLevel: stats.byRulesLevel
      }
    }

    return stats
  },

  /**
   * Search equipment by text (simple search)
   */
  searchByText(text: string, techBase: TechBase, limit = 20): LocalEquipmentVariant[] {
    const result = this.search({
      techBase,
      text,
      pageSize: limit,
      page: 1
    })
    return result.items
  },

  /**
   * Get equipment compatible with a specific year
   */
  getEquipmentByYear(year: number, techBase: TechBase, category?: string): LocalEquipmentVariant[] {
    const result = this.search({
      techBase,
      availableByYear: year,
      category: category ? [category] : undefined,
      pageSize: 1000  // Get all results
    })
    return result.items
  },

  /**
   * Clear search engine cache and reinitialize
   */
  refreshCache(): void {
    EquipmentDataService.clearCache()
    searchEngine = null
    ensureSearchEngineInitialized()
  }
}

// Export types for consumers
export type { LocalEquipmentVariant }






