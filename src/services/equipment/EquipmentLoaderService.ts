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

import {
  parseTechBase as parseEnumTechBase,
  parseRulesLevel as parseEnumRulesLevel,
} from '@/services/units/EnumParserRegistry';
import {
  EquipmentFlag,
  EquipmentBehaviorFlag,
} from '@/types/enums/EquipmentFlag';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import {
  IAmmunition,
  AmmoCategory,
  AmmoVariant,
} from '@/types/equipment/AmmunitionTypes';
import {
  IElectronics,
  ElectronicsCategory,
} from '@/types/equipment/ElectronicsTypes';
import {
  IMiscEquipment,
  MiscEquipmentCategory,
} from '@/types/equipment/MiscEquipmentTypes';
import { IWeapon, WeaponCategory } from '@/types/equipment/weapons/interfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { logger } from '@/utils/logger';

import {
  createSingleton,
  type SingletonFactory,
} from '../core/createSingleton';

/**
 * Detect if we're running in a server (Node.js) environment
 */
const isServer = typeof window === 'undefined';

/**
 * Read a JSON file - handles both server-side (fs) and client-side (fetch) environments
 */
async function readJsonFile<T>(
  filePath: string,
  basePath: string,
): Promise<T | null> {
  if (isServer) {
    // Server-side: use fs to read from public directory
    // This code only runs server-side and is not bundled for the client
    // Turbopack warning: This dynamic path is server-only and won't affect client bundle
    try {
      // Dynamic imports to avoid bundling in browser
      const fs = await import('fs').then((m) => m.promises);
      const path = await import('path');

      // Resolve path relative to public directory
      // Construct path explicitly to help with static analysis
      const publicDir = path.resolve(process.cwd(), 'public');
      // Remove leading slashes and construct path explicitly
      const cleanBasePath = basePath.replace(/^\/+/, '');
      const cleanFilePath = filePath.replace(/^\/+/, '');
      // Use explicit string construction for known file patterns
      // This helps Turbopack understand the file access pattern
      const pathSegments = [publicDir, cleanBasePath, cleanFilePath].filter(
        Boolean,
      );
      const fullPath = path.resolve(...pathSegments);

      const content = await fs.readFile(fullPath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      logger.warn(
        `[EquipmentLoaderService] Server-side read failed for ${filePath}:`,
        error,
      );
      return null;
    }
  } else {
    // Client-side: use fetch
    try {
      const response = await fetch(`${basePath}/${filePath}`);
      if (response.ok) {
        return (await response.json()) as T;
      }
      logger.warn(
        `[EquipmentLoaderService] Fetch failed for ${filePath}: ${response.status}`,
      );
      return null;
    } catch (error) {
      logger.warn(
        `[EquipmentLoaderService] Fetch error for ${filePath}:`,
        error,
      );
      return null;
    }
  }
}

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
  /**
   * Filter by unit type compatibility.
   * Equipment must have at least one of the specified unit types in allowedUnitTypes.
   */
  readonly unitType?: UnitType | UnitType[];
  /**
   * Filter to equipment that has ALL of the specified flags.
   */
  readonly hasFlags?: EquipmentFlag[];
  /**
   * Filter out equipment that has ANY of the specified flags.
   */
  readonly excludeFlags?: EquipmentFlag[];
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
  /** Unit types that can mount this weapon */
  allowedUnitTypes?: string[];
  /** Equipment flags (behavior and unit type) */
  flags?: string[];
  /** Locations where this equipment can be mounted */
  allowedLocations?: string[];
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
  /** Unit types that can use this ammunition */
  allowedUnitTypes?: string[];
  /** Equipment flags */
  flags?: string[];
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
  /** Unit types that can mount this equipment */
  allowedUnitTypes?: string[];
  /** Equipment flags */
  flags?: string[];
  /** Locations where this equipment can be mounted */
  allowedLocations?: string[];
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
  /** Unit types that can mount this equipment */
  allowedUnitTypes?: string[];
  /** Equipment flags */
  flags?: string[];
  /** Locations where this equipment can be mounted */
  allowedLocations?: string[];
}

/**
 * Equipment file wrapper structure.
 * Only `items` is required — metadata fields are optional since some
 * equipment files were restructured without the wrapper fields.
 */
