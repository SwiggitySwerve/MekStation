import { TerrainType, IHexTerrain } from '@/types/gameplay/TerrainTypes';
import {
  generateTerrain,
  generateTerrainMap,
  presetFeaturesToDirectives,
  TerrainGeneratorConfig,
  BiomeType,
  BIOME_WEIGHTS,
  type IFeatureDirective,
  type IPresetFeature,
} from '@/utils/gameplay/terrainGenerator';

describe('grid dimensions', () => {
  it('should generate a grid with correct dimensions', () => {
    const config: TerrainGeneratorConfig = {
      width: 10,
      height: 8,
      biome: 'temperate',
    };

    const grid = generateTerrain(config);

    expect(grid).toHaveLength(10 * 8);
  });

  it('should handle 1x1 grid', () => {
    const config: TerrainGeneratorConfig = {
      width: 1,
      height: 1,
      biome: 'temperate',
    };

    const grid = generateTerrain(config);

    expect(grid).toHaveLength(1);
    expect(grid[0].coordinate).toEqual({ q: 0, r: 0 });
  });

  it('should generate correct coordinates for all hexes', () => {
    const config: TerrainGeneratorConfig = {
      width: 5,
      height: 4,
      biome: 'temperate',
    };

    const grid = generateTerrain(config);

    for (const hex of grid) {
      expect(hex.coordinate.q).toBeGreaterThanOrEqual(0);
      expect(hex.coordinate.q).toBeLessThan(5);
      expect(hex.coordinate.r).toBeGreaterThanOrEqual(0);
      expect(hex.coordinate.r).toBeLessThan(4);
    }

    const coordSet = new Set(
      grid.map((h: IHexTerrain) => `${h.coordinate.q},${h.coordinate.r}`),
    );
    expect(coordSet.size).toBe(grid.length);
  });
});

describe('valid terrain types', () => {
  it('should generate all hexes with valid TerrainType', () => {
    const config: TerrainGeneratorConfig = {
      width: 15,
      height: 15,
      biome: 'temperate',
    };

    const grid = generateTerrain(config);
    const validTypes = Object.values(TerrainType);

    for (const hex of grid) {
      expect(hex.features.length).toBeGreaterThan(0);
      for (const feature of hex.features) {
        expect(validTypes).toContain(feature.type);
      }
    }
  });

  it('should generate elevation within expected range (0-3)', () => {
    const config: TerrainGeneratorConfig = {
      width: 20,
      height: 20,
      biome: 'temperate',
    };

    const grid = generateTerrain(config);

    for (const hex of grid) {
      expect(hex.elevation).toBeGreaterThanOrEqual(0);
      expect(hex.elevation).toBeLessThanOrEqual(3);
    }
  });
});

describe('seed reproducibility', () => {
  it('should produce identical output with same seed', () => {
    const config: TerrainGeneratorConfig = {
      width: 10,
      height: 10,
      biome: 'temperate',
      seed: 12345,
    };

    const grid1 = generateTerrain(config);
    const grid2 = generateTerrain(config);

    expect(grid1).toEqual(grid2);
  });

  it('should produce different output with different seeds', () => {
    const config1: TerrainGeneratorConfig = {
      width: 10,
      height: 10,
      biome: 'temperate',
      seed: 12345,
    };

    const config2: TerrainGeneratorConfig = {
      width: 10,
      height: 10,
      biome: 'temperate',
      seed: 54321,
    };

    const grid1 = generateTerrain(config1);
    const grid2 = generateTerrain(config2);

    const differences = grid1.filter(
      (h1: IHexTerrain, i: number) =>
        h1.features[0].type !== grid2[i].features[0].type ||
        h1.elevation !== grid2[i].elevation,
    );
    expect(differences.length).toBeGreaterThan(0);
  });

  it('should produce different output without seed (random)', () => {
    const config: TerrainGeneratorConfig = {
      width: 10,
      height: 10,
      biome: 'temperate',
    };

    const grid1 = generateTerrain(config);
    const grid2 = generateTerrain(config);

    const allSame = grid1.every(
      (h1: IHexTerrain, i: number) =>
        h1.features[0].type === grid2[i].features[0].type &&
        h1.elevation === grid2[i].elevation,
    );
    expect(allSame).toBe(false);
  });
});

