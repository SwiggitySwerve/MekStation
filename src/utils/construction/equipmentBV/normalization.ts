/**
 * Equipment BV Resolver - Normalization Logic
 *
 * Normalizes equipment IDs from various formats to canonical catalog IDs.
 * Handles MegaMek names, unit JSON formats, regex patterns, and direct aliases.
 */

import {
  isLegacyEquipmentId,
  registryPreviousId,
  resolveRegistryId,
} from '../equipmentBVCatalogData';
import {
  loadCatalogForEquipmentId,
  loadEquipmentCatalog,
  isAmmunitionEquipmentId,
  loadNameMappings,
  getLowerMappingsCache,
  setLowerMappingsCache,
} from './catalogLoader';
import {
  ABBREVIATION_MAP,
  AMMUNITION_NORMALIZATION_PATTERNS,
  DIRECT_ALIAS_MAP,
  BV_MOUNT_QUALIFIERS,
  BV_MOUNT_MARKERS,
  BV_AMMO_QUANTITY,
  NORMALIZATION_PATTERNS,
} from './normalizationPatterns';
import { nativeIdentityId } from './sourceLookupAliases';

type EquipmentCatalogLookup = ReadonlyMap<string, unknown>;
/** MtfFile.java:1210-1211; BLKFile.java:248-249 (48fcb2f64). */
export function normalizeNativeEquipmentName(
  equipmentName: string,
  includeRegistry = true,
): string {
  const nativeId = resolveRegistryId(equipmentName);
  const weapons = loadEquipmentCatalog();
  return normalizeEquipmentId(
    equipmentName,
    nativeId && weapons.has(nativeId)
      ? weapons
      : loadCatalogForEquipmentId(equipmentName),
    includeRegistry,
  );
}

const legacyCatalogs = new WeakMap<object, EquipmentCatalogLookup>();
function firstCatalogMatch(
  catalog: EquipmentCatalogLookup,
  candidates: readonly (string | undefined)[],
): string | undefined {
  return candidates.find(
    (candidate): candidate is string =>
      candidate !== undefined && catalog.has(candidate),
  );
}

function mappedCatalogId(
  catalog: EquipmentCatalogLookup,
  id: string | undefined,
  name: string,
): string | undefined {
  const target = id && (catalog.has(id) ? id : registryPreviousId(id, name));
  return target && catalog.has(target) ? target : undefined;
}

function firstMappedCatalogMatch(
  catalog: EquipmentCatalogLookup,
  mappings: Record<string, string>,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const mapped = mappedCatalogId(catalog, mappings[key], key);
    if (mapped) return mapped;
  }
  return undefined;
}

function firstLowerMappedCatalogMatch(
  catalog: EquipmentCatalogLookup,
  mappings: ReadonlyMap<string, string>,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const mapped = mappedCatalogId(catalog, mappings.get(key), key);
    if (mapped) return mapped;
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

function getLegacyCatalog(fullCatalog: EquipmentCatalogLookup) {
  const catalog =
    legacyCatalogs.get(fullCatalog) ??
    new Map([...fullCatalog].filter(([id]) => isLegacyEquipmentId(id)));
  legacyCatalogs.set(fullCatalog, catalog);
  return catalog;
}

function getEquipmentLookupTokens(
  equipmentId: string,
  catalog: EquipmentCatalogLookup,
) {
  const rawLower = equipmentId.toLowerCase().trim();
  // BLK qualifiers describe the mount, not its EquipmentType.
  const qualifiedBase = rawLower.replace(BV_MOUNT_QUALIFIERS, '');
  const base = isAmmunitionEquipmentId(qualifiedBase)
    ? qualifiedBase.replace(BV_AMMO_QUANTITY, '')
    : qualifiedBase;
  // BLK mount markers occur in native tokens and converted IDs.
  const lookupBase = catalog.has(base)
    ? base
    : base.replace(BV_MOUNT_MARKERS, '');
  const lower = catalog.has(rawLower)
    ? rawLower
    : catalog.has(lookupBase) ||
        firstDirectAliasCatalogMatch(catalog, [lookupBase])
      ? lookupBase
      : lookupBase.replace(/(?:-?\((?:st|pt)\)|-?(?:st|pt))$/, '').trim();
  return { rawLower, lookupBase, lower };
}

/** Retain exact catalog IDs while removing native mount decorators for lookup. */
export function getNativeEquipmentLookupToken(equipmentId: string): string {
  return getEquipmentLookupTokens(
    equipmentId,
    getLegacyCatalog(loadCatalogForEquipmentId(equipmentId)),
  ).lower;
}

/**
 * The decorated Inner Sphere machine-gun-array mounts (ISMGA, ISLMGA, ISHMGA)
 * whose weight lookup must drop the `(ST)` sponson and `:OMNI` decorators
 * first: the BV catalog matches them by name to a 0.25 t stub, where MegaMek
 * loads the plain array (0.5 t each: ISMGA.java:70-83, ISLightMGA.java:69-82,
 * ISHeavyMGA.java:70-83 at 48fcb2f64). Clan arrays already resolve to the same
 * 0.25 t entry with or without the decorator, so they stay out.
 */
const NATIVE_WEIGHT_TOKEN_MOUNT = /^is[lh]?mga(?:\(st\)(?::omni)?|:omni)$/i;

/**
 * The single token the weight owners resolve a native mount through. Every
 * other mount keeps its source token, so public equipment identities and every
 * non-array lookup are unchanged.
 */
export function getNativeWeightLookupToken(equipmentId: string): string {
  return NATIVE_WEIGHT_TOKEN_MOUNT.test(equipmentId)
    ? getNativeEquipmentLookupToken(equipmentId)
    : equipmentId;
}

export function normalizeEquipmentId(
  equipmentId: string,
  catalog: EquipmentCatalogLookup = loadCatalogForEquipmentId(equipmentId),
  includeRegistry = true,
): string {
  const fullCatalog = catalog;
  catalog = getLegacyCatalog(fullCatalog);
  const { rawLower, lookupBase, lower } = getEquipmentLookupTokens(
    equipmentId,
    catalog,
  );
  const explicit = resolveRegistryId(lower);
  const generated =
    includeRegistry && explicit && fullCatalog.has(explicit)
      ? explicit
      : undefined;
  if (generated && registryPreviousId(generated, lower)) return generated;
  const registryAlias = DIRECT_ALIAS_MAP[lower];
  if (
    includeRegistry &&
    registryAlias &&
    resolveRegistryId(registryAlias) === registryAlias &&
    fullCatalog.has(registryAlias)
  )
    return registryAlias;
  const identity = nativeIdentityId(lookupBase);
  if (!catalog.has(rawLower) && identity && catalog.has(identity))
    return identity;
  const stripped = lower.replace(/^\d+-/, '').replace(/-\d+$/, '');

  // Preserve rack numbers and tech/munition variants before general instance-ID
  // stripping. A failed ammo lookup must never become a weapon lookup.
  if (isAmmunitionEquipmentId(lower)) {
    const ammoToken = lower.replace(/\s*-\s*/g, '-').replace(/[\s/]+/g, '-');
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
    return generated ?? lower;
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

  const fallback = stripped || lower;
  return generated ?? (isLegacyEquipmentId(fallback) ? fallback : rawLower);
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
