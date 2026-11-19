import type {
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  IUnitPosition,
} from '@/types/gameplay';

import { Facing, MovementType } from '@/types/gameplay';
import { isInBounds, isOccupied } from '@/utils/gameplay/hexGrid';
import { coordToKey, hexDistance } from '@/utils/gameplay/hexMath';
import {
  prepareGroundPathMpCost,
  calculateMovementHeat,
  getFacingChangeCost,
  getMaxMP,
  type IMovementCostContext,
  type UnitMovementType,
  movementModeForPath,
} from '@/utils/gameplay/movement';
import {
  createPathSearchSpace,
  findPathInSearchSpace,
  floodSearchSpace,
} from '@/utils/gameplay/movement/pathfinding';

import type { IScoreMoveContext } from './MoveAI.scoring';
import type { IBotBehavior, IMove } from './types';

import { findAllPaths } from './AITerrainPathfinder';
import {
  resolveAdvancedParameters,
  resolveCoordinationParameters,
  resolveObjectiveParameters,
  resolveTierParameters,
} from './AITierRegistry';

export function getValidMoveCandidates(
  grid: IHexGrid,
  position: IUnitPosition,
  movementType: MovementType,
  capability: IMovementCapability,
  movementContext?: IMovementCostContext,
): readonly IMove[] {
  const maxMP = getMaxMP(capability, movementType);
  const destinations = enumerateMovementCandidateDestinations(
    position.coord,
    maxMP,
  );
  const moves: IMove[] = [];
  // One search space and one flood bounded at maxMP per call. Every finite
  // step costs at least 1 MP (`getHexMovementCost`), and a ground move costs
  // its path's step costs plus non-negative turning MP, so a destination the
  // flood does not reach yields no move and its search is skipped. Every path
  // still comes from the same unbounded A* that `findPath` runs.
  const groundSearch =
    movementType !== MovementType.Jump
      ? createPathSearchSpace(
          grid,
          position.coord,
          toGroundUnitMovementType(movementType),
          movementContext ?? {},
        )
      : null;
  const withinMaxMP = groundSearch
    ? floodSearchSpace(groundSearch, maxMP)
    : null;

  for (const destination of destinations) {
    if (!isInBounds(grid, destination)) continue;
    const distance = hexDistance(position.coord, destination);
    if (distance > 0 && isOccupied(grid, destination)) continue;
    if (
      withinMaxMP &&
      distance > 0 &&
      !withinMaxMP.has(coordToKey(destination))
    ) {
      continue;
    }

    const path =
      groundSearch && distance > 0
        ? findPathInSearchSpace(groundSearch, destination, Infinity)
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
        // Forward full capability heat state so motive-mode adjustments apply.
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

export function enrichScoreContext(
  behavior: IBotBehavior,
  ctx: IScoreMoveContext,
  moves: readonly IMove[],
): IScoreMoveContext {
  const tierParams = resolveTierParameters(behavior.tier);
  const tierMovement = tierParams.movement;
  const tierCoordination = resolveCoordinationParameters(tierParams);
  const tierObjective = resolveObjectiveParameters(tierParams);
  const tierAdvanced = resolveAdvancedParameters(tierParams);

  if (!tierMovement.pathfinderEnabled) {
    return {
      ...ctx,
      tierMovement,
      tierCoordination,
      tierObjective,
      tierAdvanced,
    };
  }

  const movementType = moves[0].movementType;
  const capability = ctx.capability ?? deriveCapability(moves, movementType);
  const pathByDestination = findAllPaths(
    ctx.grid,
    ctx.attacker.position,
    movementType,
    capability,
  );

  return {
    ...ctx,
    tierMovement,
    tierCoordination,
    tierObjective,
    tierAdvanced,
    pathByDestination,
  };
}

function deriveCapability(
  moves: readonly IMove[],
  movementType: MovementType,
): IMovementCapability {
  let maxMp = 0;
  for (const move of moves) {
    if (move.mpCost > maxMp) maxMp = move.mpCost;
  }
  return {
    walkMP: movementType === MovementType.Walk ? maxMp : 0,
    runMP: movementModeForPath(movementType) === 'run' ? maxMp : 0,
    jumpMP: movementType === MovementType.Jump ? maxMp : 0,
  };
}

function toGroundUnitMovementType(
  movementType: MovementType,
): UnitMovementType {
  return movementModeForPath(movementType) === 'run' ? 'run' : 'walk';
}

export function enumerateMovementCandidateDestinations(
  origin: IHexCoordinate,
  maxMP: number,
): readonly IHexCoordinate[] {
  const destinations: IHexCoordinate[] = [];

  for (let dq = -maxMP; dq <= maxMP; dq++) {
    for (let dr = -maxMP; dr <= maxMP; dr++) {
      destinations.push({
        q: origin.q + dq,
        r: origin.r + dr,
      });
    }
  }

  return destinations;
}
