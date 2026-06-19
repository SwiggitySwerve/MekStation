/**
 * Movement Point Calculations
 */

import { IHexCoordinate, IHexGrid } from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { terrainFeaturesFromString } from '@/utils/gameplay/terrainEncoding';

import type { UnitMovementType } from './types';

import { getHex } from '../hexGrid';
import { hexDistance, hexLine } from '../hexMath';
import {
  movementCostContextForStep,
  type IMovementCostContext,
} from './costContext';
import {
  lowLightMovementPenaltyCost,
  movementElevationStepCost,
  movementTerrainEntryBlockedReason,
  summarizeMovementTerrain,
  terrainFeatureMovementCost,
  waterTerrainBlockedReason,
} from './movementStepCost';
import {
  isPavementRoadBonusEligibleMode,
  waterMovementCostModifier,
} from './terrainRules';

export const PAVEMENT_ROAD_BONUS_MP = 1;

export {
  applyActiveMPBoosters,
  applyJumpJetCriticalDamage,
  applyPartialWingJumpBonus,
  calculateRunMP,
  calculateSprintMP,
  createMovementCapability,
  getEffectiveWalkMP,
  getHeatAdjustedMovementCapability,
  getMaxMP,
  getSprintMPForCapability,
} from './movementCapability';
export {
  movementCostContextForCapability,
  movementCostContextForStep,
} from './costContext';
export type { IMovementCostContext } from './costContext';

export interface IMovementStepCostBreakdown {
  readonly mpCost: number;
  readonly baseCost: number;
  readonly terrainCost: number;
  readonly elevationCost: number;
  readonly elevationDelta: number;
  readonly blockedReason?: string;
}

export function getPavementRoadBonusMP(
  movementMode: UnitMovementType,
  context: Pick<
    IMovementCostContext,
    'optionalRules' | 'pavementRoadBonusProfile'
  > = {},
): number {
  return isPavementRoadBonusEligibleMode(movementMode, context)
    ? PAVEMENT_ROAD_BONUS_MP
    : 0;
}

/**
 * Get the MP cost to enter a hex based on terrain and movement type.
 * Includes terrain modifiers and elevation change costs.
 */
export function getHexMovementCost(
  grid: IHexGrid,
  coord: IHexCoordinate,
  movementType: UnitMovementType = 'walk',
  fromCoord?: IHexCoordinate,
  context: IMovementCostContext = {},
): number {
  return getMovementStepCostBreakdown(
    grid,
    coord,
    movementType,
    fromCoord,
    context,
  ).mpCost;
}

export function getMovementStepCostBreakdown(
  grid: IHexGrid,
  coord: IHexCoordinate,
  movementType: UnitMovementType = 'walk',
  fromCoord?: IHexCoordinate,
  context: IMovementCostContext = {},
): IMovementStepCostBreakdown {
  const hex = getHex(grid, coord);
  if (!hex) {
    return {
      mpCost: Infinity,
      baseCost: 0,
      terrainCost: 0,
      elevationCost: 0,
      elevationDelta: 0,
      blockedReason: 'Destination is outside map bounds',
    };
  }

  const baseCost = 1;
  let terrainCost = 0;

  const terrain = summarizeMovementTerrain(hex.terrain);
  const entryBlockedReason = movementTerrainEntryBlockedReason({
    movementType,
    terrain,
    elevation: hex.elevation,
    context,
  });
  if (entryBlockedReason) {
    return {
      mpCost: Infinity,
      baseCost,
      terrainCost: 0,
      elevationCost: 0,
      elevationDelta: 0,
      blockedReason: entryBlockedReason,
    };
  }

  terrainCost += lowLightMovementPenaltyCost(movementType, context);

  // Audit 2026-06-09 C-3/C-4: MegaMek Hex.movementCost sums Terrain.movementCost
  // over every terrain in the hex, so multi-feature hexes (e.g. rough under
  // light woods) charge each feature — not just the primary one — with
  // per-motive, per-level costs. Water is excluded because its depth-based
  // surcharge is applied separately below, and a pavement/road/bridge surface
  // bypasses the terrain sum entirely (MegaMek MoveStep: "Account for
  // terrain, unless we're moving along a road").
  if (!terrain.hasPavementSurfaceFeature) {
    terrainCost += terrainFeatureMovementCost({
      terrainFeatures: terrain.terrainFeatures,
      movementType,
      context,
    });
  }

  const waterBlockedReason = waterTerrainBlockedReason({
    movementType,
    terrain,
    context,
  });
  if (waterBlockedReason) {
    return {
      mpCost: Infinity,
      baseCost,
      terrainCost,
      elevationCost: 0,
      elevationDelta: 0,
      blockedReason: waterBlockedReason,
    };
  }

  if (
    terrain.hasWaterFeature &&
    !terrain.hasPavementSurfaceFeature &&
    !terrain.hasSurfaceIce
  ) {
    terrainCost += waterMovementCostModifier(
      movementType,
      terrain.waterLevel,
      context,
    );
  }

  if (movementType === 'jump') {
    terrainCost = 0;
  }

  const elevation = movementElevationStepCost({
    grid,
    fromCoord,
    toCoord: coord,
    toElevation: hex.elevation,
    terrainFeatures: terrain.terrainFeatures,
    movementType,
    hasPavementSurfaceFeature: terrain.hasPavementSurfaceFeature,
    context,
  });
  if (elevation.blockedReason) {
    return {
      mpCost: Infinity,
      baseCost,
      terrainCost,
      elevationCost: elevation.elevationCost,
      elevationDelta: elevation.elevationDelta,
      blockedReason: elevation.blockedReason,
    };
  }
  terrainCost += elevation.terrainCost;

  const infantryWoodsDiscount =
    context.movementTerrainProfile === 'infantry' &&
    terrain.hasWoodsFeature &&
    !terrain.hasPavementSurfaceFeature
      ? 1
      : 0;
  const totalCost = Math.max(
    1,
    baseCost + terrainCost + elevation.elevationCost - infantryWoodsDiscount,
  );

  return {
    mpCost: totalCost,
    baseCost,
    terrainCost: totalCost - baseCost - elevation.elevationCost,
    elevationCost: elevation.elevationCost,
    elevationDelta: elevation.elevationDelta,
  };
}

