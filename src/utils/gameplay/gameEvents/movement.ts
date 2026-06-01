import {
  Facing,
  GameEventType,
  GamePhase,
  IFacingChangedPayload,
  IGameEvent,
  IGoProneStep,
  IHexCoordinate,
  IConvertModeStep,
  IMovementEnhancementActivatedPayload,
  IMovementDeclaredPayload,
  IMovementInvalidPayload,
  IMovementLockedPayload,
  IRuntimeMovementStateChangedPayload,
  MovementEnhancementActivationKind,
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

export function createGoProneMovementDeclaredEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
  at: IHexCoordinate,
  facing: Facing,
  mpCost = 1,
): IGameEvent {
  const step: IGoProneStep = {
    kind: 'goProne',
    index: 0,
    at: { q: at.q, r: at.r },
    mpCost,
  };
  const payload: IMovementDeclaredPayload = {
    unitId,
    from: { q: at.q, r: at.r },
    to: { q: at.q, r: at.r },
    facing,
    movementType: MovementType.Stationary,
    path: [{ q: at.q, r: at.r }],
    mpUsed: mpCost,
    heatGenerated: 0,
    goProneAttempt: true,
    hexesMoved: 0,
    straightHexes: 0,
    turningMpCost: mpCost,
    netDisplacement: 0,
    steps: [step],
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

export function createMovementEnhancementActivatedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
  enhancement: MovementEnhancementActivationKind,
): IGameEvent {
  const payload: IMovementEnhancementActivatedPayload = {
    unitId,
    enhancement,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.MovementEnhancementActivated,
      turn,
      GamePhase.Movement,
      unitId,
    ),
    payload,
  };
}

export function createFacingChangedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  payload: Omit<IFacingChangedPayload, 'unitId'>,
): IGameEvent {
  const facingPayload: IFacingChangedPayload = {
    unitId,
    ...payload,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.FacingChanged,
      turn,
      phase,
      unitId,
    ),
    payload: facingPayload,
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
