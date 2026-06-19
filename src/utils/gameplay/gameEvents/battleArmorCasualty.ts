import type {
  ISquadEliminatedPayload,
  ITrooperKilledPayload,
} from '@/types/gameplay';

import { GameEventType, GamePhase, IGameEvent } from '@/types/gameplay';

import {
  createBattleArmorEventBase,
  type IBattleArmorEventContext,
} from './battleArmorCommon';

/**
 * Emitted for every trooper casualty inside a BA squad. `survivingTroopers`
 * is the count after this casualty, so a 4 to 3 transition carries `3`.
 */
export interface ICreateTrooperKilledEventInput extends IBattleArmorEventContext {
  readonly trooperIndex: number;
  readonly survivingTroopers: number;
}

type TrooperKilledLegacyArgs = [
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  trooperIndex: number,
  survivingTroopers: number,
];

function trooperKilledInput(
  input: ICreateTrooperKilledEventInput | string,
  legacy: [] | TrooperKilledLegacyArgs,
): ICreateTrooperKilledEventInput {
  if (typeof input !== 'string') return input;
  const [sequence, turn, phase, unitId, trooperIndex, survivingTroopers] =
    legacy as TrooperKilledLegacyArgs;
  return {
    gameId: input,
    sequence,
    turn,
    phase,
    unitId,
    trooperIndex,
    survivingTroopers,
  };
}

export function createTrooperKilledEvent(
  input: ICreateTrooperKilledEventInput | string,
  ...legacy: [] | TrooperKilledLegacyArgs
): IGameEvent {
  const eventInput = trooperKilledInput(input, legacy);
  const payload: ITrooperKilledPayload = {
    unitId: eventInput.unitId,
    trooperIndex: eventInput.trooperIndex,
    survivingTroopers: eventInput.survivingTroopers,
  };
  return {
    ...createBattleArmorEventBase(eventInput, GameEventType.TrooperKilled),
    payload,
  };
}

/**
 * Emitted once when the final trooper in a squad dies.
 * Consumers should stop routing damage / attacks at this unit after this.
 */
type SquadEliminatedLegacyArgs = [
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
];

export type ICreateSquadEliminatedEventInput = IBattleArmorEventContext;

export function createSquadEliminatedEvent(
  input: ICreateSquadEliminatedEventInput | string,
  ...legacy: [] | SquadEliminatedLegacyArgs
): IGameEvent {
  const eventInput = squadEliminatedInput(input, legacy);
  const payload: ISquadEliminatedPayload = { unitId: eventInput.unitId };
  return {
    ...createBattleArmorEventBase(eventInput, GameEventType.SquadEliminated),
    payload,
  };
}

function squadEliminatedInput(
  input: ICreateSquadEliminatedEventInput | string,
  legacy: [] | SquadEliminatedLegacyArgs,
): ICreateSquadEliminatedEventInput {
  if (typeof input !== 'string') return input;
  const [sequence, turn, phase, unitId] = legacy as SquadEliminatedLegacyArgs;
  return { gameId: input, sequence, turn, phase, unitId };
}
