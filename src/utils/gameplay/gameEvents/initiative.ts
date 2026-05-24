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
  initiativeModifiers?: {
    readonly playerModifier: number;
    readonly opponentModifier: number;
  },
  tacticalGeniusReroll?: {
    readonly side: GameSide;
    readonly originalPlayerRoll: number;
    readonly originalOpponentRoll: number;
  },
): IGameEvent {
  const payload: IInitiativeRolledPayload = {
    playerRoll,
    opponentRoll,
    winner,
    movesFirst,
    ...(tacticalGeniusReroll
      ? {
          tacticalGeniusRerollSide: tacticalGeniusReroll.side,
          playerOriginalRoll: tacticalGeniusReroll.originalPlayerRoll,
          opponentOriginalRoll: tacticalGeniusReroll.originalOpponentRoll,
        }
      : {}),
    ...(initiativeModifiers &&
    (initiativeModifiers.playerModifier !== 0 ||
      initiativeModifiers.opponentModifier !== 0)
      ? {
          playerModifier: initiativeModifiers.playerModifier,
          opponentModifier: initiativeModifiers.opponentModifier,
          playerTotal: playerRoll + initiativeModifiers.playerModifier,
          opponentTotal: opponentRoll + initiativeModifiers.opponentModifier,
        }
      : {}),
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
