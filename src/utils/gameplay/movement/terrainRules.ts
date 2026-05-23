import type { IMovementWaterCapability } from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';
import {
  TerrainType,
  type ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';

import type { IMovementCostContext } from './costContext';
import type { UnitMovementType } from './types';

function hasAmphibiousWaterMovement(
  waterCapability: IMovementWaterCapability | undefined,
): boolean {
  return Boolean(
    waterCapability?.fullyAmphibious || waterCapability?.limitedAmphibious,
  );
}

export function blocksWaterMovement(
  movementType: UnitMovementType,
  context: IMovementCostContext,
): boolean {
  const isRunningWaterEntry =
    context.declaredMovementType === MovementType.Run || movementType === 'run';
  const isWaterRunExemptMotive =
    movementType === 'hover' ||
    movementType === 'naval' ||
    movementType === 'hydrofoil' ||
    movementType === 'submarine' ||
    movementType === 'vtol' ||
    movementType === 'wige';

  if (isRunningWaterEntry && !isWaterRunExemptMotive && !context.isFirstStep) {
    return !context.waterCapability?.fullyAmphibious;
  }
  if (movementType === 'tracked' || movementType === 'wheeled') {
    return !(
      context.waterCapability?.fullyAmphibious ||
      context.waterCapability?.flotationHull
    );
  }
  return false;
}

export function waterMovementCostModifier(
  movementType: UnitMovementType,
  waterLevel: number,
  context: IMovementCostContext,
): number {
  if (waterLevel <= 0) return 0;
  if (
    movementType === 'jump' ||
    movementType === 'hover' ||
    movementType === 'vtol' ||
    movementType === 'wige' ||
    movementType === 'naval' ||
    movementType === 'hydrofoil' ||
    movementType === 'submarine'
  ) {
    return 0;
  }
  if (hasAmphibiousWaterMovement(context.waterCapability)) {
    return 1;
  }
  return waterLevel === 1 ? 1 : 3;
}

export const ROAD_LEVEL_DIRT = 3;
export const ROAD_LEVEL_GRAVEL = 4;

export function isPavedRoadFeature(feature: ITerrainFeature): boolean {
  return (
    feature.type === TerrainType.Road &&
    feature.level !== ROAD_LEVEL_DIRT &&
    feature.level !== ROAD_LEVEL_GRAVEL
  );
}

export function isPavementSurfaceFeature(feature: ITerrainFeature): boolean {
  return (
    feature.type === TerrainType.Bridge ||
    feature.type === TerrainType.Pavement ||
    isPavedRoadFeature(feature)
  );
}

export function isPavementRoadBonusEligibleMode(
  movementType: UnitMovementType,
): boolean {
  return (
    movementType === 'tracked' ||
    movementType === 'wheeled' ||
    movementType === 'hover'
  );
}

export function isPavementRoadBonusSurfaceFeature(
  feature: ITerrainFeature,
  movementType: UnitMovementType,
): boolean {
  if (
    feature.type === TerrainType.Bridge ||
    feature.type === TerrainType.Pavement ||
    isPavedRoadFeature(feature)
  ) {
    return true;
  }
  if (feature.type !== TerrainType.Road) return false;
  if (feature.level === ROAD_LEVEL_DIRT) return movementType === 'hover';
  if (feature.level === ROAD_LEVEL_GRAVEL) {
    return movementType === 'hover' || movementType === 'tracked';
  }
  return true;
}

export function bridgeClearanceBlockedReason(
  movementType: UnitMovementType,
  bridgeLevel: number | null,
  surfaceElevation: number,
  waterLevel: number,
  context: IMovementCostContext,
): string | null {
  if (bridgeLevel === null) return null;
  if (
    movementType !== 'naval' &&
    movementType !== 'hydrofoil' &&
    movementType !== 'submarine'
  ) {
    return null;
  }

  const unitHeight = context.unitHeight ?? 0;
  const clearanceBase =
    movementType === 'submarine'
      ? surfaceElevation - waterLevel
      : surfaceElevation;
  const clearance = bridgeLevel - clearanceBase;
  if (unitHeight < clearance) return null;
  return `${formatMovementModeForReason(movementType)} movement lacks bridge clearance`;
}

export function paysElevationCost(movementType: UnitMovementType): boolean {
  return (
    movementType !== 'jump' &&
    movementType !== 'vtol' &&
    movementType !== 'wige' &&
    movementType !== 'naval' &&
    movementType !== 'hydrofoil' &&
    movementType !== 'submarine'
  );
}

function hasGroundElevationLimit(movementType: UnitMovementType): boolean {
  return paysElevationCost(movementType);
}

export function maxElevationChangeForMovementType(
  movementType: UnitMovementType,
): number | null {
  if (!hasGroundElevationLimit(movementType)) return null;
  if (
    movementType === 'tracked' ||
    movementType === 'wheeled' ||
    movementType === 'hover'
  ) {
    return 1;
  }
  return 2;
}

export function requiresWaterTerrain(movementType: UnitMovementType): boolean {
  return (
    movementType === 'naval' ||
    movementType === 'hydrofoil' ||
    movementType === 'submarine'
  );
}

export function requiresOpenWaterTerrain(
  movementType: UnitMovementType,
): boolean {
  return movementType === 'naval' || movementType === 'hydrofoil';
}

export function requiresRailTerrain(movementType: UnitMovementType): boolean {
  return movementType === 'rail' || movementType === 'maglev';
}

export function formatMovementModeForReason(
  movementType: UnitMovementType,
): string {
  switch (movementType) {
    case 'vtol':
      return 'VTOL';
    case 'wige':
      return 'WiGE';
    default:
      return movementType.charAt(0).toUpperCase() + movementType.slice(1);
  }
}
