import {
  TerrainType,
  type ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';

const terrainFeaturesCache = new Map<string, readonly ITerrainFeature[]>();
const terrainTypeValues = new Set<string>(Object.values(TerrainType));

function cacheTerrainFeatures(
  terrainString: string,
  features: readonly ITerrainFeature[],
): readonly ITerrainFeature[] {
  const frozenFeatures = Object.freeze(features);
  terrainFeaturesCache.set(terrainString, frozenFeatures);
  return frozenFeatures;
}

function hasFeatureMetadata(feature: ITerrainFeature): boolean {
  return (
    feature.constructionFactor !== undefined ||
    feature.buildingId !== undefined ||
    feature.fuelTankElevation !== undefined ||
    feature.fuelTankId !== undefined ||
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
  const cachedFeatures = terrainFeaturesCache.get(terrainString);
  if (cachedFeatures) return cachedFeatures;

  if (!terrainString) return cacheTerrainFeatures(terrainString, []);

  if (terrainString.startsWith('[')) {
    try {
      const parsed = JSON.parse(terrainString) as readonly ITerrainFeature[];
      return cacheTerrainFeatures(
        terrainString,
        Array.isArray(parsed) ? parsed : [],
      );
    } catch {
      return cacheTerrainFeatures(terrainString, []);
    }
  }

  const terrainType = terrainString as TerrainType;
  if (!terrainTypeValues.has(terrainType)) {
    return cacheTerrainFeatures(terrainString, []);
  }

  return cacheTerrainFeatures(terrainString, [
    {
      type: terrainType,
      level: terrainType === TerrainType.Clear ? 0 : 1,
    },
  ]);
}
