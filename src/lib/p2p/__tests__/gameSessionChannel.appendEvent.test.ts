import * as Y from 'yjs';

import { makeReconnectHostEvents } from '@/utils/gameplay/__tests__/gameSessionEvents.fixtures';
import {
  appendEvent,
  GameEventIdCollisionError,
} from '@/utils/gameplay/gameSession';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSessionCore';

import {
  applyReplayStreamEvents,
  createGameSessionChannel,
} from '../gameSessionChannel';

describe('P2P peer append admission', () => {
  const events = makeReconnectHostEvents();

  it('onPeerEvent can redeliver a host event without growing the held log twice', () => {
    const doc = new Y.Doc();
    try {
      const eventArray = doc.getArray<string>('gameEvents');
      const host = createGameSessionChannel({
        localPeerId: 'host',
        eventArray,
      });
      const guest = createGameSessionChannel({
        localPeerId: 'guest',
        eventArray,
      });
      let session = hydrateGameSessionFromEvents(
        'match-1',
        events.slice(0, 12),
      );
      const unsubscribe = guest.onPeerEvent((event) => {
        session = appendEvent(session, event);
      });
      host.broadcastEvent(events[12]);
      const once = session;
      host.broadcastEvent(events[12]);
      expect(session).toBe(once);
      expect(session.events).toHaveLength(13);
      expect(session.currentState).toStrictEqual(
        hydrateGameSessionFromEvents('match-1', events.slice(0, 13))
          .currentState,
      );
      unsubscribe();
    } finally {
      doc.destroy();
    }
  });

  it('applyReplayStreamEvents redelivery is admitted once by the shared boundary', () => {
    let session = hydrateGameSessionFromEvents('match-1', events.slice(0, 12));
    const stream = {
      kind: 'replay-stream' as const,
      matchId: 'match-1',
      events: events.slice(10, 15),
      done: true,
    };
    applyReplayStreamEvents([stream, stream], (event) => {
      session = appendEvent(session, event);
    });
    expect(session.events).toEqual(events.slice(0, 15));
    expect(session.currentState).toStrictEqual(
      hydrateGameSessionFromEvents('match-1', events.slice(0, 15)).currentState,
    );
    expect(() =>
      applyReplayStreamEvents(
        [
          {
            ...stream,
            events: [
              {
                ...events[12],
                timestamp: `${events[12].timestamp}-collision`,
              },
            ],
          },
        ],
        (event) => {
          session = appendEvent(session, event);
        },
      ),
    ).toThrow(GameEventIdCollisionError);
  });
});
