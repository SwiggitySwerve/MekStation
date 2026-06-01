import type { IMovementWaterCapability } from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';
import {
  TerrainType,
  type ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';

import type { IMovementCostContext } from './costContext';
import type { UnitMovementType } from './types';

function hasAmphibiousWaterMovement(
  waterCapability: IMovementWaterCapability | undefined,
): boolean {
  return Boolean(
    waterCapability?.fullyAmphibious || waterCapability?.limitedAmphibious,
  );
}

function isWaterRunExemptMotive(movementType: UnitMovementType): boolean {
  return (
    movementType === 'hover' ||
    movementType === 'naval' ||
    movementType === 'hydrofoil' ||
    movementType === 'submarine' ||
    movementType === 'umu' ||
    movementType === 'vtol' ||
    movementType === 'wige'
  );
}

function isPlaytest2RunWaterExemptMotive(
  movementType: UnitMovementType,
  context: IMovementCostContext,
): boolean {
  if (
    !hasOptionalRule(context.optionalRules ?? [], PLAYTEST_2_OPTIONAL_RULE_KEY)
  ) {
    return false;
  }
  if (context.movementTerrainProfile === 'infantry') return false;
  return movementType === 'walk' || movementType === 'run';
}

function isWaterDepthCostExemptMotive(movementType: UnitMovementType): boolean {
  return (
    movementType === 'jump' ||
    movementType === 'hover' ||
    movementType === 'vtol' ||
    movementType === 'wige' ||
    movementType === 'naval' ||
    movementType === 'hydrofoil' ||
    movementType === 'submarine' ||
    movementType === 'umu' ||
    movementType === 'biped_swim' ||
    movementType === 'quad_swim'
  );
}

function isMekSwimMovement(movementType: UnitMovementType): boolean {
  return movementType === 'biped_swim' || movementType === 'quad_swim';
}

export function blocksWaterMovement(
  movementType: UnitMovementType,
  context: IMovementCostContext,
): boolean {
  const isRunningWaterEntry =
    context.declaredMovementType === MovementType.Run || movementType === 'run';

  if (
    isRunningWaterEntry &&
    !isWaterRunExemptMotive(movementType) &&
    !isPlaytest2RunWaterExemptMotive(movementType, context) &&
    !context.isFirstStep
  ) {
    return !context.waterCapability?.fullyAmphibious;
  }
  if (movementType === 'tracked' || movementType === 'wheeled') {
    return !(
      context.waterCapability?.fullyAmphibious ||
      context.waterCapability?.flotationHull
    );
  }
  return false;
}

export function waterMovementCostModifier(
  movementType: UnitMovementType,
  waterLevel: number,
  context: IMovementCostContext,
): number {
  if (waterLevel <= 0) return 0;
  if (isWaterDepthCostExemptMotive(movementType)) {
    return 0;
  }
  if (hasAmphibiousWaterMovement(context.waterCapability)) {
    return 1;
  }
  if (context.waterCapability?.frogmanSpecialist && waterLevel > 1) {
    return 2;
  }
  if (waterLevel === 1) return 1;
  return hasOptionalRule(
    context.optionalRules ?? [],
    PLAYTEST_2_OPTIONAL_RULE_KEY,
  )
    ? 2
    : 3;
}

export const ROAD_LEVEL_DIRT = 3;
export const ROAD_LEVEL_GRAVEL = 4;
const TAC_OPS_INFANTRY_PAVEMENT_BONUS_OPTION_KEYS = new Set([
  'tacopsinfpavebonus',
  'advancedtacopsinfpavebonus',
]);
const PLAYTEST_2_OPTIONAL_RULE_KEY = 'playtest2';

export function isPavedRoadFeature(feature: ITerrainFeature): boolean {
  return (
    feature.type === TerrainType.Road &&
    feature.level !== ROAD_LEVEL_DIRT &&
    feature.level !== ROAD_LEVEL_GRAVEL
  );
}

export function isPavementSurfaceFeature(feature: ITerrainFeature): boolean {
  return (
    feature.type === TerrainType.Bridge ||
    feature.type === TerrainType.Pavement ||
    isPavedRoadFeature(feature)
  );
}

export function isPavementRoadBonusEligibleMode(
  movementType: UnitMovementType,
  context: Pick<
    IMovementCostContext,
    'optionalRules' | 'pavementRoadBonusProfile'
  > = {},
): boolean {
  const motiveEligible =
    movementType === 'tracked' ||
    movementType === 'wheeled' ||
    movementType === 'hover';
  if (!motiveEligible) return false;
  if (context.pavementRoadBonusProfile === 'tacops_infantry') {
    return hasTacOpsInfantryPavementBonus(context.optionalRules ?? []);
  }
  return true;
}

export function isPavementRoadBonusSurfaceFeature(
  feature: ITerrainFeature,
  movementType: UnitMovementType,
): boolean {
  if (
    feature.type === TerrainType.Bridge ||
    feature.type === TerrainType.Pavement ||
    isPavedRoadFeature(feature)
  ) {
    return true;
  }
  if (feature.type !== TerrainType.Road) return false;
  if (feature.level === ROAD_LEVEL_DIRT) return movementType === 'hover';
  if (feature.level === ROAD_LEVEL_GRAVEL) {
    return movementType === 'hover' || movementType === 'tracked';
  }
  return true;
}

export function bridgeClearanceBlockedReason(
  movementType: UnitMovementType,
  bridgeLevel: number | null,
  surfaceElevation: number,
  waterLevel: number,
  context: IMovementCostContext,
): string | null {
  if (bridgeLevel === null) return null;
  if (
    movementType !== 'naval' &&
    movementType !== 'hydrofoil' &&
    movementType !== 'submarine'
  ) {
    return null;
  }

  const unitHeight = context.unitHeight ?? 0;
  const clearanceBase =
    movementType === 'submarine'
      ? surfaceElevation - waterLevel
      : surfaceElevation;
  const clearance = bridgeLevel - clearanceBase;
  if (unitHeight < clearance) return null;
  return `${formatMovementModeForReason(movementType)} movement lacks bridge clearance`;
}

export function paysElevationCost(movementType: UnitMovementType): boolean {
  return (
    movementType !== 'jump' &&
    movementType !== 'vtol' &&
    movementType !== 'wige' &&
    movementType !== 'naval' &&
    movementType !== 'hydrofoil' &&
    movementType !== 'submarine' &&
    !isMekSwimMovement(movementType)
  );
}

function hasGroundElevationLimit(movementType: UnitMovementType): boolean {
  return paysElevationCost(movementType);
}

export function maxElevationChangeForMovementType(
  movementType: UnitMovementType,
  context: Pick<IMovementCostContext, 'movementTerrainProfile'> = {},
): number | null {
  if (!hasGroundElevationLimit(movementType)) return null;
  if (context.movementTerrainProfile === 'infantry') return 1;
  if (
    movementType === 'tracked' ||
    movementType === 'wheeled' ||
    movementType === 'hover'
  ) {
    return 1;
  }
  return 2;
}

export function requiresWaterTerrain(movementType: UnitMovementType): boolean {
  return (
    movementType === 'naval' ||
    movementType === 'hydrofoil' ||
    movementType === 'submarine' ||
    isMekSwimMovement(movementType)
  );
}

export function requiresOpenWaterTerrain(
  movementType: UnitMovementType,
): boolean {
  return movementType === 'naval' || movementType === 'hydrofoil';
}

export function requiresRailTerrain(movementType: UnitMovementType): boolean {
  return movementType === 'rail' || movementType === 'maglev';
}

export function formatMovementModeForReason(
  movementType: UnitMovementType,
): string {
  switch (movementType) {
    case 'vtol':
      return 'VTOL';
    case 'wige':
      return 'WiGE';
    case 'umu':
      return 'UMU';
    case 'biped_swim':
      return 'Biped swim';
    case 'quad_swim':
      return 'Quad swim';
    default:
      return movementType.charAt(0).toUpperCase() + movementType.slice(1);
  }
}

function hasTacOpsInfantryPavementBonus(
  optionalRules: readonly string[],
): boolean {
  return optionalRules.some((rule) =>
    TAC_OPS_INFANTRY_PAVEMENT_BONUS_OPTION_KEYS.has(
      normalizedOptionalRuleKey(rule),
    ),
  );
}

function hasOptionalRule(
  optionalRules: readonly string[],
  expectedKey: string,
): boolean {
  return optionalRules.some(
    (rule) => normalizedOptionalRuleKey(rule) === expectedKey,
  );
}

function normalizedOptionalRuleKey(rule: string): string {
  return rule.toLowerCase().replace(/[^a-z0-9]+/g, '');
}
