import type { IHexTerrain } from '@/types/gameplay';

import { Facing, TerrainType } from '@/types/gameplay';
import {
  getFacingAbbreviation,
  getFacingName,
} from '@/utils/gameplay/unitPosition';

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

function isFacing(value: number): value is Facing {
  return (
    Number.isInteger(value) &&
    value >= Facing.North &&
    value <= Facing.Northwest
  );
}

export function terrainCliffExitDirectionsForFeatures(
  features: readonly TerrainFeature[],
): readonly Facing[] {
  const directions = new Set<Facing>();
  for (const feature of features) {
    for (const direction of feature.cliffTopExits ?? []) {
      if (isFacing(direction)) {
        directions.add(direction);
      }
    }
  }

  return Array.from(directions).sort((a, b) => a - b);
}

export function terrainCliffExitDirectionsAttributeForFeatures(
  features: readonly TerrainFeature[],
): string | undefined {
  const directions = terrainCliffExitDirectionsForFeatures(features);
  return directions.length > 0 ? directions.join(',') : undefined;
}

export function terrainCliffExitLabelsAttributeForFeatures(
  features: readonly TerrainFeature[],
): string | undefined {
  const directions = terrainCliffExitDirectionsForFeatures(features);
  return directions.length > 0
    ? directions.map(getFacingAbbreviation).join(',')
    : undefined;
}

export function terrainCliffExitDetailLabelForFeatures(
  features: readonly TerrainFeature[],
): string | undefined {
  const directions = terrainCliffExitDirectionsForFeatures(features);
  return directions.length > 0
    ? `Cliff edges: ${directions.map(getFacingName).join(', ')}`
    : undefined;
}

export function terrainCliffExitDirectionsAttribute(
  terrain: IHexTerrain | undefined,
): string | undefined {
  return terrain
    ? terrainCliffExitDirectionsAttributeForFeatures(terrain.features)
    : undefined;
}

export function terrainCliffExitLabelsAttribute(
  terrain: IHexTerrain | undefined,
): string | undefined {
  return terrain
    ? terrainCliffExitLabelsAttributeForFeatures(terrain.features)
    : undefined;
}

export function terrainCliffExitDetailLabel(
  terrain: IHexTerrain | undefined,
): string | undefined {
  return terrain
    ? terrainCliffExitDetailLabelForFeatures(terrain.features)
    : undefined;
}
