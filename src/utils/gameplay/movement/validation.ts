/**
 * Movement Validation
 */

import { getHeatMovementPenalty } from '@/constants/heat';
import {
  Facing,
  IEnvironmentalConditions,
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  IMovementValidation,
  IUnitPosition,
  MovementType,
  StandUpMode,
} from '@/types/gameplay';
import {
  getWindJumpReduction,
  scaleJumpDistance,
} from '@/utils/gameplay/environmentalModifiers';

import type { UnitMovementType } from './types';

import { getOccupant, isInBounds, isOccupied } from '../hexGrid';
import { hexDistance, hexEquals } from '../hexMath';
import {
  getHexMovementCost,
  getJumpClearanceBlockedReason,
  getJumpElevationBlockedReason,
  getMaxMP,
  getMovementStepCostBreakdown,
  type IMovementCostContext,
} from './calculations';
import { calculateGroundPathTurningMpCost } from './eventPath';
import {
  calculateManeuveringAceBipedLateralShiftCost,
  calculateManeuveringAceQuadLateralStepCost,
  canUseManeuveringAceBipedLateralShift,
} from './lateralShift';
import { movementModeForPath } from './mode';
import { calculateMovementHeat } from './modifiers';
import { findPath } from './pathfinding';

export interface IValidateMovementInput {
  readonly grid: IHexGrid;
  readonly position: IUnitPosition;
  readonly destination: IHexCoordinate;
  readonly newFacing: Facing;
  readonly movementType: MovementType;
  readonly capability: IMovementCapability;
  readonly currentHeat?: number;
  readonly environmentalConditions?: IEnvironmentalConditions;
  readonly movementContext?: IMovementCostContext;
}

type ValidateMovementArgs =
  | readonly [input: IValidateMovementInput]
  | readonly [
      grid: IHexGrid,
      position: IUnitPosition,
      destination: IHexCoordinate,
      newFacing: Facing,
      movementType: MovementType,
      capability: IMovementCapability,
      currentHeat?: number,
      environmentalConditions?: IEnvironmentalConditions,
      movementContext?: IMovementCostContext,
    ];

/**
 * Validate a movement action.
 *
 * Heat reduces walking MP only; run/sprint MP are derived from the adjusted
 * walk allowance, and jump MP is heat-immune.
 */
export function validateMovement(
  ...args: ValidateMovementArgs
): IMovementValidation {
  const input = normalizeValidateMovementInput(args);
  const preconditionFailure = movementPreconditionFailure(input);
  if (preconditionFailure) return preconditionFailure;

  const distance = hexDistance(input.position.coord, input.destination);
  const movementCostContext = resolveMovementCostContext(input);
  const maxMP = getEnvironmentalMaxMP(
    input.capability,
    input.movementType,
    heatMovementPenalty(input.currentHeat),
    input.environmentalConditions,
  );
  const costResolution = resolveMovementMpCost({
    ...input,
    distance,
    movementCostContext,
  });
  if (!costResolution.accepted) return costResolution.validation;

  if (costResolution.mpCost > maxMP) {
    return {
      valid: false,
      error: `Destination costs ${costResolution.mpCost} MP, but max range for ${input.movementType} is ${maxMP}`,
      mpCost: costResolution.mpCost,
      heatGenerated: 0,
    };
  }

  const jumpBlockedReason = jumpMovementBlockedReason(input, distance, maxMP);
  if (jumpBlockedReason) {
    return {
      valid: false,
      error: jumpBlockedReason,
      mpCost: costResolution.mpCost,
      heatGenerated: 0,
    };
  }

  const heatGenerated = calculateMovementHeat(input.movementType, distance, {
    movementMode: input.capability.movementMode,
    movementHeatProfile: input.capability.movementHeatProfile,
    partialWingJumpBonus: input.capability.partialWingJumpBonus,
  });

  return {
    valid: true,
    mpCost: costResolution.mpCost,
    heatGenerated,
  };
}

