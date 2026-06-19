import type {
  IHexCoordinate,
  IHexGrid,
  IMovementRangeHex,
  IUnitGameState,
  MovementTravelMode,
} from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';

import type { ReservedProjectionApplier } from './reachableProjectionTypes';

import { withAutomaticWigeLandingProjection } from './automaticWigeLanding';
import {
  getJumpClearanceBlockedReason,
  getJumpElevationBlockedReason,
  getJumpElevationDelta,
} from './calculations';

export interface IJumpRangeHexInput {
  readonly unit: IUnitGameState;
  readonly grid: IHexGrid;
  readonly origin: IHexCoordinate;
  readonly hex: IHexCoordinate;
  readonly dist: number;
  readonly pathBudget: number;
  readonly reservedCost: number;
  readonly heatGenerated: number;
  readonly movementMode: MovementTravelMode;
  readonly withReservedProjection: ReservedProjectionApplier;
}

export function deriveJumpRangeHex(
  input: IJumpRangeHexInput,
): IMovementRangeHex {
  const elevationDelta = getJumpElevationDelta(
    input.grid,
    input.origin,
    input.hex,
  );
  const clearanceBlockedReason = jumpClearanceBlockedReason(input);
  if (clearanceBlockedReason) {
    return input.withReservedProjection({
      hex: input.hex,
      mpCost: input.dist + input.reservedCost,
      elevationDelta,
      elevationCost: 0,
      terrainCost: 0,
      path: [input.origin, input.hex],
      heatGenerated: 0,
      movementMode: input.movementMode,
      reachable: false,
      movementType: MovementType.Jump,
      blockedReason: clearanceBlockedReason,
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails: clearanceBlockedReason,
    });
  }

  return input.withReservedProjection(
    withAutomaticWigeLandingProjection(
      {
        hex: input.hex,
        mpCost: input.dist + input.reservedCost,
        elevationDelta,
        elevationCost: 0,
        terrainCost: 0,
        path: [input.origin, input.hex],
        heatGenerated: input.heatGenerated,
        movementMode: input.movementMode,
        reachable: true,
        movementType: MovementType.Jump,
      },
      input.unit,
    ),
  );
}

function jumpClearanceBlockedReason(
  input: IJumpRangeHexInput,
): string | undefined {
  return (
    getJumpElevationBlockedReason(
      input.grid,
      input.origin,
      input.hex,
      input.pathBudget,
    ) ??
    getJumpClearanceBlockedReason(
      input.grid,
      input.origin,
      input.hex,
      input.pathBudget,
    ) ??
    undefined
  );
}
