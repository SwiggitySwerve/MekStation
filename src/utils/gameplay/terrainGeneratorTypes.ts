/**
 * Procedural terrain generation — shared types and the seeded RNG.
 *
 * Extracted into a leaf module so the base generator (`terrainGenerator.ts`)
 * and the feature overlay (`terrainFeatures.ts`) can both depend on these
 * without a circular import.
 *
 * @spec openspec/changes/add-procedural-map-variety/specs/terrain-generation/spec.md
 */

import type { TerrainType } from '@/types/gameplay/TerrainTypes';

/** The five base biomes recognised by the terrain generator. */
export type BiomeType = 'temperate' | 'desert' | 'arctic' | 'urban' | 'jungle';

/**
 * A single preset feature-placement directive.
 *
 * Each directive asks the feature-application pass to overlay a terrain
 * type onto the base-generated grid as seeded clusters.
 *
 * @spec openspec/changes/add-procedural-map-variety/specs/terrain-generation/spec.md
 */
export interface IFeatureDirective {
  /** The terrain type to stamp onto the grid. */
  readonly type: TerrainType;
  /** Target fraction of grid hexes the feature should cover, `[0, 1]`. */
  readonly density: number;
  /** Mean cluster radius in hexes (>= 1). */
  readonly clusterSize: number;
}

export interface TerrainGeneratorConfig {
  width: number;
  height: number;
  biome: BiomeType;
  seed?: number;
  /**
   * Optional ordered list of feature-placement directives. When omitted or
   * empty, `generateTerrain` produces output identical to base biome
   * generation. The feature-application pass applies directives in a fixed
   * order independent of their order here.
   *
   * @spec openspec/changes/add-procedural-map-variety/specs/terrain-generation/spec.md
   */
  readonly presetFeatures?: readonly IFeatureDirective[];
}

/**
 * Linear-congruential seeded RNG used by both the base biome pass and the
 * feature overlay. Sharing one instance across both passes keeps the whole
 * generated map a single deterministic function of the seed.
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /** Draw a float in `[0, 1)`. */
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  /** Draw an integer in `[0, max)`. */
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
}
