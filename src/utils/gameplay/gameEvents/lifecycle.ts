import {
  GameEventType,
  GamePhase,
  GameSide,
  IGameConfig,
  IGameCreatedPayload,
  IGameEndedPayload,
  IGameEvent,
  IGameStartedPayload,
  IGameUnit,
} from '@/types/gameplay';

import { createEventBase } from './base';

export function createGameCreatedEvent(
  gameId: string,
  config: IGameConfig,
  units: readonly IGameUnit[],
): IGameEvent {
  const payload: IGameCreatedPayload = { config, units };
  return {
    ...createEventBase(
      gameId,
      0,
      GameEventType.GameCreated,
      0,
      GamePhase.Initiative,
    ),
    payload,
  };
}

export function createGameStartedEvent(
  gameId: string,
  sequence: number,
  firstSide: GameSide,
): IGameEvent {
  const payload: IGameStartedPayload = { firstSide };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.GameStarted,
      1,
      GamePhase.Initiative,
    ),
    payload,
  };
}

export function createGameEndedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  winner: GameSide | 'draw',
  reason: 'destruction' | 'concede' | 'turn_limit' | 'objective',
): IGameEvent {
  const payload: IGameEndedPayload = { winner, reason };
  return {
    ...createEventBase(gameId, sequence, GameEventType.GameEnded, turn, phase),
    payload,
  };
}
