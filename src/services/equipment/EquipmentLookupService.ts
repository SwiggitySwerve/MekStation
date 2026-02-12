/**
 * Equipment Lookup Service
 *
 * Provides access to equipment definitions with filtering and search.
 * Uses JSON-based equipment loading as primary source with hardcoded
 * TypeScript constants as fallback during transition.
 *
 * @spec openspec/specs/equipment-services/spec.md
 */

import {
  createSingleton,
  type SingletonFactory,
} from '@/services/core/createSingleton';
import { TechBase } from '@/types/enums/TechBase';
import {
  EquipmentCategory,
  IEquipmentItem,
  IWeapon,
  IAmmunition,
  getAllEquipmentItems as getAllEquipmentItemsFallback,
  getAllWeapons as getAllWeaponsFallback,
  getAllAmmunition as getAllAmmunitionFallback,
} from '@/types/equipment';
import { MiscEquipmentCategory } from '@/types/equipment/MiscEquipmentTypes';
import { weaponCategoryToEquipmentCategory } from '@/utils/equipment/categoryRegistry';
import { logger } from '@/utils/logger';

import { IEquipmentQueryCriteria } from '../common/types';
import {
  getEquipmentLoader,
  IEquipmentLoadResult,
} from './EquipmentLoaderService';

/**
 * Equipment lookup service interface
 */
export interface IEquipmentLookupService {
  // Initialization
  initialize(): Promise<void>;
  isInitialized(): boolean;

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

  // Source info
  getDataSource(): 'json' | 'fallback';
  getLoadResult(): IEquipmentLoadResult | null;
}

/**
 * Categories of misc equipment to exclude from browser
 * (handled by Structure tab configuration)
 */
const EXCLUDED_MISC_CATEGORIES: readonly MiscEquipmentCategory[] = [
  MiscEquipmentCategory.JUMP_JET,
  MiscEquipmentCategory.HEAT_SINK,
];

/**
 * IDs of AMS weapons that should also appear in "Other" category
 */
const AMS_WEAPON_IDS = ['ams', 'clan-ams', 'laser-ams', 'clan-laser-ams'];

/**
 * Equipment Lookup Service implementation
 *
 * Uses JSON-based EquipmentLoaderService as primary data source.
 * Falls back to hardcoded TypeScript constants if JSON loading fails.
 */
export class EquipmentLookupService implements IEquipmentLookupService {
  private equipmentCache: IEquipmentItem[] | null = null;
  private initPromise: Promise<void> | null = null;
  private initialized = false;
  private useJsonSource = false;
  private loadResult: IEquipmentLoadResult | null = null;

  /**
   * Initialize the service by loading equipment from JSON files.
   * Falls back to hardcoded constants if loading fails.
   * Safe to call multiple times - subsequent calls return the same promise.
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  /**
   * Internal initialization logic
   */
  private async doInitialize(): Promise<void> {
    try {
      const loader = getEquipmentLoader();

      // Only load if not already loaded
      if (!loader.getIsLoaded()) {
        this.loadResult = await loader.loadOfficialEquipment();
      } else {
        // Already loaded, create a synthetic result
        this.loadResult = {
          success: true,
          itemsLoaded: loader.getTotalCount(),
          errors: [],
          warnings: [],
        };
      }

      // Use JSON source if we loaded a reasonable number of items
      // (fallback has ~200 items, JSON should have 700+)
      const minItemsForJson = 100;
      this.useJsonSource =
        this.loadResult.success &&
        this.loadResult.itemsLoaded >= minItemsForJson;

      if (!this.useJsonSource) {
        logger.warn(
          `[EquipmentLookupService] JSON loading failed or insufficient items (${this.loadResult.itemsLoaded}), using hardcoded fallback. ` +
            `Errors: ${this.loadResult.errors.join(', ')}`,
        );
      } else {
        logger.debug(
          `[EquipmentLookupService] Loaded ${this.loadResult.itemsLoaded} equipment items from JSON`,
        );
      }
    } catch (error) {
      logger.error(
        '[EquipmentLookupService] Failed to initialize from JSON:',
        error,
      );
      this.useJsonSource = false;
      this.loadResult = {
        success: false,
        itemsLoaded: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
      };
    }

    this.initialized = true;
    // Clear cache so next access rebuilds with correct source
    this.equipmentCache = null;
  }

