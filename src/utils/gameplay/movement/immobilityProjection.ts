import type {
  IHexCoordinate,
  IHexGrid,
  IMovementRangeHex,
} from '@/types/gameplay';
import type { IMovementInvalidPayload } from '@/types/gameplay/GameSessionMovementEvents';

import { MovementType } from '@/types/gameplay';

import type { UnitMovementType } from './types';

import { getJumpElevationDelta } from './calculations';

export function immobileMovementRangeHex({
  grid,
  origin,
  hex,
  mpType,
  movementMode,
  reason,
}: {
  readonly grid: IHexGrid;
  readonly origin: IHexCoordinate;
  readonly hex: IHexCoordinate;
  readonly mpType: MovementType;
  readonly movementMode: UnitMovementType;
  readonly reason: string;
}): IMovementRangeHex {
  const invalidReason: IMovementInvalidPayload['reason'] = 'UnitImmobile';
  return {
    hex,
    mpCost: 0,
    terrainCost: mpType === MovementType.Jump ? 0 : undefined,
    elevationDelta:
      mpType === MovementType.Jump
        ? getJumpElevationDelta(grid, origin, hex)
        : undefined,
    elevationCost: mpType === MovementType.Jump ? 0 : undefined,
    path: [origin],
    heatGenerated: 0,
    movementMode,
    reachable: false,
    movementType: mpType,
    blockedReason: reason,
    movementInvalidReason: invalidReason,
    movementInvalidDetails: reason,
  };
}
