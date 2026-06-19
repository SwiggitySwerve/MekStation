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

interface IElevationStepCostInput {
  readonly grid: IHexGrid;
  readonly fromCoord: IHexCoordinate | undefined;
  readonly toCoord: IHexCoordinate;
  readonly toElevation: number;
  readonly terrainFeatures: readonly TerrainFeature[];
  readonly movementType: UnitMovementType;
  readonly hasPavementSurfaceFeature: boolean;
  readonly context: IMovementCostContext;
}

export interface IMovementElevationStepCost {
  readonly terrainCost: number;
  readonly elevationCost: number;
  readonly elevationDelta: number;
  readonly blockedReason?: string;
}

export function summarizeMovementTerrain(
  terrainText: string,
): IMovementTerrainSummary {
  const terrainFeatures = terrainFeaturesFromString(terrainText);
  const waterLevels = terrainFeatures
    .filter((feature) => feature.type === TerrainType.Water)
    .map((feature) => feature.level);
  const bridgeLevels = terrainFeatures
    .filter((feature) => feature.type === TerrainType.Bridge)
    .map((feature) => feature.level);
  const hasWaterFeature = waterLevels.length > 0;
  const waterLevel = hasWaterFeature ? Math.max(0, ...waterLevels) : 0;
  const hasIceFeature = terrainFeatures.some(
    (feature) => feature.type === TerrainType.Ice,
  );

  return {
    terrainFeatures,
    hasWaterFeature,
    waterLevel,
    hasPavementSurfaceFeature: terrainFeatures.some((feature) =>
      isPavementSurfaceFeature(feature),
    ),
    bridgeLevel: bridgeLevels.length > 0 ? Math.max(...bridgeLevels) : null,
    hasSurfaceIce: hasWaterFeature && hasIceFeature && waterLevel > 0,
    hasWoodsFeature: terrainFeatures.some(
      (feature) =>
        feature.type === TerrainType.LightWoods ||
        feature.type === TerrainType.HeavyWoods,
    ),
  };
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
  input: IElevationStepCostInput,
): IMovementElevationStepCost {
  if (!input.fromCoord) {
    return { terrainCost: 0, elevationCost: 0, elevationDelta: 0 };
  }

  const fromHex = getHex(input.grid, input.fromCoord);
  if (!fromHex) {
    return { terrainCost: 0, elevationCost: 0, elevationDelta: 0 };
  }

  const elevationDelta = input.toElevation - fromHex.elevation;
  const cliffBlockedReason = directionalCliffBlockedReason({
    movementType: input.movementType,
    toTerrainFeatures: input.terrainFeatures,
    fromCoord: input.fromCoord,
    toCoord: input.toCoord,
    elevationDelta,
    hasPavementSurfaceFeature: input.hasPavementSurfaceFeature,
    movementModeLabel: formatMovementModeForReason(input.movementType),
  });
  if (cliffBlockedReason) {
    return {
      terrainCost: 0,
      elevationCost: 0,
      elevationDelta,
      blockedReason: cliffBlockedReason,
    };
  }

  return {
    ...movementElevationCost(input, elevationDelta),
    terrainCost:
      wigeSheerCliffAscentCost({
        grid: input.grid,
        fromCoord: input.fromCoord,
        toCoord: input.toCoord,
        toTerrainFeatures: input.terrainFeatures,
        movementType: input.movementType,
        elevationDelta,
      }) +
      wigeBuildingClimbModeCost({
        grid: input.grid,
        fromCoord: input.fromCoord,
        toCoord: input.toCoord,
        toElevation: input.toElevation,
        toTerrainFeatures: input.terrainFeatures,
        movementType: input.movementType,
      }),
  };
}

function movementElevationCost(
  input: IElevationStepCostInput,
  elevationDelta: number,
): Omit<IMovementElevationStepCost, 'terrainCost'> {
  const elevationChange = Math.abs(elevationDelta);
  if (elevationChange === 0 || !paysElevationCost(input.movementType)) {
    return { elevationCost: 0, elevationDelta };
  }

  const baseElevationCost =
    elevationChange *
    elevationCostMultiplier(input.movementType, input.context);
  const maxElevationChange = maxElevationChangeForMovementType(
    input.movementType,
    input.context,
  );
  if (maxElevationChange !== null && elevationChange > maxElevationChange) {
    const limitLabel =
      maxElevationChange === 2
        ? 'ground movement limit'
        : `${formatMovementModeForReason(input.movementType)} movement limit`;
    return {
      elevationCost: baseElevationCost,
      elevationDelta,
      blockedReason: `Elevation change of ${elevationChange} exceeds ${limitLabel}`,
    };
  }

  let elevationCost = baseElevationCost;
  if (
    hasMountaineerMovementRelief(input.context) &&
    isBattleMechGroundMovement(input.movementType)
  ) {
    elevationCost = Math.max(0, elevationCost - 1);
  }
  return { elevationCost, elevationDelta };
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