interface IEquipmentFile<T> {
  $schema?: string;
  version?: string;
  generatedAt?: string;
  count?: number;
  items: T[];
}

// Use EnumParserRegistry for standard enum parsing (OCP compliant)
const parseTechBase = parseEnumTechBase;
const parseRulesLevel = parseEnumRulesLevel;

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
 * Convert string to UnitType enum
 * Returns undefined if not a valid unit type
 */
function parseUnitType(value: string): UnitType | undefined {
  // Handle both full enum name and shorthand
  const normalized = value.toUpperCase().replace(/-/g, '_').replace(/ /g, '_');

  // Map of normalized strings to UnitType values
  const unitTypeMap: Record<string, UnitType> = {
    // Full names
    BATTLEMECH: UnitType.BATTLEMECH,
    OMNIMECH: UnitType.OMNIMECH,
    INDUSTRIALMECH: UnitType.INDUSTRIALMECH,
    PROTOMECH: UnitType.PROTOMECH,
    VEHICLE: UnitType.VEHICLE,
    VTOL: UnitType.VTOL,
    AEROSPACE: UnitType.AEROSPACE,
    CONVENTIONAL_FIGHTER: UnitType.CONVENTIONAL_FIGHTER,
    SMALL_CRAFT: UnitType.SMALL_CRAFT,
    DROPSHIP: UnitType.DROPSHIP,
    JUMPSHIP: UnitType.JUMPSHIP,
    WARSHIP: UnitType.WARSHIP,
    SPACE_STATION: UnitType.SPACE_STATION,
    INFANTRY: UnitType.INFANTRY,
    BATTLE_ARMOR: UnitType.BATTLE_ARMOR,
    SUPPORT_VEHICLE: UnitType.SUPPORT_VEHICLE,
    // Common shorthands
    MECH: UnitType.BATTLEMECH,
    MECH_EQUIPMENT: UnitType.BATTLEMECH,
    TANK: UnitType.VEHICLE,
    VEHICLE_EQUIPMENT: UnitType.VEHICLE,
    VTOL_EQUIPMENT: UnitType.VTOL,
    FIGHTER: UnitType.AEROSPACE,
    FIGHTER_EQUIPMENT: UnitType.AEROSPACE,
    ASF: UnitType.AEROSPACE,
    SUPPORT: UnitType.SUPPORT_VEHICLE,
    SUPPORT_VEHICLE_EQUIPMENT: UnitType.SUPPORT_VEHICLE,
    BA: UnitType.BATTLE_ARMOR,
    BA_EQUIPMENT: UnitType.BATTLE_ARMOR,
    INF: UnitType.INFANTRY,
    INF_EQUIPMENT: UnitType.INFANTRY,
    PROTO: UnitType.PROTOMECH,
    PROTO_EQUIPMENT: UnitType.PROTOMECH,
    SC: UnitType.SMALL_CRAFT,
    SC_EQUIPMENT: UnitType.SMALL_CRAFT,
    DS: UnitType.DROPSHIP,
    DS_EQUIPMENT: UnitType.DROPSHIP,
    JS: UnitType.JUMPSHIP,
    JS_EQUIPMENT: UnitType.JUMPSHIP,
    WS: UnitType.WARSHIP,
    WS_EQUIPMENT: UnitType.WARSHIP,
    SS: UnitType.SPACE_STATION,
    SS_EQUIPMENT: UnitType.SPACE_STATION,
  };

  return unitTypeMap[normalized];
}

/**
 * Convert string to EquipmentBehaviorFlag enum
 * Returns undefined if not a valid behavior flag
 */
function parseBehaviorFlag(value: string): EquipmentBehaviorFlag | undefined {
  const normalized = value.toUpperCase().replace(/-/g, '_');
  const flagValues = Object.values(EquipmentBehaviorFlag);
  if (flagValues.includes(normalized as EquipmentBehaviorFlag)) {
    return normalized as EquipmentBehaviorFlag;
  }
  return undefined;
}

/**
 * Parse an array of string flags into typed EquipmentFlag array
 * Note: Only behavior flags are stored in the flags array.
 * Unit type compatibility is handled via allowedUnitTypes.
 */