  /**
   * Check if the service has been initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the current data source being used
   */
  getDataSource(): 'json' | 'fallback' {
    return this.useJsonSource ? 'json' : 'fallback';
  }

  /**
   * Get the result of the last load operation
   */
  getLoadResult(): IEquipmentLoadResult | null {
    return this.loadResult;
  }

  /**
   * Build equipment items from the JSON loader
   */
  private buildEquipmentItemsFromLoader(): IEquipmentItem[] {
    const items: IEquipmentItem[] = [];
    const loader = getEquipmentLoader();

    // Weapons - use centralized category registry
    for (const weapon of loader.getAllWeapons()) {
      const category = weaponCategoryToEquipmentCategory(weapon.category);

      const additionalCategories = AMS_WEAPON_IDS.includes(weapon.id)
        ? [EquipmentCategory.MISC_EQUIPMENT]
        : undefined;

      items.push({
        id: weapon.id,
        name: weapon.name,
        category,
        additionalCategories,
        techBase: weapon.techBase,
        rulesLevel: weapon.rulesLevel,
        weight: weapon.weight,
        criticalSlots: weapon.criticalSlots,
        costCBills: weapon.costCBills,
        battleValue: weapon.battleValue,
        introductionYear: weapon.introductionYear,
      });
    }

    // Ammunition
    for (const ammo of loader.getAllAmmunition()) {
      items.push({
        id: ammo.id,
        name: ammo.name,
        category: EquipmentCategory.AMMUNITION,
        techBase: ammo.techBase,
        rulesLevel: ammo.rulesLevel,
        weight: ammo.weight,
        criticalSlots: ammo.criticalSlots,
        costCBills: ammo.costPerTon,
        battleValue: ammo.battleValue,
        introductionYear: ammo.introductionYear,
      });
    }

    // Electronics
    for (const electronics of loader.getAllElectronics()) {
      items.push({
        id: electronics.id,
        name: electronics.name,
        category: EquipmentCategory.ELECTRONICS,
        techBase: electronics.techBase,
        rulesLevel: electronics.rulesLevel,
        weight: electronics.weight,
        criticalSlots: electronics.criticalSlots,
        costCBills: electronics.costCBills,
        battleValue: electronics.battleValue,
        introductionYear: electronics.introductionYear,
        variableEquipmentId: electronics.variableEquipmentId,
      });
    }

    // Misc Equipment (excluding Jump Jets and Heat Sinks - handled by Structure tab)
    for (const misc of loader.getAllMiscEquipment()) {
      if (EXCLUDED_MISC_CATEGORIES.includes(misc.category)) {
        continue;
      }

      items.push({
        id: misc.id,
        name: misc.name,
        category: EquipmentCategory.MISC_EQUIPMENT,
        techBase: misc.techBase,
        rulesLevel: misc.rulesLevel,
        weight: misc.weight,
        criticalSlots: misc.criticalSlots,
        costCBills: misc.costCBills,
        battleValue: misc.battleValue,
        introductionYear: misc.introductionYear,
        variableEquipmentId: misc.variableEquipmentId,
      });
    }

    return items;
  }

  /**
   * Get cached equipment list (from JSON or fallback)
   */
  private getEquipment(): IEquipmentItem[] {
    if (!this.equipmentCache) {
      if (this.useJsonSource) {
        this.equipmentCache = this.buildEquipmentItemsFromLoader();
      } else {
        this.equipmentCache = getAllEquipmentItemsFallback();
      }
    }
    return this.equipmentCache;
  }

