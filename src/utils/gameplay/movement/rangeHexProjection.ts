import type {
  IHexCoordinate,
  IHexGrid,
  IMovementRangeHex,
} from '@/types/gameplay';
import type { IMovementInvalidPayload } from '@/types/gameplay/GameSessionMovementEvents';

import { MovementType } from '@/types/gameplay';
import { hexDistance, hexLine } from '@/utils/gameplay/hexMath';

import type { UnitMovementType } from './types';

import {
  calculatePathMovementCost,
  getJumpElevationDelta,
  getMovementStepCostBreakdown,
  type IMovementCostContext,
  movementCostContextForStep,
} from './calculations';
import { hexHasPavementRoadBonusSurface } from './pathfinding';

export function finalStepCost(
  grid: IHexGrid,
  path: readonly IHexCoordinate[],
  movementType: UnitMovementType,
  context: IMovementCostContext = {},
): ReturnType<typeof getMovementStepCostBreakdown> | null {
  if (path.length < 2) {
    return null;
  }
  const from = path[path.length - 2];
  const to = path[path.length - 1];
  return getMovementStepCostBreakdown(
    grid,
    to,
    movementType,
    from,
    movementCostContextForStep(context, path.length === 2),
  );
}

export function compareRangeHexes(
  a: IMovementRangeHex,
  b: IMovementRangeHex,
): number {
  if (a.reachable !== b.reachable) return a.reachable ? -1 : 1;
  if (a.mpCost === b.mpCost) return 0;
  if (!Number.isFinite(a.mpCost)) return 1;
  if (!Number.isFinite(b.mpCost)) return -1;
  return a.mpCost - b.mpCost;
}

export function blockedRangeHex({
  grid,
  origin,
  hex,
  mpType,
  movementMode,
  maxCost,
  blockedReason,
  costContext = {},
}: {
  readonly grid: IHexGrid;
  readonly origin: IHexCoordinate;
  readonly hex: IHexCoordinate;
  readonly mpType: MovementType;
  readonly movementMode: UnitMovementType;
  readonly maxCost: number;
  readonly blockedReason: string;
  readonly costContext?: IMovementCostContext;
}): IMovementRangeHex {
  const directStep =
    hexDistance(origin, hex) === 1
      ? getMovementStepCostBreakdown(
          grid,
          hex,
          movementMode,
          origin,
          movementCostContextForStep(costContext, true),
        )
      : null;
  const lineBlockedStep =
    directStep ??
    firstBlockedLineStep(grid, origin, hex, movementMode, costContext);
  const invalidReason = movementInvalidReasonForBlockedRangeHex(
    lineBlockedStep,
    maxCost,
  );
  const invalidDetails =
    lineBlockedStep?.blockedReason ??
    (lineBlockedStep &&
    Number.isFinite(lineBlockedStep.mpCost) &&
    lineBlockedStep.mpCost > maxCost
      ? `Path costs ${lineBlockedStep.mpCost} MP, but only ${maxCost} MP is available`
      : blockedReason);

  return {
    hex,
    mpCost: lineBlockedStep?.mpCost ?? Infinity,
    terrainCost: lineBlockedStep?.terrainCost,
    elevationDelta: lineBlockedStep?.elevationDelta,
    elevationCost: lineBlockedStep?.elevationCost,
    path: directStep ? [origin, hex] : undefined,
    heatGenerated: 0,
    movementMode,
    reachable: false,
    movementType: mpType,
    blockedReason: invalidDetails,
    movementInvalidReason: invalidReason,
    movementInvalidDetails: invalidDetails,
  };
}

export function insufficientMpRangeHex({
  grid,
  origin,
  hex,
  mpType,
  movementMode,
  mpCost,
  maxCost,
  costContext = {},
}: {
  readonly grid: IHexGrid;
  readonly origin: IHexCoordinate;
  readonly hex: IHexCoordinate;
  readonly mpType: MovementType;
  readonly movementMode: UnitMovementType;
  readonly mpCost: number;
  readonly maxCost: number;
  readonly costContext?: IMovementCostContext;
}): IMovementRangeHex {
  const directStep =
    hexDistance(origin, hex) === 1
      ? getMovementStepCostBreakdown(
          grid,
          hex,
          movementMode,
          origin,
          movementCostContextForStep(costContext, true),
        )
      : null;
  const details = `Destination is ${mpCost} hexes away, but max range for ${mpType} is ${maxCost}`;
  return {
    hex,
    mpCost: directStep?.mpCost ?? mpCost,
    terrainCost: directStep?.terrainCost,
    elevationDelta:
      directStep?.elevationDelta ?? getJumpElevationDelta(grid, origin, hex),
    elevationCost: directStep?.elevationCost,
    path: directStep ? [origin, hex] : undefined,
    heatGenerated: 0,
    movementMode,
    reachable: false,
    movementType: mpType,
    blockedReason: details,
    movementInvalidReason: 'InsufficientMP',
    movementInvalidDetails: details,
  };
}

