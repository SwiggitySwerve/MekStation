import {
  Facing,
  GameEventType,
  GamePhase,
  IConvertModeStep,
  IGameEvent,
  IGoProneStep,
  IHexCoordinate,
  IMovementDeclaredPayload,
  MovementType,
  type StandUpMode,
} from '@/types/gameplay';
import {
  movementAnimationModeForType,
  normalizeMovementEventPath,
} from '@/utils/gameplay/movement/eventPath';

import type { IGameplayEventContext } from './eventContext';

import { createEventBase } from './base';

type MovementEventContext = Omit<IGameplayEventContext, 'phase'>;

type MovementDeclaredLegacyArgs = [
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
  options?: IMovementDeclaredEventOptions,
];

export interface IMovementDeclaredEventOptions {
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
}

export interface ICreateMovementDeclaredEventInput extends MovementEventContext {
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly facing: Facing;
  readonly movementType: MovementType;
  readonly mpUsed: number;
  readonly heatGenerated: number;
  readonly path?: readonly IHexCoordinate[];
  readonly options?: IMovementDeclaredEventOptions;
}

export function createMovementDeclaredEvent(
  input: ICreateMovementDeclaredEventInput | string,
  ...legacy: [] | MovementDeclaredLegacyArgs
): IGameEvent {
  const {
    facing,
    from,
    gameId,
    heatGenerated,
    movementType,
    mpUsed,
    options,
    path,
    sequence,
    to,
    turn,
    unitId,
  } = movementDeclaredInput(input, legacy);
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

type GoProneMovementDeclaredLegacyArgs = [
  sequence: number,
  turn: number,
  unitId: string,
  at: IHexCoordinate,
  facing: Facing,
  mpCost?: number,
];

export interface ICreateGoProneMovementDeclaredEventInput extends MovementEventContext {
  readonly at: IHexCoordinate;
  readonly facing: Facing;
  readonly mpCost?: number;
}

export function createGoProneMovementDeclaredEvent(
  input: ICreateGoProneMovementDeclaredEventInput | string,
  ...legacy: [] | GoProneMovementDeclaredLegacyArgs
): IGameEvent {
  const {
    at,
    facing,
    gameId,
    mpCost = 1,
    sequence,
    turn,
    unitId,
  } = goProneMovementDeclaredInput(input, legacy);
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

function movementDeclaredInput(
  input: ICreateMovementDeclaredEventInput | string,
  legacy: [] | MovementDeclaredLegacyArgs,
): ICreateMovementDeclaredEventInput {
  if (typeof input !== 'string') return input;

  const [
    sequence,
    turn,
    unitId,
    from,
    to,
    facing,
    movementType,
    mpUsed,
    heatGenerated,
    path,
    options,
  ] = legacy as MovementDeclaredLegacyArgs;

  return {
    gameId: input,
    sequence,
    turn,
    unitId,
    from,
    to,
    facing,
    movementType,
    mpUsed,
    heatGenerated,
    path,
    options,
  };
}

function goProneMovementDeclaredInput(
  input: ICreateGoProneMovementDeclaredEventInput | string,
  legacy: [] | GoProneMovementDeclaredLegacyArgs,
): ICreateGoProneMovementDeclaredEventInput {
  if (typeof input !== 'string') return input;

  const [sequence, turn, unitId, at, facing, mpCost] =
    legacy as GoProneMovementDeclaredLegacyArgs;

  return {
    gameId: input,
    sequence,
    turn,
    unitId,
    at,
    facing,
    mpCost,
  };
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
