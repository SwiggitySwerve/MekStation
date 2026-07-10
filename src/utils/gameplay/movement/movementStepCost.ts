import type { IHexCoordinate, IHexGrid } from '@/types/gameplay';

import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { hasSPA } from '@/utils/gameplay/spaModifiers/canonicalize';
import { terrainFeaturesFromString } from '@/utils/gameplay/terrainEncoding';
import { getTerrainFeatureMovementCostModifier } from '@/utils/gameplay/terrainMovementCost';

import type { IMovementCostContext } from './costContext';
import type { UnitMovementType } from './types';

import { getHex } from '../hexGrid';
import {
  directionalCliffBlockedReason,
  wigeSheerCliffAscentCost,
} from './cliffTerrain';
import {
  blocksWaterMovement,
  bridgeClearanceBlockedReason,
  formatMovementModeForReason,
  isPavementSurfaceFeature,
  maxElevationChangeForMovementType,
  paysElevationCost,
  requiresOpenWaterTerrain,
  requiresRailTerrain,
  requiresWaterTerrain,
} from './terrainRules';
import { wigeBuildingClimbModeCost } from './wigeClimbModeCost';

type TerrainFeature = ReturnType<typeof terrainFeaturesFromString>[number];

export interface IMovementTerrainSummary {
  readonly terrainFeatures: readonly TerrainFeature[];
  readonly hasWaterFeature: boolean;
  readonly waterLevel: number;
  readonly hasPavementSurfaceFeature: boolean;
  readonly bridgeLevel: number | null;
  readonly hasSurfaceIce: boolean;
  readonly hasWoodsFeature: boolean;
}

export interface IMovementElevationStepCost {
  readonly terrainCost: number;
  readonly elevationCost: number;
  readonly elevationDelta: number;
  readonly blockedReason?: string;
}

export interface IMutableMovementTerrainSummary {
  terrainFeatures: readonly TerrainFeature[];
  hasWaterFeature: boolean;
  waterLevel: number;
  hasPavementSurfaceFeature: boolean;
  bridgeLevel: number | null;
  hasSurfaceIce: boolean;
  hasWoodsFeature: boolean;
}

export interface IMutableMovementElevationStepCost {
  terrainCost: number;
  elevationCost: number;
  elevationDelta: number;
  blockedReason?: string;
}

export function summarizeMovementTerrain(
  terrainText: string,
  summary: IMutableMovementTerrainSummary,
): void {
  const terrainFeatures = terrainFeaturesFromString(terrainText);
  let hasWaterFeature = false;
  let waterLevel = 0;
  let hasPavementSurfaceFeature = false;
  let bridgeLevel: number | null = null;
  let hasIceFeature = false;
  let hasWoodsFeature = false;

  for (const feature of terrainFeatures) {
    if (feature.type === TerrainType.Water) {
      hasWaterFeature = true;
      waterLevel = Math.max(waterLevel, feature.level);
    } else if (feature.type === TerrainType.Bridge) {
      bridgeLevel = Math.max(bridgeLevel ?? feature.level, feature.level);
    } else if (feature.type === TerrainType.Ice) {
      hasIceFeature = true;
    } else if (
      feature.type === TerrainType.LightWoods ||
      feature.type === TerrainType.HeavyWoods
    ) {
      hasWoodsFeature = true;
    }

    if (isPavementSurfaceFeature(feature)) {
      hasPavementSurfaceFeature = true;
    }
  }

  summary.terrainFeatures = terrainFeatures;
  summary.hasWaterFeature = hasWaterFeature;
  summary.waterLevel = waterLevel;
  summary.hasPavementSurfaceFeature = hasPavementSurfaceFeature;
  summary.bridgeLevel = bridgeLevel;
  summary.hasSurfaceIce = hasWaterFeature && hasIceFeature && waterLevel > 0;
  summary.hasWoodsFeature = hasWoodsFeature;
}

