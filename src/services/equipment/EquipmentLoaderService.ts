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
  AmmunitionContract,
  ElectronicsContract,
  MiscEquipmentContract,
  PhysicalWeaponContract,
  WeaponContract,
} from '@/types/contracts';
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
 * One-line summary of a Zod schema for use in dev-loader log lines.
 *
 * The `safeParse` API is structural so we treat each contract as an
 * opaque parser keyed by a human-readable label.
 */
interface IShapeValidator {
  readonly label: string;
  readonly safeParse: (item: unknown) => {
    success: boolean;
    error?: {
      issues: readonly {
        path: ReadonlyArray<string | number>;
        message: string;
      }[];
    };
  };
}

/**
 * Map per-shape `$schema`-filename suffix to the matching contract.
 *
 * Used by `detectShapeValidator` to pick the right Zod schema for an
 * equipment file. Ammunition files in the corpus today don't carry a
 * `$schema` reference, so the loader falls back to the per-loop default
 * (see `validateShapeFromFile`). New shapes only need an entry here
 * plus a default-fallback in the call site.
 */
const SHAPE_VALIDATORS_BY_SCHEMA_FILE: Record<string, IShapeValidator> = {
  'weapon-schema.json': {
    label: 'WeaponContract',
    safeParse: WeaponContract.safeParse.bind(
      WeaponContract,
    ) as IShapeValidator['safeParse'],
  },
  'physical-weapon-schema.json': {
    label: 'PhysicalWeaponContract',
    safeParse: PhysicalWeaponContract.safeParse.bind(
      PhysicalWeaponContract,
    ) as IShapeValidator['safeParse'],
  },
  'ammunition-schema.json': {
    label: 'AmmunitionContract',
    safeParse: AmmunitionContract.safeParse.bind(
      AmmunitionContract,
    ) as IShapeValidator['safeParse'],
  },
  'electronics-schema.json': {
    label: 'ElectronicsContract',
    safeParse: ElectronicsContract.safeParse.bind(
      ElectronicsContract,
    ) as IShapeValidator['safeParse'],
  },
  'misc-equipment-schema.json': {
    label: 'MiscEquipmentContract',
    safeParse: MiscEquipmentContract.safeParse.bind(
      MiscEquipmentContract,
    ) as IShapeValidator['safeParse'],
  },
};

/**
 * Resolve a contract validator from an `IEquipmentFile.$schema` reference.
 *
 * Returns `undefined` when the file has no `$schema` or the suffix isn't
 * mapped — callers can pass an explicit `fallback` validator (typical
 * for ammunition files which omit the header) so the gate still runs.
 */
function detectShapeValidator(
  schemaRef: string | undefined,
): IShapeValidator | undefined {
  if (!schemaRef) return undefined;
  const fileName = schemaRef.split(/[\\/]/).pop() ?? schemaRef;
  return SHAPE_VALIDATORS_BY_SCHEMA_FILE[fileName];
}

/**
 * Validate every item in an equipment file against a contract.
 *
 * Behaviour:
 *  - Default: collect failures and emit a single `console.warn`
 *    summarising drift. Non-throwing because the corpus may still have
 *    minor known gaps (e.g. 6 X-Pulse / VSP entries pre-PR-A2 missed
 *    `costCBills`). The `--strict` schema-bridge CI gate is the
 *    enforcement layer; this dev-loader gate is just an early signal.
 *  - `MEKSTATION_STRICT_SCHEMA_BRIDGE=1`: throw with an aggregated
 *    error message. Useful for one-off `npx jest` runs where you want
 *    to fail fast on any new drift introduced by a code change.
 *
 * Dev/test only — production callers never reach this code path because
 * every consumer wraps the call in `process.env.NODE_ENV !== 'production'`.
 */
