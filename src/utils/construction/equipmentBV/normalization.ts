/**
 * Equipment BV Resolver - Normalization Logic
 *
 * Normalizes equipment IDs from various formats to canonical catalog IDs.
 * Handles MegaMek names, unit JSON formats, regex patterns, and direct aliases.
 */

import {
  loadCatalogForEquipmentId,
  isAmmunitionEquipmentId,
  loadNameMappings,
  getLowerMappingsCache,
  setLowerMappingsCache,
} from './catalogLoader';
import {
  ABBREVIATION_MAP,
  AMMUNITION_NORMALIZATION_PATTERNS,
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
  patterns = NORMALIZATION_PATTERNS,
): string | undefined {
  for (const [pattern, replacement] of patterns) {
    if (!value.match(pattern)) continue;
    const result = value.replace(pattern, replacement);
    const clanId = clanPrefixCatalogMatch(catalog, value, [result]);
    if (clanId) return clanId;
    if (catalog.has(result)) return result;
  }
  return undefined;
}

function clanPrefixCatalogMatch(
  catalog: EquipmentCatalogLookup,
  noSpaces: string,
  candidates: readonly string[],
): string | undefined {
  if (!noSpaces.startsWith('cl')) return undefined;
  return firstCatalogMatch(
    catalog,
    candidates.map((candidate) => 'clan-' + candidate),
  );
}

export function normalizeEquipmentId(
  equipmentId: string,
  catalog: EquipmentCatalogLookup = loadCatalogForEquipmentId(equipmentId),
): string {
  const rawLower = equipmentId.toLowerCase().trim();
  // BLK (ST)/(R) mount markers become these spellings in converter IDs.
  const lower = catalog.has(rawLower)
    ? rawLower
    : rawLower
        .replace(/:omni$/, '')
        .replace(/^r-/, '')
        .replace(/st$/, '');
  const stripped = lower.replace(/^\d+-/, '').replace(/-\d+$/, '');

  // Preserve rack numbers and tech/munition variants before general instance-ID
  // stripping. A failed ammo lookup must never become a weapon lookup.
  if (isAmmunitionEquipmentId(lower)) {
    const ammoToken = lower.replace(/[\s/]+/g, '-');
    const resolved =
      firstCatalogMatch(catalog, [lower]) ??
      firstCatalogMatch(catalog, [ammoToken]) ??
      firstDirectAliasCatalogMatch(catalog, [lower]) ??
      firstLowerMappedCatalogMatch(
        catalog,
        getOrBuildLowerMappings(loadNameMappings()),
        [lower],
      ) ??
      firstDirectAliasCatalogMatch(catalog, [ammoToken]) ??
      firstPatternCatalogMatch(
        catalog,
        ammoToken,
        AMMUNITION_NORMALIZATION_PATTERNS,
      );
    if (resolved) return resolved;
    if (stripped !== lower) {
      const instanceId = normalizeEquipmentId(stripped, catalog);
      if (catalog.has(instanceId)) return instanceId;
    }
    return lower;
  }

  const directCatalogId = firstCatalogMatch(catalog, [
    lower,
    stripped,
    lower.replace(/^is-/, ''),
  ]);
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

  const withoutPrefix = noSpaces.replace(/^(is|cl)-?/, '');
  const withoutPrefixHyphenated = withoutPrefix.replace(
    /([a-z])(\d)/g,
    '$1-$2',
  );
  const clanId = clanPrefixCatalogMatch(catalog, noSpaces, [
    withoutPrefix,
    withoutPrefixHyphenated,
  ]);
  if (clanId) return clanId;

  const compactPatternId = firstPatternCatalogMatch(catalog, noSpaces);
  if (compactPatternId) return compactPatternId;

  const unprefixedId = firstCatalogMatch(catalog, [
    withoutPrefix,
    withoutPrefixHyphenated,
  ]);
  if (unprefixedId) return unprefixedId;

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
