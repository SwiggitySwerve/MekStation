import type { IHexCoordinate, IHexGrid } from '@/types/gameplay';

import {
  TerrainType,
  type ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { parseTerrainFeatures } from '@/utils/gameplay/lineOfSight';

/** Terrain-feature queries shared by the movement and displacement PSR producers. */

export function terrainAt(
  grid: IHexGrid,
  coord: IHexCoordinate | undefined,
): string | undefined {
  if (!coord) return undefined;
  return grid.hexes.get(coordToKey(coord))?.terrain;
}

export function terrainFeaturesFromTag(
  tag: string | undefined,
): readonly ITerrainFeature[] {
  if (!tag) return [];
  return parseTerrainFeatures(tag);
}

export function hasTerrainFeature(
  terrainFeatures: readonly ITerrainFeature[],
  terrainType: TerrainType,
): boolean {
  return terrainFeatures.some(
    (feature) => feature.type === terrainType && feature.level > 0,
  );
}

export function waterDepthFromFeatures(
  terrainFeatures: readonly ITerrainFeature[],
): number | undefined {
  const water = terrainFeatures.find(
    (feature) => feature.type === TerrainType.Water,
  );
  if (!water) return undefined;
  return Math.max(1, water.level);
}

export function terrainLevelFromFeatures(
  terrainFeatures: readonly ITerrainFeature[],
  terrainType: TerrainType,
): number | undefined {
  const feature = terrainFeatures.find((entry) => entry.type === terrainType);
  if (!feature) return undefined;
  return Math.max(1, feature.level);
}

export function hasOverloadedBuildingFeature(
  terrainFeatures: readonly ITerrainFeature[],
  unitTonnage: number | undefined,
): boolean {
  if (unitTonnage === undefined || !Number.isFinite(unitTonnage)) return false;

  const building = terrainFeatures.find(
    (feature) =>
      feature.type === TerrainType.Building &&
      feature.level > 0 &&
      feature.constructionFactor !== undefined &&
      Number.isFinite(feature.constructionFactor),
  );
  if (!building || building.constructionFactor === undefined) return false;

  return unitTonnage > building.constructionFactor;
}
