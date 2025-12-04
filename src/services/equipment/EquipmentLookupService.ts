/**
 * Equipment Lookup Service
 * 
 * Provides access to equipment definitions with filtering and search.
 * Wraps the existing equipment type system.
 * 
 * @spec openspec/specs/equipment-services/spec.md
 */

import { TechBase } from '@/types/enums/TechBase';
import {
  EquipmentCategory,
  IEquipmentItem,
  IWeapon,
  IAmmunition,
  getAllEquipmentItems,
  getAllWeapons,
  getAllAmmunition,
  getEquipmentById as getEquipmentByIdFromTypes,
  filterEquipmentByTechBase,
  filterEquipmentByCategory,
  filterEquipmentByYear,
} from '@/types/equipment';
import { IEquipmentQueryCriteria } from '../common/types';

/**
 * Equipment lookup service interface
 */
export interface IEquipmentLookupService {
  // Single-criterion lookups
  getById(id: string): IEquipmentItem | undefined;
  getByCategory(category: EquipmentCategory): IEquipmentItem[];
  getByTechBase(techBase: TechBase): IEquipmentItem[];
  getByEra(year: number): IEquipmentItem[];
  search(query: string): IEquipmentItem[];
  
  // Combined filter query
  query(criteria: IEquipmentQueryCriteria): IEquipmentItem[];
  
  // Bulk accessors
  getAllWeapons(): IWeapon[];
  getAllAmmunition(): IAmmunition[];
  getAllEquipment(): IEquipmentItem[];
}

/**
 * Equipment Lookup Service implementation
 */
export class EquipmentLookupService implements IEquipmentLookupService {
  private equipmentCache: IEquipmentItem[] | null = null;

  /**
   * Get cached equipment list
   */
  private getEquipment(): IEquipmentItem[] {
    if (!this.equipmentCache) {
      this.equipmentCache = getAllEquipmentItems();
    }
    return this.equipmentCache;
  }

  /**
   * Get equipment by unique identifier
   */
  getById(id: string): IEquipmentItem | undefined {
    return getEquipmentByIdFromTypes(id);
  }

  /**
   * Get all equipment in a given category
   */
  getByCategory(category: EquipmentCategory): IEquipmentItem[] {
    return filterEquipmentByCategory(category);
  }

  /**
   * Get equipment compatible with a tech base
   */
  getByTechBase(techBase: TechBase): IEquipmentItem[] {
    return filterEquipmentByTechBase(techBase);
  }

  /**
   * Get equipment available in a given year
   */
  getByEra(year: number): IEquipmentItem[] {
    return filterEquipmentByYear(year);
  }

  /**
   * Search equipment by name substring (case-insensitive)
   */
  search(queryStr: string): IEquipmentItem[] {
    const lowerQuery = queryStr.toLowerCase();
    return this.getEquipment().filter(e => 
      e.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Query equipment with multiple filter criteria
   */
  query(criteria: IEquipmentQueryCriteria): IEquipmentItem[] {
    let results = this.getEquipment();

    // Filter by category
    if (criteria.category !== undefined) {
      results = results.filter(e => e.category === criteria.category);
    }

    // Filter by tech base
    if (criteria.techBase !== undefined) {
      results = results.filter(e => e.techBase === criteria.techBase);
    }

    // Filter by year (introduction year)
    if (criteria.year !== undefined) {
      results = results.filter(e => e.introductionYear <= criteria.year!);
    }

    // Filter by name query
    if (criteria.nameQuery !== undefined && criteria.nameQuery.length > 0) {
      const lowerQuery = criteria.nameQuery.toLowerCase();
      results = results.filter(e => e.name.toLowerCase().includes(lowerQuery));
    }

    // Filter by rules level
    if (criteria.rulesLevel !== undefined) {
      results = results.filter(e => e.rulesLevel === criteria.rulesLevel);
    }

    // Filter by max weight
    if (criteria.maxWeight !== undefined) {
      results = results.filter(e => e.weight <= criteria.maxWeight!);
    }

    // Filter by max slots
    if (criteria.maxSlots !== undefined) {
      results = results.filter(e => e.criticalSlots <= criteria.maxSlots!);
    }

    return results;
  }

  /**
   * Get all weapon definitions
   */
  getAllWeapons(): IWeapon[] {
    return getAllWeapons() as IWeapon[];
  }

  /**
   * Get all ammunition definitions
   */
  getAllAmmunition(): IAmmunition[] {
    return getAllAmmunition() as IAmmunition[];
  }

  /**
   * Get all equipment items
   */
  getAllEquipment(): IEquipmentItem[] {
    return this.getEquipment();
  }
}

// Singleton instance
export const equipmentLookupService = new EquipmentLookupService();

