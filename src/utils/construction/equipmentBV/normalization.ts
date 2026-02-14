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

export function normalizeEquipmentId(equipmentId: string): string {
  const catalog = loadEquipmentCatalog();
  const lower = equipmentId.toLowerCase().trim();

  if (catalog.has(lower)) return lower;

  const stripped = lower.replace(/^\d+-/, '').replace(/-\d+$/, '');
  if (catalog.has(stripped)) return stripped;

  if (DIRECT_ALIAS_MAP[stripped]) {
    const alias = DIRECT_ALIAS_MAP[stripped];
    if (catalog.has(alias)) return alias;
  }
  if (DIRECT_ALIAS_MAP[lower]) {
    const alias = DIRECT_ALIAS_MAP[lower];
    if (catalog.has(alias)) return alias;
  }

  const nameMappings = loadNameMappings();
  if (nameMappings[equipmentId]) {
    const mapped = nameMappings[equipmentId];
    if (catalog.has(mapped)) return mapped;
  }

  const lowerMappings = getOrBuildLowerMappings(nameMappings);
  const mappedFromLower =
    lowerMappings.get(stripped) ?? lowerMappings.get(lower);
  if (mappedFromLower && catalog.has(mappedFromLower)) return mappedFromLower;

  if (ABBREVIATION_MAP[stripped]) {
    const abbrev = ABBREVIATION_MAP[stripped];
    if (catalog.has(abbrev)) return abbrev;
  }

  const noSpaces = stripped.replace(/\s+/g, '');
  if (catalog.has(noSpaces)) return noSpaces;

  const hyphenated = noSpaces.replace(/([a-z])(\d)/g, '$1-$2');
  if (catalog.has(hyphenated)) return hyphenated;

  for (const [pattern, replacement] of NORMALIZATION_PATTERNS) {
    if (noSpaces.match(pattern)) {
      const result = noSpaces.replace(pattern, replacement);
      if (catalog.has(result)) return result;
    }
  }

  const withoutPrefix = noSpaces.replace(/^(is|cl)-?/, '');
  if (catalog.has(withoutPrefix)) return withoutPrefix;

  const withoutPrefixHyphenated = withoutPrefix.replace(
    /([a-z])(\d)/g,
    '$1-$2',
  );
  if (catalog.has(withoutPrefixHyphenated)) return withoutPrefixHyphenated;

  if (noSpaces.startsWith('cl')) {
    const clanId = 'clan-' + withoutPrefix;
    if (catalog.has(clanId)) return clanId;
    const clanIdHyphenated = 'clan-' + withoutPrefixHyphenated;
    if (catalog.has(clanIdHyphenated)) return clanIdHyphenated;
  }

  for (const [pattern, replacement] of NORMALIZATION_PATTERNS) {
    if (withoutPrefix.match(pattern)) {
      const result = withoutPrefix.replace(pattern, replacement);
      if (catalog.has(result)) return result;
    }
  }

  const strippedOriginal = equipmentId
    .replace(/^\d+-/, '')
    .replace(/-\d+$/, '');
  if (strippedOriginal !== equipmentId) {
    if (nameMappings[strippedOriginal]) {
      const mapped = nameMappings[strippedOriginal];
      if (catalog.has(mapped)) return mapped;
    }
    const mappedStripped = lowerMappings.get(strippedOriginal.toLowerCase());
    if (mappedStripped && catalog.has(mappedStripped)) return mappedStripped;
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
