/**
 * The diverged mirror is rebuilt, not merely refused (umbrella 19.2,
 * findings #79 and #85) - E4c-B2.
 *
 * B1 made a divergence visible and refused commands into it. It could
 * not clear, because the board really was wrong: `reconcileMatchLogMirror`
 * deletes the durable log, and `applyReplayStream` appended the peer's
 * events on top of a stale in-memory session and called `setLive()`.
 *
 * The obvious repair - lift the `if (!interactiveSession)` guard and
 * rehydrate - would have rebuilt a BLANK battle (#85):
 * `appendReplayEventToActiveSession` returns before its storage write
 * whenever an interactive session exists, so after the delete the
 * durable log stays empty and `hydrateSessionFromMatchLog` reads
 * nothing. So the divergence path has to persist the peer's events
 * FIRST, and only then hydrate from a log that exists again.
 */

import { act, renderHook, waitFor } from '@testing-library/react';

import type { IGameSessionChannel } from '@/lib/p2p';
import type { IGameSession } from '@/types/gameplay';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { useP2PReconnectSession } from '@/hooks/useP2PReconnectSession';
import { useP2PMirrorStore } from '@/lib/p2p/p2pMirrorStore';
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
    payload: { firstSide: GameSide.Player },
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
    emitReplay: (events: readonly IGameEvent[]) => {
      replayCallback({
        kind: 'replay-stream',
        matchId: 'match-1',
        events,
        done: true,
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

/** Mount the guest reconnect flow with a stored log and a stream. */
function mountReconnect(opts: {
  readonly stored: readonly IGameEvent[];
  readonly stream: readonly IGameEvent[];
}) {
  const { channel, emitReplay } = makeChannel();
  const persistReplayEvent = jest.fn().mockResolvedValue(undefined);
  const appendReplayEvent = jest.fn().mockResolvedValue(undefined);
  const adoptRebuiltSession = jest.fn();
  const setHydratedSession = jest.fn();
  const hydrated = makeHydratedSession();
  const hydrateFromMatchLog = jest.fn().mockResolvedValue(hydrated);
  const setLive = jest.fn();

  renderHook(() =>
    useP2PReconnectSession('match-1', {
      getLastSequence: jest.fn().mockResolvedValue(0),
      getMatchMetadata: jest.fn().mockResolvedValue(metadata),
      getEventsForMatch: jest.fn().mockResolvedValue(opts.stored),
      deleteEventsForMatch: jest.fn().mockResolvedValue(undefined),
      ensureSyncRoom: jest.fn(),
      getLocalPeerId: () => 'guest-peer',
      getHostPresent: () => true,
      createChannel: () => channel,
      appendReplayEvent,
      persistReplayEvent,
      adoptRebuiltSession,
      hydrateFromMatchLog,
      setHydratedSession,
      setLive,
      redirectToLobby: jest.fn(),
    }),
  );

  return {
    channel,
    emitReplay,
    persistReplayEvent,
    appendReplayEvent,
    adoptRebuiltSession,
    hydrateFromMatchLog,
    hydrated,
    setLive,
    stream: opts.stream,
  };
}

/** Wait until the guest flow has asked the host for a replay. */
async function settle(harness: {
  readonly channel: IGameSessionChannel;
}): Promise<void> {
  await waitFor(() =>
    expect(harness.channel.broadcastReconnectRequest).toHaveBeenCalled(),
  );
}

describe('P2P mirror divergence rebuild', () => {
  beforeEach(() => {
    useP2PMirrorStore.getState().reset();
  });
  afterEach(() => {
    useP2PMirrorStore.getState().reset();
  });

  it('writes the peer prefix to the durable log before rebuilding from it', async () => {
    // The invariant the delete broke, restored: after a divergence the
    // durable log holds the peer's authoritative events, in order. This
    // is #85's row - without the persist, the hydrate below reads an
    // empty log and hands the player a blank battle that LOOKS like a
    // successful recovery.
    const harness = mountReconnect({
      stored: [makeEvent(0, 'id-a'), makeEvent(1, 'id-b')],
      stream: [makeEvent(0, 'id-a'), makeEvent(1, 'id-x')],
    });

    await settle(harness);
    act(() => harness.emitReplay(harness.stream));

    await waitFor(() =>
      expect(harness.persistReplayEvent).toHaveBeenCalledTimes(2),
    );
    expect(
      harness.persistReplayEvent.mock.calls.map(([, event]) => event.id),
    ).toEqual(['id-a', 'id-x']);
    // And the stale in-memory append path is NOT used for those events:
    // appending the peer's history onto the board that disagreed with it
    // is exactly what produced the mixed session in the first place.
    expect(harness.appendReplayEvent).not.toHaveBeenCalled();
    expect(
      harness.hydrateFromMatchLog.mock.invocationCallOrder[0],
    ).toBeGreaterThan(
      harness.persistReplayEvent.mock.invocationCallOrder[1] as number,
    );
  });

  it('adopts the rebuilt session and clears the divergence', async () => {
    // R6. The flag clears because the board was actually replaced - not
    // because time passed, and not because a later verdict said `match`.
    useP2PMirrorStore
      .getState()
      .recordDivergence('match-1', { kind: 'truncated', position: 1 });

    const harness = mountReconnect({
      stored: [makeEvent(0, 'id-a'), makeEvent(1, 'id-b')],
      stream: [makeEvent(0, 'id-a')],
    });
    await settle(harness);
    act(() => harness.emitReplay(harness.stream));

    await waitFor(() =>
      expect(harness.adoptRebuiltSession).toHaveBeenCalledWith(
        harness.hydrated,
      ),
    );
    await waitFor(() =>
      expect(useP2PMirrorStore.getState().divergenceFor('match-1')).toBeNull(),
    );
    expect(harness.setLive).toHaveBeenCalled();
  });

  it('leaves a clean replay on the path it always took', async () => {
    // The vacuity guard: a clean prefix must not persist-and-rebuild,
    // or every match would be rebuilt from storage on every reconnect.
    const harness = mountReconnect({
      stored: [makeEvent(0, 'id-a')],
      stream: [makeEvent(0, 'id-a'), makeEvent(1, 'id-b')],
    });
    await settle(harness);
    act(() => harness.emitReplay(harness.stream));

    await waitFor(() =>
      expect(harness.appendReplayEvent).toHaveBeenCalledTimes(2),
    );
    expect(harness.persistReplayEvent).not.toHaveBeenCalled();
    expect(harness.adoptRebuiltSession).not.toHaveBeenCalled();
  });

  it('does not clear a divergence without rebuilding', async () => {
    // M7's inverse. A clean replay for a match that already diverged
    // must NOT clear the flag: with the log deleted, the next reconcile
    // returns `match` trivially, so "a clean verdict" is not evidence of
    // recovery - only a completed rebuild is.
    useP2PMirrorStore.getState().recordDivergence('match-1', {
      kind: 'replaced',
      position: 1,
      storedId: 'id-b',
      receivedId: 'id-x',
    });

    const harness = mountReconnect({
      stored: [],
      stream: [makeEvent(0, 'id-a')],
    });
    await settle(harness);
    act(() => harness.emitReplay(harness.stream));

    await waitFor(() => expect(harness.setLive).toHaveBeenCalled());
    expect(harness.adoptRebuiltSession).not.toHaveBeenCalled();
    expect(useP2PMirrorStore.getState().divergenceFor('match-1')).toStrictEqual(
      { kind: 'replaced', position: 1 },
    );
  });
});
