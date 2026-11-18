/**
 * P1 guard, one test per branch of foldedStateOf:
 *   - stamped by the fold but out of step with the log: GameStateRevisionError;
 *   - marked by applyCorrectedState (no event produced it): refused;
 *   - unstamped (from JSON or transport, or built by hand): refolded from the
 *     log as before P1, a deliberate compatibility path.
 * Also the duplicate-id admission rules on the id index that replaced the
 * linear scan.
 */
import { isDeepStrictEqual } from 'node:util';

import { GameEngine } from '@/engine/GameEngine';
import {
  GameEventType,
  type IGameEvent,
  type IGameSession,
} from '@/types/gameplay';
import {
  appendEvent,
  assertGameEventBatchAdmissible,
  GameEventIdCollisionError,
  GameEventSequenceError,
  GameStateRevisionError,
} from '@/utils/gameplay/gameSession';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSessionCore';
import { deriveState } from '@/utils/gameplay/gameState';

import { makeReconnectHostEvents } from '../gameSessionEvents.fixtures';
import { seededForces } from './incrementalFold.seededGames';

const events = makeReconnectHostEvents();
const base = (length = 12): IGameSession =>
  hydrateGameSessionFromEvents('match-1', events.slice(0, length));
const foldOf = (session: IGameSession) =>
  deriveState(session.id, session.events);

function turnEnded(session: IGameSession): IGameEvent {
  const last = session.events.at(-1)!;
  return {
    ...last,
    id: `turn-ended-${last.sequence + 1}`,
    sequence: last.sequence + 1,
    type: GameEventType.TurnEnded,
    payload: {},
  } as IGameEvent;
}

describe('fold revision guard', () => {
  it('refuses the append after applyCorrectedState sets a state no event produced', () => {
    const { player, opponent, gameUnits } = seededForces();
    const interactive = new GameEngine({ seed: 1 }).createInteractiveSession(
      player,
      opponent,
      gameUnits,
    );
    const state = interactive.getState();
    const unit = state.units['player-0'];
    interactive.applyCorrectedState({
      ...state,
      units: { ...state.units, 'player-0': { ...unit, heat: unit.heat + 7 } },
    });
    const session = interactive.getSession();
    const eventCount = session.events.length;

    expect(() => interactive.appendEvent(turnEnded(session))).toThrow(
      GameStateRevisionError,
    );
    expect(() => interactive.advancePhase()).toThrow(GameStateRevisionError);
    expect(interactive.getSession().events).toHaveLength(eventCount);
    expect(interactive.getState().units['player-0'].heat).toBe(unit.heat + 7);
  });

  it('refolds an unstamped replaced currentState from the log, as before P1', () => {
    const session = base();
    const replaced: IGameSession = {
      ...session,
      currentState: { ...session.currentState, turn: 99 },
    };
    const next = appendEvent(replaced, events[12]);
    expect(isDeepStrictEqual(next.currentState, foldOf(next))).toBe(true);
    expect(next.currentState.turn).not.toBe(99);
  });

  it('refuses a stamped state that its log has moved past or behind', () => {
    const session = base();
    const behind: IGameSession = {
      ...session,
      events: session.events.slice(0, -1),
    };
    expect(() => appendEvent(behind, events[11])).toThrow(
      GameStateRevisionError,
    );
    const ahead: IGameSession = {
      ...base(11),
      events: session.events,
    };
    expect(() => appendEvent(ahead, events[12])).toThrow(
      GameStateRevisionError,
    );
  });

  it('refolds an unstamped state from JSON transport, and equals the full fold', () => {
    const session = base();
    const transported: IGameSession = JSON.parse(
      JSON.stringify(session),
    ) as IGameSession;
    const next = appendEvent(transported, events[12]);
    expect(isDeepStrictEqual(next.currentState, foldOf(next))).toBe(true);
  });

  it('appends normally with no error, and the state equals the full fold', () => {
    let session = base(1);
    for (const event of events.slice(1)) {
      session = appendEvent(session, event);
      expect(isDeepStrictEqual(session.currentState, foldOf(session))).toBe(
        true,
      );
    }
  });

  it('keeps the held state usable after a no-op event branches from it', () => {
    const session = base();
    const afterNoOp = appendEvent(session, turnEnded(session));
    expect(afterNoOp.currentState).not.toBe(session.currentState);
    const other = appendEvent(session, events[12]);
    expect(isDeepStrictEqual(other.currentState, foldOf(other))).toBe(true);
    expect(
      isDeepStrictEqual(
        appendEvent(afterNoOp, { ...events[12], sequence: 13 }).currentState,
        deriveState(session.id, [
          ...afterNoOp.events,
          { ...events[12], sequence: 13 },
        ]),
      ),
    ).toBe(true);
  });
});