function parseFlags(flags: string[] | undefined): EquipmentBehaviorFlag[] {
  if (!flags) return [];

  const result: EquipmentBehaviorFlag[] = [];
  for (const flag of flags) {
    const behaviorFlag = parseBehaviorFlag(flag);
    if (behaviorFlag) {
      result.push(behaviorFlag);
    }
    // Unknown flags are silently ignored (may be new flags not yet supported)
  }
  return result;
}

/**
 * Parse allowed unit types from string array
 */
function parseAllowedUnitTypes(types: string[] | undefined): UnitType[] {
  if (!types) return [];

  const result: UnitType[] = [];
  for (const type of types) {
    const unitType = parseUnitType(type);
    if (unitType) {
      result.push(unitType);
    }
  }
  return result;
}

/**
 * Convert raw JSON weapon data to IWeapon interface
 */
function convertWeapon(raw: IRawWeaponData): IWeapon {
  const allowedUnitTypes = parseAllowedUnitTypes(raw.allowedUnitTypes);
  const flags = parseFlags(raw.flags);

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
    ...(allowedUnitTypes.length > 0 && { allowedUnitTypes }),
    ...(flags.length > 0 && { flags }),
    ...(raw.allowedLocations && { allowedLocations: raw.allowedLocations }),
  };
}

/**
 * Convert raw JSON ammunition data to IAmmunition interface
 */
function convertAmmunition(raw: IRawAmmunitionData): IAmmunition {
  const allowedUnitTypes = parseAllowedUnitTypes(raw.allowedUnitTypes);
  const flags = parseFlags(raw.flags);

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
    ...(raw.damageModifier !== undefined && {
      damageModifier: raw.damageModifier,
    }),
    ...(raw.rangeModifier !== undefined && {
      rangeModifier: raw.rangeModifier,
    }),
    ...(raw.special && { special: raw.special }),
    ...(allowedUnitTypes.length > 0 && { allowedUnitTypes }),
    ...(flags.length > 0 && { flags }),
  };
}

/**
 * Convert raw JSON electronics data to IElectronics interface
 */
function convertElectronics(raw: IRawElectronicsData): IElectronics {
  const allowedUnitTypes = parseAllowedUnitTypes(raw.allowedUnitTypes);
  const flags = parseFlags(raw.flags);

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
    ...(raw.variableEquipmentId && {
      variableEquipmentId: raw.variableEquipmentId,
    }),
    ...(allowedUnitTypes.length > 0 && { allowedUnitTypes }),
    ...(flags.length > 0 && { flags }),
    ...(raw.allowedLocations && { allowedLocations: raw.allowedLocations }),
  };
}

/**
 * Convert raw JSON misc equipment data to IMiscEquipment interface
 */
