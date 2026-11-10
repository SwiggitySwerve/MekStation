import { act, renderHook, waitFor } from '@testing-library/react';

import type { IGameSessionChannel } from '@/lib/p2p';
import type { IGameEvent } from '@/types/gameplay';

import { InteractiveSession } from '@/engine/InteractiveSession';
import { useP2PReconnectSession } from '@/hooks/useP2PReconnectSession';
import { createMirrorDiceRoller } from '@/lib/p2p/mirrorDiceRoller';
import { useP2PMirrorStore } from '@/lib/p2p/p2pMirrorStore';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { makeReconnectHostEvents } from '@/utils/gameplay/__tests__/gameSessionEvents.fixtures';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSessionCore';

jest.mock('@/lib/p2p/matchLogStorage', () => ({
  ...jest.requireActual('@/lib/p2p/matchLogStorage'),
  persistMatchEvent: jest.fn().mockResolvedValue(undefined),
}));

describe('P2P guest full baseline replacement', () => {
  beforeEach(() => {
    useGameplayStore.getState().reset();
    useP2PMirrorStore.getState().reset();
  });
  afterEach(() => {
    useGameplayStore.getState().reset();
    useP2PMirrorStore.getState().reset();
  });

  it('replaces 12 held and stored events with the host full 20-event stream', async () => {
    const events = makeReconnectHostEvents();
    expect(events).toHaveLength(20);
    const host = hydrateGameSessionFromEvents('match-1', events);
    const prefix = hydrateGameSessionFromEvents('match-1', events.slice(0, 12));
    const original = InteractiveSession.fromSession(
      prefix,
      createMirrorDiceRoller(),
    );
    useGameplayStore.getState().setInteractiveSession(original);
    useGameplayStore.getState().setSession(prefix);

    let stored = [...prefix.events];
    let replay: Parameters<IGameSessionChannel['onReplayStream']>[0] = () =>
      undefined;
    const channel: IGameSessionChannel = {
      broadcastEvent: jest.fn(),
      onPeerEvent: jest.fn(() => jest.fn()),
      broadcastIntent: jest.fn(),
      onPeerIntent: jest.fn(() => jest.fn()),
      broadcastRejection: jest.fn(),
      onPeerRejection: jest.fn(() => jest.fn()),
      broadcastReconnectRequest: jest.fn(),
      onReconnectRequest: jest.fn(() => jest.fn()),
      broadcastReplayStream: jest.fn(),
      onReplayStream: (callback) => {
        replay = callback;
        return jest.fn();
      },
      broadcastReconnectReject: jest.fn(),
      onReconnectReject: jest.fn(() => jest.fn()),
    };
    const operations: string[] = [];
    const setLive = jest.fn();
    const { unmount } = renderHook(() =>
      useP2PReconnectSession('match-1', {
        getLastSequence: async () => 11,
        getMatchMetadata: async () => ({
          matchId: 'match-1',
          hostPeerId: 'host',
          guestPeerId: 'guest',
          status: 'active',
          lastActivity: events[0].timestamp,
        }),
        getEventsForMatch: async () => stored,
        deleteEventsForMatch: async () => {
          stored = [];
        },
        ensureSyncRoom: jest.fn(),
        getLocalPeerId: () => 'guest',
        getHostPresent: () => true,
        createChannel: () => channel,
        // Use the real default append and adoption paths; only durable IO and transport are faked.
        persistReplayEvent: async (_matchId: string, event: IGameEvent) => {
          operations.push(`persist:${event.sequence}`);
          stored = stored
            .filter((held) => held.sequence !== event.sequence)
            .concat(event);
        },
        hydrateFromMatchLog: async (matchId) => {
          operations.push('hydrate');
          return hydrateGameSessionFromEvents(matchId, stored);
        },
        setLive,
        redirectToLobby: jest.fn(),
      }),
    );
    await waitFor(() =>
      expect(channel.broadcastReconnectRequest).toHaveBeenCalledWith({
        matchId: 'match-1',
        lastLocalSeq: 0,
      }),
    );
    act(() => {
      replay({
        kind: 'replay-stream',
        matchId: 'match-1',
        events: events.slice(0, 8),
        done: false,
      });
      replay({
        kind: 'replay-stream',
        matchId: 'match-1',
        events: events.slice(8),
        done: true,
      });
    });
    await waitFor(() => expect(setLive).toHaveBeenCalledTimes(1));
    const guest = useGameplayStore.getState().interactiveSession;
    expect(guest?.getSession().events).toHaveLength(20);
    expect(
      new Set(guest?.getSession().events.map((event) => event.id)).size,
    ).toBe(20);
    expect(guest?.getSession().events.map((event) => event.sequence)).toEqual(
      Array.from({ length: 20 }, (_, i) => i),
    );
    expect(guest?.getSession().currentState).toStrictEqual(host.currentState);
    expect(useGameplayStore.getState().session?.currentState).toStrictEqual(
      host.currentState,
    );
    expect(guest).not.toBe(original);
    expect(stored).toEqual(events);
    expect(operations).toEqual([
      ...events.map((event) => `persist:${event.sequence}`),
      'hydrate',
    ]);
    unmount();
  });
});
