/**
 * Movement Point Calculations
 */

import {
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  MovementType,
} from '@/types/gameplay';
import { TERRAIN_PROPERTIES, TerrainType } from '@/types/gameplay/TerrainTypes';

import type { UnitMovementType } from './types';

import { getHex } from '../hexGrid';
import { hexDistance } from '../hexMath';

/**
 * Calculate running MP from walking MP.
 * Run MP = ceil(walk MP * 1.5)
 */
export function calculateRunMP(walkMP: number): number {
  return Math.ceil(walkMP * 1.5);
}

/**
 * Create movement capability from base values.
 */
export function createMovementCapability(
  walkMP: number,
  jumpMP: number = 0,
): IMovementCapability {
  return {
    walkMP,
    runMP: calculateRunMP(walkMP),
    jumpMP,
  };
}

/**
 * Get the maximum MP available for a movement type.
 *
 * Per `wire-heat-generation-and-effects` tasks 7.1 / 7.2 /
 * decisions.md "Heat movement penalty integration point":
 * overheated units lose MP by `floor(heat / 5)`. Callers that
 * track current heat pass `heatPenalty`; legacy callers that omit
 * it get the raw MP. Jump MP also has heat applied (per heat
 * chart — total MP reduction). The penalty never drives MP
 * negative; floor is 0 so a heat-30 walking unit still has 0
 * walkMP, not -N.
 */
export function getMaxMP(
  capability: IMovementCapability,
  movementType: MovementType,
  heatPenalty: number = 0,
): number {
  const raw = getRawMaxMP(capability, movementType);
  if (heatPenalty <= 0) return raw;
  return Math.max(0, raw - heatPenalty);
}

function getRawMaxMP(
  capability: IMovementCapability,
  movementType: MovementType,
): number {
  switch (movementType) {
    case MovementType.Stationary:
      return 0;
    case MovementType.Walk:
      return capability.walkMP;
    case MovementType.Run:
      return capability.runMP;
    case MovementType.Jump:
      return capability.jumpMP;
    default:
      return 0;
  }
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
): number {
  const hex = getHex(grid, coord);
  if (!hex) return Infinity;

  const baseCost = 1;
  let terrainModifier = 0;

  if (hex.terrain) {
    const terrainType = hex.terrain as TerrainType;
    const terrainProps = TERRAIN_PROPERTIES[terrainType];

    if (terrainProps) {
      terrainModifier = terrainProps.movementCostModifier[movementType] || 0;

      if (terrainType === TerrainType.Water) {
        if (movementType === 'walk' || movementType === 'run') {
          return Infinity;
        }
      }
    }
  }

  if (movementType === 'jump') {
    terrainModifier = 0;
  }

  let elevationCost = 0;
  if (fromCoord) {
    const fromHex = getHex(grid, fromCoord);
    if (fromHex) {
      const elevationChange = hex.elevation - fromHex.elevation;
      if (elevationChange > 0) {
        elevationCost = elevationChange;

        if (
          elevationChange > 2 &&
          (movementType === 'walk' || movementType === 'run')
        ) {
          return Infinity;
        }
      }
    }
  }

  return baseCost + terrainModifier + elevationCost;
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
