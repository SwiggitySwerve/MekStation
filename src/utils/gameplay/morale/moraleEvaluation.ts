/**
 * In-battle morale evaluation pass.
 *
 * Folds the combat-event log into the ordered list of `MoraleShifted`
 * events it implies, then exposes the suffix the engine still needs to
 * append. Because the derivation is a pure function of the log, the
 * pass is fully idempotent — running it twice appends nothing the
 * second time, and replaying the log reconstructs morale exactly
 * (per `add-combat-morale-and-withdrawal` design D2).
 *
 * @spec openspec/changes/add-combat-morale-and-withdrawal/spec.md
 *   — Requirement: Morale Shift Rules
 */

import {
  GameEventType,
  GamePhase,
  GameSide,
  type IGameEvent,
  type IMoraleShiftedPayload,
  type MoraleLevel,
} from '@/types/gameplay';
import { createMoraleShiftedEvent } from '@/utils/gameplay/gameEvents/morale';
import { deriveState } from '@/utils/gameplay/gameState';

import {
  computeMoraleShifts,
  shiftMoraleLevel,
  vitalCritUnitId,
} from './moraleShift';

/** Every side starts a battle at `STEADY`. */
export const DEFAULT_BATTLE_MORALE: Readonly<Record<GameSide, MoraleLevel>> = {
  [GameSide.Player]: 'STEADY',
  [GameSide.Opponent]: 'STEADY',
};

/**
 * A morale shift the log implies but that has not yet been emitted as a
 * `MoraleShifted` event — the engine appends these in order.
 */
export interface IPendingMoraleEvent {
  readonly side: GameSide;
  readonly from: MoraleLevel;
  readonly to: MoraleLevel;
  readonly cause: string;
  readonly turn: number;
  /** Sequence of the combat event that triggered the shift. */
  readonly triggerSequence: number;
}

/**
 * Combat-event types whose appearance the morale pass reacts to.
 * `MoraleShifted` itself is excluded so re-folding stays idempotent.
 */
function isMoraleTriggerEvent(event: IGameEvent): boolean {
  return (
    event.type === GameEventType.UnitDestroyed ||
    event.type === GameEventType.ComponentDestroyed ||
    event.type === GameEventType.CriticalHitResolved
  );
}

/**
 * Derive the ordered list of every morale shift the combat-event log
 * implies. Each entry carries the pre-shift (`from`) and post-shift
 * (`to`) level so the emitted event is self-describing.
 *
 * The fold walks events in sequence order, maintaining running morale
 * per side and the set of units whose vital-crit downshift has already
 * been counted (the spec caps that shift to once per unit).
 */
export function deriveAllMoraleShifts(
  events: readonly IGameEvent[],
): readonly IPendingMoraleEvent[] {
  const ordered = [...events].sort((a, b) => a.sequence - b.sequence);
  const morale: Record<GameSide, MoraleLevel> = {
    [GameSide.Player]: DEFAULT_BATTLE_MORALE[GameSide.Player],
    [GameSide.Opponent]: DEFAULT_BATTLE_MORALE[GameSide.Opponent],
  };
  const vitalCritCounted = new Set<string>();
  const result: IPendingMoraleEvent[] = [];

  for (let i = 0; i < ordered.length; i++) {
    const event = ordered[i];
    if (!isMoraleTriggerEvent(event)) continue;

    // Morale shifts are evaluated against the state BEFORE this
    // event's own reducer runs — `UnitDestroyed` for a unit must still
    // be able to read that unit's side and heaviness.
    const priorState = deriveState(event.gameId, ordered.slice(0, i));
    const shifts = computeMoraleShifts(priorState, event, vitalCritCounted);
    for (const shift of shifts) {
      if (shift.delta === 0) continue;
      const from = morale[shift.side];
      const to = shiftMoraleLevel(from, shift.delta);
      if (from === to) continue;
      morale[shift.side] = to;
      result.push({
        side: shift.side,
        from,
        to,
        cause: shift.cause,
        turn: event.turn,
        triggerSequence: event.sequence,
      });
    }

    // Grow the vital-crit cap set AFTER computing this event's shift,
    // so the first crit on a unit still counts.
    const critUnit = vitalCritUnitId(event);
    if (critUnit !== null) {
      vitalCritCounted.add(critUnit);
    }
  }

  return result;
}

/**
 * Fold the `MoraleShifted` events in a log into the running per-side
 * `battleMorale`. Used by the reducer to reconstruct morale from the
 * event stream.
 */
export function deriveBattleMorale(
  events: readonly IGameEvent[],
): Record<GameSide, MoraleLevel> {
  const morale: Record<GameSide, MoraleLevel> = {
    [GameSide.Player]: DEFAULT_BATTLE_MORALE[GameSide.Player],
    [GameSide.Opponent]: DEFAULT_BATTLE_MORALE[GameSide.Opponent],
  };
  for (const event of events) {
    if (event.type !== GameEventType.MoraleShifted) continue;
    const payload = event.payload as IMoraleShiftedPayload;
    morale[payload.side] = payload.to;
  }
  return morale;
}

/**
 * Given a session's full event log, return the `MoraleShifted` events
 * still missing from it — the suffix of `deriveAllMoraleShifts` beyond
 * the count of `MoraleShifted` events already present. The engine
 * appends these, re-deriving state after each.
 *
 * `gameId`, `turn`, and `phase` stamp the new events' envelope.
 */
export function buildMissingMoraleEvents(
  gameId: string,
  events: readonly IGameEvent[],
  turn: number,
  phase: GamePhase,
): readonly IGameEvent[] {
  const allShifts = deriveAllMoraleShifts(events);
  const alreadyEmitted = events.filter(
    (e) => e.type === GameEventType.MoraleShifted,
  ).length;
  const missing = allShifts.slice(alreadyEmitted);

  let sequence = events.length;
  const result: IGameEvent[] = [];
  for (const shift of missing) {
    result.push(
      createMoraleShiftedEvent(
        gameId,
        sequence,
        turn,
        phase,
        shift.side,
        shift.from,
        shift.to,
        shift.cause,
      ),
    );
    sequence += 1;
  }
  return result;
}
