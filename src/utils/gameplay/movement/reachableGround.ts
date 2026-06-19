import type {
  IHexCoordinate,
  IHexGrid,
  IMovementRangeHex,
  IUnitGameState,
  MovementTravelMode,
} from '@/types/gameplay';
import type { MovementType } from '@/types/gameplay';

import type {
  HullDownExitProjection,
  ReservedProjectionApplier,
  StandUpProjection,
} from './reachableProjectionTypes';

import { withAutomaticWigeLandingProjection } from './automaticWigeLanding';
import {
  calculatePathMovementCost,
  type IMovementCostContext,
} from './calculations';
import { findPath } from './pathfinding';
import {
  blockedRangeHex,
  finalStepCost,
  overBudgetRangeHex,
} from './rangeHexProjection';
import { withPostureProjection } from './reachableProjectionHelpers';

export interface IGroundRangeHexInput {
  readonly unit: IUnitGameState;
  readonly grid: IHexGrid;
  readonly origin: IHexCoordinate;
  readonly hex: IHexCoordinate;
  readonly mpType: MovementType;
  readonly movementMode: MovementTravelMode;
  readonly pathBudget: number;
  readonly maxPathCost: number;
  readonly reservedCost: number;
  readonly reservedNoun: string;
  readonly costContext: IMovementCostContext;
  readonly heatGenerated: number;
  readonly standUpProjection: StandUpProjection;
  readonly hullDownExitProjection: HullDownExitProjection;
  readonly withReservedProjection: ReservedProjectionApplier;
}

export function deriveGroundRangeHex(
  input: IGroundRangeHexInput,
): IMovementRangeHex {
  const path = findReachableGroundPath(input);
  if (!path || path.length === 0) return deriveBlockedGroundRangeHex(input);

  const pathCost = calculatePathMovementCost(
    input.grid,
    path,
    input.movementMode,
    input.costContext,
  );
  const cost = pathCost + input.reservedCost;
  const maxTotalCost = input.maxPathCost + input.reservedCost;
  if (cost > maxTotalCost) {
    return deriveGroundOverMaxTotalRangeHex(input, path, cost, maxTotalCost);
  }

  const finalStep = finalStepCost(
    input.grid,
    path,
    input.movementMode,
    input.costContext,
  );
  return input.withReservedProjection(
    withAutomaticWigeLandingProjection(
      {
        hex: input.hex,
        mpCost: cost,
        terrainCost: finalStep?.terrainCost,
        elevationDelta: finalStep?.elevationDelta,
        elevationCost: finalStep?.elevationCost,
        path,
        heatGenerated: input.heatGenerated,
        movementMode: input.movementMode,
        reachable: true,
        movementType: input.mpType,
        ...input.standUpProjection,
        ...input.hullDownExitProjection,
      },
      input.unit,
    ),
  );
}

function findReachableGroundPath(
  input: IGroundRangeHexInput,
): readonly IHexCoordinate[] | null {
  const directPath = findPath({
    grid: input.grid,
    start: input.origin,
    end: input.hex,
    maxCost: input.pathBudget,
    movementType: input.movementMode,
    context: input.costContext,
  });
  if (directPath || input.maxPathCost <= input.pathBudget) return directPath;

  return findPath({
    grid: input.grid,
    start: input.origin,
    end: input.hex,
    maxCost: input.maxPathCost,
    movementType: input.movementMode,
    context: input.costContext,
    options: { requirePavementRoadBonusSurface: true },
  });
}

function deriveBlockedGroundRangeHex(
  input: IGroundRangeHexInput,
): IMovementRangeHex {
  const blockedProjection = blockedRangeHex({
    grid: input.grid,
    origin: input.origin,
    hex: input.hex,
    mpType: input.mpType,
    movementMode: input.movementMode,
    maxCost: input.maxPathCost,
    blockedReason: `No legal ${input.movementMode} path within ${input.maxPathCost} MP`,
    costContext: input.costContext,
  });
  if (blockedProjection.movementInvalidReason === 'TerrainBlocked') {
    return input.withReservedProjection(
      withPostureProjection(
        blockedProjection,
        input.standUpProjection,
        input.hullDownExitProjection,
      ),
    );
  }

  const diagnosticPath = findPath({
    grid: input.grid,
    start: input.origin,
    end: input.hex,
    maxCost: Number.MAX_SAFE_INTEGER,
    movementType: input.movementMode,
    context: input.costContext,
  });
  if (diagnosticPath && diagnosticPath.length > 0) {
    return deriveOverBudgetGroundRangeHex(input, diagnosticPath);
  }

  return input.withReservedProjection(
    withPostureProjection(
      blockedProjection,
      input.standUpProjection,
      input.hullDownExitProjection,
    ),
  );
}

function deriveOverBudgetGroundRangeHex(
  input: IGroundRangeHexInput,
  diagnosticPath: readonly IHexCoordinate[],
): IMovementRangeHex {
  return input.withReservedProjection(
    withPostureProjection(
      overBudgetRangeHex({
        grid: input.grid,
        path: diagnosticPath,
        hex: input.hex,
        mpType: input.mpType,
        movementMode: input.movementMode,
        pathBudget: input.pathBudget,
        maxPathCost: input.maxPathCost,
        standingCost: input.reservedCost,
        reservedCostLabel: input.reservedNoun,
        costContext: input.costContext,
      }),
      input.standUpProjection,
      input.hullDownExitProjection,
    ),
  );
}

function deriveGroundOverMaxTotalRangeHex(
  input: IGroundRangeHexInput,
  path: readonly IHexCoordinate[],
  cost: number,
  maxTotalCost: number,
): IMovementRangeHex {
  const finalStep = finalStepCost(
    input.grid,
    path,
    input.movementMode,
    input.costContext,
  );
  const details =
    input.reservedCost > 0
      ? `Path costs ${cost} MP including ${input.reservedNoun}, but only ${maxTotalCost} MP is available`
      : `Path costs ${cost} MP, but only ${input.maxPathCost} MP is available`;
  return input.withReservedProjection({
    hex: input.hex,
    mpCost: cost,
    terrainCost: finalStep?.terrainCost,
    elevationDelta: finalStep?.elevationDelta,
    elevationCost: finalStep?.elevationCost,
    path,
    heatGenerated: 0,
    movementMode: input.movementMode,
    reachable: false,
    movementType: input.mpType,
    blockedReason: details,
    movementInvalidReason: 'InsufficientMP',
    movementInvalidDetails: details,
    ...input.standUpProjection,
    ...input.hullDownExitProjection,
  });
}
