import type {
  IEnvironmentalConditions,
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
} from '@/types/gameplay';
import type { IMovementInvalidPayload } from '@/types/gameplay/GameSessionMovementEvents';

import { MovementType } from '@/types/gameplay';

import { isOccupied } from '../hexGrid';
import { hexDistance, hexEquals } from '../hexMath';
import {
  getMovementStepCostBreakdown,
  getPavementRoadBonusMP,
  movementCostContextForCapability,
  movementCostContextForStep,
} from './calculations';
import { movementModeForPath } from './mode';
import { hexHasPavementRoadBonusSurface } from './pathfinding';

export type ISuppliedMovementPathValidation =
  | ISuppliedMovementPathAccepted
  | ISuppliedMovementPathRejected;

interface ISuppliedMovementPathAccepted {
  readonly valid: true;
  readonly reason: IMovementInvalidPayload['reason'];
  readonly details: string;
  readonly mpCost?: number;
  readonly heatGenerated?: number;
}

interface ISuppliedMovementPathRejected {
  readonly valid: false;
  readonly reason: IMovementInvalidPayload['reason'];
  readonly details: string;
  readonly mpCost?: number;
  readonly heatGenerated?: number;
}

export function directTerrainBlockedStep(input: {
  readonly grid: IHexGrid;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly movementType: MovementType;
  readonly capability: IMovementCapability;
  readonly standingCost?: number;
  readonly pendingConversionCost?: number;
  readonly pendingAltitudeControlCost?: number;
  readonly environmentalConditions?: IEnvironmentalConditions;
  readonly optionalRules?: readonly string[] | undefined;
}): { readonly blockedReason: string; readonly mpCost: number } | null {
  if (input.movementType === MovementType.Jump) return null;
  if (hexDistance(input.from, input.to) !== 1) return null;

  const movementMode = movementModeForPath(
    input.movementType,
    input.capability,
  );
  const costContext = movementCostContextForCapability(
    input.movementType,
    input.capability,
    {
      environmentalConditions: input.environmentalConditions,
      optionalRules: input.optionalRules,
    },
  );
  const step = getMovementStepCostBreakdown(
    input.grid,
    input.to,
    movementMode,
    input.from,
    movementCostContextForStep(costContext, true),
  );

  if (!step.blockedReason) return null;
  return {
    blockedReason: step.blockedReason,
    mpCost:
      step.mpCost +
      (input.standingCost ?? 0) +
      (input.pendingConversionCost ?? 0) +
      (input.pendingAltitudeControlCost ?? 0),
  };
}

export function validateSuppliedMovementPath(input: {
  readonly grid: IHexGrid;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly path: readonly IHexCoordinate[];
  readonly movementType: MovementType;
  readonly capability: IMovementCapability;
  readonly maxCost: number;
  readonly standingCost: number;
  readonly reservedCostLabel: string;
  readonly environmentalConditions?: IEnvironmentalConditions;
  readonly optionalRules?: readonly string[];
}): ISuppliedMovementPathValidation {
  if (input.path.length === 0) {
    return {
      valid: false,
      reason: 'InvalidPath',
      details: 'Committed movement path is empty',
    };
  }

  const first = input.path[0];
  const last = input.path[input.path.length - 1];
  if (!hexEquals(first, input.from) || !hexEquals(last, input.to)) {
    return {
      valid: false,
      reason: 'InvalidPath',
      details:
        'Committed movement path must start at the unit and end at the destination',
    };
  }

  if (
    input.movementType === MovementType.Jump ||
    input.movementType === MovementType.Stationary
  ) {
    return {
      valid: true,
      reason: 'InvalidDestination',
      details: 'Movement path accepted',
    };
  }

  const movementMode = movementModeForPath(
    input.movementType,
    input.capability,
  );
  const costContext = movementCostContextForCapability(
    input.movementType,
    input.capability,
    {
      environmentalConditions: input.environmentalConditions,
      optionalRules: input.optionalRules,
    },
  );
  const pavementRoadBonusMP = getPavementRoadBonusMP(movementMode, costContext);
  let isPavementRoadBonusPath = pavementRoadBonusMP > 0;
  let totalCost = input.standingCost;
  if (totalCost > input.maxCost) {
    return {
      valid: false,
      reason: 'InsufficientMP',
      details: `Unit needs ${input.standingCost} MP for ${input.reservedCostLabel}, but only ${input.maxCost} MP is available`,
      mpCost: totalCost,
    };
  }

  for (let i = 1; i < input.path.length; i++) {
    const previous = input.path[i - 1];
    const current = input.path[i];
    if (hexDistance(previous, current) !== 1) {
      return {
        valid: false,
        reason: 'InvalidPath',
        details: 'Committed ground movement path contains a non-adjacent step',
        mpCost: totalCost,
      };
    }

    if (i < input.path.length - 1 && isOccupied(input.grid, current)) {
      return {
        valid: false,
        reason: 'DestinationOccupied',
        details: `Committed movement path passes through occupied hex (${current.q}, ${current.r})`,
        mpCost: totalCost,
      };
    }

    if (
      isPavementRoadBonusPath &&
      !hexHasPavementRoadBonusSurface(input.grid, current, movementMode)
    ) {
      isPavementRoadBonusPath = false;
    }

    const step = getMovementStepCostBreakdown(
      input.grid,
      current,
      movementMode,
      previous,
      movementCostContextForStep(costContext, i === 1),
    );
    if (step.blockedReason || !Number.isFinite(step.mpCost)) {
      return {
        valid: false,
        reason: 'TerrainBlocked',
        details:
          step.blockedReason ??
          `Committed movement path cannot enter (${current.q}, ${current.r})`,
        mpCost: totalCost,
      };
    }

    totalCost += step.mpCost;
    const maxAllowedCost =
      input.maxCost + (isPavementRoadBonusPath ? pavementRoadBonusMP : 0);
    if (totalCost > maxAllowedCost) {
      const details =
        input.standingCost > 0
          ? `Committed movement path costs ${totalCost} MP including ${input.reservedCostLabel}, but only ${maxAllowedCost} MP is available`
          : `Committed movement path costs ${totalCost} MP, but only ${maxAllowedCost} MP is available`;
      return {
        valid: false,
        reason: 'InsufficientMP',
        details,
        mpCost: totalCost,
      };
    }
  }

  return {
    valid: true,
    reason: 'InvalidDestination',
    details: 'Movement path accepted',
    mpCost: totalCost,
  };
}
