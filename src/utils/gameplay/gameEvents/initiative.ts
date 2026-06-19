import {
  GameEventType,
  GamePhase,
  GameSide,
  IGameEvent,
  IInitiativeOrderSetPayload,
  IInitiativeRolledPayload,
} from '@/types/gameplay';

import { createEventBase } from './base';

interface IInitiativeModifiersInput {
  readonly playerModifier: number;
  readonly opponentModifier: number;
}

interface ITacticalGeniusRerollInput {
  readonly side: GameSide;
  readonly originalPlayerRoll: number;
  readonly originalOpponentRoll: number;
}

type InitiativeRolledEventArgs = [
  gameId: string,
  sequence: number,
  turn: number,
  playerRoll: number,
  opponentRoll: number,
  winner: GameSide,
  movesFirst: GameSide,
  initiativeModifiers?: IInitiativeModifiersInput,
  tacticalGeniusReroll?: ITacticalGeniusRerollInput,
];

export interface ICreateInitiativeRolledEventInput {
  readonly gameId: string;
  readonly sequence: number;
  readonly turn: number;
  readonly playerRoll: number;
  readonly opponentRoll: number;
  readonly winner: GameSide;
  readonly movesFirst: GameSide;
  readonly initiativeModifiers?: IInitiativeModifiersInput;
  readonly tacticalGeniusReroll?: ITacticalGeniusRerollInput;
}

export function createInitiativeRolledEvent(
  ...args: [ICreateInitiativeRolledEventInput] | InitiativeRolledEventArgs
): IGameEvent {
  const input = normalizeInitiativeRolledEventInput(args);
  const payload: IInitiativeRolledPayload = {
    playerRoll: input.playerRoll,
    opponentRoll: input.opponentRoll,
    winner: input.winner,
    movesFirst: input.movesFirst,
    ...(input.tacticalGeniusReroll
      ? {
          tacticalGeniusRerollSide: input.tacticalGeniusReroll.side,
          playerOriginalRoll: input.tacticalGeniusReroll.originalPlayerRoll,
          opponentOriginalRoll: input.tacticalGeniusReroll.originalOpponentRoll,
        }
      : {}),
    ...(input.initiativeModifiers &&
    (input.initiativeModifiers.playerModifier !== 0 ||
      input.initiativeModifiers.opponentModifier !== 0)
      ? {
          playerModifier: input.initiativeModifiers.playerModifier,
          opponentModifier: input.initiativeModifiers.opponentModifier,
          playerTotal:
            input.playerRoll + input.initiativeModifiers.playerModifier,
          opponentTotal:
            input.opponentRoll + input.initiativeModifiers.opponentModifier,
        }
      : {}),
  };

  return {
    ...createEventBase(
      input.gameId,
      input.sequence,
      GameEventType.InitiativeRolled,
      input.turn,
      GamePhase.Initiative,
    ),
    payload,
  };
}

function normalizeInitiativeRolledEventInput(
  args: [ICreateInitiativeRolledEventInput] | InitiativeRolledEventArgs,
): ICreateInitiativeRolledEventInput {
  if (typeof args[0] !== 'string') {
    return args[0];
  }

  const [
    gameId,
    sequence,
    turn,
    playerRoll,
    opponentRoll,
    winner,
    movesFirst,
    initiativeModifiers,
    tacticalGeniusReroll,
  ] = args as InitiativeRolledEventArgs;

  return {
    gameId,
    sequence,
    turn,
    playerRoll,
    opponentRoll,
    winner,
    movesFirst,
    ...(initiativeModifiers !== undefined ? { initiativeModifiers } : {}),
    ...(tacticalGeniusReroll !== undefined ? { tacticalGeniusReroll } : {}),
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
