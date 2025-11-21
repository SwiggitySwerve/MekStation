/**
 * Equipment Browser Types - Type definitions for equipment browser services
 * Following SOLID principles - Interface segregation and dependency inversion
 */

import { EquipmentObject } from '../criticalSlots/CriticalSlot';
import { TechBase } from '../../data/equipment';

// Core equipment variant interface (extracted from component)
export interface EquipmentVariant {
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

// Filter configuration
export interface EquipmentFilters {
  searchTerm: string;
  category: string;
  techBase: string;
}

// Sort configuration
export interface EquipmentSort {
  sortBy: 'name' | 'weight' | 'crits' | 'techBase' | 'damage' | 'heat';
  sortOrder: 'ASC' | 'DESC';
}

// Pagination configuration
export interface PaginationConfig {
  currentPage: number;
  pageSize: number;
}

// Pagination result
export interface PaginationResult<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Equipment browser configuration
export interface EquipmentBrowserConfig {
  filters: EquipmentFilters;
  sort: EquipmentSort;
  pagination: PaginationConfig;
}

// Equipment browser result
export interface EquipmentBrowserResult {
  equipment: PaginationResult<EquipmentVariant>;
  categories: string[];
  techBases: string[];
  config: EquipmentBrowserConfig;
}

// Service interfaces following SOLID principles

/**
 * Equipment Data Service - Single responsibility for data loading and transformation
 */
export interface IEquipmentDataService {
  /**
   * Load all equipment variants from the database
   */
  loadAllEquipment(): Promise<EquipmentVariant[]>;
  
  /**
   * Get equipment variant by ID
   */
  getEquipmentById(id: string): EquipmentVariant | null;
  
  /**
   * Convert equipment variant to equipment object for allocation
   */
  convertToEquipmentObject(variant: EquipmentVariant): EquipmentObject;
  
  /**
   * Get unique categories from loaded equipment
   */
  getCategories(): string[];
  
  /**
   * Get available tech bases
   */
  getTechBases(): string[];
  
  /**
   * Check if data service is ready (data loaded)
   */
  isReady(): boolean;
}

/**
 * Equipment Filter Service - Single responsibility for filtering operations
 */
export interface IEquipmentFilterService {
  /**
   * Apply filters to equipment list
   */
  applyFilters(equipment: EquipmentVariant[], filters: EquipmentFilters): EquipmentVariant[];
  
  /**
   * Apply search filter
   */
  applySearch(equipment: EquipmentVariant[], searchTerm: string): EquipmentVariant[];
  
  /**
   * Apply category filter
   */
  applyCategory(equipment: EquipmentVariant[], category: string): EquipmentVariant[];
  
  /**
   * Apply tech base filter
   */
  applyTechBase(equipment: EquipmentVariant[], techBase: string): EquipmentVariant[];
  
  /**
   * Get filter suggestions based on current search term
   */
  getFilterSuggestions(equipment: EquipmentVariant[], searchTerm: string, maxSuggestions?: number): {
    names: string[];
    categories: string[];
    techBases: string[];
  };
  
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
  };
}

/**
 * Equipment Sort Service - Single responsibility for sorting operations
 */
export interface IEquipmentSortService {
  /**
   * Sort equipment array
   */
  sortEquipment(equipment: EquipmentVariant[], sort: EquipmentSort): EquipmentVariant[];
  
  /**
   * Get sort value from equipment for comparison
   */
  getSortValue(equipment: EquipmentVariant, sortBy: EquipmentSort['sortBy']): any;
}

/**
 * Equipment Pagination Service - Single responsibility for pagination
 */
export interface IEquipmentPaginationService {
  /**
   * Paginate equipment array
   */
  paginate<T>(items: T[], config: PaginationConfig): PaginationResult<T>;
  
  /**
   * Calculate pagination info
   */
  calculatePaginationInfo(totalItems: number, config: PaginationConfig): {
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Equipment Browser Controller - Facade coordinating all services
 */
export interface IEquipmentBrowserController {
  /**
   * Initialize the controller and load data
   */
  initialize(): Promise<void>;
  
  /**
   * Get equipment with current configuration
   */
  getEquipment(): Promise<EquipmentBrowserResult>;
  
  /**
   * Update filters
   */
  setFilters(filters: Partial<EquipmentFilters>): Promise<EquipmentBrowserResult>;
  
  /**
   * Update sort configuration
   */
  setSort(sort: Partial<EquipmentSort>): Promise<EquipmentBrowserResult>;
  
  /**
   * Update pagination
   */
  setPagination(pagination: Partial<PaginationConfig>): Promise<EquipmentBrowserResult>;
  
  /**
   * Reset all filters to defaults
   */
  resetFilters(): Promise<EquipmentBrowserResult>;
  
  /**
   * Get equipment variant by ID
   */
  getEquipmentById(id: string): EquipmentVariant | null;
  
  /**
   * Convert equipment to object for allocation
   */
  convertToEquipmentObject(variant: EquipmentVariant): EquipmentObject;
  
  /**
   * Check if controller is ready
   */
  isReady(): boolean;
}

// Default configurations
export const DEFAULT_EQUIPMENT_FILTERS: EquipmentFilters = {
  searchTerm: '',
  category: 'all',
  techBase: 'all'
};

export const DEFAULT_EQUIPMENT_SORT: EquipmentSort = {
  sortBy: 'name',
  sortOrder: 'ASC'
};

export const DEFAULT_PAGINATION_CONFIG: PaginationConfig = {
  currentPage: 1,
  pageSize: 25
};

export const DEFAULT_EQUIPMENT_BROWSER_CONFIG: EquipmentBrowserConfig = {
  filters: DEFAULT_EQUIPMENT_FILTERS,
  sort: DEFAULT_EQUIPMENT_SORT,
  pagination: DEFAULT_PAGINATION_CONFIG
};