export function getJumpElevationDelta(
  grid: IHexGrid,
  from: IHexCoordinate,
  to: IHexCoordinate,
): number {
  const toHex = getHex(grid, to);
  const fromHex = getHex(grid, from);
  if (!toHex || !fromHex) return 0;
  return toHex.elevation - fromHex.elevation;
}

export function getJumpElevationBlockedReason(
  grid: IHexGrid,
  from: IHexCoordinate,
  to: IHexCoordinate,
  effectiveJumpMP: number,
): string | null {
  const elevationDelta = getJumpElevationDelta(grid, from, to);
  if (elevationDelta <= effectiveJumpMP) return null;
  return `Jump elevation rise of ${elevationDelta} exceeds jump MP ${effectiveJumpMP}`;
}

function formatElevationForReason(elevation: number): string {
  return elevation >= 0 ? `+${elevation}` : `${elevation}`;
}

function representedJumpTerrainHeight(
  grid: IHexGrid,
  coord: IHexCoordinate,
): number | null {
  const hex = getHex(grid, coord);
  if (!hex) return null;

  const buildingHeight = Math.max(
    0,
    ...terrainFeaturesFromString(hex.terrain)
      .filter((feature) => feature.type === TerrainType.Building)
      .map((feature) => feature.level),
  );
  return hex.elevation + buildingHeight;
}

export function getJumpClearanceBlockedReason(
  grid: IHexGrid,
  from: IHexCoordinate,
  to: IHexCoordinate,
  effectiveJumpMP: number,
): string | null {
  const fromHex = getHex(grid, from);
  if (!fromHex) return null;

  const jumpClearance = fromHex.elevation + effectiveJumpMP;
  for (const hex of hexLine(from, to).slice(1)) {
    const terrainHeight = representedJumpTerrainHeight(grid, hex);
    if (terrainHeight === null || terrainHeight <= jumpClearance) continue;
    return `Jump path height ${formatElevationForReason(terrainHeight)} at (${hex.q},${hex.r}) exceeds jump clearance ${formatElevationForReason(jumpClearance)}`;
  }
  return null;
}

export function calculatePathMovementCost(
  grid: IHexGrid,
  path: readonly IHexCoordinate[],
  movementType: UnitMovementType = 'walk',
  context: IMovementCostContext = {},
): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    total += getHexMovementCost(
      grid,
      curr,
      movementType,
      prev,
      movementCostContextForStep(context, i === 1),
    );
  }
  return total;
}

/**
 * Calculate the minimum MP cost to move from one hex to another.
 * Uses straight-line distance (pathfinding would use actual path cost).
 */
export function estimateMovementCost(
  from: IHexCoordinate,
  to: IHexCoordinate,
): number {
  return hexDistance(from, to);
}
