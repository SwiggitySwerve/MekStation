import type {
  Facing,
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  IUnitGameState,
  StandUpMode,
} from '@/types/gameplay';
import type { IMovementInvalidPayload } from '@/types/gameplay/GameSessionMovementEvents';

import { getHeatMovementPenalty } from '@/constants/heat';
import { MovementType } from '@/types/gameplay';
import { representedUnitImmobileReason } from '@/utils/gameplay/unitImmobility';

import { isOccupied } from '../hexGrid';
import { hexDistance, hexEquals } from '../hexMath';
import {
  hasPendingAltitudeControlMovementCost,
  pendingAltitudeControlMovementCost,
  type IPendingAltitudeControlMovementCost,
} from './altitudeControlAccounting';
import {
  getMaxMP,
  getMovementStepCostBreakdown,
  getPavementRoadBonusMP,
  movementCostContextForCapability,
  movementCostContextForStep,
} from './calculations';
import {
  hasPendingConversionMovementCost,
  pendingConversionMovementCost,
  type IPendingConversionMovementCost,
} from './conversionAccounting';
import { movementDeclarationLockInvalidState } from './declarationEligibility';
import { buildMovementEventPath } from './eventPath';
import { getHullDownExitCost } from './hullDownExit';
import { movementModeForPath } from './mode';
import { hexHasPavementRoadBonusSurface } from './pathfinding';
import { deriveMovementRangeHexForDestination } from './reachable';
import { resolveRuntimeMovementCapability } from './runtimeCapability';
import { getStandingCost, validateMovement } from './validation';

export interface ICommittedMovementValidationInput {
  readonly grid: IHexGrid;
  readonly unit: IUnitGameState;
  readonly to: IHexCoordinate;
  readonly facing: Facing;
  readonly movementType: MovementType;
  readonly capability?: IMovementCapability | null;
  readonly path?: readonly IHexCoordinate[];
  readonly standUpMode?: StandUpMode;
  readonly optionalRules?: readonly string[] | undefined;
}

export type CommittedMovementValidationResult =
  | {
      readonly valid: true;
      readonly mpCost: number;
      readonly heatGenerated: number;
      readonly path: readonly IHexCoordinate[];
    }
  | {
      readonly valid: false;
      readonly reason: IMovementInvalidPayload['reason'];
      readonly details: string;
      readonly mpCost?: number;
      readonly heatGenerated?: number;
    };

/**
 * Validate a movement declaration at commit time and return the host-
 * authoritative MP, heat, and event path. Callers should pass a grid whose
 * occupant ids already reflect live unit state.
 */