export function movementTerrainEntryBlockedReason(input: {
  readonly movementType: UnitMovementType;
  readonly terrain: IMovementTerrainSummary;
  readonly elevation: number;
  readonly context: IMovementCostContext;
}): string | undefined {
  if (
    requiresWaterTerrain(input.movementType) &&
    !input.terrain.hasWaterFeature
  ) {
    return `${formatMovementModeForReason(input.movementType)} movement requires water terrain`;
  }
  if (
    requiresOpenWaterTerrain(input.movementType) &&
    input.terrain.hasSurfaceIce
  ) {
    return `${formatMovementModeForReason(input.movementType)} movement requires open water terrain`;
  }

  const bridgeBlocked = bridgeClearanceBlockedReason(
    input.movementType,
    input.terrain.bridgeLevel,
    input.elevation,
    input.terrain.waterLevel,
    input.context,
  );
  if (bridgeBlocked) return bridgeBlocked;

  if (
    representedLowLightMovementPenalty(input.context) > 0 &&
    hasNightwalkerMovementRelief(input.context) &&
    input.movementType === 'run'
  ) {
    return 'Terrain Master: Nightwalker prohibits running in represented low-light conditions';
  }

  if (requiresRailTerrain(input.movementType)) {
    return `${formatMovementModeForReason(input.movementType)} movement requires rail terrain`;
  }
  return undefined;
}

export function lowLightMovementPenaltyCost(
  movementType: UnitMovementType,
  context: IMovementCostContext,
): number {
  if (
    representedLowLightMovementPenalty(context) > 0 &&
    !hasNightwalkerMovementRelief(context) &&
    isBattleMechGroundMovement(movementType)
  ) {
    return representedLowLightMovementPenalty(context);
  }
  return 0;
}

export function waterTerrainBlockedReason(input: {
  readonly movementType: UnitMovementType;
  readonly terrain: IMovementTerrainSummary;
  readonly context: IMovementCostContext;
}): string | undefined {
  if (
    input.terrain.hasWaterFeature &&
    !input.terrain.hasPavementSurfaceFeature &&
    !input.terrain.hasSurfaceIce &&
    input.terrain.waterLevel > 0 &&
    blocksWaterMovement(input.movementType, input.context) &&
    !input.context.waterCapability?.fullyAmphibious &&
    !hasFrogmanWaterMovement(input.context)
  ) {
    return 'Water blocks ground movement';
  }
  return undefined;
}

export function terrainFeatureMovementCost(input: {
  readonly terrainFeatures: readonly TerrainFeature[];
  readonly movementType: UnitMovementType;
  readonly context: IMovementCostContext;
}): number {
  return input.terrainFeatures.reduce((total, feature) => {
    if (feature.type === TerrainType.Water) return total;
    let featureCost = getTerrainFeatureMovementCostModifier(
      feature,
      input.movementType,
    );
    if (
      featureCost > 0 &&
      hasMountaineerMovementRelief(input.context) &&
      isBattleMechGroundMovement(input.movementType) &&
      (feature.type === TerrainType.Rough ||
        feature.type === TerrainType.Rubble)
    ) {
      featureCost -= 1;
    }
    return total + featureCost;
  }, 0);
}

