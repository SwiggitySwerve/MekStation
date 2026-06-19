/**
 * Combat morale and withdrawal event creators.
 *
 * Factory functions for the three event types added by
 * `add-combat-morale-and-withdrawal`: `MoraleShifted`,
 * `WithdrawalDeclared`, and `ForcedWithdrawalTriggered`.
 *
 * @spec openspec/changes/add-combat-morale-and-withdrawal/design.md D8
 */

import {
  GameEventType,
  GamePhase,
  GameSide,
  type IForcedWithdrawalTriggeredPayload,
  type IGameEvent,
  type IMoraleShiftedPayload,
  type IWithdrawalDeclaredPayload,
  type MoraleLevel,
} from '@/types/gameplay';

import type {
  GameplayEventContextArgs,
  IGameplayEventContext,
} from './eventContext';

import { createEventBase } from './base';

type MoraleShiftedEventArgs = [
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  side: GameSide,
  from: MoraleLevel,
  to: MoraleLevel,
  cause: string,
];

export interface ICreateMoraleShiftedEventInput {
  readonly gameId: string;
  readonly sequence: number;
  readonly turn: number;
  readonly phase: GamePhase;
  readonly side: GameSide;
  readonly from: MoraleLevel;
  readonly to: MoraleLevel;
  readonly cause: string;
}

type WithdrawalDeclaredEventArgs = [
  ...GameplayEventContextArgs,
  edge: 'north' | 'south' | 'east' | 'west',
  declaredBy: 'player' | 'forced',
];

export interface ICreateWithdrawalDeclaredEventInput extends IGameplayEventContext {
  readonly edge: 'north' | 'south' | 'east' | 'west';
  readonly declaredBy: 'player' | 'forced';
}

/**
 * Per `add-combat-morale-and-withdrawal` (D2 / D8): emitted when a
 * side's `battleMorale` changes. `from` / `to` make the event
 * self-describing so replay consumers need not re-fold the log.
 */
export function createMoraleShiftedEvent(
  ...args: [ICreateMoraleShiftedEventInput] | MoraleShiftedEventArgs
): IGameEvent {
  const input = normalizeMoraleShiftedEventInput(args);
  const payload: IMoraleShiftedPayload = {
    side: input.side,
    from: input.from,
    to: input.to,
    cause: input.cause,
    turn: input.turn,
  };
  return {
    ...createEventBase(
      input.gameId,
      input.sequence,
      GameEventType.MoraleShifted,
      input.turn,
      input.phase,
    ),
    payload,
  };
}

/**
 * Per `add-combat-morale-and-withdrawal` (D4 / D8): emitted when a unit
 * is flagged to withdraw. `declaredBy: 'player'` is a human-declared
 * withdrawal; `declaredBy: 'forced'` is the Forced Withdrawal rule.
 * The reducer latches `isWithdrawing` and stores `retreatTargetEdge`.
 */
export function createWithdrawalDeclaredEvent(
  ...args: [ICreateWithdrawalDeclaredEventInput] | WithdrawalDeclaredEventArgs
): IGameEvent {
  const input = normalizeWithdrawalDeclaredEventInput(args);
  const payload: IWithdrawalDeclaredPayload = {
    unitId: input.unitId,
    edge: input.edge,
    declaredBy: input.declaredBy,
    turn: input.turn,
  };
  return {
    ...createEventBase(
      input.gameId,
      input.sequence,
      GameEventType.WithdrawalDeclared,
      input.turn,
      input.phase,
      input.unitId,
    ),
    payload,
  };
}

function normalizeMoraleShiftedEventInput(
  args: [ICreateMoraleShiftedEventInput] | MoraleShiftedEventArgs,
): ICreateMoraleShiftedEventInput {
  if (typeof args[0] !== 'string') {
    return args[0];
  }

  const [gameId, sequence, turn, phase, side, from, to, cause] =
    args as MoraleShiftedEventArgs;

  return {
    gameId,
    sequence,
    turn,
    phase,
    side,
    from,
    to,
    cause,
  };
}

function normalizeWithdrawalDeclaredEventInput(
  args: [ICreateWithdrawalDeclaredEventInput] | WithdrawalDeclaredEventArgs,
): ICreateWithdrawalDeclaredEventInput {
  if (typeof args[0] !== 'string') {
    return args[0];
  }

  const [gameId, sequence, turn, phase, unitId, edge, declaredBy] =
    args as WithdrawalDeclaredEventArgs;

  return {
    gameId,
    sequence,
    turn,
    phase,
    unitId,
    edge,
    declaredBy,
  };
}

/**
 * Per `add-combat-morale-and-withdrawal` (D5 / D8): emitted by the
 * end-of-phase Forced Withdrawal check for each unit it compels to
 * withdraw. Always paired with a `WithdrawalDeclared` event
 * (`declaredBy: 'forced'`) for the same unit.
 */
export function createForcedWithdrawalTriggeredEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  reason: 'morale-broken' | 'crippled',
): IGameEvent {
  const payload: IForcedWithdrawalTriggeredPayload = {
    unitId,
    reason,
    turn,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.ForcedWithdrawalTriggered,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}
