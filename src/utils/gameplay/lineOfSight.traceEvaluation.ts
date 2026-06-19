import type { IHexCoordinate } from '@/types/gameplay/HexGridInterfaces';

import {
  ITerrainFeature,
  TERRAIN_PROPERTIES,
  TerrainType,
} from '@/types/gameplay/TerrainTypes';

import type {
  ILOSInterveningTerrainEffect,
  ILOSResult,
  LOSDensityFamily,
} from './lineOfSight.types';

import { buildingBlocksNonDiagramLOS } from './lineOfSight.geometry';
import {
  damageableCoverProviderForFeature,
  damageableCoverProviderForGroundedDropShip,
  getTerrainHeight,
  GROUNDED_DROPSHIP_COVER_HEIGHT,
  interveningLosDensity,
  isDropShipUnit,
  isGroundedUnit,
  losDensityFamily,
  occupantStateForHex,
  parseTerrainFeatures,
  sameBuildingHexCount,
  terrainFeatureAffectsLOS,
} from './lineOfSight.terrain';
import {
  blockedResult,
  ILOSInterveningTraceState,
  ITraceContext,
} from './lineOfSight.traceState';
import { terrainWaterDepth } from './lineOfSight.water';

type PendingTerrainEffect = ILOSInterveningTerrainEffect & {
  readonly losDensity: number;
  readonly losDensityFamily: LOSDensityFamily;
};

function groundedDropShipBlocker(
  context: ITraceContext,
  state: ILOSInterveningTraceState,
): IHexCoordinate | undefined {
  const occupant = occupantStateForHex(
    context.hexData.occupantId,
    context.occupants,
  );
  if (
    occupant === undefined ||
    context.hexData.occupantId === null ||
    !isDropShipUnit(occupant) ||
    !isGroundedUnit(occupant)
  ) {
    return undefined;
  }

  const totalElevation =
    context.hexData.elevation + GROUNDED_DROPSHIP_COVER_HEIGHT;
  const damageableCoverProvider = damageableCoverProviderForGroundedDropShip({
    coord: context.hex,
    occupantId: context.hexData.occupantId,
    occupant,
    totalElevation,
    currentDistance: context.currentDistance,
    targetDistance: context.targetDistance,
    shooterHeight: context.shooterHeight,
    targetHeight: context.targetHeight,
  });
  if (damageableCoverProvider !== undefined) {
    state.damageableCoverProviders.push(damageableCoverProvider);
  }

  return buildingBlocksNonDiagramLOS({
    buildingHeight: totalElevation,
    currentDistance: context.currentDistance,
    shooterHeight: context.shooterHeight,
    targetDistance: context.targetDistance,
    targetHeight: context.targetHeight,
  })
    ? context.hex
    : undefined;
}

function pendingTerrainEffect(
  feature: ITerrainFeature,
  context: ITraceContext,
): PendingTerrainEffect | undefined {
  const losDensity = interveningLosDensity(feature);
  if (losDensity <= 0) {
    return undefined;
  }

  if (
    !terrainFeatureAffectsLOS({
      feature,
      hexElevation: context.hexData.elevation,
      losHeight: context.losHeight,
      shooterHeight: context.shooterHeight,
      targetHeight: context.targetHeight,
      currentDistance: context.currentDistance,
      targetDistance: context.targetDistance,
      tacOpsLosDiagram: context.tacOpsLosDiagram,
    })
  ) {
    return undefined;
  }

  return {
    coord: context.hex,
    terrain: feature.type,
    modifier: losDensity,
    losDensity,
    losDensityFamily: losDensityFamily(feature),
  };
}

function directTerrainBlocker(
  feature: ITerrainFeature,
  context: ITraceContext,
  state: ILOSInterveningTraceState,
): TerrainType | undefined {
  const props = TERRAIN_PROPERTIES[feature.type];
  if (!props?.blocksLOS) {
    return undefined;
  }

  const terrainHeight = getTerrainHeight(feature, props);
  const blockingHeight = context.hexData.elevation + terrainHeight;
  const damageableCoverProvider = damageableCoverProviderForFeature({
    coord: context.hex,
    feature,
    height: terrainHeight,
    totalElevation: blockingHeight,
    currentDistance: context.currentDistance,
    targetDistance: context.targetDistance,
    shooterHeight: context.shooterHeight,
    targetHeight: context.targetHeight,
  });
  if (damageableCoverProvider !== undefined) {
    state.damageableCoverProviders.push(damageableCoverProvider);
  }

  if (feature.type === TerrainType.Building) {
    return buildingBlocksNonDiagramLOS({
      buildingHeight: blockingHeight,
      currentDistance: context.currentDistance,
      shooterHeight: context.shooterHeight,
      targetDistance: context.targetDistance,
      targetHeight: context.targetHeight,
    })
      ? feature.type
      : undefined;
  }

  return blockingHeight > context.losHeight ? feature.type : undefined;
}