describe('InteractiveSession setSession with a replaced log (b)', () => {
  it('drops the stale stamp: the next append refolds and equals the full fold of that log', () => {
    const { player, opponent, gameUnits } = seededForces();
    const interactive = new GameEngine({ seed: 1 }).createInteractiveSession(
      player,
      opponent,
      gameUnits,
    );
    interactive.advancePhase();
    interactive.advancePhase();
    const previous = interactive.getSession();
    const truncated = previous.events.slice(0, 2);
    expect(truncated.length).toBeLessThan(previous.events.length);
    const context = Reflect.get(interactive, 'runtimeContext') as {
      setSession: (session: IGameSession) => void;
    };
    context.setSession({ ...previous, events: truncated });
    const next = turnEnded({ ...previous, events: truncated });

    interactive.appendEvent(next);

    const after = interactive.getSession();
    expect(after.events).toEqual([...truncated, next]);
    expect(
      isDeepStrictEqual(
        after.currentState,
        deriveState(after.id, after.events),
      ),
    ).toBe(true);
    expect(
      isDeepStrictEqual(
        previous.currentState,
        deriveState(previous.id, previous.events),
      ),
    ).toBe(true);
  });
});

describe('duplicate-id admission on the id index', () => {
  it('returns the session unchanged for an identical resend, old or just appended', () => {
    const session = appendEvent(base(), events[12]);
    for (const event of session.events) {
      const transported = JSON.parse(JSON.stringify(event)) as IGameEvent;
      expect(appendEvent(session, transported)).toBe(session);
    }
  });

  it('throws GameEventIdCollisionError for a conflicting resend', () => {
    const session = appendEvent(base(), events[12]);
    expect(() =>
      appendEvent(session, { ...events[12], timestamp: 'different' }),
    ).toThrow(GameEventIdCollisionError);
    expect(() =>
      appendEvent(session, { ...events[3], timestamp: 'different' }),
    ).toThrow(GameEventIdCollisionError);
  });

  it('keeps the sequence error for a new id at a non-increasing sequence', () => {
    const session = base();
    expect(() => appendEvent(session, { ...events[12], sequence: 11 })).toThrow(
      GameEventSequenceError,
    );
  });

  it('does not see an id appended on a sibling branch', () => {
    const session = base();
    const left = appendEvent(session, events[12]);
    const rightEvent = { ...turnEnded(session), id: 'right-branch' };
    const right = appendEvent(session, rightEvent);
    // events[12] is not in `right`: a new id at a used sequence.
    expect(() => appendEvent(right, events[12])).toThrow(
      GameEventSequenceError,
    );
    expect(() => appendEvent(left, rightEvent)).toThrow(GameEventSequenceError);
    expect(appendEvent(left, events[12])).toBe(left);
    expect(appendEvent(right, rightEvent)).toBe(right);
  });

  it('batch admission still refuses a conflicting repeat inside the tail', () => {
    const session = base();
    expect(() =>
      assertGameEventBatchAdmissible(session, [
        events[12],
        { ...events[12], timestamp: 'different' },
      ]),
    ).toThrow(GameEventIdCollisionError);
    expect(() =>
      assertGameEventBatchAdmissible(session, [events[12], events[12]]),
    ).not.toThrow();
    expect(session.events).toHaveLength(12);
  });
});
