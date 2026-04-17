/**
 * Unified SPA loader and query API.
 *
 * Public entry point for the canonical SPA catalog. Provides id lookup
 * (with legacy-alias resolution), category / pipeline / source filters,
 * and predicates consumers use for random selection and UI filtering.
 */

import type {
  ISPADefinition,
  SPACategory,
  SPAPipeline,
  SPASource,
} from '@/types/spa/SPADefinition';

import {
  CANONICAL_SPA_CATALOG,
  CANONICAL_SPA_LIST,
  SPA_LEGACY_ALIASES,
} from './canonicalCatalog';

// Precompute alias map for O(1) legacy-id resolution.
const LEGACY_ID_MAP: ReadonlyMap<string, string> = new Map(
  SPA_LEGACY_ALIASES.map((a) => [a.legacyId, a.canonicalId]),
);

/**
 * Resolve an SPA id. Returns the canonical id if the input is already
 * canonical; otherwise looks up the legacy alias table; returns null if
 * the id is unknown in either form.
 */
export function resolveSPAId(rawId: string): string | null {
  if (CANONICAL_SPA_CATALOG[rawId]) return rawId;
  return LEGACY_ID_MAP.get(rawId) ?? null;
}

/**
 * Look up a definition by id. Accepts canonical or legacy ids and returns
 * null when the id is unknown — callers that want to throw should assert.
 */
export function getSPADefinition(rawId: string): ISPADefinition | null {
  const canonicalId = resolveSPAId(rawId);
  if (!canonicalId) return null;
  return CANONICAL_SPA_CATALOG[canonicalId] ?? null;
}

/** All SPA definitions in catalog order. */
export function getAllSPAs(): readonly ISPADefinition[] {
  return CANONICAL_SPA_LIST;
}

/** Filter the catalog by category. */
export function getSPAsByCategory(
  category: SPACategory,
): readonly ISPADefinition[] {
  return CANONICAL_SPA_LIST.filter((spa) => spa.category === category);
}

/** Filter the catalog by source rulebook. */
export function getSPAsBySource(source: SPASource): readonly ISPADefinition[] {
  return CANONICAL_SPA_LIST.filter((spa) => spa.source === source);
}

/** Filter the catalog by the combat pipeline an SPA affects. */
export function getSPAsForPipeline(
  pipeline: SPAPipeline,
): readonly ISPADefinition[] {
  return CANONICAL_SPA_LIST.filter((spa) => spa.pipelines.includes(pipeline));
}

/** All purchasable SPAs (xpCost is non-null) excluding flaws. */
export function getPurchasableSPAs(): readonly ISPADefinition[] {
  return CANONICAL_SPA_LIST.filter((spa) => spa.xpCost !== null && !spa.isFlaw);
}

/** All flaws — separated so they can be weighted independently in rolls. */
export function getFlaws(): readonly ISPADefinition[] {
  return CANONICAL_SPA_LIST.filter((spa) => spa.isFlaw);
}

/** All origin-only abilities — not available via normal advancement. */
export function getOriginOnlySPAs(): readonly ISPADefinition[] {
  return CANONICAL_SPA_LIST.filter((spa) => spa.isOriginOnly);
}

/** True when every id in `abilities` resolves to a canonical SPA. */
export function areSPAIdsValid(abilities: readonly string[]): boolean {
  return abilities.every((id) => resolveSPAId(id) !== null);
}

/** Map a list of (possibly legacy) ids to their canonical forms, dropping unknowns. */
export function canonicalizeSPAIds(
  abilities: readonly string[],
): readonly string[] {
  const out: string[] = [];
  for (const id of abilities) {
    const canon = resolveSPAId(id);
    if (canon) out.push(canon);
  }
  return out;
}

// Re-export the raw data structures for consumers that need them.
export {
  CANONICAL_SPA_CATALOG,
  CANONICAL_SPA_LIST,
  SPA_LEGACY_ALIASES,
} from './canonicalCatalog';
export type {
  ISPADefinition,
  ISPAIdAlias,
  SPACategory,
  SPAPipeline,
  SPASource,
  SPADesignationType,
} from '@/types/spa/SPADefinition';