function normalizeValidateMovementInput(
  args: ValidateMovementArgs,
): IValidateMovementInput {
  if (args.length === 1) return args[0];
  const [
    grid,
    position,
    destination,
    newFacing,
    movementType,
    capability,
    currentHeat = 0,
    environmentalConditions,
    movementContext,
  ] = args;
  return {
    grid,
    position,
    destination,
    newFacing,
    movementType,
    capability,
    currentHeat,
    environmentalConditions,
    movementContext,
  };
}

function movementPreconditionFailure(
  input: IValidateMovementInput,
): IMovementValidation | null {
  if (input.position.isStuck) {
    return invalidMovement('Unit is stuck');
  }
  if (!isInBounds(input.grid, input.destination)) {
    return invalidMovement('Destination is outside map bounds');
  }
  if (
    !hexEquals(input.position.coord, input.destination) &&
    isOccupied(input.grid, input.destination)
  ) {
    return invalidMovement('Destination hex is occupied');
  }
  if (
    hexDistance(input.position.coord, input.destination) > 0 &&
    startHexIsOccupiedByAnotherUnit(input.grid, input.position)
  ) {
    return invalidMovement(
      'Unit cannot make follow-up movement from a start hex occupied by another unit',
    );
  }
  if (
    input.movementType === MovementType.Jump &&
    input.capability.jumpMP === 0
  ) {
    return invalidMovement('Unit cannot jump (no jump jets)');
  }
  return null;
}

function invalidMovement(error: string): IMovementValidation {
  return {
    valid: false,
    error,
    mpCost: 0,
    heatGenerated: 0,
  };
}

function heatMovementPenalty(currentHeat: number | undefined): number {
  return currentHeat && currentHeat > 0
    ? getHeatMovementPenalty(currentHeat)
    : 0;
}

function resolveMovementCostContext(
  input: IValidateMovementInput,
): IMovementCostContext | undefined {
  return input.environmentalConditions === undefined
    ? input.movementContext
    : {
        ...input.movementContext,
        environmentalConditions: input.environmentalConditions,
      };
}

type MovementMpCostResolution =
  | { readonly accepted: true; readonly mpCost: number }
  | { readonly accepted: false; readonly validation: IMovementValidation };

interface IMovementMpCostInput extends IValidateMovementInput {
  readonly movementCostContext?: IMovementCostContext;
  readonly distance: number;
}

function resolveMovementMpCost(
  input: IMovementMpCostInput,
): MovementMpCostResolution {
  const facingChangeCost = getFacingChangeCost(
    input.position.facing,
    input.newFacing,
  );
  let mpCost = input.distance === 0 ? facingChangeCost : input.distance;
  if (input.movementType === MovementType.Jump || input.distance === 0) {
    return { accepted: true, mpCost };
  }

  const unitMovementType = movementModeForPath(
    input.movementType,
    input.capability,
  );
  const path = findPath({
    grid: input.grid,
    start: input.position.coord,
    end: input.destination,
    maxCost: Infinity,
    movementType: unitMovementType,
    context: input.movementCostContext,
  });
  if (!path) return groundPathFailure(input, unitMovementType);

  mpCost = calculateGroundPathMpCost(
    input.grid,
    path,
    unitMovementType,
    input.position.facing,
    input.newFacing,
    input.movementCostContext,
  );
  const lateralStepCost = maneuveringAceLateralStepCost(
    input,
    unitMovementType,
  );
  return {
    accepted: true,
    mpCost:
      lateralStepCost === undefined
        ? mpCost
        : Math.min(mpCost, lateralStepCost),
  };
}

function groundPathFailure(
  input: IMovementMpCostInput,
  unitMovementType: UnitMovementType,
): MovementMpCostResolution {
  const directStep = getMovementStepCostBreakdown(
    input.grid,
    input.destination,
    unitMovementType,
    input.position.coord,
    input.movementCostContext,
  );
  if (!Number.isFinite(directStep.mpCost)) {
    return {
      accepted: false,
      validation: invalidMovement(
        directStep.blockedReason ??
          `Path crosses impassable terrain at (${input.destination.q}, ${input.destination.r})`,
      ),
    };
  }

  return {
    accepted: false,
    validation: invalidMovement('No valid ground path to destination'),
  };
}

