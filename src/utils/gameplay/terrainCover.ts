/**
 * terrainCover - derive true partial cover from target hex / LOS terrain.
 *
 * MegaMek separates target-hex woods/smoke to-hit modifiers from true partial
 * cover. This module only answers the latter, so woods/smoke do not trigger
 * partial-cover hit-location behavior.
 *
 * @spec openspec/changes/complete-partial-cover-rules/specs/to-hit-resolution/spec.md
 *        Requirement: Partial Cover Modifier
 */

import type {
  IGameUnit,
  IHex,
  IHexCoordinate,
  IHexGrid,
  IUnitToken,
} from '@/types/gameplay';

import {
  CoverLevel,
  TerrainType,
  TERRAIN_PROPERTIES,
  TokenUnitType,
} from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  coordToKey,
  hexDistance,
  hexEquals,
  hexLine,
} from '@/utils/gameplay/hexMath';
import { terrainFeaturesFromString } from '@/utils/gameplay/terrainEncoding';
import { getPrimaryTerrainFeatureFromTerrainTag } from '@/utils/gameplay/terrainMovementCost';

export interface IHexCoverInfo {
  readonly terrain?: TerrainType;
  readonly coverLevel: CoverLevel;
  readonly partialCover: boolean;
  readonly modifier: number;
  readonly reason?: string;
}

export interface ITargetCoverOptions {
  readonly horizontalCoverEligible?: boolean;
  readonly targetHexWaterCoverEligible?: boolean;
}

const MEK_HORIZONTAL_COVER_UNIT_TYPES = new Set<UnitType>([
  UnitType.BATTLEMECH,
  UnitType.OMNIMECH,
  UnitType.INDUSTRIALMECH,
]);

const TARGET_HEX_PARTIAL_COVER_TERRAINS = new Set<TerrainType>([
  TerrainType.Swamp,
  TerrainType.Building,
]);

function terrainTypeForHex(hex: IHex | undefined): TerrainType | undefined {
  return getPrimaryTerrainFeatureFromTerrainTag(hex?.terrain)?.type;
}

function terrainFeaturesForHex(hex: IHex | undefined) {
  return terrainFeaturesFromString(hex?.terrain ?? '');
}

function waterDepthForHex(hex: IHex | undefined): number {
  return Math.max(
    0,
    ...terrainFeaturesForHex(hex)
      .filter((feature) => feature.type === TerrainType.Water)
      .map((feature) => feature.level),
  );
}

function formatTerrainName(terrain: TerrainType): string {
  return terrain.replace(/_/g, ' ');
}

function formatHexLabel(hex: IHexCoordinate): string {
  return `(${hex.q}, ${hex.r})`;
}

function formatElevation(elevation: number): string {
  return elevation >= 0 ? `+${elevation}` : `${elevation}`;
}

/**
 * Return whether a hex's terrain grants its occupant partial cover.
 *
 * `IHex.terrain` is a free `string` (forward-compat). An unrecognised or
 * absent terrain value - including the all-clear grid the simulation runner
 * currently builds - yields `false`, so this never throws and never
 * over-reports cover.
 */
export function hexProvidesPartialCover(
  hex: IHex | undefined,
  options: ITargetCoverOptions = {},
): boolean {
  return getHexCoverInfo(hex, options).partialCover;
}

/**
 * Return target-cover metadata for a hex. This is shared by the combat preview
 * projection and the committed attack declaration path.
 */
export function getHexCoverInfo(
  hex: IHex | undefined,
  options: ITargetCoverOptions = {},
): IHexCoverInfo {
  const waterDepth = waterDepthForHex(hex);
  if (waterDepth > 0) {
    const partialWaterCover =
      waterDepth === 1 && options.targetHexWaterCoverEligible !== false;
    if (partialWaterCover) {
      return {
        terrain: TerrainType.Water,
        coverLevel: CoverLevel.Partial,
        partialCover: true,
        modifier: 1,
        reason: 'Target in water partial cover (+1)',
      };
    }
  }

  const terrain = terrainTypeForHex(hex);
  if (!terrain) {
    return {
      coverLevel: CoverLevel.None,
      partialCover: false,
      modifier: 0,
    };
  }

  const partialCover = TARGET_HEX_PARTIAL_COVER_TERRAINS.has(terrain);
  const coverLevel = partialCover
    ? TERRAIN_PROPERTIES[terrain].coverLevel
    : CoverLevel.None;

  return {
    terrain,
    coverLevel,
    partialCover,
    modifier: partialCover ? 1 : 0,
    reason: partialCover
      ? `Target in ${formatTerrainName(terrain)} partial cover (+1)`
      : undefined,
  };
}

