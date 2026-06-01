import {
  Facing,
  GameEventType,
  GamePhase,
  IGameEvent,
  IHexCoordinate,
  IConvertModeStep,
  IMovementDeclaredPayload,
  IMovementInvalidPayload,
  IMovementLockedPayload,
  IRuntimeMovementStateChangedPayload,
  MovementType,
  type StandUpMode,
} from '@/types/gameplay';
import {
  movementAnimationModeForType,
  normalizeMovementEventPath,
} from '@/utils/gameplay/movement/eventPath';

import { createEventBase } from './base';

export function createMovementDeclaredEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
  from: IHexCoordinate,
  to: IHexCoordinate,
  facing: Facing,
  movementType: MovementType,
  mpUsed: number,
  heatGenerated: number,
  path?: readonly IHexCoordinate[],
  options?: {
    readonly standUpAttempt?: boolean;
    readonly standUpSucceeded?: boolean;
    readonly standUpMode?: StandUpMode;
    readonly hullDownExitAttempt?: boolean;
    readonly hullDownEntryAttempt?: boolean;
    readonly goProneAttempt?: boolean;
    readonly conversionStepCount?: number;
    readonly conversionMpCost?: number;
    readonly altitudeControlStepCount?: number;
    readonly altitudeControlMpCost?: number;
  },
): IGameEvent {
  const mode = movementAnimationModeForType(movementType);
  const conversionStepCount = normalizedConversionStepCount(
    options?.conversionStepCount,
    options?.conversionMpCost,
  );
  const conversionMpCost = normalizedConversionMpCost(
    options?.conversionMpCost,
  );
  const altitudeControlStepCount = normalizedAltitudeControlStepCount(
    options?.altitudeControlStepCount,
    options?.altitudeControlMpCost,
  );
  const altitudeControlMpCost = normalizedAltitudeControlMpCost(
    options?.altitudeControlMpCost,
  );
  const conversionSteps = buildConversionSteps(
    from,
    conversionStepCount,
    conversionMpCost,
  );
  const payload: IMovementDeclaredPayload = {
    unitId,
    from,
    to,
    facing,
    movementType,
    ...(mode ? { mode } : {}),
    path: normalizeMovementEventPath(from, to, path),
    mpUsed,
    heatGenerated,
    ...(conversionStepCount > 0
      ? { conversionStepCount, conversionMpCost }
      : {}),
    ...(altitudeControlStepCount > 0
      ? { altitudeControlStepCount, altitudeControlMpCost }
      : {}),
    ...(conversionSteps.length > 0 ? { steps: conversionSteps } : {}),
    ...(options?.standUpAttempt ? { standUpAttempt: true } : {}),
    ...(options?.standUpAttempt && options.standUpSucceeded !== undefined
      ? { standUpSucceeded: options.standUpSucceeded }
      : {}),
    ...(options?.standUpAttempt && options.standUpMode
      ? { standUpMode: options.standUpMode }
      : {}),
    ...(options?.hullDownExitAttempt ? { hullDownExitAttempt: true } : {}),
    ...(options?.hullDownEntryAttempt
      ? {
          hullDownEntryAttempt: true,
          steps: [
            ...conversionSteps,
            {
              kind: 'hullDown' as const,
              index: conversionSteps.length,
              at: from,
              mpCost: mpUsed,
            },
          ],
          hexesMoved: 0,
          straightHexes: 0,
          turningMpCost: 0,
          netDisplacement: 0,
        }
      : {}),
    ...(options?.goProneAttempt
      ? {
          goProneAttempt: true,
          steps: [
            ...conversionSteps,
            {
              kind: 'goProne' as const,
              index: conversionSteps.length,
              at: from,
              mpCost: 0,
            },
          ],
          hexesMoved: 0,
          straightHexes: 0,
          turningMpCost: 0,
          netDisplacement: 0,
        }
      : {}),
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.MovementDeclared,
      turn,
      GamePhase.Movement,
      unitId,
    ),
    payload,
  };
}

function normalizedConversionStepCount(
  stepCount: number | undefined,
  mpCost: number | undefined,
): number {
  if (stepCount !== undefined && Number.isFinite(stepCount)) {
    return Math.max(0, Math.floor(stepCount));
  }
  return mpCost !== undefined && mpCost > 0 ? 1 : 0;
}

function normalizedConversionMpCost(mpCost: number | undefined): number {
  if (mpCost === undefined || !Number.isFinite(mpCost)) return 0;
  return Math.max(0, Math.floor(mpCost));
}

function normalizedAltitudeControlStepCount(
  stepCount: number | undefined,
  mpCost: number | undefined,
): number {
  if (stepCount !== undefined && Number.isFinite(stepCount)) {
    return Math.max(0, Math.floor(stepCount));
  }
  return mpCost !== undefined && mpCost > 0 ? 1 : 0;
}

function normalizedAltitudeControlMpCost(mpCost: number | undefined): number {
  if (mpCost === undefined || !Number.isFinite(mpCost)) return 0;
  return Math.max(0, Math.floor(mpCost));
}

function buildConversionSteps(
  at: IHexCoordinate,
  stepCount: number,
  mpCost: number,
): readonly IConvertModeStep[] {
  return Array.from({ length: stepCount }, (_, index) => ({
    kind: 'convertMode' as const,
    index,
    at,
    mpCost: index === 0 ? mpCost : 0,
    stepNumber: index + 1,
    stepCount,
  }));
}

export function createMovementInvalidEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
  from: IHexCoordinate,
  to: IHexCoordinate,
  facing: Facing,
  movementType: MovementType,
  reason: IMovementInvalidPayload['reason'],
  details?: string,
  mpCost?: number,
  heatGenerated?: number,
): IGameEvent {
  const payload: IMovementInvalidPayload = {
    unitId,
    from,
    to,
    facing,
    movementType,
    reason,
    details,
    mpCost,
    heatGenerated,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.MovementInvalid,
      turn,
      GamePhase.Movement,
      unitId,
    ),
    payload,
  };
}

export function createMovementLockedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
): IGameEvent {
  const payload: IMovementLockedPayload = { unitId };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.MovementLocked,
      turn,
      GamePhase.Movement,
      unitId,
    ),
    payload,
  };
}

export function createRuntimeMovementStateChangedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
  patch: Omit<IRuntimeMovementStateChangedPayload, 'unitId'>,
): IGameEvent {
  const payload: IRuntimeMovementStateChangedPayload = {
    unitId,
    ...patch,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.RuntimeMovementStateChanged,
      turn,
      GamePhase.Movement,
      unitId,
    ),
    payload,
  };
}