function maneuveringAceLateralStepCost(
  input: IMovementMpCostInput,
  unitMovementType: UnitMovementType,
): number | undefined {
  const canUseLateralStep = canUseManeuveringAceBipedLateralShift({
    from: input.position.coord,
    to: input.destination,
    fromFacing: input.position.facing,
    toFacing: input.newFacing,
    movementType: input.movementType,
    movementContext: input.movementCostContext,
  });
  if (!canUseLateralStep) return undefined;

  const params = {
    grid: input.grid,
    from: input.position.coord,
    to: input.destination,
    movementType: unitMovementType,
    movementContext: input.movementCostContext,
  };
  return input.capability.mekLegProfile === 'quad'
    ? calculateManeuveringAceQuadLateralStepCost(params)
    : calculateManeuveringAceBipedLateralShiftCost(params);
}

function jumpMovementBlockedReason(
  input: IValidateMovementInput,
  distance: number,
  maxMP: number,
): string | undefined {
  if (input.movementType !== MovementType.Jump || distance <= 0) {
    return undefined;
  }

  return (
    getJumpElevationBlockedReason(
      input.grid,
      input.position.coord,
      input.destination,
      maxMP,
    ) ??
    getJumpClearanceBlockedReason(
      input.grid,
      input.position.coord,
      input.destination,
      maxMP,
    ) ??
    undefined
  );
}

function startHexIsOccupiedByAnotherUnit(
  grid: IHexGrid,
  position: IUnitPosition,
): boolean {
  const occupantId = getOccupant(grid, position.coord);
  return occupantId !== null && occupantId !== position.unitId;
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

export interface IGetValidDestinationsInput {
  readonly grid: IHexGrid;
  readonly position: IUnitPosition;
  readonly movementType: MovementType;
  readonly capability: IMovementCapability;
  readonly currentHeat?: number;
  readonly environmentalConditions?: IEnvironmentalConditions;
  readonly movementContext?: IMovementCostContext;
}

type GetValidDestinationsArgs =
  | readonly [input: IGetValidDestinationsInput]
  | readonly [
      grid: IHexGrid,
      position: IUnitPosition,
      movementType: MovementType,
      capability: IMovementCapability,
      currentHeat?: number,
      environmentalConditions?: IEnvironmentalConditions,
      movementContext?: IMovementCostContext,
    ];

/**
 * Get all valid destinations for a movement type.
 */
export function getValidDestinations(
  ...args: GetValidDestinationsArgs
): readonly IHexCoordinate[] {
  const input = normalizeGetValidDestinationsInput(args);
  const maxMP = getEnvironmentalMaxMP(
    input.capability,
    input.movementType,
    heatMovementPenalty(input.currentHeat),
    input.environmentalConditions,
  );
  if (maxMP === 0) {
    return [input.position.coord];
  }

  const destinations: IHexCoordinate[] = [];

  for (let dq = -maxMP; dq <= maxMP; dq++) {
    for (let dr = -maxMP; dr <= maxMP; dr++) {
      const destination: IHexCoordinate = {
        q: input.position.coord.q + dq,
        r: input.position.coord.r + dr,
      };

      const validation = validateMovement({
        grid: input.grid,
        position: input.position,
        destination,
        newFacing: input.position.facing,
        movementType: input.movementType,
        capability: input.capability,
        currentHeat: input.currentHeat,
        environmentalConditions: input.environmentalConditions,
        movementContext: input.movementContext,
      });

      if (validation.valid) {
        destinations.push(destination);
      }
    }
  }

  return destinations;
}

function normalizeGetValidDestinationsInput(
  args: GetValidDestinationsArgs,
): IGetValidDestinationsInput {
  if (args.length === 1) return args[0];
  const [
    grid,
    position,
    movementType,
    capability,
    currentHeat = 0,
    environmentalConditions,
    movementContext,
  ] = args;
  return {
    grid,
    position,
    movementType,
    capability,
    currentHeat,
    environmentalConditions,
    movementContext,
  };
}
