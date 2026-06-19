import {
  GameEventType,
  GamePhase,
  IFacingChangedPayload,
  IGameEvent,
  IMovementEnhancementActivatedPayload,
  IMovementLockedPayload,
  IRuntimeMovementStateChangedPayload,
  MovementEnhancementActivationKind,
} from '@/types/gameplay';

import type { IGameplayEventContext } from './eventContext';

import { createEventBase } from './base';

export {
  createGoProneMovementDeclaredEvent,
  createMovementDeclaredEvent,
} from './movementDeclared';
export type {
  ICreateGoProneMovementDeclaredEventInput,
  ICreateMovementDeclaredEventInput,
  IMovementDeclaredEventOptions,
} from './movementDeclared';
export { createMovementInvalidEvent } from './movementInvalid';
export type { ICreateMovementInvalidEventInput } from './movementInvalid';

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

export interface ICreateFacingChangedEventInput extends IGameplayEventContext {
  readonly payload: Omit<IFacingChangedPayload, 'unitId'>;
}

export function createFacingChangedEvent(
  input: ICreateFacingChangedEventInput | string,
  ...legacy:
    | []
    | [
        sequence: number,
        turn: number,
        phase: GamePhase,
        unitId: string,
        payload: Omit<IFacingChangedPayload, 'unitId'>,
      ]
): IGameEvent {
  const [sequence, turn, phase, unitId, payload] = legacy as [
    number,
    number,
    GamePhase,
    string,
    Omit<IFacingChangedPayload, 'unitId'>,
  ];
  const eventInput =
    typeof input !== 'string'
      ? input
      : { gameId: input, sequence, turn, phase, unitId, payload };
  const facingPayload: IFacingChangedPayload = {
    unitId: eventInput.unitId,
    ...eventInput.payload,
  };

  return {
    ...createEventBase(
      eventInput.gameId,
      eventInput.sequence,
      GameEventType.FacingChanged,
      eventInput.turn,
      eventInput.phase,
      eventInput.unitId,
    ),
    payload: facingPayload,
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
