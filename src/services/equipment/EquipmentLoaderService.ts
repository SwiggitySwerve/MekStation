/**
 * Equipment Loader Service
 * 
 * Provides runtime loading of equipment data from JSON files.
 * Supports both official equipment and custom user-defined equipment.
 * 
 * @module services/equipment/EquipmentLoaderService
 */

import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { IWeapon, WeaponCategory } from '@/types/equipment/weapons/interfaces';
import { IAmmunition, AmmoCategory, AmmoVariant } from '@/types/equipment/AmmunitionTypes';
import { IElectronics, ElectronicsCategory } from '@/types/equipment/ElectronicsTypes';
import { IMiscEquipment, MiscEquipmentCategory } from '@/types/equipment/MiscEquipmentTypes';

/**
 * Equipment loading result
 */
export interface IEquipmentLoadResult {
  readonly success: boolean;
  readonly itemsLoaded: number;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * Validation result for equipment data
 */
export interface IEquipmentValidationResult {
  readonly isValid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * Equipment filter criteria
 */
export interface IEquipmentFilter {
  readonly category?: string | string[];
  readonly techBase?: TechBase | TechBase[];
  readonly rulesLevel?: RulesLevel | RulesLevel[];
  readonly maxYear?: number;
  readonly minYear?: number;
  readonly searchText?: string;
}

/**
 * Raw JSON weapon data before conversion
 */
interface IRawWeaponData {
  id: string;
  name: string;
  category: string;
  subType: string;
  techBase: string;
  rulesLevel: string;
  damage: number | string;
  heat: number;
  ranges: {
    minimum: number;
    short: number;
    medium: number;
    long: number;
    extreme?: number;
  };
  weight: number;
  criticalSlots: number;
  ammoPerTon?: number;
  costCBills: number;
  battleValue: number;
  introductionYear: number;
  isExplosive?: boolean;
  special?: string[];
}

/**
 * Raw JSON ammunition data
 */
interface IRawAmmunitionData {
  id: string;
  name: string;
  category: string;
  variant: string;
  techBase: string;
  rulesLevel: string;
  compatibleWeaponIds: string[];
  shotsPerTon: number;
  weight: number;
  criticalSlots: number;
  costPerTon: number;
  battleValue: number;
  isExplosive: boolean;
  introductionYear: number;
  damageModifier?: number;
  rangeModifier?: number;
  special?: string[];
}

/**
 * Raw JSON electronics data
 */
interface IRawElectronicsData {
  id: string;
  name: string;
  category: string;
  techBase: string;
  rulesLevel: string;
  weight: number;
  criticalSlots: number;
  costCBills: number;
  battleValue: number;
  introductionYear: number;
  special?: string[];
  variableEquipmentId?: string;
}

/**
 * Raw JSON misc equipment data
 */
interface IRawMiscEquipmentData {
  id: string;
  name: string;
  category: string;
  techBase: string;
  rulesLevel: string;
  weight: number;
  criticalSlots: number;
  costCBills: number;
  battleValue: number;
  introductionYear: number;
  special?: string[];
  variableEquipmentId?: string;
}

/**
 * Equipment file wrapper structure
 */
interface IEquipmentFile<T> {
  $schema: string;
  version: string;
  generatedAt: string;
  count: number;
  items: T[];
}

/**
 * Convert string to TechBase enum
 */
function parseTechBase(value: string): TechBase {
  switch (value.toUpperCase()) {
    case 'INNER_SPHERE':
      return TechBase.INNER_SPHERE;
    case 'CLAN':
      return TechBase.CLAN;
    case 'BOTH':
    case 'MIXED':
      return TechBase.MIXED;
    default:
      return TechBase.INNER_SPHERE;
  }
}

/**
 * Convert string to RulesLevel enum
 */
function parseRulesLevel(value: string): RulesLevel {
  switch (value.toUpperCase()) {
    case 'INTRODUCTORY':
      return RulesLevel.INTRODUCTORY;
    case 'STANDARD':
      return RulesLevel.STANDARD;
    case 'ADVANCED':
      return RulesLevel.ADVANCED;
    case 'EXPERIMENTAL':
    case 'UNOFFICIAL':
      return RulesLevel.EXPERIMENTAL;
    default:
      return RulesLevel.STANDARD;
  }
}

/**
 * Convert string to WeaponCategory enum
 */
function parseWeaponCategory(value: string): WeaponCategory {
  switch (value) {
    case 'Energy':
      return WeaponCategory.ENERGY;
    case 'Ballistic':
      return WeaponCategory.BALLISTIC;
    case 'Missile':
      return WeaponCategory.MISSILE;
    case 'Physical':
      return WeaponCategory.PHYSICAL;
    case 'Artillery':
      return WeaponCategory.ARTILLERY;
    default:
      return WeaponCategory.ENERGY;
  }
}

/**
 * Convert string to AmmoCategory enum
 */
function parseAmmoCategory(value: string): AmmoCategory {
  switch (value) {
    case 'Autocannon':
      return AmmoCategory.AUTOCANNON;
    case 'Gauss':
      return AmmoCategory.GAUSS;
    case 'Machine Gun':
      return AmmoCategory.MACHINE_GUN;
    case 'LRM':
      return AmmoCategory.LRM;
    case 'SRM':
      return AmmoCategory.SRM;
    case 'MRM':
      return AmmoCategory.MRM;
    case 'ATM':
      return AmmoCategory.ATM;
    case 'NARC':
      return AmmoCategory.NARC;
    case 'Artillery':
      return AmmoCategory.ARTILLERY;
    case 'AMS':
      return AmmoCategory.AMS;
    default:
      return AmmoCategory.AUTOCANNON;
  }
}

/**
 * Convert string to AmmoVariant enum
 */
function parseAmmoVariant(value: string): AmmoVariant {
  switch (value) {
    case 'Standard':
      return AmmoVariant.STANDARD;
    case 'Armor-Piercing':
      return AmmoVariant.ARMOR_PIERCING;
    case 'Cluster':
      return AmmoVariant.CLUSTER;
    case 'Precision':
      return AmmoVariant.PRECISION;
    case 'Flechette':
      return AmmoVariant.FLECHETTE;
    case 'Inferno':
      return AmmoVariant.INFERNO;
    case 'Fragmentation':
      return AmmoVariant.FRAGMENTATION;
    case 'Incendiary':
      return AmmoVariant.INCENDIARY;
    case 'Smoke':
      return AmmoVariant.SMOKE;
    case 'Thunder':
      return AmmoVariant.THUNDER;
    case 'Swarm':
      return AmmoVariant.SWARM;
    case 'Tandem-Charge':
      return AmmoVariant.TANDEM_CHARGE;
    case 'Extended Range':
      return AmmoVariant.EXTENDED_RANGE;
    case 'High Explosive':
      return AmmoVariant.HIGH_EXPLOSIVE;
    default:
      return AmmoVariant.STANDARD;
  }
}

/**
 * Convert string to ElectronicsCategory enum
 */
function parseElectronicsCategory(value: string): ElectronicsCategory {
  switch (value) {
    case 'Targeting':
      return ElectronicsCategory.TARGETING;
    case 'ECM':
      return ElectronicsCategory.ECM;
    case 'Active Probe':
      return ElectronicsCategory.ACTIVE_PROBE;
    case 'C3 System':
      return ElectronicsCategory.C3;
    case 'TAG':
      return ElectronicsCategory.TAG;
    case 'Communications':
      return ElectronicsCategory.COMMUNICATIONS;
    default:
      return ElectronicsCategory.TARGETING;
  }
}

/**
 * Convert string to MiscEquipmentCategory enum
 */
function parseMiscEquipmentCategory(value: string): MiscEquipmentCategory {
  switch (value) {
    case 'Heat Sink':
      return MiscEquipmentCategory.HEAT_SINK;
    case 'Jump Jet':
      return MiscEquipmentCategory.JUMP_JET;
    case 'Movement Enhancement':
      return MiscEquipmentCategory.MOVEMENT;
    case 'Defensive':
      return MiscEquipmentCategory.DEFENSIVE;
    case 'Myomer':
      return MiscEquipmentCategory.MYOMER;
    case 'Industrial':
      return MiscEquipmentCategory.INDUSTRIAL;
    default:
      return MiscEquipmentCategory.HEAT_SINK;
  }
}

/**
 * Convert raw JSON weapon data to IWeapon interface
 */
function convertWeapon(raw: IRawWeaponData): IWeapon {
  return {
    id: raw.id,
    name: raw.name,
    category: parseWeaponCategory(raw.category),
    subType: raw.subType,
    techBase: parseTechBase(raw.techBase),
    rulesLevel: parseRulesLevel(raw.rulesLevel),
    damage: raw.damage,
    heat: raw.heat,
    ranges: raw.ranges,
    weight: raw.weight,
    criticalSlots: raw.criticalSlots,
    ...(raw.ammoPerTon && { ammoPerTon: raw.ammoPerTon }),
    costCBills: raw.costCBills,
    battleValue: raw.battleValue,
    introductionYear: raw.introductionYear,
    ...(raw.isExplosive && { isExplosive: raw.isExplosive }),
    ...(raw.special && { special: raw.special }),
  };
}

/**
 * Convert raw JSON ammunition data to IAmmunition interface
 */
function convertAmmunition(raw: IRawAmmunitionData): IAmmunition {
  return {
    id: raw.id,
    name: raw.name,
    category: parseAmmoCategory(raw.category),
    variant: parseAmmoVariant(raw.variant),
    techBase: parseTechBase(raw.techBase),
    rulesLevel: parseRulesLevel(raw.rulesLevel),
    compatibleWeaponIds: raw.compatibleWeaponIds,
    shotsPerTon: raw.shotsPerTon,
    weight: raw.weight,
    criticalSlots: raw.criticalSlots,
    costPerTon: raw.costPerTon,
    battleValue: raw.battleValue,
    isExplosive: raw.isExplosive,
    introductionYear: raw.introductionYear,
    ...(raw.damageModifier !== undefined && { damageModifier: raw.damageModifier }),
    ...(raw.rangeModifier !== undefined && { rangeModifier: raw.rangeModifier }),
    ...(raw.special && { special: raw.special }),
  };
}

/**
 * Convert raw JSON electronics data to IElectronics interface
 */
function convertElectronics(raw: IRawElectronicsData): IElectronics {
  return {
    id: raw.id,
    name: raw.name,
    category: parseElectronicsCategory(raw.category),
    techBase: parseTechBase(raw.techBase),
    rulesLevel: parseRulesLevel(raw.rulesLevel),
    weight: raw.weight,
    criticalSlots: raw.criticalSlots,
    costCBills: raw.costCBills,
    battleValue: raw.battleValue,
    introductionYear: raw.introductionYear,
    ...(raw.special && { special: raw.special }),
    ...(raw.variableEquipmentId && { variableEquipmentId: raw.variableEquipmentId }),
  };
}

/**
 * Convert raw JSON misc equipment data to IMiscEquipment interface
 */
function convertMiscEquipment(raw: IRawMiscEquipmentData): IMiscEquipment {
  return {
    id: raw.id,
    name: raw.name,
    category: parseMiscEquipmentCategory(raw.category),
    techBase: parseTechBase(raw.techBase),
    rulesLevel: parseRulesLevel(raw.rulesLevel),
    weight: raw.weight,
    criticalSlots: raw.criticalSlots,
    costCBills: raw.costCBills,
    battleValue: raw.battleValue,
    introductionYear: raw.introductionYear,
    ...(raw.special && { special: raw.special }),
    ...(raw.variableEquipmentId && { variableEquipmentId: raw.variableEquipmentId }),
  };
}

/**
 * Equipment Loader Service
 * 
 * Loads and caches equipment data from JSON files for runtime use.
 */
export class EquipmentLoaderService {
  private static instance: EquipmentLoaderService | null = null;
  
