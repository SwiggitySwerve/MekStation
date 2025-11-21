/**
 * Equipment Data Service - Equipment data processing and filtering logic
 * Handles equipment data transformation, filtering, sorting, and pagination
 * Follows SOLID principles with single responsibility for equipment data operations
 */

import { ALL_EQUIPMENT_VARIANTS, Equipment, TechBase } from '../../data/equipment';

export interface LocalEquipmentVariant {
  id: string;
  name: string;
  category: string;
  techBase: TechBase;
  weight: number;
  crits: number;
  damage?: number | null;
  heat?: number | null;
  minRange?: number | null;
  rangeShort?: number | null;
  rangeMedium?: number | null;
  rangeLong?: number | null;
  rangeExtreme?: number | null;
  ammoPerTon?: number | null;
  cost?: number | null;
  battleValue?: number | null;
  requiresAmmo: boolean;
  introductionYear: number;
  rulesLevel: string;
  baseType?: string;
  description?: string;
  special?: string[];
  sourceBook?: string;
  pageReference?: string;
}

export interface EquipmentFilterCriteria {
  searchTerm: string;
  categoryFilter: string;
  techBaseFilter: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

export interface EquipmentDataResult {
  equipment: LocalEquipmentVariant[];
  totalCount: number;
  categories: string[];
  techBases: TechBase[];
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PaginatedEquipmentResult extends EquipmentDataResult {
  paginatedEquipment: LocalEquipmentVariant[];
  currentPage: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export class EquipmentDataService {
  private static cachedEquipment: LocalEquipmentVariant[] | null = null;
  private static cacheTimestamp: number = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all equipment data with caching
   */
  static getAllEquipment(): EquipmentDataResult {
    const now = Date.now();
    
    // Check if cache is valid
    if (this.cachedEquipment && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.buildResult(this.cachedEquipment);
    }

    // Generate fresh data
    const result = this.flattenEquipmentData();
    
    // Cache the result if successful
    if (result.isValid && result.equipment.length > 0) {
      this.cachedEquipment = result.equipment;
      this.cacheTimestamp = now;
    }

    return result;
  }

  /**
   * Clear cached equipment data
   */
  static clearCache(): void {
    this.cachedEquipment = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Filter and sort equipment based on criteria
   */
  static filterAndSortEquipment(
    equipment: LocalEquipmentVariant[],
    criteria: EquipmentFilterCriteria
  ): LocalEquipmentVariant[] {
    let filtered = [...equipment];
    
    // Apply search filter
    if (criteria.searchTerm) {
      const searchLower = criteria.searchTerm.toLowerCase();
      filtered = filtered.filter(eq =>
        eq.name.toLowerCase().includes(searchLower) ||
        eq.category.toLowerCase().includes(searchLower) ||
        eq.description?.toLowerCase().includes(searchLower) ||
        eq.special?.some(s => s.toLowerCase().includes(searchLower)) ||
        eq.baseType?.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (criteria.categoryFilter !== 'all') {
      filtered = filtered.filter(eq => eq.category === criteria.categoryFilter);
    }

    // Apply tech base filter
    if (criteria.techBaseFilter !== 'all') {
      filtered = filtered.filter(eq => eq.techBase === criteria.techBaseFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any = a.name;
      let bVal: any = b.name;

      switch (criteria.sortBy) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'weight':
          aVal = a.weight;
          bVal = b.weight;
          break;
        case 'crits':
          aVal = a.crits;
          bVal = b.crits;
          break;
        case 'techBase':
          aVal = a.techBase;
          bVal = b.techBase;
          break;
        case 'damage':
          aVal = a.damage || 0;
          bVal = b.damage || 0;
          break;
        case 'heat':
          aVal = a.heat || 0;
          bVal = b.heat || 0;
          break;
        case 'battleValue':
          aVal = a.battleValue || 0;
          bVal = b.battleValue || 0;
          break;
        case 'cost':
          aVal = a.cost || 0;
          bVal = b.cost || 0;
          break;
        case 'introductionYear':
          aVal = a.introductionYear;
          bVal = b.introductionYear;
          break;
        default:
          aVal = a.name;
          bVal = b.name;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.localeCompare(bVal);
        return criteria.sortOrder === 'DESC' ? -comparison : comparison;
      } else {
        const comparison = aVal - bVal;
        return criteria.sortOrder === 'DESC' ? -comparison : comparison;
      }
    });

    return filtered;
  }

  /**
   * Paginate equipment data
   */
  static paginateEquipment(
    equipment: LocalEquipmentVariant[],
    currentPage: number,
    pageSize: number
  ): PaginatedEquipmentResult {
    const totalCount = equipment.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const validPage = Math.max(1, Math.min(currentPage, totalPages));
    
    const startIndex = (validPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedEquipment = equipment.slice(startIndex, endIndex);

    return {
      equipment,
      totalCount,
      categories: this.extractCategories(equipment),
      techBases: this.extractTechBases(equipment),
      isValid: true,
      errors: [],
      warnings: totalCount === 0 ? ['No equipment matches the current filters'] : [],
      paginatedEquipment,
      currentPage: validPage,
      pageSize,
      totalPages,
      hasNextPage: validPage < totalPages,
      hasPreviousPage: validPage > 1
    };
  }

  /**
   * Get equipment with filtering, sorting, and pagination
   */
  static getFilteredEquipment(
    criteria: EquipmentFilterCriteria,
    currentPage: number = 1,
    pageSize: number = 25
  ): PaginatedEquipmentResult {
    // Get all equipment
    const allEquipmentResult = this.getAllEquipment();
    
    if (!allEquipmentResult.isValid) {
      return {
        ...allEquipmentResult,
        paginatedEquipment: [],
        currentPage: 1,
        pageSize,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false
      };
    }

    // Filter and sort
    const filteredEquipment = this.filterAndSortEquipment(
      allEquipmentResult.equipment,
      criteria
    );

    // Paginate
    return this.paginateEquipment(filteredEquipment, currentPage, pageSize);
  }

  /**
   * Search equipment by name or description
   */
  static searchEquipment(
    searchTerm: string,
    limit: number = 10
  ): LocalEquipmentVariant[] {
    if (!searchTerm.trim()) {
      return [];
    }

    const allEquipment = this.getAllEquipment();
    if (!allEquipment.isValid) {
      return [];
    }

    const searchLower = searchTerm.toLowerCase();
    const matches = allEquipment.equipment.filter(eq =>
      eq.name.toLowerCase().includes(searchLower) ||
      eq.description?.toLowerCase().includes(searchLower)
    );

    // Sort by relevance (exact matches first, then starts with, then contains)
    matches.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      
      const aExact = aName === searchLower ? 0 : 1;
      const bExact = bName === searchLower ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      
      const aStarts = aName.startsWith(searchLower) ? 0 : 1;
      const bStarts = bName.startsWith(searchLower) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      
      return aName.localeCompare(bName);
    });

    return matches.slice(0, limit);
  }

  /**
   * Get equipment by ID
   */
  static getEquipmentById(id: string): LocalEquipmentVariant | null {
    const allEquipment = this.getAllEquipment();
    if (!allEquipment.isValid) {
      return null;
    }

    return allEquipment.equipment.find(eq => eq.id === id) || null;
  }

  /**
   * Get equipment statistics
   */
  static getEquipmentStatistics(): {
    totalEquipment: number;
    totalCategories: number;
    totalTechBases: number;
    categoryBreakdown: Record<string, number>;
    techBaseBreakdown: Record<string, number>;
    averageWeight: number;
    averageCrits: number;
  } {
    const allEquipment = this.getAllEquipment();
    
    if (!allEquipment.isValid || allEquipment.equipment.length === 0) {
      return {
        totalEquipment: 0,
        totalCategories: 0,
        totalTechBases: 0,
        categoryBreakdown: {},
        techBaseBreakdown: {},
        averageWeight: 0,
        averageCrits: 0
      };
    }

    const equipment = allEquipment.equipment;
    const categoryBreakdown: Record<string, number> = {};
    const techBaseBreakdown: Record<string, number> = {};
    
    let totalWeight = 0;
    let totalCrits = 0;

    equipment.forEach(eq => {
      categoryBreakdown[eq.category] = (categoryBreakdown[eq.category] || 0) + 1;
      techBaseBreakdown[eq.techBase] = (techBaseBreakdown[eq.techBase] || 0) + 1;
      totalWeight += eq.weight;
      totalCrits += eq.crits;
    });

    return {
      totalEquipment: equipment.length,
      totalCategories: Object.keys(categoryBreakdown).length,
      totalTechBases: Object.keys(techBaseBreakdown).length,
      categoryBreakdown,
      techBaseBreakdown,
      averageWeight: totalWeight / equipment.length,
      averageCrits: totalCrits / equipment.length
    };
  }

  /**
   * Flatten equipment data from the raw equipment structure
   */
  private static flattenEquipmentData(): EquipmentDataResult {
    const flattened: LocalEquipmentVariant[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation: Check if ALL_EQUIPMENT_VARIANTS is available
    if (!ALL_EQUIPMENT_VARIANTS) {
      errors.push('ALL_EQUIPMENT_VARIANTS is not available');
      return this.buildResult([], errors, warnings);
    }

    if (!Array.isArray(ALL_EQUIPMENT_VARIANTS)) {
      errors.push(`ALL_EQUIPMENT_VARIANTS is not an array: ${typeof ALL_EQUIPMENT_VARIANTS}`);
      return this.buildResult([], errors, warnings);
    }

    if (ALL_EQUIPMENT_VARIANTS.length === 0) {
      warnings.push('ALL_EQUIPMENT_VARIANTS is empty');
      return this.buildResult([], errors, warnings);
    }

    let processedCount = 0;
    let variantCount = 0;

    ALL_EQUIPMENT_VARIANTS.forEach((equipment, index) => {
      try {
        // Validate equipment structure
        if (!equipment || typeof equipment !== 'object') {
          warnings.push(`Invalid equipment at index ${index}`);
          return;
        }

        if (!equipment.id || !equipment.name || !equipment.category) {
          warnings.push(`Missing required fields in equipment at index ${index}`);
          return;
        }

        if (!equipment.variants || typeof equipment.variants !== 'object') {
          warnings.push(`No variants found for equipment ${equipment.id}`);
          return;
        }

        // Process each tech base variant
        Object.entries(equipment.variants).forEach(([techBase, variant]) => {
          try {
            if (!variant || typeof variant !== 'object') {
              warnings.push(`Invalid variant for ${equipment.id} ${techBase}`);
              return;
            }

            if (typeof variant.weight !== 'number' || typeof variant.crits !== 'number') {
              warnings.push(`Missing weight/crits for ${equipment.id} ${techBase}`);
              return;
            }

            const flattenedVariant: LocalEquipmentVariant = {
              id: `${equipment.id}_${techBase.toLowerCase()}`,
              name: equipment.name,
              category: equipment.category,
              techBase: techBase as TechBase,
              weight: variant.weight,
              crits: variant.crits,
              damage: variant.damage || null,
              heat: variant.heat || null,
              minRange: variant.minRange || null,
              rangeShort: variant.rangeShort || null,
              rangeMedium: variant.rangeMedium || null,
              rangeLong: variant.rangeLong || null,
              rangeExtreme: variant.rangeExtreme || null,
              ammoPerTon: variant.ammoPerTon || null,
              cost: variant.cost || null,
              battleValue: variant.battleValue || null,
              requiresAmmo: equipment.requiresAmmo || false,
              introductionYear: equipment.introductionYear || 3025,
              rulesLevel: equipment.rulesLevel || 'Standard',
              baseType: equipment.baseType,
              description: equipment.description,
              special: equipment.special,
              sourceBook: equipment.sourceBook,
              pageReference: equipment.pageReference
            };

            flattened.push(flattenedVariant);
            variantCount++;

          } catch (variantError) {
            warnings.push(`Error processing variant ${techBase} for ${equipment.id}: ${variantError}`);
          }
        });

        processedCount++;

      } catch (equipmentError) {
        warnings.push(`Error processing equipment at index ${index}: ${equipmentError}`);
      }
    });

    if (flattened.length === 0) {
      errors.push('No valid equipment variants were created');
    }

    return this.buildResult(flattened, errors, warnings);
  }

  /**
   * Build standardized result object
   */
  private static buildResult(
    equipment: LocalEquipmentVariant[],
    errors: string[] = [],
    warnings: string[] = []
  ): EquipmentDataResult {
    return {
      equipment,
      totalCount: equipment.length,
      categories: this.extractCategories(equipment),
      techBases: this.extractTechBases(equipment),
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Extract unique categories from equipment list
   */
  private static extractCategories(equipment: LocalEquipmentVariant[]): string[] {
    const categories = new Set(equipment.map(eq => eq.category));
    return Array.from(categories).sort();
  }

  /**
   * Extract unique tech bases from equipment list
   */
  private static extractTechBases(equipment: LocalEquipmentVariant[]): TechBase[] {
    const techBases = new Set(equipment.map(eq => eq.techBase));
    return Array.from(techBases).sort();
  }

  /**
   * Validate filter criteria
   */
  static validateFilterCriteria(criteria: Partial<EquipmentFilterCriteria>): {
    isValid: boolean;
    errors: string[];
    sanitized: EquipmentFilterCriteria;
  } {
    const errors: string[] = [];
    
    const sanitized: EquipmentFilterCriteria = {
      searchTerm: typeof criteria.searchTerm === 'string' ? criteria.searchTerm.trim() : '',
      categoryFilter: typeof criteria.categoryFilter === 'string' ? criteria.categoryFilter : 'all',
      techBaseFilter: typeof criteria.techBaseFilter === 'string' ? criteria.techBaseFilter : 'all',
      sortBy: typeof criteria.sortBy === 'string' ? criteria.sortBy : 'name',
      sortOrder: criteria.sortOrder === 'DESC' ? 'DESC' : 'ASC'
    };

    // Validate sort field
    const validSortFields = ['name', 'weight', 'crits', 'techBase', 'damage', 'heat', 'battleValue', 'cost', 'introductionYear'];
    if (!validSortFields.includes(sanitized.sortBy)) {
      errors.push(`Invalid sort field: ${sanitized.sortBy}`);
      sanitized.sortBy = 'name';
    }

    // Validate tech base filter
    const validTechBases = ['all', 'IS', 'Clan'];
    if (!validTechBases.includes(sanitized.techBaseFilter)) {
      errors.push(`Invalid tech base filter: ${sanitized.techBaseFilter}`);
      sanitized.techBaseFilter = 'all';
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    };
  }
}