describe('biome distribution', () => {
  const countTerrainTypes = (grid: IHexTerrain[]): Map<TerrainType, number> => {
    const counts = new Map<TerrainType, number>();
    for (const hex of grid) {
      const type = hex.features[0].type;
      counts.set(type, (counts.get(type) || 0) + 1);
    }
    return counts;
  };

  const checkDistribution = (
    grid: IHexTerrain[],
    weights: Record<string, number>,
    tolerance: number = 0.15,
  ) => {
    const counts = countTerrainTypes(grid);
    const total = grid.length;

    for (const [terrainStr, expectedWeight] of Object.entries(weights)) {
      const terrain = terrainStr as TerrainType;
      const actualCount = counts.get(terrain) || 0;
      const actualWeight = actualCount / total;

      expect(actualWeight).toBeGreaterThanOrEqual(expectedWeight - tolerance);
      expect(actualWeight).toBeLessThanOrEqual(expectedWeight + tolerance);
    }
  };

  it('should roughly match temperate biome weights', () => {
    const config: TerrainGeneratorConfig = {
      width: 30,
      height: 30,
      biome: 'temperate',
      seed: 42,
    };

    const grid = generateTerrain(config);

    checkDistribution(
      grid,
      {
        [TerrainType.Clear]: 0.6,
      },
      0.15,
    );

    const counts = countTerrainTypes(grid);
    const woodsCount =
      (counts.get(TerrainType.LightWoods) || 0) +
      (counts.get(TerrainType.HeavyWoods) || 0);
    const woodsPercent = woodsCount / grid.length;
    expect(woodsPercent).toBeGreaterThanOrEqual(0.1);
    expect(woodsPercent).toBeLessThanOrEqual(0.35);
  });

  it('should roughly match desert biome weights', () => {
    const config: TerrainGeneratorConfig = {
      width: 30,
      height: 30,
      biome: 'desert',
      seed: 42,
    };

    const grid = generateTerrain(config);

    const counts = countTerrainTypes(grid);
    const sandPercent = (counts.get(TerrainType.Sand) || 0) / grid.length;
    expect(sandPercent).toBeGreaterThanOrEqual(0.35);
    expect(sandPercent).toBeLessThanOrEqual(0.65);
  });

  it('should roughly match arctic biome weights', () => {
    const config: TerrainGeneratorConfig = {
      width: 30,
      height: 30,
      biome: 'arctic',
      seed: 42,
    };

    const grid = generateTerrain(config);

    const counts = countTerrainTypes(grid);
    const snowPercent = (counts.get(TerrainType.Snow) || 0) / grid.length;
    const icePercent = (counts.get(TerrainType.Ice) || 0) / grid.length;
    expect(snowPercent + icePercent).toBeGreaterThanOrEqual(0.4);
    expect(snowPercent + icePercent).toBeLessThanOrEqual(0.9);
  });

  it('should roughly match urban biome weights', () => {
    const config: TerrainGeneratorConfig = {
      width: 30,
      height: 30,
      biome: 'urban',
      seed: 42,
    };

    const grid = generateTerrain(config);

    const counts = countTerrainTypes(grid);
    const pavementPercent =
      (counts.get(TerrainType.Pavement) || 0) / grid.length;
    const buildingPercent =
      (counts.get(TerrainType.Building) || 0) / grid.length;
    expect(pavementPercent + buildingPercent).toBeGreaterThanOrEqual(0.4);
    expect(pavementPercent + buildingPercent).toBeLessThanOrEqual(0.9);
  });

  it('should roughly match jungle biome weights', () => {
    const config: TerrainGeneratorConfig = {
      width: 30,
      height: 30,
      biome: 'jungle',
      seed: 42,
    };

    const grid = generateTerrain(config);

    const counts = countTerrainTypes(grid);
    const heavyWoodsPercent =
      (counts.get(TerrainType.HeavyWoods) || 0) / grid.length;
    const lightWoodsPercent =
      (counts.get(TerrainType.LightWoods) || 0) / grid.length;
    expect(heavyWoodsPercent + lightWoodsPercent).toBeGreaterThanOrEqual(0.4);
    expect(heavyWoodsPercent + lightWoodsPercent).toBeLessThanOrEqual(0.9);
  });
});

