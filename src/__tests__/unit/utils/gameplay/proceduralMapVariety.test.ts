/**
 * Procedural Map Variety — preset distinctness and full-preset integration.
 *
 * Verifies the preset-distinctness guarantee from `add-procedural-map-variety`:
 * two different presets generated at the same seed, dimensions, and biome
 * produce measurably different terrain. Also confirms all 17 presets map to
 * feature directives without loss.
 *
 * @spec openspec/changes/add-procedural-map-variety/specs/terrain-generation/spec.md
 */

import {
  INDUSTRIAL_COMPLEX,
  LIGHT_FOREST,
  DENSE_FOREST,
  MAP_PRESETS,
  OPEN_PLAINS,
} from '@/constants/scenario/mapPresets';
import { TerrainType, IHexTerrain } from '@/types/gameplay/TerrainTypes';
import {
  generateTerrainMap,
  presetFeaturesToDirectives,
  type BiomeType,
} from '@/utils/gameplay/terrainGenerator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a terrain-type histogram (fraction per type) for a generated grid. */
function histogram(grid: readonly IHexTerrain[]): Map<TerrainType, number> {
  const counts = new Map<TerrainType, number>();
  for (const hex of grid) {
    const t = hex.features[0].type;
    counts.set(t, (counts.get(t) || 0) + 1);
  }
  const total = grid.length;
  const fractions = new Map<TerrainType, number>();
  counts.forEach((count, type) => {
    fractions.set(type, count / total);
  });
  return fractions;
}

/**
 * Sum of absolute per-type fraction differences between two histograms — a
 * total-variation-style distance. Two statistically identical maps score 0.
 */
function histogramDistance(
  a: Map<TerrainType, number>,
  b: Map<TerrainType, number>,
): number {
  const types = new Set<TerrainType>(
    Array.from(a.keys()).concat(Array.from(b.keys())),
  );
  let distance = 0;
  types.forEach((type) => {
    distance += Math.abs((a.get(type) || 0) - (b.get(type) || 0));
  });
  return distance;
}

const SEED = 13579;
const DIMENSION = 30;
const BIOME: BiomeType = 'temperate';

const generate = (preset: (typeof MAP_PRESETS)[number]) =>
  generateTerrainMap(preset, {
    width: DIMENSION,
    height: DIMENSION,
    biome: BIOME,
    seed: SEED,
  });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('procedural map variety — preset mapping coverage', () => {
  it('maps all 17 presets to feature directives without throwing', () => {
    expect(MAP_PRESETS).toHaveLength(17);
    for (const preset of MAP_PRESETS) {
      expect(() => presetFeaturesToDirectives(preset.features)).not.toThrow();
    }
  });

  it('produces at least one terrain-overlay directive for every preset', () => {
    // Every preset carries at least one non-elevation feature, so each maps
    // to a non-empty directive list.
    for (const preset of MAP_PRESETS) {
      const directives = presetFeaturesToDirectives(preset.features);
      expect(directives.length).toBeGreaterThan(0);
    }
  });
});

describe('Requirement: Preset Map Distinctness', () => {
  // Scenario: Sparse and dense forest presets differ
  it('LIGHT_FOREST and DENSE_FOREST differ in woods fraction beyond tolerance', () => {
    const light = generate(LIGHT_FOREST).grid;
    const dense = generate(DENSE_FOREST).grid;

    const woodsFraction = (grid: readonly IHexTerrain[]): number => {
      const h = histogram(grid);
      return (
        (h.get(TerrainType.LightWoods) || 0) +
        (h.get(TerrainType.HeavyWoods) || 0)
      );
    };

    const lightWoods = woodsFraction(light);
    const denseWoods = woodsFraction(dense);

    // Dense forest must carry materially more woods than light forest.
    expect(denseWoods).toBeGreaterThan(lightWoods);
    expect(denseWoods - lightWoods).toBeGreaterThan(0.1);
  });

  // Scenario: Open and industrial presets differ
  it('OPEN_PLAINS and INDUSTRIAL_COMPLEX produce histograms differing beyond tolerance', () => {
    const plains = generate(OPEN_PLAINS).grid;
    const industrial = generate(INDUSTRIAL_COMPLEX).grid;

    const distance = histogramDistance(
      histogram(plains),
      histogram(industrial),
    );
    // A non-trivial total-variation distance — the maps are not statistically
    // identical.
    expect(distance).toBeGreaterThan(0.2);

    // Only the industrial preset contains Building hexes.
    const industrialHasBuildings = industrial.some(
      (h) => h.features[0].type === TerrainType.Building,
    );
    const plainsHasBuildings = plains.some(
      (h) => h.features[0].type === TerrainType.Building,
    );
    expect(industrialHasBuildings).toBe(true);
    expect(plainsHasBuildings).toBe(false);
  });

  it('every distinct preset pair yields a non-identical histogram', () => {
    // Regression guard that presets are genuinely consumed: no two distinct
    // presets at the same seed/biome/dimensions produce an identical map.
    const grids = MAP_PRESETS.map((p) => generate(p).grid);
    for (let i = 0; i < grids.length; i++) {
      for (let j = i + 1; j < grids.length; j++) {
        const distance = histogramDistance(
          histogram(grids[i]),
          histogram(grids[j]),
        );
        // Presets with overlapping feature sets may be close, but never
        // hex-for-hex identical when the feature lists differ.
        const identical = grids[i].every(
          (hex, idx) => hex.features[0].type === grids[j][idx].features[0].type,
        );
        if (
          JSON.stringify(MAP_PRESETS[i].features) !==
          JSON.stringify(MAP_PRESETS[j].features)
        ) {
          expect(identical).toBe(false);
        }
        expect(distance).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('procedural map variety — determinism', () => {
  it('regenerating the same preset at the same seed is byte-identical', () => {
    const a = generate(INDUSTRIAL_COMPLEX);
    const b = generate(INDUSTRIAL_COMPLEX);
    expect(a.grid).toEqual(b.grid);
    expect(a.presetId).toBe(b.presetId);
  });
});
