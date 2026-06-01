import {
  TerrainType,
  type ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';

function hasFeatureMetadata(feature: ITerrainFeature): boolean {
  return (
    feature.constructionFactor !== undefined ||
    feature.buildingId !== undefined ||
    feature.isOnFire !== undefined ||
    feature.isFrozen !== undefined ||
    feature.cliffTopExits !== undefined
  );
}

function canUseSimpleTerrainString(feature: ITerrainFeature): boolean {
  if (hasFeatureMetadata(feature)) return false;
  if (feature.type === TerrainType.Clear) return feature.level <= 0;
  return feature.level <= 1;
}

export function terrainStringFromFeatures(
  features: readonly ITerrainFeature[],
): string {
  if (features.length === 0) return TerrainType.Clear;
  if (features.length === 1 && canUseSimpleTerrainString(features[0])) {
    return features[0].type;
  }
  return JSON.stringify(features);
}

export function terrainFeaturesFromString(
  terrainString: string,
): readonly ITerrainFeature[] {
  if (!terrainString) return [];

  if (terrainString.startsWith('[')) {
    try {
      const parsed = JSON.parse(terrainString) as readonly ITerrainFeature[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  const terrainType = terrainString as TerrainType;
  if (!Object.values(TerrainType).includes(terrainType)) return [];

  return [
    {
      type: terrainType,
      level: terrainType === TerrainType.Clear ? 0 : 1,
    },
  ];
}
