import {
  Facing,
  GameEventType,
  GamePhase,
  IGameEvent,
  IFacingChangedPayload,
  IGoProneStep,
  IHexCoordinate,
  IMovementEnhancementActivatedPayload,
  IMovementDeclaredPayload,
  IMovementLockedPayload,
  MovementEnhancementActivationKind,
  MovementType,
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
