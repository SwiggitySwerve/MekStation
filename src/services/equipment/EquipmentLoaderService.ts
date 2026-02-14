/**
 * Equipment Loader Service
 *
 * Provides runtime loading of equipment data from JSON files.
 * Supports both official equipment and custom user-defined equipment.
 *
 * Handles both server-side (Node.js) and client-side (browser) environments.
 *
 * @module services/equipment/EquipmentLoaderService
 */

import { IAmmunition } from '@/types/equipment/AmmunitionTypes';
import { IElectronics } from '@/types/equipment/ElectronicsTypes';
import { IMiscEquipment } from '@/types/equipment/MiscEquipmentTypes';
import { IWeapon } from '@/types/equipment/weapons/interfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  createSingleton,
  type SingletonFactory,
} from '../core/createSingleton';
import {
  convertAmmunition,
  convertElectronics,
  convertMiscEquipment,
  convertWeapon,
  type IEquipmentFile,
  type IRawAmmunitionData,
  type IRawElectronicsData,
  type IRawMiscEquipmentData,
  type IRawWeaponData,
} from './EquipmentConverters';
import { readJsonFile } from './EquipmentFileReader';
import {
  type IEquipmentFilter,
  type IEquipmentIndexData,
  type IEquipmentLoadResult,
  type IEquipmentValidationResult,
} from './EquipmentLoaderTypes';
import { filterEquipmentByCriteria } from './EquipmentSearch';

export type {
  IEquipmentFilter,
  IEquipmentLoadResult,
  IEquipmentValidationResult,
} from './EquipmentLoaderTypes';

const DEFAULT_WEAPON_FILES = [
  'weapons/energy-laser.json',
  'weapons/energy-ppc.json',
  'weapons/energy-other.json',
  'weapons/ballistic-autocannon.json',
  'weapons/ballistic-gauss.json',
  'weapons/ballistic-machinegun.json',
  'weapons/ballistic-other.json',
  'weapons/missile-atm.json',
  'weapons/missile-lrm.json',
  'weapons/missile-mrm.json',
  'weapons/missile-other.json',
  'weapons/missile-srm.json',
  'weapons/physical.json',
];

const DEFAULT_AMMUNITION_FILES = [
  'ammunition/artillery.json',
  'ammunition/atm.json',
  'ammunition/autocannon.json',
  'ammunition/gauss.json',
  'ammunition/lrm.json',
  'ammunition/machinegun.json',
  'ammunition/mrm.json',
  'ammunition/narc.json',
  'ammunition/other.json',
  'ammunition/srm.json',
];

const DEFAULT_ELECTRONICS_FILES = [
  'electronics/ecm.json',
  'electronics/active-probe.json',
  'electronics/c3.json',
  'electronics/other.json',
];

const DEFAULT_MISC_FILES = [
  'miscellaneous/heat-sinks.json',
  'miscellaneous/jump-jets.json',
  'miscellaneous/movement.json',
  'miscellaneous/myomer.json',
  'miscellaneous/defensive.json',
  'miscellaneous/other.json',
];

function getIndexedFileList(
  entry: Record<string, string> | string | undefined,
  fallback: readonly string[],
): string[] {
  if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
    return Object.values(entry);
  }
  return [...fallback];
}

/**
 * Equipment Loader Service
 *
 * Loads and caches equipment data from JSON files for runtime use.
 */
export class EquipmentLoaderService {
  private weapons: Map<string, IWeapon> = new Map();
  private ammunition: Map<string, IAmmunition> = new Map();
  private electronics: Map<string, IElectronics> = new Map();
  private miscEquipment: Map<string, IMiscEquipment> = new Map();

  private isLoaded = false;
  private loadErrors: string[] = [];

  constructor() {}

  /**
   * Check if equipment is loaded
   */
  getIsLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Get any loading errors
   */
  getLoadErrors(): readonly string[] {
    return this.loadErrors;
  }

  /**
   * Load all official equipment from JSON files
   * Works in both server-side (Node.js) and client-side (browser) environments
   */
  async loadOfficialEquipment(
    basePath = '/data/equipment/official',
  ): Promise<IEquipmentLoadResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let itemsLoaded = 0;

