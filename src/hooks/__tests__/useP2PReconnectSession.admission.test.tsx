import { act, renderHook, waitFor } from '@testing-library/react';

import type { IGameSessionChannel } from '@/lib/p2p';
import type { IGameEvent } from '@/types/gameplay';

import { toast } from '@/components/shared/Toast';
import { InteractiveSession } from '@/engine/InteractiveSession';
import {
  useP2PReconnectSession,
  type IUseP2PReconnectSessionOptions,
} from '@/hooks/useP2PReconnectSession';
import { persistMatchEvent } from '@/lib/p2p/matchLogStorage';
import { createMirrorDiceRoller } from '@/lib/p2p/mirrorDiceRoller';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { makeReconnectHostEvents } from '@/utils/gameplay/__tests__/gameSessionEvents.fixtures';
import {
  GameEventIdCollisionError,
  GameEventSequenceError,
  hydrateGameSessionFromEvents,
} from '@/utils/gameplay/gameSession';
import { logger } from '@/utils/logger';

jest.mock('@/components/shared/Toast', () => ({ toast: jest.fn() }));
jest.mock('@/lib/p2p/matchLogStorage', () => ({
  ...jest.requireActual('@/lib/p2p/matchLogStorage'),
  persistMatchEvent: jest.fn().mockResolvedValue(undefined),
}));

function setup(options: IUseP2PReconnectSessionOptions = {}) {
  const events = makeReconnectHostEvents();
  const held = hydrateGameSessionFromEvents('match-1', events.slice(0, 12));
  const original = InteractiveSession.fromSession(
    held,
    createMirrorDiceRoller(),
  );
  const heldSnapshot = JSON.stringify(held);
  useGameplayStore.getState().setInteractiveSession(original);
  useGameplayStore.getState().setSession(held);
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
  const persistReplayEvent = jest.fn().mockResolvedValue(undefined);
  const setLive = jest.fn();
  const setHydratedSession = jest.fn();
  const adoptRebuiltSession = jest.fn();
  const deleteEventsForMatch = jest.fn().mockResolvedValue(undefined);
  const view = renderHook(() =>
    useP2PReconnectSession('match-1', {
      getLastSequence: async () => 11,
      getMatchMetadata: async () => ({
        matchId: 'match-1',
        hostPeerId: 'host',
        guestPeerId: 'guest',
        status: 'active',
        lastActivity: held.createdAt,
      }),
      getEventsForMatch: async () => [],
      deleteEventsForMatch,
      ensureSyncRoom: jest.fn(),
      getLocalPeerId: () => 'guest',
      getHostPresent: () => true,
      createChannel: () => channel,
      persistReplayEvent,
      setLive,
      setHydratedSession,
      adoptRebuiltSession,
      ...options,
    }),
  );
  return {
    ...view,
    events,
    held,
    original,
    heldSnapshot,
    channel,
    persistReplayEvent,
    setLive,
    setHydratedSession,
    adoptRebuiltSession,
    deleteEventsForMatch,
    replay: (received: readonly IGameEvent[]) =>
      act(() =>
        replay({
          kind: 'replay-stream',
          matchId: 'match-1',
          events: received,
          done: true,
        }),
      ),
  };
}

function expectKept(harness: ReturnType<typeof setup>, name: string) {
  expect(toast).toHaveBeenCalledWith({
    message: expect.stringContaining(`P2P reconnect failed (${name}:`),
    variant: 'error',
    duration: 8000,
  });
  expect(useGameplayStore.getState().interactiveSession).toBe(harness.original);
  expect(harness.original.getSession()).toBe(harness.held);
  expect(JSON.stringify(harness.original.getSession())).toBe(
    harness.heldSnapshot,
  );
  expect(useGameplayStore.getState().session).toBe(harness.held);
  expect(harness.setLive).not.toHaveBeenCalled();
  expect(harness.setHydratedSession).not.toHaveBeenCalled();
}

