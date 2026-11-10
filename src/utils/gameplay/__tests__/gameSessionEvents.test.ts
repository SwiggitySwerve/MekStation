import {
  appendEvent,
  GameEventIdCollisionError,
  GameEventSequenceError,
} from '@/utils/gameplay/gameSession';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSessionCore';

import { makeReconnectHostEvents } from './gameSessionEvents.fixtures';

describe('appendEvent admission', () => {
  const events = makeReconnectHostEvents();
  const session = hydrateGameSessionFromEvents('match-1', events.slice(0, 12));

  it('returns the original session for identical old-event redelivery', () => {
    const before = JSON.stringify(session);
    for (const event of session.events) {
      const transported = JSON.parse(JSON.stringify(event)) as typeof event;
      expect(appendEvent(session, transported)).toBe(session);
    }
    expect(JSON.stringify(session)).toBe(before);
  });

  it('ignores object key order, including nested payload keys', () => {
    const event = session.events[4];
    const reordered = {
      ...event,
      payload: Object.fromEntries(Object.entries(event.payload).reverse()),
    };
    expect(appendEvent(session, reordered)).toBe(session);
  });

  it.each(['payload', 'sequence', 'timestamp'] as const)(
    'rejects a conflicting id with changed %s before mutation',
    (field) => {
      const event = session.events[4];
      const collision = {
        ...event,
        ...(field === 'payload'
          ? { payload: { ...event.payload, newTotal: 999 } }
          : field === 'sequence'
            ? { sequence: 99 }
            : { timestamp: 'different' }),
      };
      expect(() => appendEvent(session, collision)).toThrow(
        GameEventIdCollisionError,
      );
      expect(session.events).toEqual(events.slice(0, 12));
    },
  );

  it.each([0, 10, 11, NaN, Infinity, 11.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects a new id at invalid or non-increasing sequence %s',
    (sequence) => {
      expect(() => appendEvent(session, { ...events[12], sequence })).toThrow(
        GameEventSequenceError,
      );
      expect(session.events).toHaveLength(12);
    },
  );

  it.each([12, 15])(
    'accepts a new increasing event at %s and derives it once',
    (sequence) => {
      const event = { ...events[12], sequence };
      const next = appendEvent(session, event);
      expect(next.events).toEqual([...session.events, event]);
      expect(next.currentState.units['unit-1'].pendingPSRs).toEqual([]);
      expect(appendEvent(next, event)).toBe(next);
    },
  );
});
