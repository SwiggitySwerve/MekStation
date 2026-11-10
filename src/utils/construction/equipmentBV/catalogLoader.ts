import type { EquipmentCatalogEntry, RawCatalogFile } from './types';
/**
 * Equipment BV Resolver - Catalog Loading
 *
 * Loads and caches equipment catalog data from bundled JSON files.
 * Provides initialization and reset functions for testing and browser contexts.
 */

import { resolveRegistryId } from '../equipmentBVCatalogData';
import {
  AMMUNITION_CATALOG_FILES,
  ELECTRONICS_CATALOG_FILES,
  MISCELLANEOUS_CATALOG_FILES,
  NAME_MAPPINGS_DATA,
  WEAPON_CATALOG_FILES,
} from './catalogData';
import capitalBVFacts from './data/capital-bv.json';
import {
  BV_MOUNT_QUALIFIERS,
  BV_MOUNT_MARKERS,
  BV_AMMO_QUANTITY,
} from './normalizationPatterns';

let catalogCache: Map<string, EquipmentCatalogEntry> | null = null;
let ammunitionCache: Map<string, EquipmentCatalogEntry> | null = null;
let nameMappingsCache: Record<string, string> | null = null;
let lowerMappingsCache: Map<string, string> | null = null;
const loggedUnresolvable = new Set<string>();

function toCatalogEntry(
  item: Record<string, unknown>,
): EquipmentCatalogEntry | null {
  if (
    typeof item.id !== 'string' ||
    typeof item.name !== 'string' ||
    typeof item.category !== 'string' ||
    typeof item.techBase !== 'string'
  ) {
    return null;
  }

  return {
    id: item.id,
    name: item.name,
    category: item.category,
    techBase: item.techBase,
    battleValue: typeof item.battleValue === 'number' ? item.battleValue : 0,
    heat: typeof item.heat === 'number' ? item.heat : undefined,
    weight: typeof item.weight === 'number' ? item.weight : undefined,
    criticalSlots:
      typeof item.criticalSlots === 'number' ? item.criticalSlots : undefined,
    special: Array.isArray(item.special)
      ? item.special.filter(
          (value): value is string => typeof value === 'string',
        )
      : undefined,
    variableEquipmentId:
      typeof item.variableEquipmentId === 'string'
        ? item.variableEquipmentId
        : undefined,
    subType: typeof item.subType === 'string' ? item.subType : undefined,
    shotsPerTon:
      typeof item.shotsPerTon === 'number' ? item.shotsPerTon : undefined,
    damage:
      typeof item.damage === 'number' || typeof item.damage === 'string'
        ? item.damage
        : undefined,
    ...(typeof item.introductionYear === 'number'
      ? { introductionYear: item.introductionYear }
      : {}),
    ...(Array.isArray(item.allowedUnitTypes)
      ? {
          allowedUnitTypes: item.allowedUnitTypes.filter(
            (value): value is string => typeof value === 'string',
          ),
        }
      : {}),
  };
}

function appendCatalogFile(
  catalog: Map<string, EquipmentCatalogEntry>,
  file: RawCatalogFile,
  overwriteExisting: boolean,
): void {
  if (!Array.isArray(file.items)) {
    return;
  }

  for (const item of file.items) {
    const normalized = toCatalogEntry(item);
    if (!normalized) {
      continue;
    }
    if (!overwriteExisting && catalog.has(normalized.id)) {
      continue;
    }
    catalog.set(normalized.id, normalized);
  }
}

export function loadNameMappings(): Record<string, string> {
  if (nameMappingsCache) return nameMappingsCache;

  // NAME_MAPPINGS_DATA is already validated as NameMappingsSource via
  // parseNameMappings at module load (see equipmentBVCatalogData.ts).
  const mappings: Record<string, string> = {};
  for (const [key, value] of Object.entries(NAME_MAPPINGS_DATA)) {
    if (key === '$schema') {
      continue;
    }
    if (typeof value === 'string') {
      mappings[key] = value;
    }
  }

  nameMappingsCache = mappings;
  return mappings;
}