export function overBudgetRangeHex({
  grid,
  path,
  hex,
  mpType,
  movementMode,
  pathBudget,
  maxPathCost,
  standingCost,
  turningCost = 0,
  reservedCostLabel = 'stand-up',
  costContext = {},
}: {
  readonly grid: IHexGrid;
  readonly path: readonly IHexCoordinate[];
  readonly hex: IHexCoordinate;
  readonly mpType: MovementType;
  readonly movementMode: UnitMovementType;
  readonly pathBudget: number;
  readonly maxPathCost: number;
  readonly standingCost: number;
  readonly turningCost?: number;
  readonly reservedCostLabel?: string;
  readonly costContext?: IMovementCostContext;
}): IMovementRangeHex {
  const pathCost = calculatePathMovementCost(
    grid,
    path,
    movementMode,
    costContext,
  );
  const pathUsesPavementRoadBonus =
    maxPathCost > pathBudget &&
    path
      .slice(1)
      .every((step) =>
        hexHasPavementRoadBonusSurface(grid, step, movementMode),
      );
  const allowedPathCost = pathUsesPavementRoadBonus ? maxPathCost : pathBudget;
  const cost = pathCost + turningCost + standingCost;
  const allowedTotalCost = allowedPathCost + standingCost;
  const finalStep = finalStepCost(grid, path, movementMode, costContext);
  const turningDetail =
    turningCost > 0 ? ` including turning +${turningCost}` : '';
  const details =
    standingCost > 0
      ? `Path costs ${cost} MP${turningDetail} including ${reservedCostLabel}, but only ${allowedTotalCost} MP is available`
      : `Path costs ${cost} MP${turningDetail}, but only ${allowedPathCost} MP is available`;

  return {
    hex,
    mpCost: cost,
    terrainCost: finalStep?.terrainCost,
    elevationDelta: finalStep?.elevationDelta,
    elevationCost: finalStep?.elevationCost,
    turningCost: turningCost > 0 ? turningCost : undefined,
    path,
    heatGenerated: 0,
    movementMode,
    reachable: false,
    movementType: mpType,
    blockedReason: details,
    movementInvalidReason: 'InsufficientMP',
    movementInvalidDetails: details,
  };
}

function firstBlockedLineStep(
  grid: IHexGrid,
  origin: IHexCoordinate,
  hex: IHexCoordinate,
  movementMode: UnitMovementType,
  costContext: IMovementCostContext,
): ReturnType<typeof getMovementStepCostBreakdown> | null {
  const line = hexLine(origin, hex);
  if (line.length < 2) return null;
  for (let i = 1; i < line.length; i++) {
    const previous = line[i - 1];
    const current = line[i];
    const step = getMovementStepCostBreakdown(
      grid,
      current,
      movementMode,
      previous,
      movementCostContextForStep(costContext, i === 1),
    );
    if (step.blockedReason || !Number.isFinite(step.mpCost)) {
      return step;
    }
  }
  return null;
}

function movementInvalidReasonForBlockedRangeHex(
  directStep: ReturnType<typeof getMovementStepCostBreakdown> | null,
  maxCost: number,
): IMovementInvalidPayload['reason'] {
  if (directStep?.blockedReason) return 'TerrainBlocked';
  if (
    directStep &&
    Number.isFinite(directStep.mpCost) &&
    directStep.mpCost > maxCost
  ) {
    return 'InsufficientMP';
  }
  return 'NoLegalPath';
}

export function outOfBoundsRangeHex({
  hex,
  mpType,
  movementMode,
  mpCost,
  path,
}: {
  readonly hex: IHexCoordinate;
  readonly mpType: MovementType;
  readonly movementMode: UnitMovementType;
  readonly mpCost: number;
  readonly path?: readonly IHexCoordinate[];
}): IMovementRangeHex {
  return {
    hex,
    mpCost,
    terrainCost: 0,
    elevationDelta: 0,
    elevationCost: 0,
    path,
    heatGenerated: 0,
    movementMode,
    reachable: false,
    movementType: mpType,
    blockedReason: 'Destination is outside map bounds',
    movementInvalidReason: 'DestinationOutOfBounds',
    movementInvalidDetails: 'Destination is outside map bounds',
  };
}

export function occupiedRangeHex({
  grid,
  origin,
  hex,
  mpType,
  movementMode,
  mpCost,
  path,
}: {
  readonly grid: IHexGrid;
  readonly origin: IHexCoordinate;
  readonly hex: IHexCoordinate;
  readonly mpType: MovementType;
  readonly movementMode: UnitMovementType;
  readonly mpCost: number;
  readonly path: readonly IHexCoordinate[];
}): IMovementRangeHex {
  return {
    hex,
    mpCost,
    terrainCost: 0,
    elevationDelta: getJumpElevationDelta(grid, origin, hex),
    elevationCost: 0,
    path,
    heatGenerated: 0,
    movementMode,
    reachable: false,
    movementType: mpType,
    blockedReason: 'Destination hex is occupied',
    movementInvalidReason: 'DestinationOccupied',
    movementInvalidDetails: 'Destination hex is occupied',
  };
}
