import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IHeatPayload,
} from '@/types/gameplay';

import type { IGameplayEventContext } from './eventContext';

import { createEventBase } from './base';

type StatusEventContextWithoutPhase = Omit<IGameplayEventContext, 'phase'>;

export interface ICreateHeatGeneratedEventInput extends IGameplayEventContext {
  readonly amount: number;
  readonly source: IHeatPayload['source'];
  readonly newTotal: number;
}

export function createHeatGeneratedEvent(
  input: ICreateHeatGeneratedEventInput | string,
  ...legacy:
    | []
    | [
        sequence: number,
        turn: number,
        phase: GamePhase,
        unitId: string,
        amount: number,
        source: IHeatPayload['source'],
        newTotal: number,
      ]
): IGameEvent {
  const [sequence, turn, phase, unitId, amount, source, newTotal] = legacy as [
    number,
    number,
    GamePhase,
    string,
    number,
    IHeatPayload['source'],
    number,
  ];
  const eventInput =
    typeof input !== 'string'
      ? input
      : {
          gameId: input,
          sequence,
          turn,
          phase,
          unitId,
          amount,
          source,
          newTotal,
        };
  return {
    ...createEventBase(
      eventInput.gameId,
      eventInput.sequence,
      GameEventType.HeatGenerated,
      eventInput.turn,
      eventInput.phase,
      eventInput.unitId,
    ),
    payload: {
      unitId: eventInput.unitId,
      amount: eventInput.amount,
      source: eventInput.source,
      newTotal: eventInput.newTotal,
    },
  };
}

export interface ICreateHeatDissipatedEventInput extends StatusEventContextWithoutPhase {
  readonly amount: number;
  readonly newTotal: number;
  readonly breakdown?: IHeatPayload['breakdown'];
}

export function createHeatDissipatedEvent(
  input: ICreateHeatDissipatedEventInput | string,
  ...legacy:
    | []
    | [
        sequence: number,
        turn: number,
        unitId: string,
        amount: number,
        newTotal: number,
        breakdown?: IHeatPayload['breakdown'],
      ]
): IGameEvent {
  const [sequence, turn, unitId, amount, newTotal, breakdown] = legacy as [
    number,
    number,
    string,
    number,
    number,
    IHeatPayload['breakdown'] | undefined,
  ];
  const eventInput =
    typeof input !== 'string'
      ? input
      : { gameId: input, sequence, turn, unitId, amount, newTotal, breakdown };
  const payload: IHeatPayload = {
    unitId: eventInput.unitId,
    amount: -Math.abs(eventInput.amount),
    source: 'dissipation',
    newTotal: eventInput.newTotal,
    ...(eventInput.breakdown ? { breakdown: eventInput.breakdown } : {}),
  };

  return {
    ...createEventBase(
      eventInput.gameId,
      eventInput.sequence,
      GameEventType.HeatDissipated,
      eventInput.turn,
      GamePhase.Heat,
      eventInput.unitId,
    ),
    payload,
  };
}