export function validateCommittedMovement(
  input: ICommittedMovementValidationInput,
): CommittedMovementValidationResult {
  const from = input.unit.position;
  const alreadyMoved = movementDeclarationLockInvalidState(
    input.unit.lockState,
  );
  if (alreadyMoved) {
    return {
      valid: false,
      reason: alreadyMoved.reason,
      details: alreadyMoved.details,
      mpCost: 0,
      heatGenerated: 0,
    };
  }

  const immobileReason = representedUnitImmobileReason(input.unit);
  if (immobileReason) {
    return {
      valid: false,
      reason: 'UnitImmobile',
      details: immobileReason,
      mpCost: 0,
      heatGenerated: 0,
    };
  }

  if (!input.capability) {
    return {
      valid: false,
      reason: 'NoMovementCapability',
      details: `No movement capability found for unit ${input.unit.id}`,
    };
  }
  const capability =
    resolveRuntimeMovementCapability(input.unit, input.capability) ??
    input.capability;

  const maxCost = getMaxMP(
    capability,
    input.movementType,
    getHeatMovementPenalty(input.unit.heat),
  );
  const standUpMode = input.standUpMode ?? 'normal';
  const standingCost = input.unit.prone
    ? getStandingCost(capability, standUpMode)
    : getHullDownExitCost(input.unit, capability, input.movementType);
  const pendingConversion = pendingConversionMovementCost(input.unit);
  const pendingAltitudeControl = pendingAltitudeControlMovementCost(input.unit);
  const reservedCost =
    standingCost + pendingConversion.mpCost + pendingAltitudeControl.mpCost;
  const reservedCostLabel = movementReservedCostLabel(
    standingCost,
    pendingConversion,
    pendingAltitudeControl,
  );
  if (
    input.unit.prone &&
    standUpMode === 'careful' &&
    !hexEquals(from, input.to)
  ) {
    return {
      valid: false,
      reason: 'InvalidDestination',
      details: 'Careful stand consumes the movement for this turn',
      mpCost: reservedCost,
      heatGenerated: 0,
    };
  }
  const projection = deriveMovementRangeHexForDestination(
    input.unit,
    input.movementType,
    input.grid,
    capability,
    input.to,
    standUpMode,
    { optionalRules: input.optionalRules },
  );
  const shouldDeferImpossibleStandUpResolution =
    input.unit.prone === true &&
    input.movementType !== MovementType.Jump &&
    projection?.standUpPsrImpossibleReason;
  if (
    projection &&
    !projection.reachable &&
    !shouldDeferImpossibleStandUpResolution
  ) {
    return {
      valid: false,
      reason: projection.movementInvalidReason ?? 'InvalidDestination',
      details:
        projection.movementInvalidDetails ??
        projection.blockedReason ??
        'Movement is not legal',
      mpCost: projection.mpCost,
      heatGenerated: projection.heatGenerated,
    };
  }

  const validation = validateMovement(
    input.grid,
    {
      unitId: input.unit.id,
      coord: from,
      facing: input.unit.facing,
      prone: input.unit.prone ?? false,
    },
    input.to,
    input.facing,
    input.movementType,
    capability,
    input.unit.heat,
  );

  if (!validation.valid) {
    if (input.path !== undefined) {
      const pathValidation = validateSuppliedMovementPath({
        grid: input.grid,
        from,
        to: input.to,
        path: input.path,
        movementType: input.movementType,
        capability,
        maxCost,
        standingCost: reservedCost,
        reservedCostLabel,
        optionalRules: input.optionalRules,
      });
      if (!pathValidation.valid) {
        return {
          valid: false,
          reason: pathValidation.reason,
          details: pathValidation.details,
          mpCost: pathValidation.mpCost,
          heatGenerated: validation.heatGenerated,
        };
      }
      if (projection?.reachable) {
        return {
          valid: true,
          mpCost: pathValidation.mpCost ?? projection.mpCost,
          heatGenerated: projection.heatGenerated ?? 0,
          path: input.path,
        };
      }
    } else if (projection?.reachable) {
      return {
        valid: true,
        mpCost: projection.mpCost,
        heatGenerated: projection.heatGenerated ?? 0,
        path: projection.path ?? [from, input.to],
      };
    }

    const directBlockedStep = directTerrainBlockedStep({
      grid: input.grid,
      from,
      to: input.to,
      movementType: input.movementType,
      capability,
      standingCost,
      pendingConversionCost: pendingConversion.mpCost,
      pendingAltitudeControlCost: pendingAltitudeControl.mpCost,
      optionalRules: input.optionalRules,
    });
    if (directBlockedStep) {
      return {
        valid: false,
        reason: 'TerrainBlocked',
        details: directBlockedStep.blockedReason,
        mpCost: directBlockedStep.mpCost,
        heatGenerated: validation.heatGenerated,
      };
    }

    return {
      valid: false,
      reason: movementInvalidReasonFromValidation(validation.error),
      details: validation.error ?? 'Movement is not legal',
      mpCost: validation.mpCost,
      heatGenerated: validation.heatGenerated,
    };
  }

  let mpCost =
    standingCost > 0 &&
    input.movementType !== MovementType.Jump &&
    input.movementType !== MovementType.Stationary &&
    hexEquals(from, input.to)
      ? reservedCost
      : validation.mpCost;
  let heatGenerated = validation.heatGenerated;
  let committedPath: readonly IHexCoordinate[] | undefined;
  if (projection?.reachable) {
    mpCost = projection.mpCost;
    heatGenerated = projection.heatGenerated ?? 0;
    committedPath = projection.path ?? [from, input.to];
  }
  if (input.path !== undefined) {
    const pathValidation = validateSuppliedMovementPath({
      grid: input.grid,
      from,
      to: input.to,
      path: input.path,
      movementType: input.movementType,
      capability,
      maxCost,
      standingCost: reservedCost,
      reservedCostLabel,
      optionalRules: input.optionalRules,
    });
    if (!pathValidation.valid) {
      return {
        valid: false,
        reason: pathValidation.reason,
        details: pathValidation.details,
        mpCost: pathValidation.mpCost,
        heatGenerated,
      };
    }
    mpCost = pathValidation.mpCost ?? mpCost;
    committedPath = input.path;
  }

  return {
    valid: true,
    mpCost,
    heatGenerated,
    path:
      committedPath ??
      buildMovementEventPath({
        grid: input.grid,
        from,
        to: input.to,
        movementType: input.movementType,
        maxCost: mpCost,
      }),
  };
}

function directTerrainBlockedStep(input: {
  readonly grid: IHexGrid;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly movementType: MovementType;
  readonly capability: IMovementCapability;
  readonly standingCost?: number;
  readonly pendingConversionCost?: number;
  readonly pendingAltitudeControlCost?: number;
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
    { optionalRules: input.optionalRules },
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

function movementReservedCostLabel(
  standingCost: number,
  pendingConversion: IPendingConversionMovementCost,
  pendingAltitudeControl: IPendingAltitudeControlMovementCost,
): string {
  const parts: string[] = [];
  if (standingCost > 0) parts.push('stand-up');
  if (hasPendingConversionMovementCost(pendingConversion)) {
    parts.push('conversion');
  }
  if (hasPendingAltitudeControlMovementCost(pendingAltitudeControl)) {
    parts.push('altitude control');
  }
  return parts.join(' and ');
}

export function movementInvalidReasonFromValidation(
  error: string | undefined,
): IMovementInvalidPayload['reason'] {
  if (!error) return 'InvalidDestination';
  if (error.includes('outside map bounds')) return 'DestinationOutOfBounds';
  if (error.includes('occupied')) return 'DestinationOccupied';
  if (error.includes('cannot jump')) return 'JumpUnavailable';
  if (error.includes('max range') || error.includes('Path costs')) {
    return 'InsufficientMP';
  }
  if (error.includes('No valid')) return 'NoLegalPath';
  if (
    error.includes('Water blocks') ||
    error.includes('requires water terrain') ||
    error.includes('requires open water terrain') ||
    error.includes('requires rail terrain') ||
    error.includes('Elevation change') ||
    error.includes('Jump elevation rise')
  ) {
    return 'TerrainBlocked';
  }
  return 'InvalidDestination';
}

interface ISuppliedMovementPathValidation {
  readonly valid: boolean;
  readonly reason: IMovementInvalidPayload['reason'];
  readonly details: string;
  readonly mpCost?: number;
}

function validateSuppliedMovementPath(input: {
  readonly grid: IHexGrid;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly path: readonly IHexCoordinate[];
  readonly movementType: MovementType;
  readonly capability: IMovementCapability;
  readonly maxCost: number;
  readonly standingCost: number;
  readonly reservedCostLabel: string;
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
    { optionalRules: input.optionalRules },
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