    try {
      // Load index.json for data-driven file discovery
      const indexData = await readJsonFile<IEquipmentIndexData>(
        'index.json',
        basePath,
      );

      // Load weapon files (data-driven from index.json)
      const weaponFiles = indexData?.files?.weapons
        ? Object.values(indexData.files.weapons)
        : DEFAULT_WEAPON_FILES;
      for (const weaponFile of weaponFiles) {
        const weaponData = await readJsonFile<IEquipmentFile<IRawWeaponData>>(
          weaponFile,
          basePath,
        );
        if (weaponData) {
          weaponData.items.forEach((item) => {
            const weapon = convertWeapon(item);
            this.weapons.set(weapon.id, weapon);
            itemsLoaded++;
          });
        } else {
          warnings.push(`Failed to load weapons from ${weaponFile}`);
        }
      }

      // Load ammunition files (data-driven from index.json)
      const ammoEntry = indexData?.files?.ammunition;
      const ammoFiles = getIndexedFileList(ammoEntry, DEFAULT_AMMUNITION_FILES);
      for (const ammoFile of ammoFiles) {
        const ammoData = await readJsonFile<IEquipmentFile<IRawAmmunitionData>>(
          ammoFile,
          basePath,
        );
        if (ammoData) {
          ammoData.items.forEach((item) => {
            const ammo = convertAmmunition(item);
            this.ammunition.set(ammo.id, ammo);
            itemsLoaded++;
          });
        } else {
          warnings.push(`Failed to load ammunition from ${ammoFile}`);
        }
      }

      // Load electronics files (data-driven from index.json)
      const elecEntry = indexData?.files?.electronics;
      const elecFiles = getIndexedFileList(
        elecEntry,
        DEFAULT_ELECTRONICS_FILES,
      );
      for (const elecFile of elecFiles) {
        const electronicsData = await readJsonFile<
          IEquipmentFile<IRawElectronicsData>
        >(elecFile, basePath);
        if (electronicsData) {
          electronicsData.items.forEach((item) => {
            const electronics = convertElectronics(item);
            this.electronics.set(electronics.id, electronics);
            itemsLoaded++;
          });
        } else {
          warnings.push(`Failed to load electronics from ${elecFile}`);
        }
      }

      // Load misc equipment files (data-driven from index.json)
      const miscEntry = indexData?.files?.miscellaneous;
      const miscFiles = getIndexedFileList(miscEntry, DEFAULT_MISC_FILES);
      for (const miscFile of miscFiles) {
        const miscData = await readJsonFile<
          IEquipmentFile<IRawMiscEquipmentData>
        >(miscFile, basePath);
        if (miscData) {
          miscData.items.forEach((item) => {
            const equipment = convertMiscEquipment(item);
            this.miscEquipment.set(equipment.id, equipment);
            itemsLoaded++;
          });
        } else {
          warnings.push(
            `Failed to load miscellaneous equipment from ${miscFile}`,
          );
        }
      }

      this.isLoaded = true;
      this.loadErrors = errors;

      return {
        success: errors.length === 0,
        itemsLoaded,
        errors,
        warnings,
      };
    } catch (e) {
      errors.push(`Failed to load equipment: ${e}`);
      return {
        success: false,
        itemsLoaded,
        errors,
        warnings,
      };
    }
  }

  /**
   * Load custom equipment from a JSON file or object
   */
  async loadCustomEquipment(
    source: string | File | object,
  ): Promise<IEquipmentLoadResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let itemsLoaded = 0;

    try {
      let data: IEquipmentFile<
        | IRawWeaponData
        | IRawAmmunitionData
        | IRawElectronicsData
        | IRawMiscEquipmentData
      >;

      if (typeof source === 'string') {
        // Assume URL
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        data = (await response.json()) as typeof data;
      } else if (source instanceof File) {
        const text = await source.text();
        data = JSON.parse(text) as typeof data;
      } else {
        data = source as IEquipmentFile<IRawWeaponData>;
      }

      // Determine type from schema or first item
      const schemaPath = data.$schema || '';

      if (schemaPath.includes('weapon')) {
        (data.items as IRawWeaponData[]).forEach((item) => {
          const weapon = convertWeapon(item);
          this.weapons.set(weapon.id, weapon);
          itemsLoaded++;
        });
      } else if (schemaPath.includes('ammunition')) {
        (data.items as IRawAmmunitionData[]).forEach((item) => {
          const ammo = convertAmmunition(item);
          this.ammunition.set(ammo.id, ammo);
          itemsLoaded++;
        });
      } else if (schemaPath.includes('electronics')) {
        (data.items as IRawElectronicsData[]).forEach((item) => {
          const electronics = convertElectronics(item);
          this.electronics.set(electronics.id, electronics);
          itemsLoaded++;
        });
      } else if (schemaPath.includes('misc-equipment')) {
        (data.items as IRawMiscEquipmentData[]).forEach((item) => {
          const equipment = convertMiscEquipment(item);
          this.miscEquipment.set(equipment.id, equipment);
          itemsLoaded++;
        });
      } else {
        warnings.push('Unknown equipment type, attempting to infer from data');
      }

      return {
        success: errors.length === 0,
        itemsLoaded,
        errors,
        warnings,
      };
    } catch (e) {
      errors.push(`Failed to load custom equipment: ${e}`);
      return {
        success: false,
        itemsLoaded,
        errors,
        warnings,
      };
    }
  }

  /**
   * Get weapon by ID
   */
  getWeaponById(id: string): IWeapon | null {
    return this.weapons.get(id) || null;
  }

  /**
   * Get ammunition by ID
   */
  getAmmunitionById(id: string): IAmmunition | null {
    return this.ammunition.get(id) || null;
  }

  /**
   * Get electronics by ID
   */
  getElectronicsById(id: string): IElectronics | null {
    return this.electronics.get(id) || null;
  }

  /**
   * Get misc equipment by ID
   */
  getMiscEquipmentById(id: string): IMiscEquipment | null {
    return this.miscEquipment.get(id) || null;
  }

  /**
   * Get any equipment by ID (searches all categories)
   */
  getById(
    id: string,
  ): IWeapon | IAmmunition | IElectronics | IMiscEquipment | null {
    return (
      this.weapons.get(id) ||
      this.ammunition.get(id) ||
      this.electronics.get(id) ||
      this.miscEquipment.get(id) ||
      null
    );
  }

  /**
   * Get all weapons
   */
  getAllWeapons(): IWeapon[] {
    return Array.from(this.weapons.values());
  }

  /**
   * Get all ammunition
   */
  getAllAmmunition(): IAmmunition[] {
    return Array.from(this.ammunition.values());
  }

  /**
   * Get all electronics
   */
  getAllElectronics(): IElectronics[] {
    return Array.from(this.electronics.values());
  }

  /**
   * Get all misc equipment
   */
  getAllMiscEquipment(): IMiscEquipment[] {
    return Array.from(this.miscEquipment.values());
  }

  /**
   * Search weapons by filter
   */
  searchWeapons(filter: IEquipmentFilter): IWeapon[] {
    return filterEquipmentByCriteria(this.getAllWeapons(), filter);
  }

  /**
   * Search ammunition by filter
   */
  searchAmmunition(filter: IEquipmentFilter): IAmmunition[] {
    return filterEquipmentByCriteria(this.getAllAmmunition(), filter);
  }

  /**
   * Search electronics by filter
   */
  searchElectronics(filter: IEquipmentFilter): IElectronics[] {
    return filterEquipmentByCriteria(this.getAllElectronics(), filter);
  }

  /**
   * Search misc equipment by filter
   */
  searchMiscEquipment(filter: IEquipmentFilter): IMiscEquipment[] {
    return filterEquipmentByCriteria(this.getAllMiscEquipment(), filter);
  }

  /**
   * Search all equipment types by unit type
   * Convenience method to get all compatible equipment for a unit type
   */
  searchByUnitType(unitType: UnitType): {
    weapons: IWeapon[];
    ammunition: IAmmunition[];
    electronics: IElectronics[];
    miscEquipment: IMiscEquipment[];
  } {
    const filter: IEquipmentFilter = { unitType };
    return {
      weapons: this.searchWeapons(filter),
      ammunition: this.searchAmmunition(filter),
      electronics: this.searchElectronics(filter),
      miscEquipment: this.searchMiscEquipment(filter),
    };
  }

  /**
   * Get total equipment count
   */
  getTotalCount(): number {
    return (
      this.weapons.size +
      this.ammunition.size +
      this.electronics.size +
      this.miscEquipment.size
    );
  }

  /**
   * Clear all loaded equipment
   */
  clear(): void {
    this.weapons.clear();
    this.ammunition.clear();
    this.electronics.clear();
    this.miscEquipment.clear();
    this.isLoaded = false;
    this.loadErrors = [];
  }
}

const equipmentLoaderServiceFactory: SingletonFactory<EquipmentLoaderService> =
  createSingleton((): EquipmentLoaderService => new EquipmentLoaderService());

/**
 * Convenience function to get the loader instance
 */
export function getEquipmentLoader(): EquipmentLoaderService {
  return equipmentLoaderServiceFactory.get();
}

/**
 * Reset the singleton (for testing)
 */
export function resetEquipmentLoader(): void {
  equipmentLoaderServiceFactory.reset();
}
