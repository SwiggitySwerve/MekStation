import type { IHexTerrain } from '@/types/gameplay';

import { TerrainType } from '@/types/gameplay';

type TerrainFeature = IHexTerrain['features'][number];

function terrainBuildingFeaturesForTerrain(
  terrain: IHexTerrain | undefined,
): readonly TerrainFeature[] {
  if (!terrain) return [];
  return terrain.features.filter(
    (feature) =>
      feature.type === TerrainType.Building ||
      Boolean(feature.buildingId) ||
      feature.constructionFactor !== undefined,
  );
}

function joinedUniqueAttribute<T extends string | number>(
  values: readonly (T | undefined)[],
): string | undefined {
  const uniqueValues = Array.from(
    new Set(values.filter((value): value is T => value !== undefined)),
  );
  return uniqueValues.length > 0 ? uniqueValues.join(',') : undefined;
}

export function terrainBuildingIdsAttribute(
  terrain: IHexTerrain | undefined,
): string | undefined {
  return joinedUniqueAttribute(
    terrainBuildingFeaturesForTerrain(terrain).map(
      (feature) => feature.buildingId,
    ),
  );
}

export function terrainBuildingLevelsAttribute(
  terrain: IHexTerrain | undefined,
): string | undefined {
  return joinedUniqueAttribute(
    terrainBuildingFeaturesForTerrain(terrain).map((feature) => feature.level),
  );
}

export function terrainBuildingConstructionFactorsAttribute(
  terrain: IHexTerrain | undefined,
): string | undefined {
  return joinedUniqueAttribute(
    terrainBuildingFeaturesForTerrain(terrain).map(
      (feature) => feature.constructionFactor,
    ),
  );
}

function formatTerrainBuildingDetail(feature: TerrainFeature): string {
  const parts = [`level ${feature.level}`];
  if (feature.constructionFactor !== undefined) {
    parts.push(`CF ${feature.constructionFactor}`);
  }

  const label = feature.buildingId ?? 'unidentified';
  return `${label} (${parts.join(', ')})`;
}

export function terrainBuildingDetailLabel(
  terrain: IHexTerrain | undefined,
): string | undefined {
  const details = terrainBuildingFeaturesForTerrain(terrain).map(
    formatTerrainBuildingDetail,
  );
  return details.length > 0 ? details.join('; ') : undefined;
}
