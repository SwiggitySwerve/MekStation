import {
  GameEventType,
  GamePhase,
  GameSide,
  IGameEvent,
  IInitiativeOrderSetPayload,
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

export function createInitiativeOrderSetEvent(
  gameId: string,
  sequence: number,
  turn: number,
  winner: GameSide,
  firstMover: GameSide,
): IGameEvent {
  const secondMover =
    firstMover === GameSide.Player ? GameSide.Opponent : GameSide.Player;
  const payload: IInitiativeOrderSetPayload = {
    winner,
    firstMover,
    secondMover,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.InitiativeOrderSet,
      turn,
      GamePhase.Initiative,
    ),
    payload,
  };
}
