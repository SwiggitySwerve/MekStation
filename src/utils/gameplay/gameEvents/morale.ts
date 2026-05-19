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

import { createEventBase } from './base';

/**
 * Per `add-combat-morale-and-withdrawal` (D2 / D8): emitted when a
 * side's `battleMorale` changes. `from` / `to` make the event
 * self-describing so replay consumers need not re-fold the log.
 */
export function createMoraleShiftedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  side: GameSide,
  from: MoraleLevel,
  to: MoraleLevel,
  cause: string,
): IGameEvent {
  const payload: IMoraleShiftedPayload = { side, from, to, cause, turn };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.MoraleShifted,
      turn,
      phase,
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
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  edge: 'north' | 'south' | 'east' | 'west',
  declaredBy: 'player' | 'forced',
): IGameEvent {
  const payload: IWithdrawalDeclaredPayload = {
    unitId,
    edge,
    declaredBy,
    turn,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.WithdrawalDeclared,
      turn,
      phase,
      unitId,
    ),
    payload,
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