export function loadEquipmentCatalog(): Map<string, EquipmentCatalogEntry> {
  if (catalogCache) return catalogCache;

  const catalog = new Map<string, EquipmentCatalogEntry>();

  for (const file of WEAPON_CATALOG_FILES) {
    appendCatalogFile(catalog, file, true);
  }

  for (const file of ELECTRONICS_CATALOG_FILES) {
    appendCatalogFile(catalog, file, false);
  }

  for (const file of MISCELLANEOUS_CATALOG_FILES) {
    appendCatalogFile(catalog, file, false);
  }

  catalogCache = catalog;
  return catalog;
}

export function resetCatalogCache(): void {
  catalogCache = null;
  ammunitionCache = null;
  nameMappingsCache = null;
  lowerMappingsCache = null;
  loggedUnresolvable.clear();
}

export function initializeCatalog(
  entries: EquipmentCatalogEntry[],
  nameMappings?: Record<string, string>,
  ammunitionEntries: EquipmentCatalogEntry[] = [],
): void {
  catalogCache = new Map();
  // Explicit generic entries keep precedence over ammunition with the same ID.
  for (const entry of entries) {
    catalogCache.set(entry.id, entry);
  }
  ammunitionCache = new Map(
    ammunitionEntries.map((entry) => [entry.id, entry]),
  );
  if (nameMappings) {
    nameMappingsCache = nameMappings;
    lowerMappingsCache = null;
  }
}

export function loadAmmunitionCatalog(): Map<string, EquipmentCatalogEntry> {
  if (ammunitionCache) return ammunitionCache;

  const catalog = new Map<string, EquipmentCatalogEntry>();
  for (const file of AMMUNITION_CATALOG_FILES) {
    appendCatalogFile(catalog, file, false);
  }
  ammunitionCache = catalog;
  return catalog;
}

/** Ammo and weapons can share an ID (for example mrm-20) in the source files. */
export function isAmmunitionEquipmentId(equipmentId: string): boolean {
  const registryId = resolveRegistryId(
    equipmentId
      .toLowerCase()
      .trim()
      .replace(BV_MOUNT_QUALIFIERS, '')
      .replace(BV_MOUNT_MARKERS, '')
      .replace(BV_AMMO_QUANTITY, ''),
  );
  // ISBPod.java:49-53 (48fcb2f64) registers B-Pods as a WeaponType.
  return (
    /ammo/i.test(equipmentId) ||
    (registryId !== undefined && loadAmmunitionCatalog().has(registryId)) ||
    (/pods/i.test(equipmentId) && !/\bb-pods\b/i.test(equipmentId))
  );
}

export function loadCatalogForEquipmentId(
  equipmentId: string,
): Map<string, EquipmentCatalogEntry> {
  const key = equipmentId.toLowerCase().trim();
  const equipment = loadEquipmentCatalog();
  if (equipment.has(key)) return equipment;
  const ammunition = loadAmmunitionCatalog();
  if (ammunition.has(key)) return ammunition;
  return isAmmunitionEquipmentId(equipmentId)
    ? loadAmmunitionCatalog()
    : loadEquipmentCatalog();
}

export function getLoggedUnresolvable(): Set<string> {
  return loggedUnresolvable;
}

export function getCatalogCache(): Map<string, EquipmentCatalogEntry> | null {
  return catalogCache;
}

export function getNameMappingsCache(): Record<string, string> | null {
  return nameMappingsCache;
}

export function getLowerMappingsCache(): Map<string, string> | null {
  return lowerMappingsCache;
}

export function setLowerMappingsCache(cache: Map<string, string> | null): void {
  lowerMappingsCache = cache;
}

export interface ICapitalEquipmentBVFacts {
  readonly isCapital?: boolean;
  readonly isSubCapital?: boolean;
  readonly isScreen?: boolean;
  readonly damageByRange?: readonly number[];
  readonly source: string;
  readonly ammoType: string;
  readonly rackSize: number;
}
const CAPITAL_BV_FACTS: ReadonlyMap<string, ICapitalEquipmentBVFacts> = new Map(
  Object.entries(capitalBVFacts),
);

/** Native capital scale and ammo keys, generated from MegaMek 48fcb2f64. */
export function getCapitalEquipmentBVFacts(
  id: string,
): ICapitalEquipmentBVFacts | undefined {
  return CAPITAL_BV_FACTS.get(id);
}
