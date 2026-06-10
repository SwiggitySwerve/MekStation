/**
 * Movement Validation
 */

import { getHeatMovementPenalty } from '@/constants/heat';
import {
  IEnvironmentalConditions,
  IHexCoordinate,
  IHexGrid,
  IUnitPosition,
  IMovementCapability,
  IMovementValidation,
  MovementType,
  Facing,
  StandUpMode,
} from '@/types/gameplay';
import {
  getWindJumpReduction,
  scaleJumpDistance,
} from '@/utils/gameplay/environmentalModifiers';

import type { UnitMovementType } from './types';

import { isInBounds, isOccupied } from '../hexGrid';
import { hexDistance, hexEquals } from '../hexMath';
import {
  getHexMovementCost,
  getMaxMP,
  type IMovementCostContext,
} from './calculations';
import { calculateGroundPathTurningMpCost } from './eventPath';
import { movementModeForPath } from './mode';
import { calculateMovementHeat } from './modifiers';
import { findPath } from './pathfinding';

/**
 * Validate a movement action.
 *
 * Per `wire-heat-generation-and-effects` task 7.3 as corrected by audit
 * 2026-06-09 C-1/C-2: when `currentHeat` is provided,
 * `getHeatMovementPenalty(currentHeat)` reduces WALK MP only; run/sprint
 * MP are re-derived from the heat-adjusted walk inside `getMaxMP`, and
 * jump MP is heat-immune. At heat 15 (penalty 3), a walk-5 unit validates
 * against walk-2 (not walk-5); attempting distance > 2 fails validation
 * with the heat-penalised range in the error string.
 */
export function validateMovement(
  grid: IHexGrid,
  position: IUnitPosition,
  destination: IHexCoordinate,
  newFacing: Facing,
  movementType: MovementType,
  capability: IMovementCapability,
  currentHeat: number = 0,
  environmentalConditions?: IEnvironmentalConditions,
  movementContext?: IMovementCostContext,
): IMovementValidation {
  if (position.isStuck) {
    return {
      valid: false,
      error: 'Unit is stuck',
      mpCost: 0,
      heatGenerated: 0,
    };
  }

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
  const facingChangeCost = getFacingChangeCost(position.facing, newFacing);

  if (movementType === MovementType.Jump && capability.jumpMP === 0) {
    return {
      valid: false,
      error: 'Unit cannot jump (no jump jets)',
      mpCost: 0,
      heatGenerated: 0,
    };
  }

  const heatPenalty = currentHeat > 0 ? getHeatMovementPenalty(currentHeat) : 0;
  const maxMP = getEnvironmentalMaxMP(
    capability,
    movementType,
    heatPenalty,
    environmentalConditions,
  );

  let mpCost = distance === 0 ? facingChangeCost : distance;
  if (movementType !== MovementType.Jump && distance > 0) {
    // Audit 2026-06-09 B-4: path with the capability's motive mode (hover,
    // tracked, wige, …) exactly like the reachability projection does, so
    // both validators charge the same terrain costs. The plain walk/run
    // mapping is only the fallback for capabilities without a motive mode.
    const unitMovementType: UnitMovementType = movementModeForPath(
      movementType,
      capability,
    );
    const path = findPath(
      grid,
      position.coord,
      destination,
      Infinity,
      unitMovementType,
      movementContext,
    );

    if (!path) {
      const directCost = getHexMovementCost(
        grid,
        destination,
        unitMovementType,
        position.coord,
        movementContext,
      );
      if (!Number.isFinite(directCost)) {
        return {
          valid: false,
          error: `Path crosses impassable terrain at (${destination.q}, ${destination.r})`,
          mpCost: 0,
          heatGenerated: 0,
        };
      }

      return {
        valid: false,
        error: 'No valid ground path to destination',
        mpCost: 0,
        heatGenerated: 0,
      };
    }

    mpCost = calculateGroundPathMpCost(
      grid,
      path,
      unitMovementType,
      position.facing,
      newFacing,
      movementContext,
    );
  }

  if (mpCost > maxMP) {
    return {
      valid: false,
      error: `Destination costs ${mpCost} MP, but max range for ${movementType} is ${maxMP}`,
      mpCost,
      heatGenerated: 0,
    };
  }

  // Audit 2026-06-09 B-3: pass the full capability heat state — previously
  // only the Partial Wing bonus was forwarded, so non-Mek units (hover,
  // tracked, …) were charged Mek movement heat here.
  const heatGenerated = calculateMovementHeat(movementType, distance, {
    movementMode: capability.movementMode,
    movementHeatProfile: capability.movementHeatProfile,
    partialWingJumpBonus: capability.partialWingJumpBonus,
  });

  return {
    valid: true,
    mpCost,
    heatGenerated,
  };
}

