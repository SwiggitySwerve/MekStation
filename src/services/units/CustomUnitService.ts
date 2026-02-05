/**
 * Custom Unit Service
 *
 * CRUD operations for user-created unit variants stored in IndexedDB.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import { v4 as uuidv4 } from 'uuid';

import { Era } from '@/types/enums/Era';
import { TechBase } from '@/types/enums/TechBase';
import { getWeightClass } from '@/types/enums/WeightClass';

import { NotFoundError } from '../common/errors';
import { IUnitIndexEntry } from '../common/types';
import { indexedDBService, STORES } from '../persistence/IndexedDBService';
import { IFullUnit } from './CanonicalUnitService';

/**
 * Unit name entry for quick lookups
 */
export interface IUnitNameEntry {
  readonly id: string;
  readonly chassis: string;
  readonly variant: string;
  readonly fullName: string;
}

/**
 * Custom unit service interface
 */
export interface ICustomUnitService {
  create(unit: IFullUnit, overwriteId?: string): Promise<string>;
  update(id: string, unit: IFullUnit): Promise<void>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<IFullUnit | null>;
  list(): Promise<readonly IUnitIndexEntry[]>;
  exists(id: string): Promise<boolean>;
  findByName(chassis: string, variant: string): Promise<IFullUnit | null>;
  listNames(): Promise<readonly IUnitNameEntry[]>;
}

/**
 * Custom Unit Service implementation
 */
export class CustomUnitService implements ICustomUnitService {
  private initialized = false;

  /**
   * Ensure database is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await indexedDBService.initialize();
      this.initialized = true;
    }
  }

  /**
   * Create a new custom unit or overwrite an existing one
   * @param unit - The unit data to save
   * @param overwriteId - Optional ID of existing unit to overwrite
   * @returns The unit ID (either generated or the overwriteId)
   */
  async create(unit: IFullUnit, overwriteId?: string): Promise<string> {
    await this.ensureInitialized();

    // If overwriting, use the existing ID; otherwise generate a new one
    const id = overwriteId || `custom-${uuidv4()}`;
    const unitWithId = { ...unit, id };

    await indexedDBService.put(STORES.CUSTOM_UNITS, id, unitWithId);

    return id;
  }

  /**
   * Update an existing custom unit
   */
  async update(id: string, unit: IFullUnit): Promise<void> {
    await this.ensureInitialized();

    const existing = await this.getById(id);
    if (!existing) {
      throw new NotFoundError('Custom Unit', id);
    }

    const unitWithId = { ...unit, id };
    await indexedDBService.put(STORES.CUSTOM_UNITS, id, unitWithId);
  }

  /**
   * Delete a custom unit
   */
  async delete(id: string): Promise<void> {
    await this.ensureInitialized();
    await indexedDBService.delete(STORES.CUSTOM_UNITS, id);
  }

  /**
   * Get a custom unit by ID
   */
  async getById(id: string): Promise<IFullUnit | null> {
    await this.ensureInitialized();
    const unit = await indexedDBService.get<IFullUnit>(STORES.CUSTOM_UNITS, id);
    return unit || null;
  }

  /**
   * List all custom units as index entries
   */
  async list(): Promise<readonly IUnitIndexEntry[]> {
    await this.ensureInitialized();
    const units = await indexedDBService.getAll<IFullUnit>(STORES.CUSTOM_UNITS);

    return units.map((unit) => this.toIndexEntry(unit));
  }

  /**
   * Check if a custom unit exists
   */
  async exists(id: string): Promise<boolean> {
    const unit = await this.getById(id);
    return unit !== null;
  }

  /**
   * Find a custom unit by chassis and variant name
   * Uses case-insensitive comparison
   */
  async findByName(
    chassis: string,
    variant: string,
  ): Promise<IFullUnit | null> {
    await this.ensureInitialized();

    const normalizedChassis = chassis.trim().toLowerCase();
    const normalizedVariant = variant.trim().toLowerCase();

    const units = await indexedDBService.getAll<IFullUnit>(STORES.CUSTOM_UNITS);

    const match = units.find((unit) => {
      const unitChassis = (unit.chassis || '').trim().toLowerCase();
      const unitVariant = (unit.variant || '').trim().toLowerCase();
      return (
        unitChassis === normalizedChassis && unitVariant === normalizedVariant
      );
    });

    return match || null;
  }

  /**
   * List all custom unit names for quick lookup
   * More efficient than loading full unit data
   */
  async listNames(): Promise<readonly IUnitNameEntry[]> {
    await this.ensureInitialized();

    const units = await indexedDBService.getAll<IFullUnit>(STORES.CUSTOM_UNITS);

    return units.map((unit) => ({
      id: unit.id,
      chassis: unit.chassis || '',
      variant: unit.variant || '',
      fullName: `${unit.chassis || ''} ${unit.variant || ''}`.trim(),
    }));
  }

  /**
   * Convert full unit to index entry
   */
  private toIndexEntry(unit: IFullUnit): IUnitIndexEntry {
    const tonnage = typeof unit.tonnage === 'number' ? unit.tonnage : 0;

    return {
      id: unit.id,
      name: `${unit.chassis} ${unit.variant}`,
      chassis: unit.chassis,
      variant: unit.variant,
      tonnage,
      techBase: (unit.techBase as TechBase) || TechBase.INNER_SPHERE,
      era: (unit.era as Era) || Era.LATE_SUCCESSION_WARS,
      weightClass: getWeightClass(tonnage),
      unitType: (unit.unitType as IUnitIndexEntry['unitType']) || 'BattleMech',
      filePath: '', // Custom units don't have file paths
    };
  }
}

// Singleton instance with lazy initialization
let _instance: CustomUnitService | null = null;

/**
 * Get the singleton CustomUnitService instance
 * Provides lazy initialization for better testability and DI support
 */
export function getCustomUnitService(): CustomUnitService {
  if (!_instance) {
    _instance = new CustomUnitService();
  }
  return _instance;
}

/**
 * Reset the singleton instance (for testing)
 * @internal
 */
export function _resetCustomUnitService(): void {
  _instance = null;
}

// Legacy export for backward compatibility
// @deprecated Use getCustomUnitService() instead
export const customUnitService = getCustomUnitService();