describe('P2P reconnect admission failures keep the board and name the refusal', () => {
  beforeEach(() => {
    useGameplayStore.getState().reset();
    jest.clearAllMocks();
  });
  afterEach(() => {
    useGameplayStore.getState().reset();
    jest.restoreAllMocks();
  });

  it.each(['collision', 'sequence', 'late collision', 'batch collision'])(
    'refuses a %s atomically through the real default append wiring',
    async (kind) => {
      const harness = setup();
      await waitFor(() =>
        expect(harness.channel.broadcastReconnectRequest).toHaveBeenCalled(),
      );
      const valid = harness.events[12];
      const heldEvent = harness.events[11];
      const incoming =
        kind === 'collision'
          ? [{ ...heldEvent, timestamp: 'conflicting' }]
          : kind === 'sequence'
            ? [{ ...valid, sequence: 11 }]
            : kind === 'late collision'
              ? [valid, { ...heldEvent, sequence: 13 }]
              : [valid, { ...valid, sequence: 13 }];
      harness.replay(incoming);
      await waitFor(() => expect(toast).toHaveBeenCalled());
      expectKept(
        harness,
        kind === 'sequence'
          ? 'GameEventSequenceError'
          : 'GameEventIdCollisionError',
      );
      expect(harness.persistReplayEvent).not.toHaveBeenCalled();
      expect(persistMatchEvent).not.toHaveBeenCalled();
      expect(harness.deleteEventsForMatch).not.toHaveBeenCalled();
      harness.unmount();
    },
  );

  it('can apply a valid retry after a refused tail', async () => {
    const harness = setup();
    await waitFor(() =>
      expect(harness.channel.broadcastReconnectRequest).toHaveBeenCalled(),
    );
    harness.replay([{ ...harness.events[12], sequence: 11 }]);
    await waitFor(() => expect(toast).toHaveBeenCalled());
    harness.replay(harness.events.slice(12));
    await waitFor(() => expect(harness.setLive).toHaveBeenCalledTimes(1));
    expect(harness.original.getSession().events).toEqual(harness.events);
    harness.unmount();
  });

  it.each([
    new GameEventIdCollisionError('injected-live-append'),
    new GameEventSequenceError(0, 11),
  ])(
    'catches $name thrown by InteractiveSession through the default appender',
    async (error) => {
      const harness = setup();
      const append = jest
        .spyOn(harness.original, 'appendEvent')
        .mockImplementation(() => {
          throw error;
        });
      await waitFor(() =>
        expect(harness.channel.broadcastReconnectRequest).toHaveBeenCalled(),
      );
      harness.replay([harness.events[12]]);
      await waitFor(() => expect(toast).toHaveBeenCalled());
      expect(append).toHaveBeenCalledWith(harness.events[12]);
      expectKept(harness, error.name);
      expect(persistMatchEvent).not.toHaveBeenCalled();
      harness.unmount();
    },
  );

  it.each([
    new GameEventIdCollisionError('injected'),
    new GameEventSequenceError(0, 11),
  ])('catches $name during baseline hydration and adoption', async (error) => {
    for (const stage of ['hydrate', 'adopt']) {
      jest.mocked(toast).mockClear();
      const harness = setup({
        hydrateFromMatchLog: async () => {
          if (stage === 'hydrate') throw error;
          return hydrateGameSessionFromEvents(
            'match-1',
            makeReconnectHostEvents(),
          );
        },
        adoptRebuiltSession: () => {
          throw error;
        },
      });
      await waitFor(() =>
        expect(harness.channel.broadcastReconnectRequest).toHaveBeenCalled(),
      );
      harness.replay(harness.events);
      await waitFor(() => expect(toast).toHaveBeenCalled());
      expectKept(harness, error.name);
      harness.unmount();
    }
  });

  it.each([
    new GameEventIdCollisionError('injected'),
    new GameEventSequenceError(0, 11),
  ])('catches $name on startup and host-pending hydration', async (error) => {
    for (const stage of ['startup', 'pending']) {
      jest.mocked(toast).mockClear();
      const harness = setup({
        timeoutMs: 1,
        getHostPresent: () => false,
        ...(stage === 'startup'
          ? {
              getLastSequence: async () => {
                throw error;
              },
            }
          : {}),
        hydrateFromMatchLog: async () => {
          throw error;
        },
      });
      await waitFor(() => expect(toast).toHaveBeenCalled());
      expectKept(harness, error.name);
      harness.unmount();
    }
  });

  it('logs the same named failure that the toast reports', async () => {
    const log = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    const harness = setup();
    await waitFor(() =>
      expect(harness.channel.broadcastReconnectRequest).toHaveBeenCalled(),
    );
    harness.replay([{ ...harness.events[12], sequence: 11 }]);
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(log).toHaveBeenCalledWith(
      'P2P reconnect failed; current session kept',
      expect.any(GameEventSequenceError),
    );
    harness.unmount();
  });
});
