import type {
  IHexCoordinate,
  IHexGrid,
} from '@/types/gameplay/HexGridInterfaces';

import { TerrainType } from '@/types/gameplay/TerrainTypes';

import type {
  ILOSCalculationOptions,
  ILOSResult,
  IEndpointWaterStatus,
  ISameBuildingContext,
} from './lineOfSight.types';

import { coordToKey } from './hexMath';
import { evaluateInterveningHex } from './lineOfSight.traceEvaluation';
import {
  blockedResult,
  emptyTraceState,
  resultFromState,
  traceContext,
} from './lineOfSight.traceState';
import {
  pathMinimumWaterDepth,
  underwaterMinimumWaterBlocker,
} from './lineOfSight.water';

interface ILOSInterveningTraceOptions {
  readonly interveningHexes: readonly IHexCoordinate[];
  readonly grid: IHexGrid;
  readonly shooterHeight: number;
  readonly targetHeight: number;
  readonly sameBuildingContext: ISameBuildingContext | undefined;
  readonly fromWater: IEndpointWaterStatus;
  readonly toWater: IEndpointWaterStatus;
  readonly initialMinimumWaterDepth: number;
  readonly tacOpsLosDiagram: boolean;
  readonly occupants: ILOSCalculationOptions['occupants'];
}

export function calculateLOSForInterveningHexes(
  options: ILOSInterveningTraceOptions,
): ILOSResult {
  const {
    fromWater,
    grid,
    initialMinimumWaterDepth: initialWaterDepth,
    interveningHexes,
    sameBuildingContext,
    shooterHeight,
    tacOpsLosDiagram,
    targetHeight,
    toWater,
  } = options;
  const state = emptyTraceState(sameBuildingContext);
  const minimumWaterDepth = pathMinimumWaterDepth(
    initialWaterDepth,
    interveningHexes,
    grid,
  );

  const underwaterClearBlocker = underwaterMinimumWaterBlocker(
    fromWater,
    toWater,
    interveningHexes,
    grid,
  );
  if (underwaterClearBlocker !== undefined) {
    return blockedResult({
      blockedBy: underwaterClearBlocker,
      blockingTerrain: TerrainType.Water,
      interveningHexes,
      minimumWaterDepth,
      state,
    });
  }

  const totalDistance = interveningHexes.length + 1;
  for (let i = 0; i < interveningHexes.length; i++) {
    const hex = interveningHexes[i];
    const hexData = grid.hexes.get(coordToKey(hex));
    if (!hexData) continue;

    const blocked = evaluateInterveningHex({
      context: traceContext({
        hex,
        hexData,
        currentDistance: i + 1,
        totalDistance,
        shooterHeight,
        targetHeight,
        tacOpsLosDiagram,
        sameBuildingContext,
        occupants: options.occupants,
        fromWater,
        toWater,
      }),
      interveningHexes,
      minimumWaterDepth,
      state,
    });
    if (blocked !== undefined) {
      return blocked;
    }
  }

  return resultFromState({
    hasLOS: true,
    interveningHexes,
    minimumWaterDepth,
    state,
  });
}