export function getFacingChangeCost(from: Facing, to: Facing): number {
  const diff = Math.abs(from - to);
  return Math.min(diff, 6 - diff);
}

function getEnvironmentalMaxMP(
  capability: IMovementCapability,
  movementType: MovementType,
  heatPenalty: number,
  environmentalConditions: IEnvironmentalConditions | undefined,
): number {
  if (
    movementType !== MovementType.Jump ||
    environmentalConditions === undefined
  ) {
    return getMaxMP(capability, movementType, heatPenalty);
  }

  const scaledJumpMP = scaleJumpDistance(
    capability.jumpMP,
    environmentalConditions.gravity,
  );
  // Audit 2026-06-09 C-2: jump MP is heat-immune (MegaMek Mek.getJumpMP has
  // no heat term) — gravity and wind are the only jump MP modifiers here.
  return Math.max(
    0,
    scaledJumpMP - getWindJumpReduction(environmentalConditions.wind),
  );
}

function calculatePathMovementCost(
  grid: IHexGrid,
  path: readonly IHexCoordinate[],
  movementType: UnitMovementType,
  movementContext?: IMovementCostContext,
): number {
  let total = 0;

  for (let i = 1; i < path.length; i++) {
    const stepCost = getHexMovementCost(
      grid,
      path[i],
      movementType,
      path[i - 1],
      movementContext,
    );
    if (!Number.isFinite(stepCost)) return Infinity;
    total += stepCost;
  }

  return total;
}

export function calculateGroundPathMpCost(
  grid: IHexGrid,
  path: readonly IHexCoordinate[],
  movementType: UnitMovementType,
  fromFacing: Facing,
  toFacing: Facing,
  movementContext?: IMovementCostContext,
): number {
  return (
    calculatePathMovementCost(grid, path, movementType, movementContext) +
    calculateGroundPathTurningMpCost({
      path,
      fromFacing,
      toFacing,
    })
  );
}

/**
 * Check if a unit is prone and needs to stand.
 * Normal stand-up costs 2 MP. MegaMek charges 1 MP when the unit only has
 * runMP 1, matching GetUpStep's reduced-cost edge case.
 */
export function canStand(
  position: IUnitPosition,
  capability: IMovementCapability,
): boolean {
  return position.prone && capability.walkMP > 0;
}

/**
 * Get the MP cost to stand from prone.
 * TacOps careful stand uses the whole walking allowance when walk MP is
 * above 2; otherwise MegaMek falls back to the normal stand-up cost.
 */
export function getStandingCost(
  capability: IMovementCapability,
  standUpMode: StandUpMode = 'normal',
): number {
  if (standUpMode === 'careful' && capability.walkMP > 2) {
    return capability.walkMP;
  }
  return capability.runMP === 1 ? 1 : 2;
}

/**
 * Get all valid destinations for a movement type.
 *
 * Per `wire-heat-generation-and-effects` task 7.3 as corrected by audit
 * 2026-06-09 C-1/C-2: when `currentHeat` is provided, walk MP is
 * heat-reduced and run/sprint MP re-derive from it (jump MP is
 * heat-immune) so UI previews + bot planning both respect the penalty.
 */
export function getValidDestinations(
  grid: IHexGrid,
  position: IUnitPosition,
  movementType: MovementType,
  capability: IMovementCapability,
  currentHeat: number = 0,
  environmentalConditions?: IEnvironmentalConditions,
  movementContext?: IMovementCostContext,
): readonly IHexCoordinate[] {
  const heatPenalty = currentHeat > 0 ? getHeatMovementPenalty(currentHeat) : 0;
  const maxMP = getEnvironmentalMaxMP(
    capability,
    movementType,
    heatPenalty,
    environmentalConditions,
  );
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
        environmentalConditions,
        movementContext,
      );

      if (validation.valid) {
        destinations.push(dest);
      }
    }
  }

  return destinations;
}