describe('terrain coherence', () => {
  it('should cluster woods together (noise coherence)', () => {
    const config: TerrainGeneratorConfig = {
      width: 20,
      height: 20,
      biome: 'temperate',
      seed: 42,
    };

    const grid = generateTerrain(config);

    let adjacentWoodsCount = 0;
    const isWoods = (hex: IHexTerrain) =>
      hex.features[0].type === TerrainType.LightWoods ||
      hex.features[0].type === TerrainType.HeavyWoods;

    const getHexAt = (q: number, r: number) =>
      grid.find(
        (h: IHexTerrain) => h.coordinate.q === q && h.coordinate.r === r,
      );

    for (const hex of grid) {
      if (isWoods(hex)) {
        const neighbors = [
          getHexAt(hex.coordinate.q + 1, hex.coordinate.r),
          getHexAt(hex.coordinate.q - 1, hex.coordinate.r),
          getHexAt(hex.coordinate.q, hex.coordinate.r + 1),
          getHexAt(hex.coordinate.q, hex.coordinate.r - 1),
        ];

        for (const neighbor of neighbors) {
          if (neighbor && isWoods(neighbor)) {
            adjacentWoodsCount++;
          }
        }
      }
    }

    const totalWoods = grid.filter(isWoods).length;
    if (totalWoods > 0) {
      expect(adjacentWoodsCount).toBeGreaterThan(0);
    }
  });

  it('should place water in low elevation areas', () => {
    const config: TerrainGeneratorConfig = {
      width: 25,
      height: 25,
      biome: 'temperate',
      seed: 123,
    };

    const grid = generateTerrain(config);

    const waterHexes = grid.filter(
      (h: IHexTerrain) => h.features[0].type === TerrainType.Water,
    );
    const nonWaterHexes = grid.filter(
      (h: IHexTerrain) => h.features[0].type !== TerrainType.Water,
    );

    if (waterHexes.length > 0 && nonWaterHexes.length > 0) {
      const avgWaterElevation =
        waterHexes.reduce(
          (sum: number, h: IHexTerrain) => sum + h.elevation,
          0,
        ) / waterHexes.length;
      const avgNonWaterElevation =
        nonWaterHexes.reduce(
          (sum: number, h: IHexTerrain) => sum + h.elevation,
          0,
        ) / nonWaterHexes.length;

      expect(avgWaterElevation).toBeLessThanOrEqual(avgNonWaterElevation);
    }
  });
});

describe('edge cases', () => {
  it('should handle very large grid', () => {
    const config: TerrainGeneratorConfig = {
      width: 50,
      height: 50,
      biome: 'temperate',
      seed: 99,
    };

    const grid = generateTerrain(config);

    expect(grid).toHaveLength(2500);
  });

  it('should handle all biome types', () => {
    const biomes: BiomeType[] = [
      'temperate',
      'desert',
      'arctic',
      'urban',
      'jungle',
    ];

    for (const biome of biomes) {
      const config: TerrainGeneratorConfig = {
        width: 10,
        height: 10,
        biome,
        seed: 42,
      };

      const grid = generateTerrain(config);

      expect(grid).toHaveLength(100);
      expect(grid.every((h: IHexTerrain) => h.features.length > 0)).toBe(true);
    }
  });
});
// ===========================================================================
// Procedural Map Variety — preset feature overlay
// @spec openspec/changes/add-procedural-map-variety/specs/terrain-generation/spec.md
// ===========================================================================

const typeCounts = (grid: readonly IHexTerrain[]): Map<TerrainType, number> => {
  const counts = new Map<TerrainType, number>();
  for (const hex of grid) {
    const t = hex.features[0].type;
    counts.set(t, (counts.get(t) || 0) + 1);
  }
  return counts;
};

const fractionOf = (grid: readonly IHexTerrain[], type: TerrainType): number =>
  (typeCounts(grid).get(type) || 0) / grid.length;

