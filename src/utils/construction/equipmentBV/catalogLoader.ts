/**
 * Equipment BV Resolver - Catalog Loading
 *
 * Loads and caches equipment catalog data from bundled JSON files.
 * Provides initialization and reset functions for testing and browser contexts.
 */

import {
  AMMUNITION_CATALOG_FILES,
  ELECTRONICS_CATALOG_FILES,
  MISCELLANEOUS_CATALOG_FILES,
  NAME_MAPPINGS_DATA,
  WEAPON_CATALOG_FILES,
} from './catalogData';
import type {
  EquipmentCatalogEntry,
  NameMappingsSource,
  RawCatalogFile,
} from './types';

let catalogCache: Map<string, EquipmentCatalogEntry> | null = null;
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
    subType: typeof item.subType === 'string' ? item.subType : undefined,
    damage:
      typeof item.damage === 'number' || typeof item.damage === 'string'
        ? item.damage
        : undefined,
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

  const source = NAME_MAPPINGS_DATA as NameMappingsSource;
  const mappings: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
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

  for (const file of AMMUNITION_CATALOG_FILES) {
    appendCatalogFile(catalog, file, false);
  }

  catalogCache = catalog;
  return catalog;
}

export function resetCatalogCache(): void {
  catalogCache = null;
  nameMappingsCache = null;
  lowerMappingsCache = null;
  loggedUnresolvable.clear();
}

export function initializeCatalog(
  entries: EquipmentCatalogEntry[],
  nameMappings?: Record<string, string>,
): void {
  catalogCache = new Map();
  for (const entry of entries) {
    catalogCache.set(entry.id, entry);
  }
  if (nameMappings) {
    nameMappingsCache = nameMappings;
  }
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

export function setLowerMappingsCache(
  cache: Map<string, string> | null,
): void {
  lowerMappingsCache = cache;
}
