/**
 * Shared terrain movement-cost utility.
 *
 * `getTerrainMovementCost` and `getPrimaryTerrainFeature` were originally
 * defined inside `src/components/gameplay/HexMapDisplay/renderHelpers.ts` — a
 * rendering module the simulation layer (`src/simulation/`) is forbidden to
 * import. This module is the simulation-accessible home for both functions:
 * pure, dependency-light, importing nothing from the rendering layer. The
 * rendering module re-exports from here so existing rendering call sites are
 * unchanged.
 *
 * Per `add-ai-terrain-aware-movement` design D1 — Extract `getTerrainMovementCost`
 * into a shared sim utility.
 *
 * @spec openspec/changes/add-ai-terrain-aware-movement/specs/simulation-system/spec.md
 *   Requirement: Shared Terrain Movement-Cost Utility
 */

import type { IHex, IHexTerrain } from '@/types/gameplay';

import { TERRAIN_LAYER_ORDER } from '@/constants/terrain';
import { TerrainType } from '@/types/gameplay';
import { TERRAIN_PROPERTIES } from '@/types/gameplay/TerrainTypes';
import { terrainFeaturesFromString } from '@/utils/gameplay/terrainEncoding';

/** Set of valid `TerrainType` string values, used to narrow a raw `IHex.terrain`. */
const TERRAIN_TYPE_VALUES: ReadonlySet<string> = new Set<string>(
  Object.values(TerrainType),
);

function getPrimaryTerrainFeatureFromFeatures(
  features: readonly { type: TerrainType; level: number }[],
): { type: TerrainType; level: number } | null {
  if (features.length === 0) return null;

  const sortedFeatures = [...features].sort(
    (a, b) => TERRAIN_LAYER_ORDER[b.type] - TERRAIN_LAYER_ORDER[a.type],
  );
  return sortedFeatures[0];
}

/**
 * Get the primary terrain feature (highest layer order) for a hex.
 *
 * Moved verbatim from `renderHelpers.ts` per design D1 — when a hex carries
 * multiple stacked features (e.g. woods over rough), the one drawn on top
 * (highest `TERRAIN_LAYER_ORDER`) is treated as the primary feature for
 * cost / cover purposes. Returns `null` for an empty or absent hex.
 */
export function getPrimaryTerrainFeature(
  terrain: IHexTerrain | undefined,
): { type: TerrainType; level: number } | null {
  return getPrimaryTerrainFeatureFromFeatures(terrain?.features ?? []);
}

export function getPrimaryTerrainFeatureFromTerrainTag(
  terrainTag: string | undefined,
): { type: TerrainType; level: number } | null {
  return getPrimaryTerrainFeatureFromFeatures(
    terrainFeaturesFromString(terrainTag ?? ''),
  );
}

/**
 * Movement-point cost to enter a hex given its terrain features.
 *
 * Moved verbatim from `renderHelpers.ts` per design D1. Open ground (no
 * features) costs `1`; each terrain type adds its `movementCostModifier.walk`
 * on top of the base `1` (e.g. heavy woods adds `2`, total `3`). Used as the
 * edge weight for the AI terrain-cost pathfinder.
 */
export function getTerrainMovementCost(
  terrain: IHexTerrain | undefined,
): number {
  const feature = getPrimaryTerrainFeature(terrain);
  if (!feature) return 1;
  const props = TERRAIN_PROPERTIES[feature.type];
  return 1 + (props?.movementCostModifier.walk ?? 0);
}

/**
 * Movement-point cost to enter a grid hex, derived from its `IHex.terrain`
 * string tag.
 *
 * The `IHexGrid` the simulation layer threads around stores each hex's
 * terrain as a free-form `string` (`IHex.terrain`), not the richer
 * `IHexTerrain` feature list. This adapter narrows that string to a known
 * `TerrainType` and returns the same per-hex cost `getTerrainMovementCost`
 * would yield for a hex carrying that single feature. An unrecognised or
 * absent terrain tag — including the all-`clear` grid the simulation runner
 * builds — yields `1`, matching open ground, so this never throws and never
 * over-reports cost.
 *
 * This is the function the AI terrain-cost pathfinder consults; it keeps the
 * pathfinder's edge weight identical to what `getTerrainMovementCost` would
 * produce for the equivalent `IHexTerrain`.
 */
export function getHexMovementCostFromTerrainTag(
  hex: IHex | undefined,
): number {
  if (!hex) {
    return 1;
  }
  const feature = getPrimaryTerrainFeatureFromTerrainTag(hex.terrain);
  if (!feature || !TERRAIN_TYPE_VALUES.has(feature.type)) return 1;

  const props = TERRAIN_PROPERTIES[feature.type];
  return 1 + (props?.movementCostModifier.walk ?? 0);
}