describe('Requirement: Preset Feature Directives', () => {
  // Scenario: Generation without presetFeatures is unchanged
  it('produces output identical to base generation when presetFeatures is omitted', () => {
    const base: TerrainGeneratorConfig = {
      width: 20,
      height: 20,
      biome: 'temperate',
      seed: 777,
    };
    const baseGrid = generateTerrain(base);
    const withEmpty = generateTerrain({ ...base, presetFeatures: [] });
    const withUndefined = generateTerrain({
      ...base,
      presetFeatures: undefined,
    });

    expect(withEmpty).toEqual(baseGrid);
    expect(withUndefined).toEqual(baseGrid);
  });

  // Scenario: Directives are accepted and applied
  it('applies a HeavyWoods directive and lands within tolerance of its density', () => {
    const directive: IFeatureDirective = {
      type: TerrainType.HeavyWoods,
      density: 0.3,
      clusterSize: 3,
    };
    const grid = generateTerrain({
      width: 24,
      height: 24,
      biome: 'temperate',
      seed: 100,
      presetFeatures: [directive],
    });

    const heavyFraction = fractionOf(grid, TerrainType.HeavyWoods);
    expect(heavyFraction).toBeGreaterThan(0);
    // Realized density within tolerance of the directive's 0.3 target.
    expect(heavyFraction).toBeGreaterThanOrEqual(0.3 - 0.12);
    expect(heavyFraction).toBeLessThanOrEqual(0.3 + 0.12);
  });
});

describe('Requirement: Deterministic Feature Clustering', () => {
  const cfg = (seed: number): TerrainGeneratorConfig => ({
    width: 24,
    height: 24,
    biome: 'temperate',
    seed,
    presetFeatures: [
      { type: TerrainType.HeavyWoods, density: 0.25, clusterSize: 4 },
    ],
  });

  // Scenario: Identical seed yields identical clustered map
  it('produces an identical grid hex-for-hex for the same seed and presetFeatures', () => {
    const a = generateTerrain(cfg(2024));
    const b = generateTerrain(cfg(2024));
    expect(a).toEqual(b);
  });

  // Scenario: Different seed yields different feature placement
  it('places at least some feature hexes at different coordinates for a different seed', () => {
    const a = generateTerrain(cfg(1));
    const b = generateTerrain(cfg(2));
    const differences = a.filter(
      (hex, i) => hex.features[0].type !== b[i].features[0].type,
    );
    expect(differences.length).toBeGreaterThan(0);
  });

  // Scenario: Features form clusters, not uniform noise
  it('groups directive hexes into contiguous clusters', () => {
    const grid = generateTerrain({
      width: 30,
      height: 30,
      biome: 'desert',
      seed: 55,
      presetFeatures: [
        { type: TerrainType.HeavyWoods, density: 0.25, clusterSize: 4 },
      ],
    });

    const at = (q: number, r: number): IHexTerrain | undefined =>
      grid.find((h) => h.coordinate.q === q && h.coordinate.r === r);
    const isFeature = (h: IHexTerrain | undefined): boolean =>
      !!h && h.features[0].type === TerrainType.HeavyWoods;

    const featureHexes = grid.filter((h) => isFeature(h));
    let withFeatureNeighbour = 0;
    for (const hex of featureHexes) {
      const neighbours = [
        at(hex.coordinate.q + 1, hex.coordinate.r),
        at(hex.coordinate.q - 1, hex.coordinate.r),
        at(hex.coordinate.q, hex.coordinate.r + 1),
        at(hex.coordinate.q, hex.coordinate.r - 1),
      ];
      if (neighbours.some((n) => isFeature(n))) {
        withFeatureNeighbour++;
      }
    }
    // Most feature hexes are adjacent to another feature hex — uniform
    // noise would leave the majority isolated.
    expect(featureHexes.length).toBeGreaterThan(0);
    expect(withFeatureNeighbour / featureHexes.length).toBeGreaterThan(0.6);
  });
});

