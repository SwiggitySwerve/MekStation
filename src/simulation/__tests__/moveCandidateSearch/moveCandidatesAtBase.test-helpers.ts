import type {
  Facing,
  IHexGrid,
  IMovementCapability,
  IUnitPosition,
} from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';
import { isInBounds, isOccupied } from '@/utils/gameplay/hexGrid';
import { hexDistance } from '@/utils/gameplay/hexMath';
import {
  prepareGroundPathMpCost,
  calculateMovementHeat,
  findPath,
  getFacingChangeCost,
  getMaxMP,
  type IMovementCostContext,
  type UnitMovementType,
  movementModeForPath,
} from '@/utils/gameplay/movement';

import type { IMove } from '../../ai/types';

/**
 * Frozen `getValidMoveCandidates` at bc5090609 (before the bounded candidate
 * search), kept only as an equivalence oracle: every in-range hex gets an
 * unbounded `findPath`, and moves over maxMP are dropped afterwards.
 */
export function moveCandidatesAtBase(
  grid: IHexGrid,
  position: IUnitPosition,
  movementType: MovementType,
  capability: IMovementCapability,
  movementContext?: IMovementCostContext,
): readonly IMove[] {
  const maxMP = getMaxMP(capability, movementType);
  const destinations = enumerateDestinationsAtBase(position.coord, maxMP);
  const moves: IMove[] = [];

  for (const destination of destinations) {
    if (!isInBounds(grid, destination)) continue;
    const distance = hexDistance(position.coord, destination);
    if (distance > 0 && isOccupied(grid, destination)) continue;

    const path =
      movementType !== MovementType.Jump && distance > 0
        ? findPath(
            grid,
            position.coord,
            destination,
            Infinity,
            toGroundUnitMovementType(movementType),
            movementContext,
          )
        : null;
    if (movementType !== MovementType.Jump && distance > 0 && !path) {
      continue;
    }

    const groundPathPrice = path
      ? prepareGroundPathMpCost(
          grid,
          path,
          toGroundUnitMovementType(movementType),
          position.facing,
          movementContext,
        )
      : undefined;

    for (let facing = 0; facing < 6; facing++) {
      const typedFacing = facing as Facing;
      const mpCost =
        distance === 0
          ? getFacingChangeCost(position.facing, typedFacing)
          : movementType === MovementType.Jump
            ? distance
            : groundPathPrice
              ? groundPathPrice(typedFacing)
              : Infinity;

      if (mpCost > maxMP) continue;

      moves.push({
        destination,
        facing: typedFacing,
        movementType,
        mpCost,
        heatGenerated: calculateMovementHeat(movementType, distance, {
          movementMode: capability.movementMode,
          movementHeatProfile: capability.movementHeatProfile,
          partialWingJumpBonus: capability.partialWingJumpBonus,
        }),
      });
    }
  }

  return moves;
}

function toGroundUnitMovementType(
  movementType: MovementType,
): UnitMovementType {
  return movementModeForPath(movementType) === 'run' ? 'run' : 'walk';
}

function enumerateDestinationsAtBase(
  origin: { q: number; r: number },
  maxMP: number,
): { q: number; r: number }[] {
  const destinations: { q: number; r: number }[] = [];
  for (let dq = -maxMP; dq <= maxMP; dq++) {
    for (let dr = -maxMP; dr <= maxMP; dr++) {
      destinations.push({ q: origin.q + dq, r: origin.r + dr });
    }
  }
  return destinations;
}
