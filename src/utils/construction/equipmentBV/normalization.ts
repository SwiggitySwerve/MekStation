/**
 * Equipment BV Resolver - Normalization Logic
 *
 * Normalizes equipment IDs from various formats to canonical catalog IDs.
 * Handles MegaMek names, unit JSON formats, regex patterns, and direct aliases.
 */

import {
  loadEquipmentCatalog,
  loadNameMappings,
  getLowerMappingsCache,
  setLowerMappingsCache,
} from './catalogLoader';
import {
  ABBREVIATION_MAP,
  DIRECT_ALIAS_MAP,
  NORMALIZATION_PATTERNS,
} from './normalizationPatterns';

type EquipmentCatalogLookup = ReadonlyMap<string, unknown>;

function firstCatalogMatch(
  catalog: EquipmentCatalogLookup,
  candidates: readonly (string | undefined)[],
): string | undefined {
  return candidates.find(
    (candidate): candidate is string =>
      candidate !== undefined && catalog.has(candidate),
  );
}

function firstMappedCatalogMatch(
  catalog: EquipmentCatalogLookup,
  mappings: Record<string, string>,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const mapped = mappings[key];
    if (mapped && catalog.has(mapped)) return mapped;
  }
  return undefined;
}

function firstLowerMappedCatalogMatch(
  catalog: EquipmentCatalogLookup,
  mappings: ReadonlyMap<string, string>,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const mapped = mappings.get(key);
    if (mapped && catalog.has(mapped)) return mapped;
  }
  return undefined;
}

function firstDirectAliasCatalogMatch(
  catalog: EquipmentCatalogLookup,
  keys: readonly string[],
): string | undefined {
  return firstMappedCatalogMatch(catalog, DIRECT_ALIAS_MAP, keys);
}

function firstPatternCatalogMatch(
  catalog: EquipmentCatalogLookup,
  value: string,
): string | undefined {
  for (const [pattern, replacement] of NORMALIZATION_PATTERNS) {
    if (!value.match(pattern)) continue;
    const result = value.replace(pattern, replacement);
    if (catalog.has(result)) return result;
  }
  return undefined;
}

function clanPrefixCatalogMatch(
  catalog: EquipmentCatalogLookup,
  noSpaces: string,
  withoutPrefix: string,
  withoutPrefixHyphenated: string,
): string | undefined {
  if (!noSpaces.startsWith('cl')) return undefined;
  return firstCatalogMatch(catalog, [
    'clan-' + withoutPrefix,
    'clan-' + withoutPrefixHyphenated,
  ]);
}

export function normalizeEquipmentId(equipmentId: string): string {
  const catalog = loadEquipmentCatalog();
  const lower = equipmentId.toLowerCase().trim();
  const stripped = lower.replace(/^\d+-/, '').replace(/-\d+$/, '');

  const directCatalogId = firstCatalogMatch(catalog, [lower, stripped]);
  if (directCatalogId) return directCatalogId;

  const directAliasId = firstDirectAliasCatalogMatch(catalog, [
    stripped,
    lower,
  ]);
  if (directAliasId) return directAliasId;

  const nameMappings = loadNameMappings();
  const nameMappedId = firstMappedCatalogMatch(catalog, nameMappings, [
    equipmentId,
  ]);
  if (nameMappedId) return nameMappedId;

  const lowerMappings = getOrBuildLowerMappings(nameMappings);
  const lowerMappedId = firstLowerMappedCatalogMatch(catalog, lowerMappings, [
    stripped,
    lower,
  ]);
  if (lowerMappedId) return lowerMappedId;

  const abbreviationId = firstMappedCatalogMatch(catalog, ABBREVIATION_MAP, [
    stripped,
  ]);
  if (abbreviationId) return abbreviationId;

  const noSpaces = stripped.replace(/\s+/g, '');
  const hyphenated = noSpaces.replace(/([a-z])(\d)/g, '$1-$2');
  const compactId = firstCatalogMatch(catalog, [noSpaces, hyphenated]);
  if (compactId) return compactId;

  const compactPatternId = firstPatternCatalogMatch(catalog, noSpaces);
  if (compactPatternId) return compactPatternId;

  const withoutPrefix = noSpaces.replace(/^(is|cl)-?/, '');
  const withoutPrefixHyphenated = withoutPrefix.replace(
    /([a-z])(\d)/g,
    '$1-$2',
  );
  const unprefixedId = firstCatalogMatch(catalog, [
    withoutPrefix,
    withoutPrefixHyphenated,
  ]);
  if (unprefixedId) return unprefixedId;

  const clanId = clanPrefixCatalogMatch(
    catalog,
    noSpaces,
    withoutPrefix,
    withoutPrefixHyphenated,
  );
  if (clanId) return clanId;

  const unprefixedPatternId = firstPatternCatalogMatch(catalog, withoutPrefix);
  if (unprefixedPatternId) return unprefixedPatternId;

  const strippedOriginal = equipmentId
    .replace(/^\d+-/, '')
    .replace(/-\d+$/, '');
  if (strippedOriginal !== equipmentId) {
    const originalMappedId =
      firstMappedCatalogMatch(catalog, nameMappings, [strippedOriginal]) ??
      firstLowerMappedCatalogMatch(catalog, lowerMappings, [
        strippedOriginal.toLowerCase(),
      ]);
    if (originalMappedId) return originalMappedId;
  }

  return stripped || lower;
}

export function getOrBuildLowerMappings(
  nameMappings: Record<string, string>,
): Map<string, string> {
  let cache = getLowerMappingsCache();
  if (cache) return cache;

  cache = new Map();
  for (const [key, value] of Object.entries(nameMappings)) {
    cache.set(key.toLowerCase(), value);
  }
  setLowerMappingsCache(cache);
  return cache;
}