function buildingHeightFromTerrain(terrain: string): number {
  return Math.max(
    0,
    ...terrainFeaturesFromString(terrain)
      .filter((feature) => feature.type === TerrainType.Building)
      .map((feature) => feature.level),
  );
}

function horizontalCoverInfoFromLOS(
  grid: IHexGrid,
  attacker: IHexCoordinate,
  target: IHexCoordinate,
  options: ITargetCoverOptions,
): IHexCoverInfo | null {
  if (options.horizontalCoverEligible === false) return null;

  const attackerHex = grid.hexes.get(coordToKey(attacker));
  const targetHex = grid.hexes.get(coordToKey(target));
  if (!attackerHex || !targetHex) return null;

  const attackerAbsHeight = attackerHex.elevation + 1;
  const targetAbsHeight = targetHex.elevation + 1;
  if (attackerAbsHeight > targetAbsHeight) return null;

  const line = hexLine(attacker, target);
  for (const coord of line) {
    if (hexEquals(coord, attacker) || hexEquals(coord, target)) continue;
    const hex = grid.hexes.get(coordToKey(coord));
    if (!hex || hexDistance(coord, target) !== 1) continue;

    const buildingHeight = buildingHeightFromTerrain(hex.terrain);
    const buildingTotalElevation = hex.elevation + buildingHeight;
    const usesBuildingCover =
      buildingHeight > 0 && buildingTotalElevation === targetAbsHeight;
    const usesElevationCover = hex.elevation === targetAbsHeight;
    if (!usesBuildingCover && !usesElevationCover) continue;

    return {
      terrain: usesBuildingCover ? TerrainType.Building : undefined,
      coverLevel: CoverLevel.Partial,
      partialCover: true,
      modifier: 1,
      reason: usesBuildingCover
        ? `Target behind building partial cover at ${formatHexLabel(coord)} (+1)`
        : `Target behind elevation ${formatElevation(hex.elevation)} partial cover at ${formatHexLabel(coord)} (+1)`,
    };
  }

  return null;
}

export function getTargetCoverInfo(
  grid: IHexGrid,
  attacker: IHexCoordinate,
  target: IHexCoordinate,
  options: ITargetCoverOptions = {},
): IHexCoverInfo {
  const targetHexCover = getHexCoverInfo(
    grid.hexes.get(coordToKey(target)),
    options,
  );
  if (targetHexCover.partialCover) return targetHexCover;
  return (
    horizontalCoverInfoFromLOS(grid, attacker, target, options) ??
    targetHexCover
  );
}

export function tokenUsesMekHorizontalCover(
  token: Pick<IUnitToken, 'unitType'> | undefined,
): boolean {
  return token?.unitType === TokenUnitType.Mech;
}

export function tokenUsesMekWaterCover(
  token: Pick<IUnitToken, 'unitType'> | undefined,
): boolean {
  return token?.unitType === TokenUnitType.Mech;
}

export function gameUnitUsesMekHorizontalCover(
  unit: Pick<IGameUnit, 'unitType'> | undefined,
): boolean {
  if (unit?.unitType === undefined) return true;
  return MEK_HORIZONTAL_COVER_UNIT_TYPES.has(unit.unitType);
}

export function gameUnitUsesMekWaterCover(
  unit: Pick<IGameUnit, 'unitType'> | undefined,
): boolean {
  if (unit?.unitType === undefined) return true;
  return MEK_HORIZONTAL_COVER_UNIT_TYPES.has(unit.unitType);
}

/**
 * Return whether a terrain tag grants partial cover OR better (i.e. any
 * cover level other than `None` - partial or full).
 *
 * The AI move scorer's cover term - per `add-ai-terrain-aware-movement`
 * design D5 - rewards a destination hex that offers "partial cover or
 * better", so it needs the partial-OR-full predicate rather than the
 * partial-only `hexProvidesPartialCover`. The argument is the raw
 * `IHex.terrain` string tag; an unrecognised or absent tag yields `false`.
 *
 * @spec openspec/changes/add-ai-terrain-aware-movement/specs/simulation-system/spec.md
 *   Requirement: Terrain-Aware Move Scoring
 */
export function terrainTagOffersCover(terrain: string | undefined): boolean {
  const primaryFeature = getPrimaryTerrainFeatureFromTerrainTag(terrain);
  if (!primaryFeature) return false;

  return TERRAIN_PROPERTIES[primaryFeature.type].coverLevel !== CoverLevel.None;
}