function inspectFeature(options: {
  readonly feature: ITerrainFeature;
  readonly context: ITraceContext;
  readonly state: ILOSInterveningTraceState;
  readonly pendingEffects: PendingTerrainEffect[];
}): TerrainType | undefined {
  const { context, feature, pendingEffects, state } = options;
  if (!TERRAIN_PROPERTIES[feature.type]) {
    return undefined;
  }

  const sameBuildingHexesForFeature = sameBuildingHexCount(
    feature,
    context.sameBuildingContext,
  );
  state.sameBuildingHexes += sameBuildingHexesForFeature;
  if (state.sameBuildingHexes > 2) {
    return feature.type;
  }
  if (sameBuildingHexesForFeature > 0) {
    return undefined;
  }

  if (interveningLosDensity(feature) > 0) {
    const terrainEffect = pendingTerrainEffect(feature, context);
    if (terrainEffect !== undefined) {
      pendingEffects.push(terrainEffect);
    }
    return undefined;
  }

  return directTerrainBlocker(feature, context, state);
}

function applyPendingTerrainEffect(
  terrainEffect: PendingTerrainEffect,
  state: ILOSInterveningTraceState,
): ILOSInterveningTerrainEffect {
  let modifier = terrainEffect.modifier;
  switch (terrainEffect.losDensityFamily) {
    case 'heavy-industrial':
      state.cumulativeHeavyIndustrial += 1;
      break;
    case 'planted-field':
      state.cumulativePlantedFields += 1;
      modifier = state.cumulativePlantedFields % 2 === 0 ? 1 : 0;
      break;
    case 'woods-smoke':
      state.cumulativeWoodsSmokeLosDensity += terrainEffect.losDensity;
      break;
  }

  return {
    coord: terrainEffect.coord,
    terrain: terrainEffect.terrain,
    modifier,
  };
}

function terrainDensityBlocks(state: ILOSInterveningTraceState): boolean {
  return (
    state.cumulativeWoodsSmokeLosDensity > 2 ||
    state.cumulativeHeavyIndustrial > 2 ||
    state.cumulativePlantedFields > 5
  );
}

function densityTerrainBlocker(
  pendingEffects: readonly PendingTerrainEffect[],
  state: ILOSInterveningTraceState,
): TerrainType | undefined {
  for (const terrainEffect of pendingEffects) {
    state.interveningTerrainEffects.push(
      applyPendingTerrainEffect(terrainEffect, state),
    );

    if (terrainDensityBlocks(state)) {
      return terrainEffect.terrain;
    }
  }

  return undefined;
}

function elevationBlocker(context: ITraceContext): number | undefined {
  const underwaterCombat =
    context.fromWater.state === 'underwater' ||
    context.toWater.state === 'underwater';
  const waterCarriesUnderwaterSightline =
    underwaterCombat && terrainWaterDepth(context.hexData.terrain) >= 1;

  return !waterCarriesUnderwaterSightline &&
    context.hexData.elevation > context.losHeight
    ? context.hexData.elevation
    : undefined;
}

export function evaluateInterveningHex(options: {
  readonly context: ITraceContext;
  readonly state: ILOSInterveningTraceState;
  readonly interveningHexes: readonly IHexCoordinate[];
  readonly minimumWaterDepth: number;
}): ILOSResult | undefined {
  const { context, interveningHexes, minimumWaterDepth, state } = options;
  const dropShipBlocker = groundedDropShipBlocker(context, state);
  if (dropShipBlocker !== undefined) {
    return blockedResult({
      blockedBy: dropShipBlocker,
      interveningHexes,
      minimumWaterDepth,
      state,
    });
  }

  const pendingEffects: PendingTerrainEffect[] = [];
  for (const feature of parseTerrainFeatures(context.hexData.terrain)) {
    const blockingTerrain = inspectFeature({
      feature,
      context,
      state,
      pendingEffects,
    });
    if (blockingTerrain !== undefined) {
      return blockedResult({
        blockedBy: context.hex,
        blockingTerrain,
        interveningHexes,
        minimumWaterDepth,
        state,
      });
    }
  }

  const densityBlocker = densityTerrainBlocker(pendingEffects, state);
  if (densityBlocker !== undefined) {
    return blockedResult({
      blockedBy: context.hex,
      blockingTerrain: densityBlocker,
      interveningHexes,
      minimumWaterDepth,
      state,
    });
  }

  const blockingElevation = elevationBlocker(context);
  return blockingElevation === undefined
    ? undefined
    : blockedResult({
        blockedBy: context.hex,
        blockingElevation,
        interveningHexes,
        minimumWaterDepth,
        state,
      });
}
