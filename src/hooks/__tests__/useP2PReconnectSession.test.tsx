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

function makeEvent(sequence: number, id = `event-${sequence}`): IGameEvent {
  return {
    id,
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
  let replayCallback: Parameters<
    IGameSessionChannel['onReplayStream']
  >[0] = () => undefined;

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
        getEventsForMatch: jest.fn().mockResolvedValue([]),
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
    expect(
      appendReplayEvent.mock.calls.map(([, event]) => event.sequence),
    ).toEqual([6, 7]);
    expect(setLive).toHaveBeenCalledTimes(1);
  });

  it('MATCH: keeps the mirror and rehydrates from the stream like today', async () => {
    const { channel, emitReplay } = makeChannel();
    const stored = [makeEvent(0), makeEvent(1)];
    const stream = [makeEvent(0), makeEvent(1), makeEvent(2)];
    const deleteEventsForMatch = jest.fn().mockResolvedValue(undefined);
    const appendReplayEvent = jest.fn().mockResolvedValue(undefined);
    const setLive = jest.fn();
    const onMirrorPrefixDivergence = jest.fn();

    renderHook(() =>
      useP2PReconnectSession('match-1', {
        getLastSequence: jest.fn().mockResolvedValue(1),
        getMatchMetadata: jest.fn().mockResolvedValue(metadata),
        getEventsForMatch: jest.fn().mockResolvedValue(stored),
        deleteEventsForMatch,
        ensureSyncRoom: jest.fn(),
        getLocalPeerId: () => 'guest-peer',
        getHostPresent: () => true,
        createChannel: () => channel,
        appendReplayEvent,
        hydrateFromMatchLog: jest.fn().mockResolvedValue(makeHydratedSession()),
        setHydratedSession: jest.fn(),
        setLive,
        redirectToLobby: jest.fn(),
        onMirrorPrefixDivergence,
      }),
    );

    await waitFor(() => {
      expect(channel.broadcastReconnectRequest).toHaveBeenCalledWith({
        matchId: 'match-1',
        lastLocalSeq: 0,
      });
    });

    act(() => {
      emitReplay(stream);
    });

    await waitFor(() => expect(appendReplayEvent).toHaveBeenCalledTimes(3));
    expect(deleteEventsForMatch).not.toHaveBeenCalled();
    expect(onMirrorPrefixDivergence).not.toHaveBeenCalled();
    expect(appendReplayEvent.mock.calls.map(([, event]) => event.id)).toEqual(
      stream.map((event) => event.id),
    );
    expect(setLive).toHaveBeenCalledTimes(1);
  });

  it('REPLACED: discards the mirror and proceeds from the stream', async () => {
    const { channel, emitReplay } = makeChannel();
    const stored = [
      makeEvent(0, 'id-a'),
      makeEvent(1, 'id-b'),
      makeEvent(2, 'id-c'),
    ];
    const stream = [
      makeEvent(0, 'id-a'),
      makeEvent(1, 'id-x'),
      makeEvent(2, 'id-c'),
    ];
    const deleteEventsForMatch = jest.fn().mockResolvedValue(undefined);
    const appendReplayEvent = jest.fn().mockResolvedValue(undefined);
    const onMirrorPrefixDivergence = jest.fn();
    const setLive = jest.fn();

    renderHook(() =>
      useP2PReconnectSession('match-1', {
        getLastSequence: jest.fn().mockResolvedValue(2),
        getMatchMetadata: jest.fn().mockResolvedValue(metadata),
        getEventsForMatch: jest.fn().mockResolvedValue(stored),
        deleteEventsForMatch,
        ensureSyncRoom: jest.fn(),
        getLocalPeerId: () => 'guest-peer',
        getHostPresent: () => true,
        createChannel: () => channel,
        appendReplayEvent,
        hydrateFromMatchLog: jest.fn().mockResolvedValue(makeHydratedSession()),
        setHydratedSession: jest.fn(),
        setLive,
        redirectToLobby: jest.fn(),
        onMirrorPrefixDivergence,
      }),
    );

    await waitFor(() => {
      expect(channel.broadcastReconnectRequest).toHaveBeenCalled();
    });

    act(() => {
      emitReplay(stream);
    });

    await waitFor(() =>
      expect(deleteEventsForMatch).toHaveBeenCalledWith('match-1'),
    );
    expect(onMirrorPrefixDivergence).toHaveBeenCalledWith({
      kind: 'replaced',
      position: 1,
      storedId: 'id-b',
      receivedId: 'id-x',
    });
    expect(appendReplayEvent.mock.calls.map(([, event]) => event.id)).toEqual([
      'id-a',
      'id-x',
      'id-c',
    ]);
    expect(setLive).toHaveBeenCalledTimes(1);
  });

  it('TRUNCATED: discards the mirror when the stream is shorter', async () => {
    const { channel, emitReplay } = makeChannel();
    const stored = [
      makeEvent(0, 'id-a'),
      makeEvent(1, 'id-b'),
      makeEvent(2, 'id-c'),
    ];
    const stream = [makeEvent(0, 'id-a'), makeEvent(1, 'id-b')];
    const deleteEventsForMatch = jest.fn().mockResolvedValue(undefined);
    const appendReplayEvent = jest.fn().mockResolvedValue(undefined);
    const onMirrorPrefixDivergence = jest.fn();

    renderHook(() =>
      useP2PReconnectSession('match-1', {
        getLastSequence: jest.fn().mockResolvedValue(2),
        getMatchMetadata: jest.fn().mockResolvedValue(metadata),
        getEventsForMatch: jest.fn().mockResolvedValue(stored),
        deleteEventsForMatch,
        ensureSyncRoom: jest.fn(),
        getLocalPeerId: () => 'guest-peer',
        getHostPresent: () => true,
        createChannel: () => channel,
        appendReplayEvent,
        hydrateFromMatchLog: jest.fn().mockResolvedValue(makeHydratedSession()),
        setHydratedSession: jest.fn(),
        setLive: jest.fn(),
        redirectToLobby: jest.fn(),
        onMirrorPrefixDivergence,
      }),
    );

    await waitFor(() => {
      expect(channel.broadcastReconnectRequest).toHaveBeenCalled();
    });

    act(() => {
      emitReplay(stream);
    });

    await waitFor(() =>
      expect(deleteEventsForMatch).toHaveBeenCalledWith('match-1'),
    );
    expect(onMirrorPrefixDivergence).toHaveBeenCalledWith({
      kind: 'truncated',
      position: 2,
    });
    expect(appendReplayEvent.mock.calls.map(([, event]) => event.id)).toEqual([
      'id-a',
      'id-b',
    ]);
  });

  it('SEQUENCE-FREE: still discards on id mismatch when sequence is absent', async () => {
    const { channel, emitReplay } = makeChannel();
    const stored = [
      makeEvent(0, 'id-a'),
      makeEvent(1, 'id-b'),
      makeEvent(2, 'id-c'),
    ];
    const stream = [
      { id: 'id-a', type: GameEventType.GameStarted },
      { id: 'id-x', type: GameEventType.GameStarted },
      { id: 'id-c', type: GameEventType.GameStarted },
    ] as IGameEvent[];
    const deleteEventsForMatch = jest.fn().mockResolvedValue(undefined);
    const onMirrorPrefixDivergence = jest.fn();

    renderHook(() =>
      useP2PReconnectSession('match-1', {
        getLastSequence: jest.fn().mockResolvedValue(2),
        getMatchMetadata: jest.fn().mockResolvedValue(metadata),
        getEventsForMatch: jest.fn().mockResolvedValue(stored),
        deleteEventsForMatch,
        ensureSyncRoom: jest.fn(),
        getLocalPeerId: () => 'guest-peer',
        getHostPresent: () => true,
        createChannel: () => channel,
        appendReplayEvent: jest.fn().mockResolvedValue(undefined),
        hydrateFromMatchLog: jest.fn().mockResolvedValue(makeHydratedSession()),
        setHydratedSession: jest.fn(),
        setLive: jest.fn(),
        redirectToLobby: jest.fn(),
        onMirrorPrefixDivergence,
      }),
    );

    await waitFor(() => {
      expect(channel.broadcastReconnectRequest).toHaveBeenCalled();
    });

    act(() => {
      emitReplay(stream);
    });

    await waitFor(() =>
      expect(deleteEventsForMatch).toHaveBeenCalledWith('match-1'),
    );
    expect(onMirrorPrefixDivergence).toHaveBeenCalledWith({
      kind: 'replaced',
      position: 1,
      storedId: 'id-b',
      receivedId: 'id-x',
    });
  });

  it('NO MIRROR: does not delete and still applies the stream', async () => {
    const { channel, emitReplay } = makeChannel();
    const deleteEventsForMatch = jest.fn().mockResolvedValue(undefined);
    const appendReplayEvent = jest.fn().mockResolvedValue(undefined);
    const onMirrorPrefixDivergence = jest.fn();
    const setLive = jest.fn();

    renderHook(() =>
      useP2PReconnectSession('match-1', {
        getLastSequence: jest.fn().mockResolvedValue(null),
        getMatchMetadata: jest.fn().mockResolvedValue(metadata),
        getEventsForMatch: jest.fn().mockResolvedValue([]),
        deleteEventsForMatch,
        ensureSyncRoom: jest.fn(),
        getLocalPeerId: () => 'guest-peer',
        getHostPresent: () => true,
        createChannel: () => channel,
        appendReplayEvent,
        hydrateFromMatchLog: jest.fn().mockResolvedValue(makeHydratedSession()),
        setHydratedSession: jest.fn(),
        setLive,
        redirectToLobby: jest.fn(),
        onMirrorPrefixDivergence,
      }),
    );

    await waitFor(() => {
      expect(channel.broadcastReconnectRequest).toHaveBeenCalledWith({
        matchId: 'match-1',
        lastLocalSeq: 0,
      });
    });

    act(() => {
      emitReplay([makeEvent(0), makeEvent(1)]);
    });

    await waitFor(() => expect(appendReplayEvent).toHaveBeenCalledTimes(2));
    expect(deleteEventsForMatch).not.toHaveBeenCalled();
    expect(onMirrorPrefixDivergence).not.toHaveBeenCalled();
    expect(setLive).toHaveBeenCalledTimes(1);
  });

  it('FULL REPLAY: a present mirror quotes lastLocalSeq 0, not the suffix (R1)', async () => {
    const { channel } = makeChannel();

    renderHook(() =>
      useP2PReconnectSession('match-1', {
        getLastSequence: jest.fn().mockResolvedValue(2),
        getMatchMetadata: jest.fn().mockResolvedValue(metadata),
        getEventsForMatch: jest
          .fn()
          .mockResolvedValue([makeEvent(0), makeEvent(1), makeEvent(2)]),
        deleteEventsForMatch: jest.fn().mockResolvedValue(undefined),
        ensureSyncRoom: jest.fn(),
        getLocalPeerId: () => 'guest-peer',
        getHostPresent: () => true,
        createChannel: () => channel,
        appendReplayEvent: jest.fn().mockResolvedValue(undefined),
        hydrateFromMatchLog: jest.fn().mockResolvedValue(makeHydratedSession()),
        setHydratedSession: jest.fn(),
        setLive: jest.fn(),
        redirectToLobby: jest.fn(),
      }),
    );

    await waitFor(() => {
      expect(channel.broadcastReconnectRequest).toHaveBeenCalledWith({
        matchId: 'match-1',
        lastLocalSeq: 0,
      });
    });
  });

  it('COLD RELOAD / REPLACED-AT-0: rewritten head discards the mirror (M3, R1)', async () => {
    const { channel, emitReplay } = makeChannel();
    const stored = [
      makeEvent(0, 'id-old'),
      makeEvent(1, 'id-b'),
      makeEvent(2, 'id-c'),
    ];
    const stream = [
      makeEvent(0, 'id-new'),
      makeEvent(1, 'id-x'),
      makeEvent(2, 'id-y'),
    ];
    const deleteEventsForMatch = jest.fn().mockResolvedValue(undefined);
    const appendReplayEvent = jest.fn().mockResolvedValue(undefined);
    const onMirrorPrefixDivergence = jest.fn();
    const setLive = jest.fn();

    renderHook(() =>
      useP2PReconnectSession('match-1', {
        getLastSequence: jest.fn().mockResolvedValue(2),
        getMatchMetadata: jest.fn().mockResolvedValue(metadata),
        getEventsForMatch: jest.fn().mockResolvedValue(stored),
        deleteEventsForMatch,
        ensureSyncRoom: jest.fn(),
        getLocalPeerId: () => 'guest-peer',
        getHostPresent: () => true,
        createChannel: () => channel,
        appendReplayEvent,
        hydrateFromMatchLog: jest.fn().mockResolvedValue(makeHydratedSession()),
        setHydratedSession: jest.fn(),
        setLive,
        redirectToLobby: jest.fn(),
        onMirrorPrefixDivergence,
      }),
    );

    await waitFor(() => {
      expect(channel.broadcastReconnectRequest).toHaveBeenCalledWith({
        matchId: 'match-1',
        lastLocalSeq: 0,
      });
    });

    act(() => {
      emitReplay(stream);
    });

    await waitFor(() =>
      expect(deleteEventsForMatch).toHaveBeenCalledWith('match-1'),
    );
    expect(onMirrorPrefixDivergence).toHaveBeenCalledWith({
      kind: 'replaced',
      position: 0,
      storedId: 'id-old',
      receivedId: 'id-new',
    });
    expect(appendReplayEvent.mock.calls.map(([, event]) => event.id)).toEqual([
      'id-new',
      'id-x',
      'id-y',
    ]);
    expect(setLive).toHaveBeenCalledTimes(1);

    act(() => {
      emitReplay([makeEvent(3, 'id-command')]);
    });
    await waitFor(() =>
      expect(appendReplayEvent.mock.calls.map(([, event]) => event.id)).toEqual(
        ['id-new', 'id-x', 'id-y', 'id-command'],
      ),
    );
  });

  it('DUPLICATE: the same event in the catch-up stream is appended once (M2)', async () => {
    const { channel, emitReplay } = makeChannel();
    const stored = [makeEvent(0, 'id-a')];
    const stream = [
      makeEvent(0, 'id-a'),
      makeEvent(1, 'id-b'),
      makeEvent(1, 'id-b'),
    ];
    const appendReplayEvent = jest.fn().mockResolvedValue(undefined);
    const setLive = jest.fn();

    renderHook(() =>
      useP2PReconnectSession('match-1', {
        getLastSequence: jest.fn().mockResolvedValue(0),
        getMatchMetadata: jest.fn().mockResolvedValue(metadata),
        getEventsForMatch: jest.fn().mockResolvedValue(stored),
        deleteEventsForMatch: jest.fn().mockResolvedValue(undefined),
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
      expect(channel.broadcastReconnectRequest).toHaveBeenCalled();
    });

    act(() => {
      emitReplay(stream);
    });

    await waitFor(() => expect(setLive).toHaveBeenCalledTimes(1));
    expect(appendReplayEvent.mock.calls.map(([, event]) => event.id)).toEqual([
      'id-a',
      'id-b',
    ]);
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
