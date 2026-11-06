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
  calculateMovementHeat,
  findPath,
  getFacingChangeCost,
  getMaxMP,
  movementModeForPath,
  type IMovementCostContext,
} from '@/utils/gameplay/movement';
import { referenceGroundPathMpCost } from '@/utils/gameplay/movement/__tests__/groundPathPricingReference.test-helpers';

import type { IMove } from '../ai/types';

/** Frozen MoveAI candidate loop at 28625ed54, kept only as an equivalence oracle. */
export function referenceMoveCandidates(
  grid: IHexGrid,
  position: IUnitPosition,
  movementType: MovementType,
  capability: IMovementCapability,
  movementContext?: IMovementCostContext,
): readonly IMove[] {
  const maxMP = getMaxMP(capability, movementType);
  const moves: IMove[] = [];
  const groundMode =
    movementModeForPath(movementType) === 'run' ? 'run' : 'walk';

  for (let dq = -maxMP; dq <= maxMP; dq++) {
    for (let dr = -maxMP; dr <= maxMP; dr++) {
      const destination = {
        q: position.coord.q + dq,
        r: position.coord.r + dr,
      };
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
              groundMode,
              movementContext,
            )
          : null;
      if (movementType !== MovementType.Jump && distance > 0 && !path) continue;

      for (let facing = 0; facing < 6; facing++) {
        const typedFacing = facing as Facing;
        const mpCost =
          distance === 0
            ? getFacingChangeCost(position.facing, typedFacing)
            : movementType === MovementType.Jump
              ? distance
              : path
                ? referenceGroundPathMpCost(
                    grid,
                    path,
                    groundMode,
                    position.facing,
                    typedFacing,
                    movementContext,
                  )
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
  }
  return moves;
}