function validateShape(
  validator: IShapeValidator,
  fileLabel: string,
  items: readonly unknown[],
): void {
  // Collect ALL failures rather than throwing on the first so the dev
  // gets one clear list per file rather than a death-by-a-thousand-cuts.
  const failures: string[] = [];
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const result = validator.safeParse(item);
    if (!result.success) {
      const id = (item as { id?: unknown } | null | undefined)?.id ?? '<no id>';
      const issuePaths = (result.error?.issues ?? [])
        .slice(0, 3)
        .map(
          (issue) =>
            `${issue.path.map(String).join('.') || '<root>'}: ${issue.message}`,
        )
        .join('; ');
      failures.push(`  [${index}] id=${String(id)} -> ${issuePaths}`);
    }
  }
  if (failures.length === 0) return;

  const message =
    `EquipmentLoaderService: ${failures.length} item(s) in ${fileLabel} ` +
    `failed ${validator.label}.safeParse:\n${failures.slice(0, 8).join('\n')}` +
    (failures.length > 8 ? `\n... and ${failures.length - 8} more` : '');

  if (process.env.MEKSTATION_STRICT_SCHEMA_BRIDGE === '1') {
    throw new Error(message);
  }
  // Non-strict default: surface drift loudly without breaking dev runs.
  // eslint-disable-next-line no-console
  console.warn(`[schema-bridge] ${message}`);
}

/**
 * Run the dev-loader schema gate for a single equipment file.
 *
 * Resolves the contract from the file's `$schema` header and falls back
 * to `defaultValidator` when the header is missing (ammunition today)
 * or points at an unknown shape. No-ops in production builds.
 */
function validateShapeFromFile(
  fileLabel: string,
  fileSchemaRef: string | undefined,
  items: readonly unknown[],
  defaultValidator: IShapeValidator,
): void {
  if (process.env.NODE_ENV === 'production') return;
  const validator = detectShapeValidator(fileSchemaRef) ?? defaultValidator;
  validateShape(validator, fileLabel, items);
}

// Pre-bound shape validators reused by the loader loops. Defined once so
// every call site lands on the same `IShapeValidator` object identity
// (cheap value, but clearer in profiles than ad-hoc literals). The
// physical-weapon shape is reachable via `detectShapeValidator` for
// files in the weapons/ directory carrying `physical-weapon-schema.json`,
// so it doesn't need its own pre-bound constant.
const WEAPON_SHAPE = SHAPE_VALIDATORS_BY_SCHEMA_FILE['weapon-schema.json'];
const AMMUNITION_SHAPE =
  SHAPE_VALIDATORS_BY_SCHEMA_FILE['ammunition-schema.json'];
const ELECTRONICS_SHAPE =
  SHAPE_VALIDATORS_BY_SCHEMA_FILE['electronics-schema.json'];
const MISC_EQUIPMENT_SHAPE =
  SHAPE_VALIDATORS_BY_SCHEMA_FILE['misc-equipment-schema.json'];

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
          // Cross-language schema-bridge gate.
          //
          // In dev/test we round-trip every item through the canonical
          // contract before handing it to the per-shape converter. This
          // is the TypeScript-side mirror of `schema_gate.validate_*` in
          // Python; together they catch silent shape drift between the
          // writer and reader sides at first contact.
          //
          // Production builds skip this cost. The CI `schema-bridge`
          // job already gates merges on corpus conformance via the
          // `--shape all --strict` Python harness, so re-parsing at
          // runtime in production buys nothing but allocations.
          //
          // The weapons/ directory holds two shapes: WeaponContract for
          // ranged weapons (energy-laser.json etc.) and
          // PhysicalWeaponContract for physical.json. The default-
          // validator argument matches the directory's "primary" shape;
          // file-level `$schema` headers re-route per-file when present.
          validateShapeFromFile(
            weaponFile,
            weaponData.$schema,
            weaponData.items,
            WEAPON_SHAPE,
          );
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
          // Schema-bridge gate. Ammunition files in the corpus today don't
          // carry `$schema` headers, so the default validator
          // (`AmmunitionContract`) handles the entire directory.
          validateShapeFromFile(
            ammoFile,
            ammoData.$schema,
            ammoData.items,
            AMMUNITION_SHAPE,
          );
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
          // Schema-bridge gate. Electronics files all carry
          // `$schema: ../../_schema/electronics-schema.json` so the
          // default-validator argument is more of a safety net than a
          // primary code path.
          validateShapeFromFile(
            elecFile,
            electronicsData.$schema,
            electronicsData.items,
            ELECTRONICS_SHAPE,
          );
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
          // Schema-bridge gate. Misc files all carry
          // `$schema: ../../_schema/misc-equipment-schema.json`.
          validateShapeFromFile(
            miscFile,
            miscData.$schema,
            miscData.items,
            MISC_EQUIPMENT_SHAPE,
          );
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
