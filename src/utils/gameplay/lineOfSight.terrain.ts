import type {
  IHexCoordinate,
  IHexGrid,
} from '@/types/gameplay/HexGridInterfaces';

import {
  ITerrainFeature,
  TERRAIN_PROPERTIES,
  TerrainType,
} from '@/types/gameplay/TerrainTypes';

import type {
  ILOSCalculationOptions,
  ILOSDamageableCoverProvider,
  ILOSUnitOccupantState,
  LOSDamageableBuildingClass,
  LOSDamageableCoverSide,
  LOSDensityFamily,
  ISameBuildingContext,
} from './lineOfSight.types';

import { coordToKey } from './hexMath';
import { terrainBlocksNonDiagramLOS } from './lineOfSight.geometry';
import { terrainFeaturesFromString } from './terrainEncoding';

export const GROUNDED_DROPSHIP_COVER_HEIGHT = 10;

/**
 * Parse terrain features from a hex's terrain string.
 * Handles both simple terrain type strings and JSON-encoded feature arrays.
 */
export function parseTerrainFeatures(
  terrainString: string,
): readonly ITerrainFeature[] {
  return terrainFeaturesFromString(terrainString);
}

/**
 * Get the effective height of a terrain feature for LOS blocking.
 * Buildings use encoded height metadata, others use standard losBlockHeight.
 */
export function getTerrainHeight(
  feature: ITerrainFeature,
  props: (typeof TERRAIN_PROPERTIES)[TerrainType],
): number {
  if (
    feature.type === TerrainType.Building &&
    feature.fuelTankElevation !== undefined
  ) {
    return Math.max(0, Math.trunc(feature.fuelTankElevation));
  }

  if (feature.type === TerrainType.Building && feature.level > 0) {
    return feature.level;
  }

  if (feature.type === TerrainType.Smoke) {
    return 2;
  }

  if (
    feature.type === TerrainType.HeavyIndustrial ||
    feature.type === TerrainType.PlantedField
  ) {
    return Math.max(1, Math.trunc(feature.level));
  }

  return props.losBlockHeight;
}

function damageableBuildingClass(
  feature: ITerrainFeature,
  height: number,
): LOSDamageableBuildingClass | undefined {
  if (feature.constructionFactor !== undefined) {
    return feature.constructionFactor > 90 ? 'hard' : 'soft';
  }
  return height > 0 ? 'soft' : undefined;
}

function coverSideForElevation(options: {
  readonly totalElevation: number;
  readonly currentDistance: number;
  readonly targetDistance: number;
  readonly shooterHeight: number;
  readonly targetHeight: number;
}): LOSDamageableCoverSide | undefined {
  const {
    currentDistance,
    shooterHeight,
    targetDistance,
    targetHeight,
    totalElevation,
  } = options;

  if (
    targetDistance === 1 &&
    totalElevation === targetHeight &&
    shooterHeight <= targetHeight
  ) {
    return 'target';
  }
  if (
    currentDistance === 1 &&
    totalElevation === shooterHeight &&
    shooterHeight >= targetHeight
  ) {
    return 'attacker';
  }
  return undefined;
}

export function damageableCoverProviderForFeature(options: {
  readonly coord: IHexCoordinate;
  readonly feature: ITerrainFeature;
  readonly height: number;
  readonly totalElevation: number;
  readonly currentDistance: number;
  readonly targetDistance: number;
  readonly shooterHeight: number;
  readonly targetHeight: number;
}): ILOSDamageableCoverProvider | undefined {
  const { coord, feature, height, totalElevation } = options;
  if (feature.type !== TerrainType.Building || height <= 0) {
    return undefined;
  }

  const side = coverSideForElevation(options);
  if (side === undefined) {
    return undefined;
  }

  return {
    coord,
    kind:
      feature.fuelTankElevation !== undefined ||
      feature.fuelTankId !== undefined
        ? 'fuel-tank'
        : 'building',
    side,
    terrain: TerrainType.Building,
    height,
    totalElevation,
    buildingId: feature.buildingId,
    fuelTankId: feature.fuelTankId,
    constructionFactor: feature.constructionFactor,
    buildingClass: damageableBuildingClass(feature, height),
  };
}

export function occupantStateForHex(
  occupantId: string | null,
  occupants: ILOSCalculationOptions['occupants'],
): ILOSUnitOccupantState | undefined {
  if (!occupantId || occupants === undefined) {
    return undefined;
  }

  const mapLike = occupants as ReadonlyMap<string, ILOSUnitOccupantState>;
  if (typeof mapLike.get === 'function') {
    return mapLike.get(occupantId);
  }
  return (occupants as Readonly<Record<string, ILOSUnitOccupantState>>)[
    occupantId
  ];
}

export function isDropShipUnit(unit: ILOSUnitOccupantState): boolean {
  return unit.unitType?.toLowerCase().replace(/[^a-z0-9]/g, '') === 'dropship';
}

export function isGroundedUnit(unit: ILOSUnitOccupantState): boolean {
  if (unit.destroyed) return false;
  if (unit.grounded !== undefined) return unit.grounded;
  if (unit.airborne !== undefined) return !unit.airborne;
  if (unit.altitude !== undefined) return unit.altitude <= 0;
  return true;
}