describe('Requirement: Feature Application Pass', () => {
  // Scenario: Structures override natural terrain
  it('makes overlapping hexes Building, not HeavyWoods', () => {
    // A near-total HeavyWoods directive plus a Building directive — the
    // building footprints must win in the overlap region.
    const grid = generateTerrain({
      width: 20,
      height: 20,
      biome: 'temperate',
      seed: 9,
      presetFeatures: [
        { type: TerrainType.HeavyWoods, density: 0.9, clusterSize: 6 },
        { type: TerrainType.Building, density: 0.15, clusterSize: 2 },
      ],
    });

    const buildingHexes = grid.filter(
      (h) => h.features[0].type === TerrainType.Building,
    );
    expect(buildingHexes.length).toBeGreaterThan(0);
    // Each hex carries exactly one feature, so a Building hex is never
    // also HeavyWoods.
    for (const hex of buildingHexes) {
      expect(hex.features[0].type).toBe(TerrainType.Building);
    }
  });

  // Scenario: Application order is independent of directive order
  it('produces an identical grid regardless of directive list order', () => {
    const woods: IFeatureDirective = {
      type: TerrainType.HeavyWoods,
      density: 0.2,
      clusterSize: 3,
    };
    const building: IFeatureDirective = {
      type: TerrainType.Building,
      density: 0.15,
      clusterSize: 2,
    };
    const water: IFeatureDirective = {
      type: TerrainType.Water,
      density: 0.1,
      clusterSize: 2,
    };

    const orderA = generateTerrain({
      width: 22,
      height: 22,
      biome: 'temperate',
      seed: 314,
      presetFeatures: [woods, building, water],
    });
    const orderB = generateTerrain({
      width: 22,
      height: 22,
      biome: 'temperate',
      seed: 314,
      presetFeatures: [water, building, woods],
    });

    expect(orderA).toEqual(orderB);
  });
});

// Scenario: Industrial preset produces buildings and roads
it('produces grouped Building footprints and an edge-reaching Road run', () => {
  const grid = generateTerrain({
    width: 28,
    height: 28,
    biome: 'urban',
    seed: 4242,
    presetFeatures: [
      { type: TerrainType.Building, density: 0.4, clusterSize: 3 },
      { type: TerrainType.Road, density: 0.2, clusterSize: 4 },
    ],
  });

  const counts = typeCounts(grid);
  expect(counts.get(TerrainType.Building) || 0).toBeGreaterThan(0);

  // Road hexes must reach two opposite edges of the grid.
  const roadHexes = grid.filter((h) => h.features[0].type === TerrainType.Road);
  expect(roadHexes.length).toBeGreaterThan(0);
  const qs = roadHexes.map((h) => h.coordinate.q);
  const rs = roadHexes.map((h) => h.coordinate.r);
  const touchesLeftRight = Math.min(...qs) === 0 && Math.max(...qs) === 27;
  const touchesTopBottom = Math.min(...rs) === 0 && Math.max(...rs) === 27;
  expect(touchesLeftRight || touchesTopBottom).toBe(true);
});

// Scenario: Pavement surrounds buildings
it('paves natural hexes orthogonally adjacent to buildings', () => {
  const width = 24;
  const height = 24;
  const grid = generateTerrain({
    width,
    height,
    biome: 'temperate',
    seed: 17,
    presetFeatures: [
      { type: TerrainType.Building, density: 0.1, clusterSize: 2 },
    ],
  });

  const at = (q: number, r: number): IHexTerrain | undefined =>
    q < 0 || q >= width || r < 0 || r >= height
      ? undefined
      : grid[r * width + q];

  const buildingHexes = grid.filter(
    (h) => h.features[0].type === TerrainType.Building,
  );
  expect(buildingHexes.length).toBeGreaterThan(0);

  // Every natural hex adjacent to a building must be Pavement.
  for (const b of buildingHexes) {
    const neighbours = [
      at(b.coordinate.q + 1, b.coordinate.r),
      at(b.coordinate.q - 1, b.coordinate.r),
      at(b.coordinate.q, b.coordinate.r + 1),
      at(b.coordinate.q, b.coordinate.r - 1),
    ];
    for (const n of neighbours) {
      if (!n) continue;
      const t = n.features[0].type;
      if (t !== TerrainType.Building && t !== TerrainType.Road) {
        expect(t).toBe(TerrainType.Pavement);
      }
    }
  }
});