  /**
   * Get equipment by unique identifier
   */
  getById(id: string): IEquipmentItem | undefined {
    return this.getEquipment().find((e) => e.id === id);
  }

  /**
   * Get all equipment in a given category
   */
  getByCategory(category: EquipmentCategory): IEquipmentItem[] {
    return this.getEquipment().filter((e) => e.category === category);
  }

  /**
   * Get equipment compatible with a tech base
   */
  getByTechBase(techBase: TechBase): IEquipmentItem[] {
    return this.getEquipment().filter((e) => e.techBase === techBase);
  }

  /**
   * Get equipment available in a given year
   */
  getByEra(year: number): IEquipmentItem[] {
    return this.getEquipment().filter((e) => e.introductionYear <= year);
  }

  /**
   * Search equipment by name substring (case-insensitive)
   */
  search(queryStr: string): IEquipmentItem[] {
    const lowerQuery = queryStr.toLowerCase();
    return this.getEquipment().filter((e) =>
      e.name.toLowerCase().includes(lowerQuery),
    );
  }

  /**
   * Query equipment with multiple filter criteria
   */
  query(criteria: IEquipmentQueryCriteria): IEquipmentItem[] {
    let results = this.getEquipment();

    // Filter by category
    if (criteria.category !== undefined) {
      results = results.filter((e) => e.category === criteria.category);
    }

    // Filter by tech base
    if (criteria.techBase !== undefined) {
      results = results.filter((e) => e.techBase === criteria.techBase);
    }

    // Filter by year (introduction year)
    if (criteria.year !== undefined) {
      results = results.filter((e) => e.introductionYear <= criteria.year!);
    }

    // Filter by name query
    if (criteria.nameQuery !== undefined && criteria.nameQuery.length > 0) {
      const lowerQuery = criteria.nameQuery.toLowerCase();
      results = results.filter((e) =>
        e.name.toLowerCase().includes(lowerQuery),
      );
    }

    // Filter by rules level
    if (criteria.rulesLevel !== undefined) {
      results = results.filter((e) => e.rulesLevel === criteria.rulesLevel);
    }

    // Filter by max weight
    if (criteria.maxWeight !== undefined) {
      results = results.filter((e) => e.weight <= criteria.maxWeight!);
    }

    // Filter by max slots
    if (criteria.maxSlots !== undefined) {
      results = results.filter((e) => e.criticalSlots <= criteria.maxSlots!);
    }

    return results;
  }

  /**
   * Get all weapon definitions
   */
  getAllWeapons(): IWeapon[] {
    if (this.useJsonSource) {
      return getEquipmentLoader().getAllWeapons();
    }
    return getAllWeaponsFallback() as IWeapon[];
  }

  /**
   * Get all ammunition definitions
   */
  getAllAmmunition(): IAmmunition[] {
    if (this.useJsonSource) {
      return getEquipmentLoader().getAllAmmunition();
    }
    return getAllAmmunitionFallback() as IAmmunition[];
  }

  /**
   * Get all equipment items
   */
  getAllEquipment(): IEquipmentItem[] {
    return this.getEquipment();
  }
}

// Singleton instance with lazy initialization
const equipmentLookupServiceFactory: SingletonFactory<EquipmentLookupService> =
  createSingleton((): EquipmentLookupService => new EquipmentLookupService());

export function getEquipmentLookupService(): EquipmentLookupService {
  return equipmentLookupServiceFactory.get();
}

export function resetEquipmentLookupService(): void {
  equipmentLookupServiceFactory.reset();
}

/** @internal Legacy alias */
export function _resetEquipmentLookupService(): void {
  equipmentLookupServiceFactory.reset();
}

// Legacy export for backward compatibility
// @deprecated Use getEquipmentLookupService() instead
export const equipmentLookupService = getEquipmentLookupService();
