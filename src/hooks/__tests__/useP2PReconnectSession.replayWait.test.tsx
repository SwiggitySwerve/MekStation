import { act, renderHook } from '@testing-library/react';

import type { IGameSessionChannel } from '@/lib/p2p';
import type { IGameSession } from '@/types/gameplay';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import {
  useP2PReconnectSession,
  type IUseP2PReconnectSessionOptions,
} from '@/hooks/useP2PReconnectSession';
import { useGameplayStore } from '@/stores/useGameplayStore';
import {
  GameEventType,
  GamePhase,
  GameSide,
} from '@/types/gameplay/GameSessionInterfaces';
import { logger } from '@/utils/logger';

const REPLAY_WAIT_MS = 1000;

function makeEvent(sequence: number): IGameEvent {
  return {
    id: `event-${sequence}`,
    gameId: 'match-1',
    sequence,
    timestamp: '2026-04-30T00:00:00.000Z',
    type: GameEventType.GameStarted,
    turn: 1,
    phase: GamePhase.Initiative,
    payload: { firstSide: GameSide.Player },
  };
}

function makeSession(): IGameSession {
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

const metadata = {
  matchId: 'match-1',
  hostPeerId: 'host-peer',
  guestPeerId: 'guest-peer',
  status: 'active' as const,
  lastActivity: '2026-04-30T00:00:00.000Z',
};

function makeChannel() {
  type ReplayCb = Parameters<IGameSessionChannel['onReplayStream']>[0];
  type RejectCb = Parameters<IGameSessionChannel['onReconnectReject']>[0];
  type PeerRejectCb = Parameters<IGameSessionChannel['onPeerRejection']>[0];
  let replay: ReplayCb = () => undefined;
  let reject: RejectCb = () => undefined;
  let peerReject: PeerRejectCb = () => undefined;
  const unsubscribes = {
    replay: jest.fn(),
    reject: jest.fn(),
    peerReject: jest.fn(),
  };
  const channel = {
    broadcastEvent: jest.fn(),
    onPeerEvent: jest.fn(() => jest.fn()),
    broadcastIntent: jest.fn(),
    onPeerIntent: jest.fn(() => jest.fn()),
    broadcastRejection: jest.fn(),
    onPeerRejection: jest.fn((cb: PeerRejectCb) => {
      peerReject = cb;
      return unsubscribes.peerReject;
    }),
    broadcastReconnectRequest: jest.fn(),
    onReconnectRequest: jest.fn(() => jest.fn()),
    broadcastReplayStream: jest.fn(),
    onReplayStream: jest.fn((cb: ReplayCb) => {
      replay = cb;
      return unsubscribes.replay;
    }),
    broadcastReconnectReject: jest.fn(),
    onReconnectReject: jest.fn((cb: RejectCb) => {
      reject = cb;
      return unsubscribes.reject;
    }),
  } as IGameSessionChannel;
  return {
    channel,
    unsubscribes,
    emitReplay: (events: readonly IGameEvent[], done: boolean) =>
      replay({ kind: 'replay-stream', matchId: 'match-1', events, done }),
    emitReconnectReject: (reason: string) =>
      reject({ kind: 'reconnect-reject', matchId: 'match-1', reason }),
    emitPeerRejected: (reason: string) =>
      peerReject({ kind: 'peer-rejected', reason }),
  };
}

function setup(overrides: IUseP2PReconnectSessionOptions = {}) {
  const harness = makeChannel();
  const spies = {
    hydrateFromMatchLog: jest.fn().mockResolvedValue(makeSession()),
    setHydratedSession: jest.fn(),
    setHostPending: jest.fn(),
    setLive: jest.fn(),
    redirectToLobby: jest.fn(),
    appendReplayEvent: jest.fn().mockResolvedValue(undefined),
  };
  const rendered = renderHook(() =>
    useP2PReconnectSession('match-1', {
      timeoutMs: 60_000,
      pollIntervalMs: 10,
      replayWaitMs: REPLAY_WAIT_MS,
      getLastSequence: jest.fn().mockResolvedValue(0),
      getMatchMetadata: jest.fn().mockResolvedValue(metadata),
      getEventsForMatch: jest.fn().mockResolvedValue([]),
      ensureSyncRoom: jest.fn(),
      getLocalPeerId: () => 'guest-peer',
      getHostPresent: () => true,
      createChannel: () => harness.channel,
      ...spies,
      ...overrides,
    }),
  );
  return { ...harness, ...spies, ...rendered };
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

describe('useP2PReconnectSession after the reconnect request is sent', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useGameplayStore.getState().reset();
    jest.spyOn(logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    useGameplayStore.getState().reset();
    jest.useRealTimers();
  });

  it('falls back to host-pending when the host never answers', async () => {
    const h = setup();
    await advance(0);
    expect(h.channel.broadcastReconnectRequest).toHaveBeenCalledTimes(1);

    await advance(REPLAY_WAIT_MS - 1);
    expect(h.setHostPending).not.toHaveBeenCalled();
    await advance(1);

    expect(h.hydrateFromMatchLog).toHaveBeenCalledWith('match-1');
    expect(h.setHydratedSession).toHaveBeenCalledTimes(1);
    expect(h.setHostPending).toHaveBeenCalledTimes(1);
  });

  it('restarts the wait on each replay chunk', async () => {
    const h = setup();
    await advance(0);
    await advance(600);
    act(() => h.emitReplay([makeEvent(1)], false));

    await advance(REPLAY_WAIT_MS - 1);
    expect(h.setHostPending).not.toHaveBeenCalled();
    await advance(1);
    expect(h.setHostPending).toHaveBeenCalledTimes(1);
  });

  it('stops waiting once the final chunk arrives', async () => {
    const h = setup();
    await advance(0);
    await act(async () => {
      h.emitReplay([makeEvent(1)], true);
    });
    await advance(0);
    expect(h.setLive).toHaveBeenCalledTimes(1);

    await advance(REPLAY_WAIT_MS * 5);
    expect(h.setHostPending).not.toHaveBeenCalled();
  });

  it('keeps applying later chunks after one chunk fails', async () => {
    const appendReplayEvent = jest
      .fn()
      .mockRejectedValueOnce(new Error('append failed'))
      .mockResolvedValue(undefined);
    const h = setup({ appendReplayEvent });
    await advance(0);

    await act(async () => {
      h.emitReplay([makeEvent(1)], true);
    });
    await advance(0);
    await act(async () => {
      h.emitReplay([makeEvent(2)], true);
    });
    await advance(0);

    expect(appendReplayEvent.mock.calls.map(([, e]) => e.sequence)).toEqual([
      1, 2,
    ]);
    expect(h.setLive).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalled();
  });

  it('redirects to the lobby when the host answers wrong-match', async () => {
    const h = setup();
    await advance(0);

    act(() => h.emitPeerRejected('wrong-match'));

    expect(h.redirectToLobby).toHaveBeenCalledTimes(1);
    expect(h.redirectToLobby).toHaveBeenCalledWith('match-1', 'Wrong match');
    await advance(REPLAY_WAIT_MS * 5);
    expect(h.setHostPending).not.toHaveBeenCalled();
  });

  it('ignores other peer-rejected reasons while waiting', async () => {
    const h = setup();
    await advance(0);

    act(() => h.emitPeerRejected('not-your-turn'));

    expect(h.redirectToLobby).not.toHaveBeenCalled();
  });

  it('ignores wrong-match before the request was sent', async () => {
    const h = setup({ getHostPresent: () => false });
    await advance(0);
    expect(h.channel.broadcastReconnectRequest).not.toHaveBeenCalled();

    act(() => h.emitPeerRejected('wrong-match'));

    expect(h.redirectToLobby).not.toHaveBeenCalled();
  });

  it('ignores wrong-match once replay chunks are arriving', async () => {
    const h = setup();
    await advance(0);
    act(() => h.emitReplay([makeEvent(1)], false));

    act(() => h.emitPeerRejected('wrong-match'));

    expect(h.redirectToLobby).not.toHaveBeenCalled();
  });

  it('keeps the match aborted when the wait times out', async () => {
    useGameplayStore.getState().setLocalMatchStatus('aborted');
    const h = setup({ setHostPending: undefined });
    await advance(0);

    await advance(REPLAY_WAIT_MS);

    expect(h.setHydratedSession).toHaveBeenCalledTimes(1);
    expect(useGameplayStore.getState().localMatchStatus).toBe('aborted');
  });

  it('clears the wait and unsubscribes on unmount', async () => {
    const h = setup();
    await advance(0);

    h.unmount();
    await advance(REPLAY_WAIT_MS * 5);

    expect(h.setHostPending).not.toHaveBeenCalled();
    expect(h.hydrateFromMatchLog).not.toHaveBeenCalled();
    expect(h.unsubscribes.replay).toHaveBeenCalledTimes(1);
    expect(h.unsubscribes.reject).toHaveBeenCalledTimes(1);
    expect(h.unsubscribes.peerReject).toHaveBeenCalledTimes(1);
  });

  it('still redirects on an explicit reconnect-reject', async () => {
    const h = setup();
    await advance(0);

    act(() => h.emitReconnectReject('Match in progress'));

    expect(h.redirectToLobby).toHaveBeenCalledWith(
      'match-1',
      'Match in progress',
    );
  });
});
