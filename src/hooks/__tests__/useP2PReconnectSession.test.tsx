import { act, renderHook, waitFor } from '@testing-library/react';

import type { IGameSessionChannel } from '@/lib/p2p';
import type { IGameSession } from '@/types/gameplay';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { useP2PReconnectSession } from '@/hooks/useP2PReconnectSession';
import {
  GameEventType,
  GamePhase,
  GameSide,
} from '@/types/gameplay/GameSessionInterfaces';

function makeEvent(sequence: number): IGameEvent {
  return {
    id: `event-${sequence}`,
    gameId: 'match-1',
    sequence,
    timestamp: '2026-04-30T00:00:00.000Z',
    type: GameEventType.GameStarted,
    turn: 1,
    phase: GamePhase.Initiative,
    payload: {
      firstSide: GameSide.Player,
    },
  };
}

function makeHydratedSession(): IGameSession {
  return {
    id: 'match-1',
    createdAt: '2026-04-30T00:00:00.000Z',
    updatedAt: '2026-04-30T00:00:00.000Z',
    config: {
      mapRadius: 4,
      turnLimit: 5,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    units: [],
    events: [],
    currentState: {} as IGameSession['currentState'],
  };
}

function makeChannel() {
  let replayCallback: Parameters<IGameSessionChannel['onReplayStream']>[0] =
    () => undefined;

  const channel = {
    broadcastEvent: jest.fn(),
    onPeerEvent: jest.fn(() => jest.fn()),
    broadcastIntent: jest.fn(),
    onPeerIntent: jest.fn(() => jest.fn()),
    broadcastRejection: jest.fn(),
    onPeerRejection: jest.fn(() => jest.fn()),
    broadcastReconnectRequest: jest.fn(),
    onReconnectRequest: jest.fn(() => jest.fn()),
    broadcastReplayStream: jest.fn(),
    onReplayStream: jest.fn((callback) => {
      replayCallback = callback;
      return jest.fn();
    }),
    broadcastReconnectReject: jest.fn(),
    onReconnectReject: jest.fn(() => jest.fn()),
  } as IGameSessionChannel;

  return {
    channel,
    emitReplay: (events: readonly IGameEvent[], done = true) => {
      replayCallback({
        kind: 'replay-stream',
        matchId: 'match-1',
        events,
        done,
      });
    },
  };
}

const metadata = {
  matchId: 'match-1',
  hostPeerId: 'host-peer',
  guestPeerId: 'guest-peer',
  status: 'active' as const,
  lastActivity: '2026-04-30T00:00:00.000Z',
};

describe('useP2PReconnectSession', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends lastLocalSeq and applies replay events in sequence order', async () => {
    const { channel, emitReplay } = makeChannel();
    const appendReplayEvent: jest.MockedFunction<
      (matchId: string, event: IGameEvent) => Promise<void>
    > = jest.fn<Promise<void>, [string, IGameEvent]>(() => Promise.resolve());
    const setLive = jest.fn();

    renderHook(() =>
      useP2PReconnectSession('match-1', {
        getLastSequence: jest.fn().mockResolvedValue(5),
        getMatchMetadata: jest.fn().mockResolvedValue(metadata),
        ensureSyncRoom: jest.fn(),
        getLocalPeerId: () => 'guest-peer',
        getHostPresent: () => true,
        createChannel: () => channel,
        appendReplayEvent,
        hydrateFromMatchLog: jest.fn().mockResolvedValue(makeHydratedSession()),
        setHydratedSession: jest.fn(),
        setLive,
        redirectToLobby: jest.fn(),
      }),
    );

    await waitFor(() => {
      expect(channel.broadcastReconnectRequest).toHaveBeenCalledWith({
        matchId: 'match-1',
        lastLocalSeq: 5,
      });
    });

    act(() => {
      emitReplay([makeEvent(7), makeEvent(6)]);
    });

    await waitFor(() => expect(appendReplayEvent).toHaveBeenCalledTimes(2));
    expect(appendReplayEvent.mock.calls.map(([, event]) => event.sequence)).toEqual([
      6, 7,
    ]);
    expect(setLive).toHaveBeenCalledTimes(1);
  });

  it('hydrates locally and marks hostPending when the host is absent for 10 seconds', async () => {
    jest.useFakeTimers();
    const { channel } = makeChannel();
    const hydrated = makeHydratedSession();
    const setHydratedSession = jest.fn();
    const setHostPending = jest.fn();
    const createChannel = jest.fn(() => channel);

    renderHook(() =>
      useP2PReconnectSession('match-1', {
        getLastSequence: jest.fn().mockResolvedValue(5),
        getMatchMetadata: jest.fn().mockResolvedValue(metadata),
        ensureSyncRoom: jest.fn(),
        getLocalPeerId: () => 'guest-peer',
        getHostPresent: () => false,
        createChannel,
        hydrateFromMatchLog: jest.fn().mockResolvedValue(hydrated),
        setHydratedSession,
        setHostPending,
        redirectToLobby: jest.fn(),
      }),
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(createChannel).toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(10_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(channel.broadcastReconnectRequest).not.toHaveBeenCalled();
    expect(setHydratedSession).toHaveBeenCalledWith(hydrated);
    expect(setHostPending).toHaveBeenCalledTimes(1);
  });
});
