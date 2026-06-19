import type {
  IHexCoordinate,
  IHexGrid,
} from '@/types/gameplay/HexGridInterfaces';

import { TerrainType } from '@/types/gameplay/TerrainTypes';

import type {
  IEndpointWaterContext,
  IEndpointWaterStatus,
} from './lineOfSight.types';

import { coordToKey } from './hexMath';
import { parseTerrainFeatures } from './lineOfSight.terrain';
import { parseWaterDepth } from './waterDepth';

export function terrainWaterDepth(terrainString: string): number {
  const taggedDepth = parseWaterDepth(terrainString);
  if (taggedDepth > 0 || terrainString.startsWith(TerrainType.Water)) {
    return taggedDepth;
  }

  const waterFeature = parseTerrainFeatures(terrainString).find(
    (feature) => feature.type === TerrainType.Water,
  );
  return Math.max(0, Math.trunc(waterFeature?.level ?? 0));
}

export function endpointWaterStatus({
  baseElevation,
  losElevation,
  terrainString,
}: IEndpointWaterContext): IEndpointWaterStatus {
  const waterDepth = terrainWaterDepth(terrainString ?? TerrainType.Clear);

  if (waterDepth <= 0) {
    return { state: 'land', depth: 0 };
  }

  if (losElevation === undefined) {
    return {
      state: waterDepth === 1 ? 'in-water' : 'underwater',
      depth: waterDepth,
    };
  }

  if (losElevation < baseElevation) {
    return { state: 'underwater', depth: waterDepth };
  }
  if (losElevation === baseElevation) {
    return { state: 'in-water', depth: waterDepth };
  }
  return { state: 'land', depth: waterDepth };
}

export function landToUnderwaterBlocked(
  fromWater: IEndpointWaterStatus,
  toWater: IEndpointWaterStatus,
): boolean {
  return (
    (fromWater.state === 'land' && toWater.state === 'underwater') ||
    (fromWater.state === 'underwater' && toWater.state === 'land')
  );
}

export function initialMinimumWaterDepth(
  fromWater: IEndpointWaterStatus,
  toWater: IEndpointWaterStatus,
): number {
  if (fromWater.state === 'land' || toWater.state === 'land') {
    return 0;
  }
  if (fromWater.state === 'in-water' || toWater.state === 'in-water') {
    return 1;
  }
  return Math.min(fromWater.depth, toWater.depth);
}

export function pathMinimumWaterDepth(
  initialDepth: number,
  interveningHexes: readonly IHexCoordinate[],
  grid: IHexGrid,
): number {
  return interveningHexes.reduce((minimumDepth, hex) => {
    const hexData = grid.hexes.get(coordToKey(hex));
    const terrain = hexData?.terrain ?? TerrainType.Clear;
    return Math.min(minimumDepth, terrainWaterDepth(terrain));
  }, initialDepth);
}

export function underwaterMinimumWaterBlocker(
  fromWater: IEndpointWaterStatus,
  toWater: IEndpointWaterStatus,
  interveningHexes: readonly IHexCoordinate[],
  grid: IHexGrid,
): IHexCoordinate | undefined {
  const underwaterCombat =
    fromWater.state === 'underwater' || toWater.state === 'underwater';

  if (
    !underwaterCombat ||
    fromWater.state === 'land' ||
    toWater.state === 'land'
  ) {
    return undefined;
  }

  return interveningHexes.find((hex) => {
    const hexData = grid.hexes.get(coordToKey(hex));
    const terrain = hexData?.terrain ?? TerrainType.Clear;
    return terrainWaterDepth(terrain) < 1;
  });
}