export function damageableCoverProviderForGroundedDropShip(options: {
  readonly coord: IHexCoordinate;
  readonly occupantId: string;
  readonly occupant: ILOSUnitOccupantState;
  readonly totalElevation: number;
  readonly currentDistance: number;
  readonly targetDistance: number;
  readonly shooterHeight: number;
  readonly targetHeight: number;
}): ILOSDamageableCoverProvider | undefined {
  const { coord, occupant, occupantId, totalElevation } = options;
  if (!isDropShipUnit(occupant) || !isGroundedUnit(occupant)) {
    return undefined;
  }

  const side = coverSideForElevation(options);
  if (side === undefined) {
    return undefined;
  }

  return {
    coord,
    kind: 'grounded-dropship',
    side,
    height: GROUNDED_DROPSHIP_COVER_HEIGHT,
    totalElevation,
    unitId: occupant.id ?? occupantId,
    unitType: occupant.unitType,
  };
}

export function interveningLosDensity(feature: ITerrainFeature): number {
  switch (feature.type) {
    case TerrainType.LightWoods:
      return 1;
    case TerrainType.HeavyWoods:
      return 2;
    case TerrainType.HeavyIndustrial:
    case TerrainType.PlantedField:
      return 1;
    case TerrainType.Smoke:
      return feature.level >= 2 ? 2 : 1;
    default:
      return 0;
  }
}

export function losDensityFamily(feature: ITerrainFeature): LOSDensityFamily {
  if (feature.type === TerrainType.HeavyIndustrial) {
    return 'heavy-industrial';
  }
  if (feature.type === TerrainType.PlantedField) {
    return 'planted-field';
  }
  return 'woods-smoke';
}

export function terrainFeatureAffectsLOS(options: {
  readonly feature: ITerrainFeature;
  readonly hexElevation: number;
  readonly losHeight: number;
  readonly shooterHeight: number;
  readonly targetHeight: number;
  readonly currentDistance: number;
  readonly targetDistance: number;
  readonly tacOpsLosDiagram: boolean;
}): boolean {
  const {
    currentDistance,
    feature,
    hexElevation,
    losHeight,
    shooterHeight,
    tacOpsLosDiagram,
    targetDistance,
    targetHeight,
  } = options;
  const props = TERRAIN_PROPERTIES[feature.type];
  if (!props) return false;

  const terrainHeight = hexElevation + getTerrainHeight(feature, props);
  if (tacOpsLosDiagram) {
    return terrainHeight >= losHeight;
  }

  return terrainBlocksNonDiagramLOS({
    terrainHeight,
    currentDistance,
    shooterHeight,
    targetDistance,
    targetHeight,
  });
}

function buildingFeatureForTerrain(
  terrainString: string | undefined,
): ITerrainFeature | undefined {
  return parseTerrainFeatures(terrainString ?? TerrainType.Clear).find(
    (feature) => feature.type === TerrainType.Building,
  );
}

export function sharedEndpointBuildingContext(options: {
  readonly fromHexTerrain: string | undefined;
  readonly fromBaseElevation: number;
  readonly fromLosElevation: number | undefined;
  readonly toHexTerrain: string | undefined;
  readonly toBaseElevation: number;
  readonly toLosElevation: number | undefined;
}): ISameBuildingContext | undefined {
  const {
    fromBaseElevation,
    fromHexTerrain,
    fromLosElevation,
    toBaseElevation,
    toHexTerrain,
    toLosElevation,
  } = options;
  const fromBuildingId = buildingFeatureForTerrain(fromHexTerrain)?.buildingId;
  const toBuildingId = buildingFeatureForTerrain(toHexTerrain)?.buildingId;
  const fromBuildingLevel = fromLosElevation ?? fromBaseElevation + 1;
  const toBuildingLevel = toLosElevation ?? toBaseElevation + 1;

  return fromBuildingId && fromBuildingId === toBuildingId
    ? {
        buildingId: fromBuildingId,
        endpointElevationDifference: Math.abs(
          fromBuildingLevel - toBuildingLevel,
        ),
      }
    : undefined;
}

export function sameBuildingHexCount(
  feature: ITerrainFeature,
  sameBuildingContext: ISameBuildingContext | undefined,
): number {
  if (
    feature.type !== TerrainType.Building ||
    feature.buildingId === undefined ||
    feature.buildingId !== sameBuildingContext?.buildingId
  ) {
    return 0;
  }

  return 1;
}

export function getBlockingTerrain(
  hex: IHexCoordinate,
  grid: IHexGrid,
): TerrainType | undefined {
  const hexData = grid.hexes.get(coordToKey(hex));
  if (!hexData) {
    return undefined;
  }

  for (const feature of parseTerrainFeatures(hexData.terrain)) {
    const props = TERRAIN_PROPERTIES[feature.type];
    if (interveningLosDensity(feature) > 0) {
      continue;
    }
    if (props?.blocksLOS) {
      return feature.type;
    }
  }

  return undefined;
}
