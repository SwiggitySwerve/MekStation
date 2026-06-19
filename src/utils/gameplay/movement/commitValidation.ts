import type {
  Facing,
  IHexCoordinate,
  IEnvironmentalConditions,
  IHexGrid,
  IMovementCapability,
  IUnitGameState,
  StandUpMode,
} from '@/types/gameplay';
import type { IMovementInvalidPayload } from '@/types/gameplay/GameSessionMovementEvents';

import { MovementType } from '@/types/gameplay';

import { hexEquals } from '../hexMath';
import {
  buildCommittedMovementContext,
  validateCommitReadiness,
  type ICommittedMovementContext,
} from './commitValidationContext';
import {
  directTerrainBlockedStep,
  validateSuppliedMovementPath,
  type ISuppliedMovementPathValidation,
} from './commitValidationPath';
import { buildMovementEventPath } from './eventPath';
import { deriveMovementRangeHexForDestination } from './reachable';
import { validateMovement } from './validation';

export interface ICommittedMovementValidationInput {
  readonly grid: IHexGrid;
  readonly unit: IUnitGameState;
  readonly to: IHexCoordinate;
  readonly facing: Facing;
  readonly movementType: MovementType;
  readonly capability?: IMovementCapability | null;
  readonly path?: readonly IHexCoordinate[];
  readonly standUpMode?: StandUpMode;
  readonly environmentalConditions?: IEnvironmentalConditions;
  readonly optionalRules?: readonly string[] | undefined;
}

export type CommittedMovementValidationResult =
  | {
      readonly valid: true;
      readonly mpCost: number;
      readonly heatGenerated: number;
      readonly path: readonly IHexCoordinate[];
      /**
       * Audit 2026-06-09 B-4: present when the legacy `validateMovement`
       * pass rejected a destination the canonical reachability projection
       * accepts (e.g. turning MP, which the projection does not model). The
       * commit stays projection-authoritative; this diagnostic keeps the
       * validator split observable instead of silently resolving to the
       * more permissive side.
       */
      readonly validatorDisagreement?: string;
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
  const readinessFailure = validateCommitReadiness(input);
  if (readinessFailure) return readinessFailure;

  const context = buildCommittedMovementContext(input);
  if (!context) {
    return {
      valid: false,
      reason: 'NoMovementCapability',
      details: `No movement capability found for unit ${input.unit.id}`,
    };
  }

  if (
    input.unit.prone &&
    context.standUpMode === 'careful' &&
    !hexEquals(from, input.to)
  ) {
    return {
      valid: false,
      reason: 'InvalidDestination',
      details: 'Careful stand consumes the movement for this turn',
      mpCost: context.reservedCost,
      heatGenerated: 0,
    };
  }
  const projection = deriveMovementRangeHexForDestination(
    input.unit,
    input.movementType,
    input.grid,
    context.movementCapability,
    input.to,
    context.standUpMode,
    {
      environmentalConditions: input.environmentalConditions,
      optionalRules: input.optionalRules,
    },
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
    context.movementCapability,
    input.unit.heat,
    input.environmentalConditions,
    {
      environmentalConditions: input.environmentalConditions,
      pilotAbilities: input.unit.abilities,
    },
  );

  if (!validation.valid) {
    // Audit 2026-06-09 B-4: the projection is the canonical movement
    // authority, so a projection-accepted destination still commits — but
    // the validator split must surface as a returned diagnostic instead of
    // silently resolving to the more permissive side. Known remaining
    // divergence: validateMovement charges turning MP for facing changes,
    // which the projection does not model.
    return resolveValidatorRejection({
      input,
      from,
      context,
      projection,
      validation,
    });
  }

  return resolveValidatorAcceptedMovement({
    input,
    from,
    context,
    projection,
    validation,
  });
}

function resolveValidatorAcceptedMovement(input: {
  readonly input: ICommittedMovementValidationInput;
  readonly from: IHexCoordinate;
  readonly context: ICommittedMovementContext;
  readonly projection: ReturnType<typeof deriveMovementRangeHexForDestination>;
  readonly validation: ReturnType<typeof validateMovement>;
}): CommittedMovementValidationResult {
  const { context, from, projection, validation } = input;
  const originalInput = input.input;
  let mpCost = committedMovementBaseMpCost({
    input: originalInput,
    from,
    context,
    validationMpCost: validation.mpCost,
  });
  let heatGenerated = validation.heatGenerated;
  let committedPath: readonly IHexCoordinate[] | undefined;

  if (projection?.reachable) {
    mpCost = projection.mpCost;
    heatGenerated = projection.heatGenerated ?? 0;
    committedPath = projection.path ?? [from, originalInput.to];
  }

  const pathValidation = validateOptionalCommittedPath({
    input: originalInput,
    from,
    context,
    heatGenerated,
  });
  if (pathValidation?.valid === false) return pathValidation;
  if (pathValidation?.valid === true) {
    mpCost = pathValidation.mpCost ?? mpCost;
    committedPath = originalInput.path;
  }

  return {
    valid: true,
    mpCost,
    heatGenerated,
    path:
      committedPath ??
      buildMovementEventPath({
        grid: originalInput.grid,
        from,
        to: originalInput.to,
        movementType: originalInput.movementType,
        maxCost: mpCost,
        movementContext: {
          environmentalConditions: originalInput.environmentalConditions,
          pilotAbilities: originalInput.unit.abilities,
        },
      }),
  };
}

