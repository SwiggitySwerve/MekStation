import type { IHexCoordinate, IHexGrid } from '@/types/gameplay';
import type { ITerrainFeature } from '@/types/gameplay/TerrainTypes';

import { AXIAL_DIRECTION_DELTAS } from '@/types/gameplay';

import type { UnitMovementType } from './types';

import { getHex } from '../hexGrid';

export const WIGE_SHEER_CLIFF_ASCENT_SURCHARGE_MP = 1;

function directionFromTo(
  from: IHexCoordinate,
  to: IHexCoordinate,
): number | null {
  const delta = { q: to.q - from.q, r: to.r - from.r };
  const direction = AXIAL_DIRECTION_DELTAS.findIndex(
    (candidate) => candidate.q === delta.q && candidate.r === delta.r,
  );
  return direction >= 0 ? direction : null;
}

function featureHasCliffExitToward(
  feature: ITerrainFeature,
  direction: number,
): boolean {
  return feature.cliffTopExits?.includes(direction) ?? false;
}

export function hasDirectionalCliffTopTowards(
  terrainFeatures: readonly ITerrainFeature[],
  from: IHexCoordinate,
  toward: IHexCoordinate,
): boolean {
  const direction = directionFromTo(from, toward);
  if (direction === null) return false;
  return terrainFeatures.some((feature) =>
    featureHasCliffExitToward(feature, direction),
  );
}

function isVehicleCliffBlockedMovement(
  movementType: UnitMovementType,
): boolean {
  return (
    movementType === 'tracked' ||
    movementType === 'wheeled' ||
    movementType === 'hover'
  );
}

export function directionalCliffBlockedReason(input: {
  readonly movementType: UnitMovementType;
  readonly toTerrainFeatures: readonly ITerrainFeature[];
  readonly fromCoord: IHexCoordinate;
  readonly toCoord: IHexCoordinate;
  readonly elevationDelta: number;
  readonly hasPavementSurfaceFeature: boolean;
  readonly movementModeLabel: string;
}): string | null {
  if (!isVehicleCliffBlockedMovement(input.movementType)) return null;
  if (input.hasPavementSurfaceFeature) return null;
  if (input.elevationDelta !== 1 && input.elevationDelta !== 2) return null;
  if (
    !hasDirectionalCliffTopTowards(
      input.toTerrainFeatures,
      input.toCoord,
      input.fromCoord,
    )
  ) {
    return null;
  }

  return `${input.movementModeLabel} movement cannot ascend a sheer cliff`;
}

export function wigeSheerCliffAscentCost(input: {
  readonly grid: IHexGrid;
  readonly fromCoord: IHexCoordinate;
  readonly toCoord: IHexCoordinate;
  readonly toTerrainFeatures: readonly ITerrainFeature[];
  readonly movementType: UnitMovementType;
  readonly elevationDelta: number;
}): number {
  if (input.movementType !== 'wige') return 0;
  if (input.elevationDelta <= 0) return 0;
  if (!getHex(input.grid, input.fromCoord)) return 0;
  if (
    !hasDirectionalCliffTopTowards(
      input.toTerrainFeatures,
      input.toCoord,
      input.fromCoord,
    )
  ) {
    return 0;
  }

  return WIGE_SHEER_CLIFF_ASCENT_SURCHARGE_MP;
}
