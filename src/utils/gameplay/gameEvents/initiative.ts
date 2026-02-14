import {
  GameEventType,
  GamePhase,
  GameSide,
  IGameEvent,
  IInitiativeRolledPayload,
} from '@/types/gameplay';

import { createEventBase } from './base';

export function createInitiativeRolledEvent(
  gameId: string,
  sequence: number,
  turn: number,
  playerRoll: number,
  opponentRoll: number,
  winner: GameSide,
  movesFirst: GameSide,
): IGameEvent {
  const payload: IInitiativeRolledPayload = {
    playerRoll,
    opponentRoll,
    winner,
    movesFirst,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.InitiativeRolled,
      turn,
      GamePhase.Initiative,
    ),
    payload,
  };
}