function convertMiscEquipment(raw: IRawMiscEquipmentData): IMiscEquipment {
  const allowedUnitTypes = parseAllowedUnitTypes(raw.allowedUnitTypes);
  const flags = parseFlags(raw.flags);

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
    ...(raw.variableEquipmentId && {
      variableEquipmentId: raw.variableEquipmentId,
    }),
    ...(allowedUnitTypes.length > 0 && { allowedUnitTypes }),
    ...(flags.length > 0 && { flags }),
    ...(raw.allowedLocations && { allowedLocations: raw.allowedLocations }),
  };
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
      const indexData = await readJsonFile<{
        files: {
          weapons: Record<string, string>;
          ammunition: Record<string, string> | string;
          electronics: Record<string, string> | string;
          miscellaneous: Record<string, string> | string;
        };
      }>('index.json', basePath);

      // Load weapon files (data-driven from index.json)
      const weaponFiles = indexData?.files?.weapons
        ? Object.values(indexData.files.weapons)
        : [
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
      const ammoFiles =
        ammoEntry && typeof ammoEntry === 'object'
          ? (Object.values(ammoEntry) as string[])
          : [
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
      const elecFiles =
        elecEntry && typeof elecEntry === 'object' && !Array.isArray(elecEntry)
          ? (Object.values(elecEntry) as string[])
          : [
              'electronics/ecm.json',
              'electronics/active-probe.json',
              'electronics/c3.json',
              'electronics/other.json',
            ];
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
      const miscFiles =
        miscEntry && typeof miscEntry === 'object' && !Array.isArray(miscEntry)
          ? (Object.values(miscEntry) as string[])
          : [
              'miscellaneous/heat-sinks.json',
              'miscellaneous/jump-jets.json',
              'miscellaneous/movement.json',
              'miscellaneous/myomer.json',
              'miscellaneous/defensive.json',
              'miscellaneous/other.json',
            ];
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
    let results = this.getAllWeapons();

    if (filter.techBase) {
      const techBases = Array.isArray(filter.techBase)
        ? filter.techBase
        : [filter.techBase];
      // Per spec: Tech base is binary (IS or Clan), no MIXED
      results = results.filter((w) => techBases.includes(w.techBase));
    }

    if (filter.rulesLevel) {
      const levels = Array.isArray(filter.rulesLevel)
        ? filter.rulesLevel
        : [filter.rulesLevel];
      results = results.filter((w) => levels.includes(w.rulesLevel));
    }

    if (filter.maxYear !== undefined) {
      results = results.filter((w) => w.introductionYear <= filter.maxYear!);
    }

    if (filter.minYear !== undefined) {
      results = results.filter((w) => w.introductionYear >= filter.minYear!);
    }

    if (filter.searchText) {
      const search = filter.searchText.toLowerCase();
      results = results.filter(
        (w) =>
          w.name.toLowerCase().includes(search) ||
          w.id.toLowerCase().includes(search),
      );
    }

    // Filter by unit type compatibility
    if (filter.unitType) {
      const unitTypes = Array.isArray(filter.unitType)
        ? filter.unitType
        : [filter.unitType];
      results = results.filter((w) => {
        // If weapon has no allowedUnitTypes, it defaults to mech/vehicle/aerospace
        const weaponUnitTypes = w.allowedUnitTypes ?? [
          UnitType.BATTLEMECH,
          UnitType.VEHICLE,
          UnitType.AEROSPACE,
        ];
        // Equipment is compatible if it supports at least one of the requested unit types
        return unitTypes.some((ut) => weaponUnitTypes.includes(ut));
      });
    }

    // Filter to equipment that has ALL of the specified flags
    if (filter.hasFlags && filter.hasFlags.length > 0) {
      results = results.filter((w) => {
        const weaponFlags = w.flags ?? [];
        return filter.hasFlags!.every((flag) => weaponFlags.includes(flag));
      });
    }

    // Filter out equipment that has ANY of the specified flags
    if (filter.excludeFlags && filter.excludeFlags.length > 0) {
      results = results.filter((w) => {
        const weaponFlags = w.flags ?? [];
        return !filter.excludeFlags!.some((flag) => weaponFlags.includes(flag));
      });
    }

    return results;
  }

  /**
   * Search ammunition by filter
   */
  searchAmmunition(filter: IEquipmentFilter): IAmmunition[] {
    let results = this.getAllAmmunition();

    if (filter.techBase) {
      const techBases = Array.isArray(filter.techBase)
        ? filter.techBase
        : [filter.techBase];
      results = results.filter((a) => techBases.includes(a.techBase));
    }

    if (filter.rulesLevel) {
      const levels = Array.isArray(filter.rulesLevel)
        ? filter.rulesLevel
        : [filter.rulesLevel];
      results = results.filter((a) => levels.includes(a.rulesLevel));
    }

    if (filter.maxYear !== undefined) {
      results = results.filter((a) => a.introductionYear <= filter.maxYear!);
    }

    if (filter.minYear !== undefined) {
      results = results.filter((a) => a.introductionYear >= filter.minYear!);
    }

    if (filter.searchText) {
      const search = filter.searchText.toLowerCase();
      results = results.filter(
        (a) =>
          a.name.toLowerCase().includes(search) ||
          a.id.toLowerCase().includes(search),
      );
    }

    if (filter.unitType) {
      const unitTypes = Array.isArray(filter.unitType)
        ? filter.unitType
        : [filter.unitType];
      results = results.filter((a) => {
        const ammoUnitTypes = a.allowedUnitTypes ?? [
          UnitType.BATTLEMECH,
          UnitType.VEHICLE,
          UnitType.AEROSPACE,
        ];
        return unitTypes.some((ut) => ammoUnitTypes.includes(ut));
      });
    }

    if (filter.hasFlags && filter.hasFlags.length > 0) {
      results = results.filter((a) => {
        const ammoFlags = a.flags ?? [];
        return filter.hasFlags!.every((flag) => ammoFlags.includes(flag));
      });
    }

    if (filter.excludeFlags && filter.excludeFlags.length > 0) {
      results = results.filter((a) => {
        const ammoFlags = a.flags ?? [];
        return !filter.excludeFlags!.some((flag) => ammoFlags.includes(flag));
      });
    }

    return results;
  }

  /**
   * Search electronics by filter
   */
  searchElectronics(filter: IEquipmentFilter): IElectronics[] {
    let results = this.getAllElectronics();

    if (filter.techBase) {
      const techBases = Array.isArray(filter.techBase)
        ? filter.techBase
        : [filter.techBase];
      results = results.filter((e) => techBases.includes(e.techBase));
    }

    if (filter.rulesLevel) {
      const levels = Array.isArray(filter.rulesLevel)
        ? filter.rulesLevel
        : [filter.rulesLevel];
      results = results.filter((e) => levels.includes(e.rulesLevel));
    }

    if (filter.maxYear !== undefined) {
      results = results.filter((e) => e.introductionYear <= filter.maxYear!);
    }

    if (filter.minYear !== undefined) {
      results = results.filter((e) => e.introductionYear >= filter.minYear!);
    }

    if (filter.searchText) {
      const search = filter.searchText.toLowerCase();
      results = results.filter(
        (e) =>
          e.name.toLowerCase().includes(search) ||
          e.id.toLowerCase().includes(search),
      );
    }

    if (filter.unitType) {
      const unitTypes = Array.isArray(filter.unitType)
        ? filter.unitType
        : [filter.unitType];
      results = results.filter((e) => {
        const elecUnitTypes = e.allowedUnitTypes ?? [
          UnitType.BATTLEMECH,
          UnitType.VEHICLE,
          UnitType.AEROSPACE,
        ];
        return unitTypes.some((ut) => elecUnitTypes.includes(ut));
      });
    }

    if (filter.hasFlags && filter.hasFlags.length > 0) {
      results = results.filter((e) => {
        const elecFlags = e.flags ?? [];
        return filter.hasFlags!.every((flag) => elecFlags.includes(flag));
      });
    }

    if (filter.excludeFlags && filter.excludeFlags.length > 0) {
      results = results.filter((e) => {
        const elecFlags = e.flags ?? [];
        return !filter.excludeFlags!.some((flag) => elecFlags.includes(flag));
      });
    }

    return results;
  }

  /**
   * Search misc equipment by filter
   */
  searchMiscEquipment(filter: IEquipmentFilter): IMiscEquipment[] {
    let results = this.getAllMiscEquipment();

    if (filter.techBase) {
      const techBases = Array.isArray(filter.techBase)
        ? filter.techBase
        : [filter.techBase];
      results = results.filter((m) => techBases.includes(m.techBase));
    }

    if (filter.rulesLevel) {
      const levels = Array.isArray(filter.rulesLevel)
        ? filter.rulesLevel
        : [filter.rulesLevel];
      results = results.filter((m) => levels.includes(m.rulesLevel));
    }

    if (filter.maxYear !== undefined) {
      results = results.filter((m) => m.introductionYear <= filter.maxYear!);
    }

    if (filter.minYear !== undefined) {
      results = results.filter((m) => m.introductionYear >= filter.minYear!);
    }

    if (filter.searchText) {
      const search = filter.searchText.toLowerCase();
      results = results.filter(
        (m) =>
          m.name.toLowerCase().includes(search) ||
          m.id.toLowerCase().includes(search),
      );
    }

    if (filter.unitType) {
      const unitTypes = Array.isArray(filter.unitType)
        ? filter.unitType
        : [filter.unitType];
      results = results.filter((m) => {
        const miscUnitTypes = m.allowedUnitTypes ?? [
          UnitType.BATTLEMECH,
          UnitType.VEHICLE,
          UnitType.AEROSPACE,
        ];
        return unitTypes.some((ut) => miscUnitTypes.includes(ut));
      });
    }

    if (filter.hasFlags && filter.hasFlags.length > 0) {
      results = results.filter((m) => {
        const miscFlags = m.flags ?? [];
        return filter.hasFlags!.every((flag) => miscFlags.includes(flag));
      });
    }

    if (filter.excludeFlags && filter.excludeFlags.length > 0) {
      results = results.filter((m) => {
        const miscFlags = m.flags ?? [];
        return !filter.excludeFlags!.some((flag) => miscFlags.includes(flag));
      });
    }

    return results;
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