  private weapons: Map<string, IWeapon> = new Map();
  private ammunition: Map<string, IAmmunition> = new Map();
  private electronics: Map<string, IElectronics> = new Map();
  private miscEquipment: Map<string, IMiscEquipment> = new Map();
  
  private isLoaded = false;
  private loadErrors: string[] = [];
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  static getInstance(): EquipmentLoaderService {
    if (!EquipmentLoaderService.instance) {
      EquipmentLoaderService.instance = new EquipmentLoaderService();
    }
    return EquipmentLoaderService.instance;
  }
  
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
   */
  async loadOfficialEquipment(basePath = '/data/equipment/official'): Promise<IEquipmentLoadResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let itemsLoaded = 0;
    
    try {
      // Load energy weapons
      try {
        const response = await fetch(`${basePath}/weapons/energy.json`);
        if (response.ok) {
          const data: IEquipmentFile<IRawWeaponData> = await response.json();
          data.items.forEach(item => {
            const weapon = convertWeapon(item);
            this.weapons.set(weapon.id, weapon);
            itemsLoaded++;
          });
        } else {
          warnings.push(`Failed to load energy weapons: ${response.status}`);
        }
      } catch (e) {
        warnings.push(`Error loading energy weapons: ${e}`);
      }
      
      // Load ballistic weapons
      try {
        const response = await fetch(`${basePath}/weapons/ballistic.json`);
        if (response.ok) {
          const data: IEquipmentFile<IRawWeaponData> = await response.json();
          data.items.forEach(item => {
            const weapon = convertWeapon(item);
            this.weapons.set(weapon.id, weapon);
            itemsLoaded++;
          });
        } else {
          warnings.push(`Failed to load ballistic weapons: ${response.status}`);
        }
      } catch (e) {
        warnings.push(`Error loading ballistic weapons: ${e}`);
      }
      
      // Load missile weapons
      try {
        const response = await fetch(`${basePath}/weapons/missile.json`);
        if (response.ok) {
          const data: IEquipmentFile<IRawWeaponData> = await response.json();
          data.items.forEach(item => {
            const weapon = convertWeapon(item);
            this.weapons.set(weapon.id, weapon);
            itemsLoaded++;
          });
        } else {
          warnings.push(`Failed to load missile weapons: ${response.status}`);
        }
      } catch (e) {
        warnings.push(`Error loading missile weapons: ${e}`);
      }
      
      // Load ammunition
      try {
        const response = await fetch(`${basePath}/ammunition.json`);
        if (response.ok) {
          const data: IEquipmentFile<IRawAmmunitionData> = await response.json();
          data.items.forEach(item => {
            const ammo = convertAmmunition(item);
            this.ammunition.set(ammo.id, ammo);
            itemsLoaded++;
          });
        } else {
          warnings.push(`Failed to load ammunition: ${response.status}`);
        }
      } catch (e) {
        warnings.push(`Error loading ammunition: ${e}`);
      }
      
      // Load electronics
      try {
        const response = await fetch(`${basePath}/electronics.json`);
        if (response.ok) {
          const data: IEquipmentFile<IRawElectronicsData> = await response.json();
          data.items.forEach(item => {
            const electronics = convertElectronics(item);
            this.electronics.set(electronics.id, electronics);
            itemsLoaded++;
          });
        } else {
          warnings.push(`Failed to load electronics: ${response.status}`);
        }
      } catch (e) {
        warnings.push(`Error loading electronics: ${e}`);
      }
      
      // Load misc equipment
      try {
        const response = await fetch(`${basePath}/miscellaneous.json`);
        if (response.ok) {
          const data: IEquipmentFile<IRawMiscEquipmentData> = await response.json();
          data.items.forEach(item => {
            const equipment = convertMiscEquipment(item);
            this.miscEquipment.set(equipment.id, equipment);
            itemsLoaded++;
          });
        } else {
          warnings.push(`Failed to load miscellaneous equipment: ${response.status}`);
        }
      } catch (e) {
        warnings.push(`Error loading miscellaneous equipment: ${e}`);
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
  async loadCustomEquipment(source: string | File | object): Promise<IEquipmentLoadResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let itemsLoaded = 0;
    
    try {
      let data: IEquipmentFile<IRawWeaponData | IRawAmmunitionData | IRawElectronicsData | IRawMiscEquipmentData>;
      
      if (typeof source === 'string') {
        // Assume URL
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        data = await response.json();
      } else if (source instanceof File) {
        const text = await source.text();
        data = JSON.parse(text);
      } else {
        data = source as IEquipmentFile<IRawWeaponData>;
      }
      
      // Determine type from schema or first item
      const schemaPath = data.$schema || '';
      
      if (schemaPath.includes('weapon')) {
        (data.items as IRawWeaponData[]).forEach(item => {
          const weapon = convertWeapon(item);
          this.weapons.set(weapon.id, weapon);
          itemsLoaded++;
        });
      } else if (schemaPath.includes('ammunition')) {
        (data.items as IRawAmmunitionData[]).forEach(item => {
          const ammo = convertAmmunition(item);
          this.ammunition.set(ammo.id, ammo);
          itemsLoaded++;
        });
      } else if (schemaPath.includes('electronics')) {
        (data.items as IRawElectronicsData[]).forEach(item => {
          const electronics = convertElectronics(item);
          this.electronics.set(electronics.id, electronics);
          itemsLoaded++;
        });
      } else if (schemaPath.includes('misc-equipment')) {
        (data.items as IRawMiscEquipmentData[]).forEach(item => {
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
  getById(id: string): IWeapon | IAmmunition | IElectronics | IMiscEquipment | null {
    return this.weapons.get(id) ||
           this.ammunition.get(id) ||
           this.electronics.get(id) ||
           this.miscEquipment.get(id) ||
           null;
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
    let results = this.getAllWeapons();
    
    if (filter.techBase) {
      const techBases = Array.isArray(filter.techBase) ? filter.techBase : [filter.techBase];
      results = results.filter(w => techBases.includes(w.techBase) || w.techBase === TechBase.MIXED);
    }
    
    if (filter.rulesLevel) {
      const levels = Array.isArray(filter.rulesLevel) ? filter.rulesLevel : [filter.rulesLevel];
      results = results.filter(w => levels.includes(w.rulesLevel));
    }
    
    if (filter.maxYear !== undefined) {
      results = results.filter(w => w.introductionYear <= filter.maxYear!);
    }
    
    if (filter.minYear !== undefined) {
      results = results.filter(w => w.introductionYear >= filter.minYear!);
    }
    
    if (filter.searchText) {
      const search = filter.searchText.toLowerCase();
      results = results.filter(w => 
        w.name.toLowerCase().includes(search) ||
        w.id.toLowerCase().includes(search)
      );
    }
    
    return results;
  }
  
  /**
   * Get total equipment count
   */
  getTotalCount(): number {
    return this.weapons.size + this.ammunition.size + 
           this.electronics.size + this.miscEquipment.size;
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

/**
 * Convenience function to get the loader instance
 */
export function getEquipmentLoader(): EquipmentLoaderService {
  return EquipmentLoaderService.getInstance();
}