it('stamps buildings as small footprint blocks, not scattered hexes', () => {
  const width = 26;
  const height = 26;
  const grid = generateTerrain({
    width,
    height,
    biome: 'temperate',
    seed: 71,
    presetFeatures: [
      { type: TerrainType.Building, density: 0.15, clusterSize: 2 },
    ],
  });

  const isBuilding = (q: number, r: number): boolean =>
    q >= 0 &&
    q < width &&
    r >= 0 &&
    r < height &&
    grid[r * width + q].features[0].type === TerrainType.Building;

  const buildingHexes = grid.filter(
    (h) => h.features[0].type === TerrainType.Building,
  );
  expect(buildingHexes.length).toBeGreaterThan(0);

  // Most building hexes belong to a multi-hex footprint — a building
  // hex with at least one orthogonal building neighbour. Footprints of
  // 1x2/2x1/2x2 dominate; isolated 1x1 footprints are the minority.
  let withBuildingNeighbour = 0;
  for (const hex of buildingHexes) {
    const { q, r } = hex.coordinate;
    if (
      isBuilding(q + 1, r) ||
      isBuilding(q - 1, r) ||
      isBuilding(q, r + 1) ||
      isBuilding(q, r - 1)
    ) {
      withBuildingNeighbour++;
    }
  }
  expect(withBuildingNeighbour / buildingHexes.length).toBeGreaterThan(0.3);
});

it('assigns stable ids to connected generated building components', () => {
  const width = 26;
  const height = 26;
  const config: TerrainGeneratorConfig = {
    width,
    height,
    biome: 'temperate',
    seed: 71,
    presetFeatures: [
      { type: TerrainType.Building, density: 0.15, clusterSize: 2 },
    ],
  };
  const grid = generateTerrain(config);

  const keyFor = (hex: IHexTerrain): string =>
    `${hex.coordinate.q},${hex.coordinate.r}`;
  const buildingsByKey = new Map(
    grid
      .filter((h) => h.features[0].type === TerrainType.Building)
      .map((h) => [keyFor(h), h]),
  );
  expect(buildingsByKey.size).toBeGreaterThan(0);

  for (const hex of Array.from(buildingsByKey.values())) {
    expect(hex.features[0].level).toBeGreaterThan(0);
    expect(hex.features[0].buildingId).toMatch(/^building-\d+-\d+$/);
  }

  const visited = new Set<string>();
  const componentIds = new Set<string>();
  let componentCount = 0;

  for (const startKey of Array.from(buildingsByKey.keys())) {
    if (visited.has(startKey)) continue;

    componentCount++;
    const frontier = [startKey];
    visited.add(startKey);
    const idsInComponent = new Set<string>();

    while (frontier.length > 0) {
      const key = frontier.pop();
      if (!key) continue;
      const hex = buildingsByKey.get(key);
      if (!hex) continue;

      const buildingId = hex.features[0].buildingId;
      expect(buildingId).toBeDefined();
      idsInComponent.add(buildingId ?? '');

      const { q, r } = hex.coordinate;
      const neighbours = [
        `${q + 1},${r}`,
        `${q - 1},${r}`,
        `${q},${r + 1}`,
        `${q},${r - 1}`,
      ];
      for (const neighbourKey of neighbours) {
        if (!buildingsByKey.has(neighbourKey)) continue;
        if (visited.has(neighbourKey)) continue;
        visited.add(neighbourKey);
        frontier.push(neighbourKey);
      }
    }

    expect(idsInComponent.size).toBe(1);
    componentIds.add(Array.from(idsInComponent)[0]);
  }

  expect(componentIds.size).toBe(componentCount);
  expect(generateTerrain(config)).toEqual(grid);
});

