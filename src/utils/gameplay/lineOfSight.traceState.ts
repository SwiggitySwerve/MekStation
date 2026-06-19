import type { IHex, IHexCoordinate } from '@/types/gameplay/HexGridInterfaces';
import type { TerrainType } from '@/types/gameplay/TerrainTypes';

import type {
  ILOSCalculationOptions,
  ILOSDamageableCoverProvider,
  ILOSInterveningTerrainEffect,
  ILOSResult,
  IEndpointWaterStatus,
  ISameBuildingContext,
} from './lineOfSight.types';

import { interpolateLOSHeight } from './lineOfSight.geometry';

export interface ILOSInterveningTraceState {
  readonly interveningTerrainEffects: ILOSInterveningTerrainEffect[];
  readonly damageableCoverProviders: ILOSDamageableCoverProvider[];
  cumulativeWoodsSmokeLosDensity: number;
  cumulativeHeavyIndustrial: number;
  cumulativePlantedFields: number;
  sameBuildingHexes: number;
}

export interface ITraceContext {
  readonly hex: IHexCoordinate;
  readonly hexData: IHex;
  readonly currentDistance: number;
  readonly targetDistance: number;
  readonly losHeight: number;
  readonly shooterHeight: number;
  readonly targetHeight: number;
  readonly tacOpsLosDiagram: boolean;
  readonly sameBuildingContext: ISameBuildingContext | undefined;
  readonly occupants: ILOSCalculationOptions['occupants'];
  readonly fromWater: IEndpointWaterStatus;
  readonly toWater: IEndpointWaterStatus;
}

export function traceContext(options: {
  readonly hex: IHexCoordinate;
  readonly hexData: IHex;
  readonly currentDistance: number;
  readonly totalDistance: number;
  readonly shooterHeight: number;
  readonly targetHeight: number;
  readonly tacOpsLosDiagram: boolean;
  readonly sameBuildingContext: ISameBuildingContext | undefined;
  readonly occupants: ILOSCalculationOptions['occupants'];
  readonly fromWater: IEndpointWaterStatus;
  readonly toWater: IEndpointWaterStatus;
}): ITraceContext {
  return {
    hex: options.hex,
    hexData: options.hexData,
    currentDistance: options.currentDistance,
    targetDistance: options.totalDistance - options.currentDistance,
    losHeight: interpolateLOSHeight(
      options.shooterHeight,
      options.targetHeight,
      options.totalDistance,
      options.currentDistance,
    ),
    shooterHeight: options.shooterHeight,
    targetHeight: options.targetHeight,
    tacOpsLosDiagram: options.tacOpsLosDiagram,
    sameBuildingContext: options.sameBuildingContext,
    occupants: options.occupants,
    fromWater: options.fromWater,
    toWater: options.toWater,
  };
}

export function resultFromState(options: {
  readonly hasLOS: boolean;
  readonly interveningHexes: readonly IHexCoordinate[];
  readonly minimumWaterDepth: number;
  readonly state: ILOSInterveningTraceState;
  readonly blockedBy?: IHexCoordinate;
  readonly blockingTerrain?: TerrainType;
  readonly blockingElevation?: number;
}): ILOSResult {
  return {
    hasLOS: options.hasLOS,
    blockedBy: options.blockedBy,
    blockingTerrain: options.blockingTerrain,
    blockingElevation: options.blockingElevation,
    interveningHexes: options.interveningHexes,
    interveningTerrainEffects: options.state.interveningTerrainEffects,
    minimumWaterDepth: options.minimumWaterDepth,
    damageableCoverProviders: options.state.damageableCoverProviders,
  };
}

export function blockedResult(options: {
  readonly interveningHexes: readonly IHexCoordinate[];
  readonly minimumWaterDepth: number;
  readonly state: ILOSInterveningTraceState;
  readonly blockedBy: IHexCoordinate;
  readonly blockingTerrain?: TerrainType;
  readonly blockingElevation?: number;
}): ILOSResult {
  return resultFromState({ ...options, hasLOS: false });
}

export function emptyTraceState(
  sameBuildingContext: ISameBuildingContext | undefined,
): ILOSInterveningTraceState {
  return {
    interveningTerrainEffects: [],
    damageableCoverProviders: [],
    cumulativeWoodsSmokeLosDensity: 0,
    cumulativeHeavyIndustrial: 0,
    cumulativePlantedFields: 0,
    sameBuildingHexes: sameBuildingContext?.endpointElevationDifference ?? 0,
  };
}
