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
import { loadCustomEquipmentSource } from './EquipmentCustomLoader';
import {
  type IEquipmentFilter,
  type IEquipmentLoadResult,
  type IEquipmentValidationResult,
} from './EquipmentLoaderTypes';
import { loadOfficialEquipmentSource } from './EquipmentOfficialLoader';
import { filterEquipmentByCriteria } from './EquipmentSearch';

export type {
  IEquipmentFilter,
  IEquipmentLoadResult,
  IEquipmentValidationResult,
} from './EquipmentLoaderTypes';

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
  getIsLoaded = (): boolean => {
    return this.isLoaded;
  };

  /**
   * Get any loading errors
   */
  getLoadErrors = (): readonly string[] => {
    return this.loadErrors;
  };

  /**
   * Load all official equipment from JSON files
   * Works in both server-side (Node.js) and client-side (browser) environments
   */
  loadOfficialEquipment = async (
    basePath = '/data/equipment/official',
  ): Promise<IEquipmentLoadResult> => {
    const result = await loadOfficialEquipmentSource(basePath, {
      weapons: this.weapons,
      ammunition: this.ammunition,
      electronics: this.electronics,
      miscEquipment: this.miscEquipment,
    });

    if (result.success) {
      this.isLoaded = true;
      this.loadErrors = result.errors;
    }

    return result;
  };

  /**
   * Load custom equipment from a JSON file or object
   */
  loadCustomEquipment = async (
    source: string | File | object,
  ): Promise<IEquipmentLoadResult> => {
    return loadCustomEquipmentSource(source, {
      weapons: this.weapons,
      ammunition: this.ammunition,
      electronics: this.electronics,
      miscEquipment: this.miscEquipment,
    });
  };

  /**
   * Get weapon by ID
   */
  getWeaponById = (id: string): IWeapon | null => {
    return this.weapons.get(id) || null;
  };

  /**
   * Get ammunition by ID
   */
  getAmmunitionById = (id: string): IAmmunition | null => {
    return this.ammunition.get(id) || null;
  };

  /**
   * Get electronics by ID
   */
  getElectronicsById = (id: string): IElectronics | null => {
    return this.electronics.get(id) || null;
  };

  /**
   * Get misc equipment by ID
   */
  getMiscEquipmentById = (id: string): IMiscEquipment | null => {
    return this.miscEquipment.get(id) || null;
  };

  /**
   * Get any equipment by ID (searches all categories)
   */
  getById = (
    id: string,
  ): IWeapon | IAmmunition | IElectronics | IMiscEquipment | null => {
    return (
      this.weapons.get(id) ||
      this.ammunition.get(id) ||
      this.electronics.get(id) ||
      this.miscEquipment.get(id) ||
      null
    );
  };

  /**
   * Get all weapons
   */
  getAllWeapons = (): IWeapon[] => {
    return Array.from(this.weapons.values());
  };

  /**
   * Get all ammunition
   */
  getAllAmmunition = (): IAmmunition[] => {
    return Array.from(this.ammunition.values());
  };

  /**
   * Get all electronics
   */
  getAllElectronics = (): IElectronics[] => {
    return Array.from(this.electronics.values());
  };

  /**
   * Get all misc equipment
   */
  getAllMiscEquipment = (): IMiscEquipment[] => {
    return Array.from(this.miscEquipment.values());
  };

  /**
   * Search weapons by filter
   */
  searchWeapons = (filter: IEquipmentFilter): IWeapon[] => {
    return filterEquipmentByCriteria(this.getAllWeapons(), filter);
  };

  /**
   * Search ammunition by filter
   */
  searchAmmunition = (filter: IEquipmentFilter): IAmmunition[] => {
    return filterEquipmentByCriteria(this.getAllAmmunition(), filter);
  };

  /**
   * Search electronics by filter
   */
  searchElectronics = (filter: IEquipmentFilter): IElectronics[] => {
    return filterEquipmentByCriteria(this.getAllElectronics(), filter);
  };

  /**
   * Search misc equipment by filter
   */
  searchMiscEquipment = (filter: IEquipmentFilter): IMiscEquipment[] => {
    return filterEquipmentByCriteria(this.getAllMiscEquipment(), filter);
  };

  /**
   * Search all equipment types by unit type
   * Convenience method to get all compatible equipment for a unit type
   */
  searchByUnitType = (
    unitType: UnitType,
  ): {
    weapons: IWeapon[];
    ammunition: IAmmunition[];
    electronics: IElectronics[];
    miscEquipment: IMiscEquipment[];
  } => {
    const filter: IEquipmentFilter = { unitType };
    return {
      weapons: this.searchWeapons(filter),
      ammunition: this.searchAmmunition(filter),
      electronics: this.searchElectronics(filter),
      miscEquipment: this.searchMiscEquipment(filter),
    };
  };

  /**
   * Get total equipment count
   */
  getTotalCount = (): number => {
    return (
      this.weapons.size +
      this.ammunition.size +
      this.electronics.size +
      this.miscEquipment.size
    );
  };

  /**
   * Clear all loaded equipment
   */
  clear = (): void => {
    this.weapons.clear();
    this.ammunition.clear();
    this.electronics.clear();
    this.miscEquipment.clear();
    this.isLoaded = false;
    this.loadErrors = [];
  };
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