function committedMovementBaseMpCost(input: {
  readonly input: ICommittedMovementValidationInput;
  readonly from: IHexCoordinate;
  readonly context: ICommittedMovementContext;
  readonly validationMpCost: number;
}): number {
  if (input.context.standingCost <= 0) return input.validationMpCost;
  if (input.input.movementType === MovementType.Jump) {
    return input.validationMpCost;
  }
  if (input.input.movementType === MovementType.Stationary) {
    return input.validationMpCost;
  }
  return hexEquals(input.from, input.input.to)
    ? input.context.reservedCost
    : input.validationMpCost;
}

function validateOptionalCommittedPath(input: {
  readonly input: ICommittedMovementValidationInput;
  readonly from: IHexCoordinate;
  readonly context: ICommittedMovementContext;
  readonly heatGenerated: number;
}): ISuppliedMovementPathValidation | null {
  const originalInput = input.input;
  if (originalInput.path === undefined) return null;

  const pathValidation = validateSuppliedMovementPath({
    grid: originalInput.grid,
    from: input.from,
    to: originalInput.to,
    path: originalInput.path,
    movementType: originalInput.movementType,
    capability: input.context.movementCapability,
    maxCost: input.context.maxCost,
    standingCost: input.context.reservedCost,
    reservedCostLabel: input.context.reservedCostLabel,
    environmentalConditions: originalInput.environmentalConditions,
    optionalRules: originalInput.optionalRules,
  });
  if (pathValidation.valid) return pathValidation;

  return {
    valid: false,
    reason: pathValidation.reason,
    details: pathValidation.details,
    mpCost: pathValidation.mpCost,
    heatGenerated: input.heatGenerated,
  };
}

function resolveValidatorRejection(input: {
  readonly input: ICommittedMovementValidationInput;
  readonly from: IHexCoordinate;
  readonly context: ICommittedMovementContext;
  readonly projection: ReturnType<typeof deriveMovementRangeHexForDestination>;
  readonly validation: ReturnType<typeof validateMovement>;
}): CommittedMovementValidationResult {
  const { context, from, projection, validation } = input;
  const originalInput = input.input;
  const validatorDisagreement = `Reachability projection accepted movement that validateMovement rejected: ${
    validation.error ?? 'unknown reason'
  }`;
  const projectionAccepted = commitProjectionAcceptedResult({
    input: originalInput,
    from,
    context,
    projection,
    validationHeat: validation.heatGenerated,
    validatorDisagreement,
  });
  if (projectionAccepted) return projectionAccepted;

  const directBlockedStep = directTerrainBlockedStep({
    grid: originalInput.grid,
    from,
    to: originalInput.to,
    movementType: originalInput.movementType,
    capability: context.movementCapability,
    standingCost: context.standingCost,
    pendingConversionCost: context.pendingConversion.mpCost,
    pendingAltitudeControlCost: context.pendingAltitudeControl.mpCost,
    environmentalConditions: originalInput.environmentalConditions,
    optionalRules: originalInput.optionalRules,
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

function commitProjectionAcceptedResult(input: {
  readonly input: ICommittedMovementValidationInput;
  readonly from: IHexCoordinate;
  readonly context: ICommittedMovementContext;
  readonly projection: ReturnType<typeof deriveMovementRangeHexForDestination>;
  readonly validationHeat: number;
  readonly validatorDisagreement: string;
}): CommittedMovementValidationResult | null {
  const { context, from, projection } = input;
  const originalInput = input.input;

  if (originalInput.path !== undefined) {
    const pathValidation = validateSuppliedMovementPath({
      grid: originalInput.grid,
      from,
      to: originalInput.to,
      path: originalInput.path,
      movementType: originalInput.movementType,
      capability: context.movementCapability,
      maxCost: context.maxCost,
      standingCost: context.reservedCost,
      reservedCostLabel: context.reservedCostLabel,
      environmentalConditions: originalInput.environmentalConditions,
      optionalRules: originalInput.optionalRules,
    });
    if (!pathValidation.valid) {
      return {
        valid: false,
        reason: pathValidation.reason,
        details: pathValidation.details,
        mpCost: pathValidation.mpCost,
        heatGenerated: input.validationHeat,
      };
    }
    if (projection?.reachable) {
      return {
        valid: true,
        mpCost: pathValidation.mpCost ?? projection.mpCost,
        heatGenerated: projection.heatGenerated ?? 0,
        path: originalInput.path,
        validatorDisagreement: input.validatorDisagreement,
      };
    }
    return null;
  }

  if (!projection?.reachable) return null;
  return {
    valid: true,
    mpCost: projection.mpCost,
    heatGenerated: projection.heatGenerated ?? 0,
    path: projection.path ?? [from, originalInput.to],
    validatorDisagreement: input.validatorDisagreement,
  };
}

export function movementInvalidReasonFromValidation(
  error: string | undefined,
): IMovementInvalidPayload['reason'] {
  if (!error) return 'InvalidDestination';
  if (error.includes('outside map bounds')) return 'DestinationOutOfBounds';
  if (error.includes('follow-up movement')) return 'InvalidDestination';
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
    error.includes('impassable terrain') ||
    error.includes('Nightwalker prohibits running') ||
    error.includes('Elevation change') ||
    error.includes('Jump elevation rise')
  ) {
    return 'TerrainBlocked';
  }
  return 'InvalidDestination';
}
