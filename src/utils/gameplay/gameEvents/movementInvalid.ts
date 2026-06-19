import {
  Facing,
  GameEventType,
  GamePhase,
  IGameEvent,
  IHexCoordinate,
  IMovementInvalidPayload,
  MovementType,
} from '@/types/gameplay';

import type { IGameplayEventContext } from './eventContext';

import { createEventBase } from './base';

type MovementEventContext = Omit<IGameplayEventContext, 'phase'>;

type MovementInvalidLegacyArgs = [
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
];

export interface ICreateMovementInvalidEventInput extends MovementEventContext {
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly facing: Facing;
  readonly movementType: MovementType;
  readonly reason: IMovementInvalidPayload['reason'];
  readonly details?: string;
  readonly mpCost?: number;
  readonly heatGenerated?: number;
}

export function createMovementInvalidEvent(
  input: ICreateMovementInvalidEventInput | string,
  ...legacy: [] | MovementInvalidLegacyArgs
): IGameEvent {
  const {
    details,
    facing,
    from,
    gameId,
    heatGenerated,
    movementType,
    mpCost,
    reason,
    sequence,
    to,
    turn,
    unitId,
  } = movementInvalidInput(input, legacy);
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

function movementInvalidInput(
  input: ICreateMovementInvalidEventInput | string,
  legacy: [] | MovementInvalidLegacyArgs,
): ICreateMovementInvalidEventInput {
  if (typeof input !== 'string') return input;

  const [
    sequence,
    turn,
    unitId,
    from,
    to,
    facing,
    movementType,
    reason,
    details,
    mpCost,
    heatGenerated,
  ] = legacy as MovementInvalidLegacyArgs;

  return {
    gameId: input,
    sequence,
    turn,
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
}
