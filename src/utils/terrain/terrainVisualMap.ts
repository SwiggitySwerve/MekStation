/**
 * Terrain Visual Map
 *
 * Resolves a terrain `(type, level)` pair to a visual key identifying the
 * art asset and to the public URL of the homemade SVG asset.
 *
 * @spec openspec/changes/add-terrain-rendering/specs/terrain-rendering/spec.md
 * @spec openspec/changes/add-terrain-rendering/specs/terrain-system/spec.md
 *
 * Design note (D1): the `TerrainType` enum has single `Building` and
 * `Water` entries with a numeric `level` field; we derive density-based
 * visual keys from (type, level) so we don't have to widen the enum.
 * Building level 1 -> light, 2 -> medium, 3 -> heavy, 4+ -> hardened.
 * Water level 0..1 -> shallow, 2+ -> deep.
 */

import { TerrainType } from '@/types/gameplay/TerrainTypes';

/**
 * All visual keys this project ships art for. Exhaustive list used by
 * spec-compliance tests and the symbol-defs component.
 */
export type TerrainVisualKey =
  | 'clear'
  | 'light-woods'
  | 'heavy-woods'
  | 'light-building'
  | 'medium-building'
  | 'heavy-building'
  | 'hardened-building'
  | 'shallow-water'
  | 'deep-water'
  | 'rough'
  | 'rubble'
  | 'pavement';

/**
 * Ordered list of every visual key we render. Exposed for the symbol
 * defs component so it can emit one `<symbol>` per key.
 */
export const TERRAIN_VISUAL_KEYS: readonly TerrainVisualKey[] = [
  'clear',
  'light-woods',
  'heavy-woods',
  'light-building',
  'medium-building',
  'heavy-building',
  'hardened-building',
  'shallow-water',
  'deep-water',
  'rough',
  'rubble',
  'pavement',
] as const;

/**
 * Map each visual key to the public URL of its SVG asset. The asset
 * lives on disk at `public/sprites/terrain/<key>.svg`. Next.js serves
 * the `public/` folder at root, so the URL is stable at
 * `/sprites/terrain/<key>.svg`.
 *
 * Why: spec requires the asset to live under `public/sprites/terrain/`
 * so it is also reachable externally (storybook, docs, future
 * exports). Runtime rendering prefers the inline symbol (D2) for
 * performance — this URL exists to satisfy the spec contract and as a
 * fallback loader.
 */
export const TERRAIN_VISUAL_ASSET_URLS: Readonly<
  Record<TerrainVisualKey, string>
> = {
  clear: '/sprites/terrain/clear.svg',
  'light-woods': '/sprites/terrain/light-woods.svg',
  'heavy-woods': '/sprites/terrain/heavy-woods.svg',
  'light-building': '/sprites/terrain/light-building.svg',
  'medium-building': '/sprites/terrain/medium-building.svg',
  'heavy-building': '/sprites/terrain/heavy-building.svg',
  'hardened-building': '/sprites/terrain/hardened-building.svg',
  'shallow-water': '/sprites/terrain/shallow-water.svg',
  'deep-water': '/sprites/terrain/deep-water.svg',
  rough: '/sprites/terrain/rough.svg',
  rubble: '/sprites/terrain/rubble.svg',
  pavement: '/sprites/terrain/pavement.svg',
};

/**
 * Resolve a terrain feature's visual key from `(type, level)`.
 *
 * Returns `null` for terrain types this change does not ship art for
 * (sand, mud, snow, ice, swamp, road, bridge, fire, smoke). Callers
 * should fall back to the Phase 1 MVP flat color for those types.
 */
export function visualKeyFor(
  type: TerrainType,
  level: number = 0,
): TerrainVisualKey | null {
  switch (type) {
    case TerrainType.Clear:
      return 'clear';
    case TerrainType.Pavement:
      return 'pavement';
    case TerrainType.Rough:
      return 'rough';
    case TerrainType.Rubble:
      return 'rubble';
    case TerrainType.LightWoods:
      return 'light-woods';
    case TerrainType.HeavyWoods:
      return 'heavy-woods';
    case TerrainType.Water:
      // Why: BattleTech water depth 0-1 is wade-able (shallow); depth 2+
      // drops a mech to prone / submerges infantry entirely (deep).
      return level >= 2 ? 'deep-water' : 'shallow-water';
    case TerrainType.Building:
      // Why: BattleTech building CF tiers — level 1 light (CF 15), 2
      // medium (CF 40), 3 heavy (CF 90), 4+ hardened (CF 150). We
      // encode tier via the `level` field rather than CF because CF
      // values are pre-damage state.
      if (level >= 4) return 'hardened-building';
      if (level === 3) return 'heavy-building';
      if (level === 2) return 'medium-building';
      return 'light-building';
    default:
      // road, sand, mud, snow, ice, swamp, bridge, fire, smoke
      return null;
  }
}

/**
 * Asset URL for a given visual key. Convenience lookup used by the
 * fallback loader path and by the symbol-defs hydration.
 */
export function assetUrlFor(key: TerrainVisualKey): string {
  return TERRAIN_VISUAL_ASSET_URLS[key];
}

/**
 * SVG symbol id for a given visual key. Matches the id emitted by
 * `TerrainSymbolDefs`; consumers reference it via `<use href="#...">`.
 */
export function symbolIdFor(key: TerrainVisualKey): string {
  return `terrain-${key}`;
}
