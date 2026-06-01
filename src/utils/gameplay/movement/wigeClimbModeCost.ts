import type { IHexCoordinate, IHexGrid } from '@/types/gameplay';

import {
  TerrainType,
  TERRAIN_PROPERTIES,
  type ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';
import { terrainFeaturesFromString } from '@/utils/gameplay/terrainEncoding';

import type { UnitMovementType } from './types';

import { getHex } from '../hexGrid';
import { hexDistance } from '../hexMath';

const WIGE_CLIMB_MODE_SURCHARGE_MP = 2;

function representedFeatureCeiling(feature: ITerrainFeature): number {
  if (feature.type === TerrainType.Building && feature.level > 0) {
    return feature.level;
  }

  return TERRAIN_PROPERTIES[feature.type]?.losBlockHeight ?? 0;
}

function representedHexCeiling(
  surfaceElevation: number,
  terrainFeatures: readonly ITerrainFeature[],
): number {
  return (
    surfaceElevation +
    Math.max(
      0,
      ...terrainFeatures.map((feature) => representedFeatureCeiling(feature)),
    )
  );
}

export function wigeBuildingClimbModeCost(input: {
  readonly grid: IHexGrid;
  readonly fromCoord: IHexCoordinate;
  readonly toCoord: IHexCoordinate;
  readonly toElevation: number;
  readonly toTerrainFeatures: readonly ITerrainFeature[];
  readonly movementType: UnitMovementType;
}): number {
  if (input.movementType !== 'wige') return 0;
  if (hexDistance(input.fromCoord, input.toCoord) <= 0) return 0;
  if (
    !input.toTerrainFeatures.some(
      (feature) => feature.type === TerrainType.Building && feature.level > 0,
    )
  ) {
    return 0;
  }

  const fromHex = getHex(input.grid, input.fromCoord);
  if (!fromHex) return 0;

  const fromCeiling = representedHexCeiling(
    fromHex.elevation,
    terrainFeaturesFromString(fromHex.terrain),
  );
  const toCeiling = representedHexCeiling(
    input.toElevation,
    input.toTerrainFeatures,
  );
  return toCeiling > fromCeiling ? WIGE_CLIMB_MODE_SURCHARGE_MP : 0;
}
