import {
  Facing,
  GameEventType,
  GamePhase,
  IGameEvent,
  IHexCoordinate,
  IMovementDeclaredPayload,
  IMovementInvalidPayload,
  IMovementLockedPayload,
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
    readonly goProneAttempt?: boolean;
  },
): IGameEvent {
  const mode = movementAnimationModeForType(movementType);
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
    ...(options?.standUpAttempt ? { standUpAttempt: true } : {}),
    ...(options?.standUpAttempt && options.standUpSucceeded !== undefined
      ? { standUpSucceeded: options.standUpSucceeded }
      : {}),
    ...(options?.standUpAttempt && options.standUpMode
      ? { standUpMode: options.standUpMode }
      : {}),
    ...(options?.hullDownExitAttempt ? { hullDownExitAttempt: true } : {}),
    ...(options?.goProneAttempt
      ? {
          goProneAttempt: true,
          steps: [
            {
              kind: 'goProne' as const,
              index: 0,
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
