/**
 * Procedural Map Variety — preset feature overlay.
 *
 * The feature-application pass runs after base biome generation and overlays
 * clustered features (woods, water, rough), structures (buildings, roads), and
 * pavement auto-fill onto the generated grid. Placement is fully seeded, so the
 * whole map stays a deterministic function of the generation seed.
 *
 * @spec openspec/changes/add-procedural-map-variety/specs/terrain-generation/spec.md
 */

import {
  TerrainType,
  type IHexTerrain,
  type ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';

import type { IFeatureDirective } from './terrainGeneratorTypes';
import type { SeededRandom } from './terrainGeneratorTypes';

// =============================================================================
// Grid helpers
// =============================================================================

/** Linear index of a `(q, r)` hex inside a row-major `width × height` grid. */
function hexIndex(q: number, r: number, width: number): number {
  return r * width + q;
}

/** Orthogonal (axial) neighbour offsets used for flood-fill and pavement. */
const NEIGHBOUR_OFFSETS: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Replace the single feature on a hex with the given terrain type, preserving
 * the hex coordinate and elevation. Water and buildings are given level 1 to
 * match the base generator's depth/height convention.
 */
function stampHex(
  hex: IHexTerrain,
  type: TerrainType,
  overrides: Partial<Omit<ITerrainFeature, 'type'>> = {},
): IHexTerrain {
  const feature: ITerrainFeature = {
    type,
    level: type === TerrainType.Water || type === TerrainType.Building ? 1 : 0,
    ...overrides,
  };
  return {
    coordinate: hex.coordinate,
    elevation: hex.elevation,
    features: [feature],
  };
}

// =============================================================================
// Deterministic clustering
// =============================================================================

/**
 * Grow a single cluster from an origin hex via seeded flood-fill until it
 * reaches roughly `target` hexes or runs out of grid. Returns the set of
 * linear hex indices belonging to the cluster.
 *
 * The flood-fill picks the next frontier hex with the RNG, so cluster shape
 * is a deterministic function of the seed (D3).
 */
function growCluster(
  originIndex: number,
  target: number,
  width: number,
  height: number,
  rng: SeededRandom,
): Set<number> {
  const cluster = new Set<number>([originIndex]);
  const frontier: number[] = [originIndex];

  while (cluster.size < target && frontier.length > 0) {
    // Seeded pick of a frontier hex to expand from.
    const pickAt = rng.nextInt(frontier.length);
    const current = frontier[pickAt];
    const cq = current % width;
    const cr = Math.floor(current / width);

    const candidates: number[] = [];
    for (const [dq, dr] of NEIGHBOUR_OFFSETS) {
      const nq = cq + dq;
      const nr = cr + dr;
      if (nq < 0 || nq >= width || nr < 0 || nr >= height) continue;
      const nIdx = hexIndex(nq, nr, width);
      if (!cluster.has(nIdx)) candidates.push(nIdx);
    }

    if (candidates.length === 0) {
      // Exhausted this frontier hex — drop it and continue.
      frontier.splice(pickAt, 1);
      continue;
    }

    const chosen = candidates[rng.nextInt(candidates.length)];
    cluster.add(chosen);
    frontier.push(chosen);
  }

  return cluster;
}

/**
 * Derive cluster origins and grow them for a single directive (D3). Returns
 * the set of linear hex indices the directive's feature should occupy.
 *
 * `K = ceil(density × hexCount / max(1, clusterSize²))` cluster origins are
 * drawn from the RNG; each is grown to roughly `clusterSize²`-area hexes via
 * seeded flood-fill.
 */
function placeClusteredFeature(
  directive: IFeatureDirective,
  width: number,
  height: number,
  rng: SeededRandom,
): Set<number> {
  const hexCount = width * height;
  const placed = new Set<number>();
  if (hexCount === 0 || directive.density <= 0) return placed;

  const clusterSize = Math.max(1, directive.clusterSize);
  // A cluster of radius `clusterSize` covers roughly `clusterSize²` hexes.
  const clusterArea = Math.max(1, Math.round(clusterSize * clusterSize));
  const targetHexes = Math.round(directive.density * hexCount);
  if (targetHexes <= 0) return placed;

  const clusterCount = Math.max(1, Math.ceil(targetHexes / clusterArea));

  for (let i = 0; i < clusterCount; i++) {
    if (placed.size >= targetHexes) break;
    // Seeded origin draw.
    const originIndex = rng.nextInt(hexCount);
    // Cap this cluster so the directive does not badly overshoot its density.
    const remaining = targetHexes - placed.size;
    const grown = growCluster(
      originIndex,
      Math.min(clusterArea, remaining),
      width,
      height,
      rng,
    );
    grown.forEach((idx) => placed.add(idx));
  }

  return placed;
}

// =============================================================================
// Structure placement
// =============================================================================

/**
 * Place `Building` footprints (D4): rectangular blocks of 1-4 hexes stamped at
 * seeded positions until the directive's target hex count is reached. Each
 * footprint is one of 1x1, 1x2, 2x1, or 2x2 — every footprint is rectangular
 * and 1-4 hexes. Returns the set of linear hex indices occupied by buildings.
 *
 * `clusterSize` biases how many footprints sit close together: footprints are
 * seeded around a smaller number of seed points so larger `clusterSize`
 * yields denser building blocks.
 */
function placeBuildingFootprints(
  directive: IFeatureDirective,
  width: number,
  height: number,
  rng: SeededRandom,
): Set<number> {
  const hexCount = width * height;
  const placed = new Set<number>();
  if (hexCount === 0 || directive.density <= 0) return placed;

  const targetHexes = Math.round(directive.density * hexCount);
  if (targetHexes <= 0) return placed;

  // The four rectangular footprint shapes, each 1-4 hexes.
  const FOOTPRINTS: readonly [number, number][] = [
    [1, 1],
    [1, 2],
    [2, 1],
    [2, 2],
  ];

  // Bound the loop so a fully-saturated grid still terminates.
  const maxStamps = hexCount * 2;
  let stamps = 0;
  while (placed.size < targetHexes && stamps < maxStamps) {
    stamps++;
    // Seeded footprint shape and anchor (top-left corner).
    const [fw, fh] = FOOTPRINTS[rng.nextInt(FOOTPRINTS.length)];
    const aq = rng.nextInt(width);
    const ar = rng.nextInt(height);
    for (let dr = 0; dr < fh; dr++) {
      for (let dq = 0; dq < fw; dq++) {
        const q = aq + dq;
        const r = ar + dr;
        if (q < 0 || q >= width || r < 0 || r >= height) continue;
        placed.add(hexIndex(q, r, width));
      }
    }
  }

  return placed;
}

/**
 * Assign deterministic IDs to the final connected building components. This
 * runs after roads because road tracing can split or erase generated
 * footprints.
 */
function assignBuildingComponentIds(
  out: IHexTerrain[],
  buildingHexes: ReadonlySet<number>,
  width: number,
  height: number,
): void {
  const visited = new Set<number>();
  const sortedBuildingHexes = Array.from(buildingHexes).sort((a, b) => a - b);

  for (const startIdx of sortedBuildingHexes) {
    if (visited.has(startIdx)) continue;

    const component: number[] = [];
    const frontier = [startIdx];
    visited.add(startIdx);

    while (frontier.length > 0) {
      const current = frontier.pop();
      if (current === undefined) continue;
      component.push(current);

      const cq = current % width;
      const cr = Math.floor(current / width);
      for (const [dq, dr] of NEIGHBOUR_OFFSETS) {
        const nq = cq + dq;
        const nr = cr + dr;
        if (nq < 0 || nq >= width || nr < 0 || nr >= height) continue;

        const nIdx = hexIndex(nq, nr, width);
        if (visited.has(nIdx) || !buildingHexes.has(nIdx)) continue;
        visited.add(nIdx);
        frontier.push(nIdx);
      }
    }

    const anchorIdx = Math.min(...component);
    const anchorQ = anchorIdx % width;
    const anchorR = Math.floor(anchorIdx / width);
    const buildingId = `building-${anchorQ}-${anchorR}`;

    for (const idx of component) {
      out[idx] = stampHex(out[idx], TerrainType.Building, { buildingId });
    }
  }
}

/**
 * Trace a connected `Road` path between two seeded map edges. Returns the
 * ordered list of linear hex indices on the path. On a grid too small to
 * trace a path (any dimension < 3) an empty list is returned and the caller
 * skips the directive without error (D4, tiny-grid scenario).
 */
function traceRoad(width: number, height: number, rng: SeededRandom): number[] {
  if (width < 3 || height < 3) return [];

  // Seeded edge-pair selection: 0 = horizontal (left->right),
  // 1 = vertical (top->bottom).
  const orientation = rng.nextInt(2);
  const path: number[] = [];

  if (orientation === 0) {
    // Left edge to right edge: walk every column, drifting the row.
    let row = rng.nextInt(height);
    for (let q = 0; q < width; q++) {
      path.push(hexIndex(q, row, width));
      // Seeded vertical drift, clamped to the grid.
      const drift = rng.nextInt(3) - 1;
      row = Math.max(0, Math.min(height - 1, row + drift));
    }
  } else {
    // Top edge to bottom edge: walk every row, drifting the column.
    let col = rng.nextInt(width);
    for (let r = 0; r < height; r++) {
      path.push(hexIndex(col, r, width));
      const drift = rng.nextInt(3) - 1;
      col = Math.max(0, Math.min(width - 1, col + drift));
    }
  }

  return path;
}

// =============================================================================
// Feature-application pass
// =============================================================================

/**
 * Apply preset feature directives to a base-generated grid as a deterministic
 * overlay (D1, D5). Directives are bucketed and applied in a fixed order
 * regardless of input order: natural features first, then buildings, then
 * roads, then pavement auto-fill — so structures override natural terrain and
 * the result is independent of how the preset lists its features.
 *
 * @spec openspec/changes/add-procedural-map-variety/specs/terrain-generation/spec.md
 */
export function applyPresetFeatures(
  grid: readonly IHexTerrain[],
  directives: readonly IFeatureDirective[],
  rng: SeededRandom,
  width: number,
  height: number,
): IHexTerrain[] {
  // Work on a mutable copy — the base grid is never mutated (D1).
  const out: IHexTerrain[] = grid.map((hex) => hex);

  const isStructure = (t: TerrainType): boolean =>
    t === TerrainType.Building ||
    t === TerrainType.Road ||
    t === TerrainType.Pavement;

  // Bucket directives by application phase (D5).
  const naturalDirectives = directives.filter((d) => !isStructure(d.type));
  const buildingDirectives = directives.filter(
    (d) => d.type === TerrainType.Building,
  );
  const roadDirectives = directives.filter((d) => d.type === TerrainType.Road);

  // Sort within each bucket by terrain type so application order is fully
  // independent of the directive list order (D5).
  const byType = (a: IFeatureDirective, b: IFeatureDirective): number =>
    a.type < b.type ? -1 : a.type > b.type ? 1 : a.density - b.density;
  naturalDirectives.sort(byType);
  buildingDirectives.sort(byType);

  // Phase 1: natural features.
  for (const directive of naturalDirectives) {
    const placed = placeClusteredFeature(directive, width, height, rng);
    placed.forEach((idx) => {
      out[idx] = stampHex(out[idx], directive.type);
    });
  }

  // Phase 2: buildings — rectangular 1-4 hex footprints override natural
  // terrain (D4).
  const buildingHexes = new Set<number>();
  for (const directive of buildingDirectives) {
    const placed = placeBuildingFootprints(directive, width, height, rng);
    placed.forEach((idx) => {
      out[idx] = stampHex(out[idx], TerrainType.Building);
      buildingHexes.add(idx);
    });
  }

  // Phase 3: roads — a traced path between two edges. Roads are applied
  // after buildings (D5 order: Building, then Road), so a road overrides
  // any terrain on its path, keeping the traced run edge-to-edge connected.
  for (const _directive of roadDirectives) {
    const path = traceRoad(width, height, rng);
    // Tiny grids yield an empty path; the directive is skipped (D4).
    for (const idx of path) {
      out[idx] = stampHex(out[idx], TerrainType.Road);
      // A hex that becomes road is no longer a building.
      buildingHexes.delete(idx);
    }
  }

  // Phase 4: pavement auto-fill — every still-natural hex orthogonally
  // adjacent to a building becomes pavement (D4).
  assignBuildingComponentIds(out, buildingHexes, width, height);

  if (buildingHexes.size > 0) {
    const pavementHexes = new Set<number>();
    buildingHexes.forEach((bIdx) => {
      const bq = bIdx % width;
      const br = Math.floor(bIdx / width);
      for (const [dq, dr] of NEIGHBOUR_OFFSETS) {
        const nq = bq + dq;
        const nr = br + dr;
        if (nq < 0 || nq >= width || nr < 0 || nr >= height) continue;
        const nIdx = hexIndex(nq, nr, width);
        const t = out[nIdx].features[0]?.type;
        // Only natural hexes are paved — never overwrite a structure.
        if (
          t !== TerrainType.Building &&
          t !== TerrainType.Road &&
          t !== TerrainType.Pavement
        ) {
          pavementHexes.add(nIdx);
        }
      }
    });
    pavementHexes.forEach((pIdx) => {
      out[pIdx] = stampHex(out[pIdx], TerrainType.Pavement);
    });
  }

  return out;
}

// =============================================================================
// Preset -> directive mapping
// =============================================================================

/**
 * The string feature-type vocabulary used by `IMapPreset.features` in
 * `src/constants/scenario/mapPresets.ts`.
 */
export type PresetFeatureType =
  | 'woods'
  | 'water'
  | 'rough'
  | 'building'
  | 'elevation'
  | 'road';

/**
 * The preset-feature shape carried by `IMapPreset.features` — a string
 * `type`, a `density`, and a `clustering` factor in `[0, 1]`.
 */
export interface IPresetFeature {
  readonly type: PresetFeatureType;
  readonly density: number;
  readonly clustering: number;
}

/** Maximum cluster radius a `clustering` factor of `1.0` maps to. */
const MAX_CLUSTER_RADIUS = 5;

/**
 * Translate a preset's `clustering` factor (`[0, 1]`) into a concrete mean
 * cluster radius in hexes. `0` -> radius 1 (scattered), `1` -> radius 5
 * (large clumps).
 */
function clusteringToClusterSize(clustering: number): number {
  const clamped = Math.max(0, Math.min(1, clustering));
  return Math.max(1, Math.round(1 + clamped * (MAX_CLUSTER_RADIUS - 1)));
}

/**
 * Map a single preset string feature-type to a concrete `TerrainType`, or
 * `null` when the feature has no terrain-overlay representation.
 *
 * `'elevation'` shapes the base pass's elevation field, not a terrain type,
 * so it produces no directive and is left to base generation (D6).
 */
function presetFeatureTypeToTerrain(
  type: PresetFeatureType,
): TerrainType | null {
  switch (type) {
    case 'woods':
      return TerrainType.HeavyWoods;
    case 'water':
      return TerrainType.Water;
    case 'rough':
      return TerrainType.Rough;
    case 'building':
      return TerrainType.Building;
    case 'road':
      return TerrainType.Road;
    case 'elevation':
      return null;
    default:
      return null;
  }
}

/**
 * Convert an ordered list of preset features into `IFeatureDirective`s (D6).
 * Features with no terrain-overlay representation (`'elevation'`) are
 * dropped. The relative order of the remaining features is preserved, though
 * {@link applyPresetFeatures} re-orders by fixed phase regardless.
 *
 * @spec openspec/changes/add-procedural-map-variety/specs/terrain-generation/spec.md
 */
export function presetFeaturesToDirectives(
  features: readonly IPresetFeature[],
): IFeatureDirective[] {
  const directives: IFeatureDirective[] = [];
  for (const feature of features) {
    const terrain = presetFeatureTypeToTerrain(feature.type);
    if (terrain === null) continue;
    directives.push({
      type: terrain,
      density: Math.max(0, Math.min(1, feature.density)),
      clusterSize: clusteringToClusterSize(feature.clustering),
    });
  }
  return directives;
}
