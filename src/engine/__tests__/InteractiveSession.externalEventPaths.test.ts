import {
  InteractiveSession,
  recoverInteractiveSession,
} from '@/engine/InteractiveSession';
import {
  hydrateRecoverableSessionFromMatchLog,
  hydrateSessionFromMatchLog,
} from '@/engine/InteractiveSession.persistence';
import { buildMirrorSessionGated } from '@/lib/multiplayer/mirrorMatchSession';
import { rebuildSessionFromEvents } from '@/lib/multiplayer/server/MatchRecovery';
import { foldMatchSession } from '@/lib/multiplayer/server/MatchSessionProjector';
import { recoverServerInteractiveSession } from '@/lib/multiplayer/server/matchUnitBootstrap';
import { createGameSession } from '@/utils/gameplay/gameSession';
import {
  appendEvent,
  GameEventIdCollisionError,
  GameEventSequenceError,
} from '@/utils/gameplay/gameSessionEvents';

jest.mock('@/utils/gameplay/gameSessionEvents', () => {
  const actual = jest.requireActual<
    typeof import('@/utils/gameplay/gameSessionEvents')
  >('@/utils/gameplay/gameSessionEvents');
  return { ...actual, appendEvent: jest.fn(actual.appendEvent) };
});

describe('external replay paths hydrate history without gameplay append admission', () => {
  afterEach(() => jest.mocked(appendEvent).mockReset());

  it.each([
    new GameEventIdCollisionError('injected-wire-event'),
    new GameEventSequenceError(0, 1),
  ])(
    'never submits stored or hosted mirror events to a boundary throwing $name',
    async (error) => {
      const original = createGameSession(
        {
          mapRadius: 4,
          turnLimit: 5,
          victoryConditions: ['elimination'],
          optionalRules: [],
        },
        [],
        { id: 'stored-match' },
      );
      const inboundIds = new Set(original.events.map((event) => event.id));
      const actual = jest.requireActual<
        typeof import('@/utils/gameplay/gameSessionEvents')
      >('@/utils/gameplay/gameSessionEvents');
      const receivedAppend = jest.fn();
      jest.mocked(appendEvent).mockImplementation((session, event) => {
        if (inboundIds.has(event.id)) {
          receivedAppend(event);
          throw error;
        }
        // Recovery constructors may append their own throwaway factory events.
        return actual.appendEvent(session, event);
      });
      const storage = { getEventsForMatch: async () => [...original.events] };
      const session = await hydrateSessionFromMatchLog(original.id, storage);
      expect(session.events).toEqual(original.events);
      expect(
        (await hydrateRecoverableSessionFromMatchLog(original.id, storage))
          .events,
      ).toEqual(original.events);
      expect(
        (await InteractiveSession.fromMatchLog(original.id, storage)).events,
      ).toEqual(original.events);
      expect(
        (await recoverInteractiveSession(original.id, storage)).getSession()
          .events,
      ).toEqual(original.events);
      expect(
        (await InteractiveSession.fromSessionAsync(session)).getSession(),
      ).toBe(session);
      expect(
        (await recoverServerInteractiveSession(session)).getSession(),
      ).toBe(session);
      expect(
        (
          await rebuildSessionFromEvents(original.id, original.events)
        ).getSession().events,
      ).toEqual(original.events);
      expect(foldMatchSession(original.id, original.events).events).toEqual(
        original.events,
      );
      expect(foldMatchSession(original.id, [], session)).toBe(session);
      const mirror = buildMirrorSessionGated(original.events);
      expect(mirror.kind).toBe('session');
      if (mirror.kind === 'session')
        expect(mirror.session.events).toEqual(original.events);
      expect(receivedAppend).not.toHaveBeenCalled();
    },
  );
});
