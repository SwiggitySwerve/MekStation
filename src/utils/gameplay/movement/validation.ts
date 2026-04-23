/**
 * Movement Validation
 */

import { getHeatMovementPenalty } from '@/constants/heat';
import {
  IHexCoordinate,
  IHexGrid,
  IUnitPosition,
  IMovementCapability,
  IMovementValidation,
  MovementType,
  Facing,
} from '@/types/gameplay';

import { isInBounds, isOccupied } from '../hexGrid';
import { hexDistance, hexEquals, hexLine } from '../hexMath';
import { getMaxMP } from './calculations';
import { calculateMovementHeat } from './modifiers';

/**
 * Validate a movement action.
 *
 * Per `wire-heat-generation-and-effects` task 7.3: when `currentHeat`
 * is provided, `getHeatMovementPenalty(currentHeat)` is subtracted
 * from the unit's effective MP so overheated units cannot over-move.
 * At heat 15 (penalty 3), a walk-5 unit validates against walk-2
 * (not walk-5); attempting distance > 2 fails validation with the
 * heat-penalised range in the error string.
 */
export function validateMovement(
  grid: IHexGrid,
  position: IUnitPosition,
  destination: IHexCoordinate,
  newFacing: Facing,
  movementType: MovementType,
  capability: IMovementCapability,
  currentHeat: number = 0,
): IMovementValidation {
  if (!isInBounds(grid, destination)) {
    return {
      valid: false,
      error: 'Destination is outside map bounds',
      mpCost: 0,
      heatGenerated: 0,
    };
  }

  if (
    !hexEquals(position.coord, destination) &&
    isOccupied(grid, destination)
  ) {
    return {
      valid: false,
      error: 'Destination hex is occupied',
      mpCost: 0,
      heatGenerated: 0,
    };
  }

  const distance = hexDistance(position.coord, destination);

  if (movementType === MovementType.Jump && capability.jumpMP === 0) {
    return {
      valid: false,
      error: 'Unit cannot jump (no jump jets)',
      mpCost: 0,
      heatGenerated: 0,
    };
  }

  const heatPenalty = currentHeat > 0 ? getHeatMovementPenalty(currentHeat) : 0;
  const maxMP = getMaxMP(capability, movementType, heatPenalty);

  if (distance > maxMP) {
    return {
      valid: false,
      error: `Destination is ${distance} hexes away, but max range for ${movementType} is ${maxMP}`,
      mpCost: distance,
      heatGenerated: 0,
    };
  }

  if (movementType !== MovementType.Jump && distance > 0) {
    const path = hexLine(position.coord, destination);
    for (let i = 1; i < path.length - 1; i++) {
      if (!isInBounds(grid, path[i])) {
        return {
          valid: false,
          error: 'Path goes outside map bounds',
          mpCost: distance,
          heatGenerated: 0,
        };
      }
      if (isOccupied(grid, path[i])) {
        return {
          valid: false,
          error: `Path blocked by unit at (${path[i].q}, ${path[i].r})`,
          mpCost: distance,
          heatGenerated: 0,
        };
      }
    }
  }

  const heatGenerated = calculateMovementHeat(movementType, distance);

  return {
    valid: true,
    mpCost: distance,
    heatGenerated,
  };
}

/**
 * Check if a unit is prone and needs to stand.
 * Standing costs all walking MP.
 */
export function canStand(
  position: IUnitPosition,
  capability: IMovementCapability,
): boolean {
  return position.prone && capability.walkMP > 0;
}

/**
 * Get the MP cost to stand from prone.
 */
export function getStandingCost(capability: IMovementCapability): number {
  return capability.walkMP;
}

/**
 * Get all valid destinations for a movement type.
 *
 * Per `wire-heat-generation-and-effects` task 7.3: when `currentHeat`
 * is provided, destinations are constrained by the heat-reduced MP
 * so UI previews + bot planning both respect the penalty.
 */
export function getValidDestinations(
  grid: IHexGrid,
  position: IUnitPosition,
  movementType: MovementType,
  capability: IMovementCapability,
  currentHeat: number = 0,
): readonly IHexCoordinate[] {
  const heatPenalty = currentHeat > 0 ? getHeatMovementPenalty(currentHeat) : 0;
  const maxMP = getMaxMP(capability, movementType, heatPenalty);
  if (maxMP === 0) {
    return [position.coord];
  }

  const destinations: IHexCoordinate[] = [];

  for (let dq = -maxMP; dq <= maxMP; dq++) {
    for (let dr = -maxMP; dr <= maxMP; dr++) {
      const dest: IHexCoordinate = {
        q: position.coord.q + dq,
        r: position.coord.r + dr,
      };

      const validation = validateMovement(
        grid,
        position,
        dest,
        position.facing,
        movementType,
        capability,
        currentHeat,
      );

      if (validation.valid) {
        destinations.push(dest);
      }
    }
  }

  return destinations;
}
