/**
 * Equipment Filter Service - Handles equipment filtering operations
 * Single responsibility for filtering logic and search operations
 * Following SOLID principles - Single Responsibility and Open/Closed
 */

import {
  IEquipmentFilterService,
  EquipmentVariant,
  EquipmentFilters
} from './EquipmentBrowserTypes';

export class EquipmentFilterService implements IEquipmentFilterService {

  /**
   * Apply all filters to equipment list
   */
  applyFilters(equipment: EquipmentVariant[], filters: EquipmentFilters): EquipmentVariant[] {
    console.log(`[EquipmentFilterService] Applying filters to ${equipment.length} items:`, filters);

    let filtered = equipment;

    // Apply search filter
    if (filters.searchTerm && filters.searchTerm.trim() !== '') {
      filtered = this.applySearch(filtered, filters.searchTerm);
      console.log(`[EquipmentFilterService] After search filter: ${filtered.length} items`);
    }

    // Apply category filter
    if (filters.category && filters.category !== 'all') {
      filtered = this.applyCategory(filtered, filters.category);
      console.log(`[EquipmentFilterService] After category filter: ${filtered.length} items`);
    }

    // Apply tech base filter
    if (filters.techBase && filters.techBase !== 'all') {
      filtered = this.applyTechBase(filtered, filters.techBase);
      console.log(`[EquipmentFilterService] After tech base filter: ${filtered.length} items`);
    }

    console.log(`[EquipmentFilterService] Final filtered result: ${filtered.length} items`);
    return filtered;
  }

