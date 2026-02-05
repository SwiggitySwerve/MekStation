import {
  TerrainType,
  IHexTerrain,
  ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';

export type BiomeType = 'temperate' | 'desert' | 'arctic' | 'urban' | 'jungle';

export interface TerrainGeneratorConfig {
  width: number;
  height: number;
  biome: BiomeType;
  seed?: number;
}

export type BiomeWeights = Record<
  BiomeType,
  Partial<Record<TerrainType, number>>
>;

export const BIOME_WEIGHTS: BiomeWeights = {
  temperate: {
    [TerrainType.Clear]: 0.6,
    [TerrainType.LightWoods]: 0.12,
    [TerrainType.HeavyWoods]: 0.08,
    [TerrainType.Water]: 0.1,
    [TerrainType.Rough]: 0.05,
    [TerrainType.Mud]: 0.05,
  },
  desert: {
    [TerrainType.Sand]: 0.5,
    [TerrainType.Rough]: 0.3,
    [TerrainType.Clear]: 0.1,
    [TerrainType.Mud]: 0.05,
    [TerrainType.LightWoods]: 0.05,
  },
  arctic: {
    [TerrainType.Snow]: 0.4,
    [TerrainType.Ice]: 0.3,
    [TerrainType.Clear]: 0.2,
    [TerrainType.Rough]: 0.05,
    [TerrainType.Water]: 0.05,
  },
  urban: {
    [TerrainType.Pavement]: 0.4,
    [TerrainType.Building]: 0.3,
    [TerrainType.Clear]: 0.2,
    [TerrainType.Rubble]: 0.1,
  },
  jungle: {
    [TerrainType.HeavyWoods]: 0.4,
    [TerrainType.LightWoods]: 0.3,
    [TerrainType.Swamp]: 0.2,
    [TerrainType.Water]: 0.1,
  },
};

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
}

function createGradients(rng: SeededRandom, size: number): number[][] {
  const gradients: number[][] = [];
  for (let i = 0; i < size * size; i++) {
    const angle = rng.next() * Math.PI * 2;
    gradients.push([Math.cos(angle), Math.sin(angle)]);
  }
  return gradients;
}

function dotGridGradient(
  gradients: number[][],
  size: number,
  ix: number,
  iy: number,
  x: number,
  y: number,
): number {
  const dx = x - ix;
  const dy = y - iy;
  const idx = ((iy % size) * size + (ix % size) + size * size) % (size * size);
  const gradient = gradients[idx];
  return dx * gradient[0] + dy * gradient[1];
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function perlinNoise(
  gradients: number[][],
  size: number,
  x: number,
  y: number,
): number {
  const x0 = Math.floor(x);
  const x1 = x0 + 1;
  const y0 = Math.floor(y);
  const y1 = y0 + 1;

  const sx = fade(x - x0);
  const sy = fade(y - y0);

  const n0 = dotGridGradient(gradients, size, x0, y0, x, y);
  const n1 = dotGridGradient(gradients, size, x1, y0, x, y);
  const ix0 = lerp(n0, n1, sx);

  const n2 = dotGridGradient(gradients, size, x0, y1, x, y);
  const n3 = dotGridGradient(gradients, size, x1, y1, x, y);
  const ix1 = lerp(n2, n3, sx);

  return lerp(ix0, ix1, sy);
}

function octaveNoise(
  gradients: number[][],
  size: number,
  x: number,
  y: number,
  octaves: number,
  persistence: number,
): number {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total +=
      perlinNoise(gradients, size, x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }

  return total / maxValue;
}

function selectTerrainFromWeights(
  weights: Partial<Record<TerrainType, number>>,
  roll: number,
  noiseValue: number,
  elevation: number,
  isLowElevation: boolean,
): TerrainType {
  const entries = Object.entries(weights) as [TerrainType, number][];

  const modifiedWeights = entries.map(([type, weight]) => {
    let modifiedWeight = weight;

    if (type === TerrainType.Water && isLowElevation) {
      modifiedWeight *= 2.0;
    } else if (type === TerrainType.Water && !isLowElevation) {
      modifiedWeight *= 0.3;
    }

    if (
      (type === TerrainType.LightWoods || type === TerrainType.HeavyWoods) &&
      noiseValue > 0.3
    ) {
      modifiedWeight *= 1.5;
    }

    return [type, modifiedWeight] as [TerrainType, number];
  });

  const totalWeight = modifiedWeights.reduce((sum, [, w]) => sum + w, 0);
  const normalizedRoll = roll * totalWeight;

  let cumulative = 0;
  for (const [type, weight] of modifiedWeights) {
    cumulative += weight;
    if (normalizedRoll <= cumulative) {
      return type;
    }
  }

  return entries[0][0];
}

export function generateTerrain(config: TerrainGeneratorConfig): IHexTerrain[] {
  const { width, height, biome, seed } = config;
  const actualSeed = seed ?? Math.floor(Math.random() * 0x7fffffff);
  const rng = new SeededRandom(actualSeed);

  const gridSize = Math.max(width, height) + 4;
  const elevationGradients = createGradients(rng, gridSize);
  const terrainGradients = createGradients(rng, gridSize);

  const grid: IHexTerrain[] = [];
  const weights = BIOME_WEIGHTS[biome];

  const elevationScale = 0.15;
  const terrainScale = 0.2;

  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const elevationNoise = octaveNoise(
        elevationGradients,
        gridSize,
        q * elevationScale,
        r * elevationScale,
        3,
        0.5,
      );

      const terrainNoise = octaveNoise(
        terrainGradients,
        gridSize,
        q * terrainScale,
        r * terrainScale,
        2,
        0.5,
      );

      const normalizedElevation = (elevationNoise + 1) / 2;
      const elevation = Math.floor(normalizedElevation * 4);
      const clampedElevation = Math.max(0, Math.min(3, elevation));

      const isLowElevation = clampedElevation <= 1;
      const roll = rng.next();

      const terrainType = selectTerrainFromWeights(
        weights,
        roll,
        (terrainNoise + 1) / 2,
        clampedElevation,
        isLowElevation,
      );

      const feature: ITerrainFeature = {
        type: terrainType,
        level: terrainType === TerrainType.Water ? 1 : 0,
      };

      grid.push({
        coordinate: { q, r },
        elevation:
          terrainType === TerrainType.Water
            ? Math.min(clampedElevation, 1)
            : clampedElevation,
        features: [feature],
      });
    }
  }

  return grid;
}
