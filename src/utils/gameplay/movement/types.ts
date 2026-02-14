/**
 * Movement Types and Record Creation
 */

import {
  IMovementRecord,
  MovementType,
  Facing,
  IHexCoordinate,
  IUnitPosition,
} from '@/types/gameplay';

import { hexDistance } from '../hexMath';

/**
 * Extended movement type including vehicle movement modes.
 */
export type UnitMovementType =
  | 'walk'
  | 'run'
  | 'jump'
  | 'tracked'
  | 'wheeled'
  | 'hover'
  | 'vtol';

/**
 * Create a movement record for a completed movement.
 */
export function createMovementRecord(
  unitId: string,
  start: IUnitPosition,
  end: IHexCoordinate,
  endFacing: Facing,
  movementType: MovementType,
  path: readonly IHexCoordinate[],
): IMovementRecord {
  return {
    unitId,
    startCoord: start.coord,
    endCoord: end,
    startFacing: start.facing,
    endFacing,
    movementType,
    hexesMoved: hexDistance(start.coord, end),
    path,
  };
}