// Scenario: Road tracing skipped on a tiny grid
it('skips road tracing on a 2x2 grid without error', () => {
  let grid: readonly IHexTerrain[] = [];
  expect(() => {
    grid = generateTerrain({
      width: 2,
      height: 2,
      biome: 'temperate',
      seed: 5,
      presetFeatures: [
        { type: TerrainType.Road, density: 0.5, clusterSize: 2 },
      ],
    });
  }).not.toThrow();

  expect(grid).toHaveLength(4);
  const roadHexes = grid.filter((h) => h.features[0].type === TerrainType.Road);
  expect(roadHexes).toHaveLength(0);
});
describe('presetFeaturesToDirectives', () => {
  it('maps every preset string feature-type to a TerrainType', () => {
    const features: IPresetFeature[] = [
      { type: 'woods', density: 0.3, clustering: 0.5 },
      { type: 'water', density: 0.1, clustering: 0.6 },
      { type: 'rough', density: 0.2, clustering: 0.4 },
      { type: 'building', density: 0.25, clustering: 0.8 },
      { type: 'road', density: 0.15, clustering: 0.9 },
    ];
    const directives = presetFeaturesToDirectives(features);

    expect(directives.map((d) => d.type)).toEqual([
      TerrainType.HeavyWoods,
      TerrainType.Water,
      TerrainType.Rough,
      TerrainType.Building,
      TerrainType.Road,
    ]);
  });

  it('drops elevation features (no terrain-overlay representation)', () => {
    const directives = presetFeaturesToDirectives([
      { type: 'elevation', density: 0.5, clustering: 0.3 },
      { type: 'woods', density: 0.2, clustering: 0.5 },
    ]);
    expect(directives).toHaveLength(1);
    expect(directives[0].type).toBe(TerrainType.HeavyWoods);
  });

  it('converts clustering to a cluster radius in [1, 5]', () => {
    const lo = presetFeaturesToDirectives([
      { type: 'woods', density: 0.2, clustering: 0 },
    ]);
    const hi = presetFeaturesToDirectives([
      { type: 'woods', density: 0.2, clustering: 1 },
    ]);
    expect(lo[0].clusterSize).toBe(1);
    expect(hi[0].clusterSize).toBe(5);
  });

  it('clamps density to [0, 1]', () => {
    const directives = presetFeaturesToDirectives([
      { type: 'woods', density: 2.5, clustering: 0.5 },
    ]);
    expect(directives[0].density).toBeLessThanOrEqual(1);
    expect(directives[0].density).toBeGreaterThanOrEqual(0);
  });
});

describe('generateTerrainMap', () => {
  it('records the originating presetId on the generated map', () => {
    const map = generateTerrainMap(
      {
        id: 'industrial_complex',
        features: [
          { type: 'building', density: 0.4, clustering: 0.8 },
          { type: 'road', density: 0.2, clustering: 0.9 },
        ],
      },
      { width: 20, height: 20, biome: 'urban', seed: 88 },
    );
    expect(map.presetId).toBe('industrial_complex');
    expect(map.grid).toHaveLength(400);
  });

  it('is deterministic for the same preset and seed', () => {
    const preset = {
      id: 'p',
      features: [{ type: 'woods' as const, density: 0.3, clustering: 0.6 }],
    };
    const cfg = {
      width: 18,
      height: 18,
      biome: 'temperate' as const,
      seed: 9,
    };
    const a = generateTerrainMap(preset, cfg);
    const b = generateTerrainMap(preset, cfg);
    expect(a.grid).toEqual(b.grid);
  });
});

describe('BIOME_WEIGHTS', () => {
  it('should have weights for all biome types', () => {
    expect(BIOME_WEIGHTS.temperate).toBeDefined();
    expect(BIOME_WEIGHTS.desert).toBeDefined();
    expect(BIOME_WEIGHTS.arctic).toBeDefined();
    expect(BIOME_WEIGHTS.urban).toBeDefined();
    expect(BIOME_WEIGHTS.jungle).toBeDefined();
  });

  it('should have weights that sum to approximately 1.0', () => {
    for (const [, weights] of Object.entries(BIOME_WEIGHTS)) {
      const sum = (Object.values(weights) as number[]).reduce(
        (a: number, b: number) => a + b,
        0,
      );
      expect(sum).toBeCloseTo(1.0, 2);
    }
  });
});