export function movementElevationStepCost(
  grid: IHexGrid,
  fromCoord: IHexCoordinate | undefined,
  toCoord: IHexCoordinate,
  toElevation: number,
  terrainFeatures: readonly TerrainFeature[],
  movementType: UnitMovementType,
  hasPavementSurfaceFeature: boolean,
  context: IMovementCostContext,
  result: IMutableMovementElevationStepCost,
): void {
  result.terrainCost = 0;
  result.elevationCost = 0;
  result.elevationDelta = 0;
  result.blockedReason = undefined;

  if (!fromCoord) return;

  const fromHex = getHex(grid, fromCoord);
  if (!fromHex) {
    return;
  }

  const elevationDelta = toElevation - fromHex.elevation;
  result.elevationDelta = elevationDelta;
  const cliffBlockedReason = directionalCliffBlockedReason({
    movementType,
    toTerrainFeatures: terrainFeatures,
    fromCoord,
    toCoord,
    elevationDelta,
    hasPavementSurfaceFeature,
    movementModeLabel: formatMovementModeForReason(movementType),
  });
  if (cliffBlockedReason) {
    result.blockedReason = cliffBlockedReason;
    return;
  }

  movementElevationCost(movementType, context, elevationDelta, result);
  if (result.blockedReason) return;

  result.terrainCost =
    wigeSheerCliffAscentCost({
      grid,
      fromCoord,
      toCoord,
      toTerrainFeatures: terrainFeatures,
      movementType,
      elevationDelta,
    }) +
    wigeBuildingClimbModeCost({
      grid,
      fromCoord,
      toCoord,
      toElevation,
      toTerrainFeatures: terrainFeatures,
      movementType,
    });
}

function movementElevationCost(
  movementType: UnitMovementType,
  context: IMovementCostContext,
  elevationDelta: number,
  result: IMutableMovementElevationStepCost,
): void {
  const elevationChange = Math.abs(elevationDelta);
  if (elevationChange === 0 || !paysElevationCost(movementType)) return;

  const baseElevationCost =
    elevationChange * elevationCostMultiplier(movementType, context);
  const maxElevationChange = maxElevationChangeForMovementType(
    movementType,
    context,
  );
  if (maxElevationChange !== null && elevationChange > maxElevationChange) {
    const limitLabel =
      maxElevationChange === 2
        ? 'ground movement limit'
        : `${formatMovementModeForReason(movementType)} movement limit`;
    result.elevationCost = baseElevationCost;
    result.blockedReason = `Elevation change of ${elevationChange} exceeds ${limitLabel}`;
    return;
  }

  let elevationCost = baseElevationCost;
  if (
    hasMountaineerMovementRelief(context) &&
    isBattleMechGroundMovement(movementType)
  ) {
    elevationCost = Math.max(0, elevationCost - 1);
  }
  result.elevationCost = elevationCost;
}

function elevationCostMultiplier(
  movementType: UnitMovementType,
  context: IMovementCostContext,
): number {
  if (
    context.movementTerrainProfile === 'infantry' ||
    movementType === 'tracked' ||
    movementType === 'wheeled' ||
    movementType === 'hover'
  ) {
    return 2;
  }
  return 1;
}

function hasMountaineerMovementRelief(
  context: IMovementCostContext | undefined,
): boolean {
  return hasSPA(context?.pilotAbilities ?? [], 'tm_mountaineer');
}

function hasNightwalkerMovementRelief(
  context: IMovementCostContext | undefined,
): boolean {
  return hasSPA(context?.pilotAbilities ?? [], 'tm_nightwalker');
}

function representedLowLightMovementPenalty(
  context: IMovementCostContext | undefined,
): number {
  const light = context?.environmentalConditions?.light;
  if (light === undefined) return 0;
  return REPRESENTED_LOW_LIGHT_MOVEMENT_PENALTIES[light] ?? 0;
}

function hasFrogmanWaterMovement(
  context: IMovementCostContext | undefined,
): boolean {
  return (
    context?.waterCapability?.frogmanSpecialist === true ||
    hasSPA(context?.pilotAbilities ?? [], 'tm_frogman')
  );
}

function isBattleMechGroundMovement(movementType: UnitMovementType): boolean {
  return movementType === 'walk' || movementType === 'run';
}

const REPRESENTED_LOW_LIGHT_MOVEMENT_PENALTIES = {
  daylight: 0,
  dawn: 1,
  dusk: 1,
  night: 2,
  full_moon: 1,
  glare: 1,
  moonless: 2,
  solar_flare: 2,
  pitch_black: 3,
} as const;