  /**
   * Apply search filter to equipment
   */
  applySearch(equipment: EquipmentVariant[], searchTerm: string): EquipmentVariant[] {
    if (!searchTerm || searchTerm.trim() === '') {
      return equipment;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    console.log(`[EquipmentFilterService] Applying search filter: "${searchTerm}"`);

    const filtered = equipment.filter(eq => {
      // Search in name
      if (eq.name.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in category
      if (eq.category.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in description
      if (eq.description && eq.description.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in base type
      if (eq.baseType && eq.baseType.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in special properties
      if (eq.special && eq.special.some(special => special.toLowerCase().includes(searchLower))) {
        return true;
      }

      // Search in source book
      if (eq.sourceBook && eq.sourceBook.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in rules level
      if (eq.rulesLevel.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search by numeric values (exact match)
      const searchNum = parseFloat(searchTerm);
      if (!isNaN(searchNum)) {
        if (eq.weight === searchNum || 
            eq.crits === searchNum || 
            eq.damage === searchNum || 
            eq.heat === searchNum ||
            eq.introductionYear === searchNum ||
            eq.cost === searchNum ||
            eq.battleValue === searchNum) {
          return true;
        }
      }

      return false;
    });

    console.log(`[EquipmentFilterService] Search "${searchTerm}" matched ${filtered.length}/${equipment.length} items`);
    return filtered;
  }

  /**
   * Apply category filter to equipment
   */
  applyCategory(equipment: EquipmentVariant[], category: string): EquipmentVariant[] {
    if (!category || category === 'all') {
      return equipment;
    }

    console.log(`[EquipmentFilterService] Applying category filter: "${category}"`);

    const filtered = equipment.filter(eq => eq.category === category);

    console.log(`[EquipmentFilterService] Category "${category}" matched ${filtered.length}/${equipment.length} items`);
    return filtered;
  }

  /**
   * Apply tech base filter to equipment
   */
  applyTechBase(equipment: EquipmentVariant[], techBase: string): EquipmentVariant[] {
    if (!techBase || techBase === 'all') {
      return equipment;
    }

    console.log(`[EquipmentFilterService] Applying tech base filter: "${techBase}"`);

    const filtered = equipment.filter(eq => eq.techBase === techBase);

    console.log(`[EquipmentFilterService] Tech base "${techBase}" matched ${filtered.length}/${equipment.length} items`);
    return filtered;
  }

  /**
   * Get filter suggestions based on current search term
   */
  getFilterSuggestions(equipment: EquipmentVariant[], searchTerm: string, maxSuggestions: number = 10): {
    names: string[];
    categories: string[];
    techBases: string[];
  } {
    if (!searchTerm || searchTerm.trim() === '') {
      return { names: [], categories: [], techBases: [] };
    }

    const searchLower = searchTerm.toLowerCase().trim();

    // Get name suggestions
    const nameMatches = equipment
      .filter(eq => eq.name.toLowerCase().includes(searchLower))
      .map(eq => eq.name)
      .filter((name, index, self) => self.indexOf(name) === index) // Remove duplicates
      .slice(0, maxSuggestions);

    // Get category suggestions
    const categoryMatches = equipment
      .filter(eq => eq.category.toLowerCase().includes(searchLower))
      .map(eq => eq.category)
      .filter((category, index, self) => self.indexOf(category) === index) // Remove duplicates
      .slice(0, maxSuggestions);

    // Get tech base suggestions (unlikely to be many)
    const techBaseMatches = equipment
      .filter(eq => eq.techBase.toLowerCase().includes(searchLower))
      .map(eq => eq.techBase)
      .filter((techBase, index, self) => self.indexOf(techBase) === index) // Remove duplicates
      .slice(0, maxSuggestions);

    return {
      names: nameMatches,
      categories: categoryMatches,
      techBases: techBaseMatches
    };
  }

  /**
   * Create advanced filter predicates for complex filtering
   */
  createAdvancedFilter(config: {
    minWeight?: number;
    maxWeight?: number;
    minCrits?: number;
    maxCrits?: number;
    minDamage?: number;
    maxDamage?: number;
    minHeat?: number;
    maxHeat?: number;
    hasAmmo?: boolean;
    rulesLevels?: string[];
    introYearRange?: { min: number; max: number };
    categories?: string[];
    techBases?: string[];
  }): (equipment: EquipmentVariant) => boolean {
    
    return (equipment: EquipmentVariant): boolean => {
      // Weight range filter
      if (config.minWeight !== undefined && equipment.weight < config.minWeight) {
        return false;
      }
      if (config.maxWeight !== undefined && equipment.weight > config.maxWeight) {
        return false;
      }

      // Critical slots range filter
      if (config.minCrits !== undefined && equipment.crits < config.minCrits) {
        return false;
      }
      if (config.maxCrits !== undefined && equipment.crits > config.maxCrits) {
        return false;
      }

      // Damage range filter
      if (config.minDamage !== undefined) {
        if (!equipment.damage || equipment.damage < config.minDamage) {
          return false;
        }
      }
      if (config.maxDamage !== undefined) {
        if (!equipment.damage || equipment.damage > config.maxDamage) {
          return false;
        }
      }

      // Heat range filter
      if (config.minHeat !== undefined) {
        if (!equipment.heat || equipment.heat < config.minHeat) {
          return false;
        }
      }
      if (config.maxHeat !== undefined) {
        if (!equipment.heat || equipment.heat > config.maxHeat) {
          return false;
        }
      }

      // Ammo requirement filter
      if (config.hasAmmo !== undefined) {
        if (equipment.requiresAmmo !== config.hasAmmo) {
          return false;
        }
      }

      // Rules levels filter
      if (config.rulesLevels && config.rulesLevels.length > 0) {
        if (!config.rulesLevels.includes(equipment.rulesLevel)) {
          return false;
        }
      }

      // Introduction year range filter
      if (config.introYearRange) {
        if (equipment.introductionYear < config.introYearRange.min || 
            equipment.introductionYear > config.introYearRange.max) {
          return false;
        }
      }

      // Categories filter
      if (config.categories && config.categories.length > 0) {
        if (!config.categories.includes(equipment.category)) {
          return false;
        }
      }

      // Tech bases filter
      if (config.techBases && config.techBases.length > 0) {
        if (!config.techBases.includes(equipment.techBase)) {
          return false;
        }
      }

      return true;
    };
  }

  /**
   * Get filter statistics for the current filter state
   */
  getFilterStats(originalEquipment: EquipmentVariant[], filteredEquipment: EquipmentVariant[]): {
    totalItems: number;
    filteredItems: number;
    filterPercentage: number;
    categoryCounts: Record<string, number>;
    techBaseCounts: Record<string, number>;
    averageWeight: number;
    averageCrits: number;
  } {
    const totalItems = originalEquipment.length;
    const filteredItems = filteredEquipment.length;
    const filterPercentage = totalItems > 0 ? (filteredItems / totalItems) * 100 : 0;

    // Count by category
    const categoryCounts: Record<string, number> = {};
    filteredEquipment.forEach(eq => {
      categoryCounts[eq.category] = (categoryCounts[eq.category] || 0) + 1;
    });

    // Count by tech base
    const techBaseCounts: Record<string, number> = {};
    filteredEquipment.forEach(eq => {
      techBaseCounts[eq.techBase] = (techBaseCounts[eq.techBase] || 0) + 1;
    });

    // Calculate averages
    const totalWeight = filteredEquipment.reduce((sum, eq) => sum + eq.weight, 0);
    const totalCrits = filteredEquipment.reduce((sum, eq) => sum + eq.crits, 0);
    const averageWeight = filteredItems > 0 ? totalWeight / filteredItems : 0;
    const averageCrits = filteredItems > 0 ? totalCrits / filteredItems : 0;

    return {
      totalItems,
      filteredItems,
      filterPercentage,
      categoryCounts,
      techBaseCounts,
      averageWeight: Math.round(averageWeight * 100) / 100, // Round to 2 decimal places
      averageCrits: Math.round(averageCrits * 100) / 100
    };
  }
}
