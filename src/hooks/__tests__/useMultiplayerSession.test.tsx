import { act, renderHook, waitFor } from '@testing-library/react';

import type { IClientWebSocket } from '@/lib/multiplayer/client';
import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { useMultiplayerSession } from '@/hooks/useMultiplayerSession';
import { useP2PCommandGate } from '@/hooks/useP2PCommandGate';
import { buildMirrorSession } from '@/lib/multiplayer/mirrorMatchSession';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSessionCore';
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

class MockSocket implements IClientWebSocket {
  sent: string[] = [];
  readyState = 1;
  onopen: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onclose: ((ev: unknown) => void) | null = null;

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
  }

  emit(message: IServerMessage): void {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

const auth = { playerId: 'pid_host', token: 'token' };
const ts = '2026-04-30T00:00:00.000Z';

const pauseMessage: IServerMessage = {
  kind: 'MatchPaused',
  matchId: 'match-1',
  ts,
  reason: 'peer-pending',
  pendingSlots: ['bravo-1'],
  graceRemainingMs: 30_000,
  pendingExpiresAtMs: 40_000,
};
const timeoutMessage: IServerMessage = {
  kind: 'SeatTimedOut',
  matchId: 'match-1',
  ts,
  slotId: 'bravo-1',
  playerId: 'pid_opp',
};

function mountLifecycleSession() {
  const sockets: MockSocket[] = [];
  const view = renderHook(
    ({ matchId }: { matchId: string | null }) =>
      useMultiplayerSession('ws://example.test/socket', matchId, auth, {
        reconnect: false,
        socketFactory: () => {
          const socket = new MockSocket();
          sockets.push(socket);
          return socket;
        },
      }),
    { initialProps: { matchId: 'match-1' as string | null } },
  );
  act(() => sockets[0].onopen?.({}));
  return { ...view, sockets };
}

describe('useMultiplayerSession terminal lifecycle', () => {
  beforeEach(() => useGameplayStore.getState().reset());
  afterEach(() => useGameplayStore.getState().reset());

  it.each(['ready', 'MatchResumed'] as const)(
    'clears pause presentation and pending state together on %s',
    (recovery) => {
      const { result, sockets, unmount } = mountLifecycleSession();
      act(() => sockets[0].emit(pauseMessage));
      expect(result.current.pausedInfo).not.toBeNull();
      expect(result.current.error?.code).toBe('MATCH_PAUSED');
      expect(useGameplayStore.getState().localMatchStatus).toBe('hostPending');
      act(() => {
        if (recovery === 'ready') emitReplay(sockets[0], []);
        else sockets[0].emit({ kind: recovery, matchId: 'match-1', ts });
      });
      expect(result.current.status).toBe('ready');
      expect(result.current.pausedInfo).toBeNull();
      expect(result.current.error).toBeNull();
      expect(useGameplayStore.getState()).toMatchObject({
        localMatchStatus: 'live',
        localMatchGraceDeadlineMs: null,
        localMatchGraceRemainingMs: null,
      });
      unmount();
    },
  );

  it('removes the pause overlay on timeout and keeps terminal state through recovery', () => {
    const { result, sockets, unmount } = mountLifecycleSession();
    act(() => {
      sockets[0].emit(pauseMessage);
      sockets[0].emit(timeoutMessage);
    });
    expect(result.current.status).toBe('error');
    expect(result.current.pausedInfo).toBeNull();
    expect(result.current.error?.code).toBe('SEAT_TIMED_OUT');
    const terminalError = result.current.error;
    const aborted = useGameplayStore.getState();
    for (const recovery of ['ready', 'MatchResumed', 'MatchPaused'] as const) {
      act(() => {
        if (recovery === 'ready') emitReplay(sockets[0], []);
        else if (recovery === 'MatchPaused') sockets[0].emit(pauseMessage);
        else sockets[0].emit({ kind: recovery, matchId: 'match-1', ts });
      });
      expect(result.current.status).toBe('error');
      expect(result.current.pausedInfo).toBeNull();
      expect(result.current.error).toBe(terminalError);
      expect(useGameplayStore.getState()).toBe(aborted);
    }
    // Terminal presentation cannot discard the server's conceded outcome history.
    const events = buildEventLog().events;
    act(() => emitReplay(sockets[0], events));
    expect(result.current.mirrorEvents.map((event) => event.id)).toEqual(
      events.map((event) => event.id),
    );
    expect(result.current.status).toBe('error');
    unmount();
  });

  it('clears pause presentation on close without resetting an aborted match', () => {
    const { result, sockets, unmount } = mountLifecycleSession();
    act(() => {
      sockets[0].emit(pauseMessage);
      sockets[0].emit(timeoutMessage);
      sockets[0].emit({
        kind: 'Close',
        matchId: 'match-1',
        ts,
        reason: 'Match closed',
      });
    });
    expect(result.current.status).toBe('closed');
    expect(result.current.pausedInfo).toBeNull();
    expect(result.current.error).toBeNull();
    expect(useGameplayStore.getState().localMatchStatus).toBe('aborted');
    unmount();
  });

  it.each(['paused', 'aborted'] as const)(
    'resets %s on WS teardown so a later P2P match is available',
    (status) => {
      const { sockets, unmount } = mountLifecycleSession();
      act(() =>
        sockets[0].emit(status === 'paused' ? pauseMessage : timeoutMessage),
      );
      unmount();
      expect(useGameplayStore.getState()).toMatchObject({
        localMatchStatus: 'live',
        localMatchGraceDeadlineMs: null,
        localMatchGraceRemainingMs: null,
      });
      const nextMatch = renderHook(() => useP2PCommandGate('p2p-ROOM01'));
      expect(nextMatch.result.current?.available).toBe(true);
      nextMatch.unmount();
    },
  );

  it('resets when the match changes and ignores disposed socket callbacks', () => {
    const { result, sockets, rerender, unmount } = mountLifecycleSession();
    const staleMessage = sockets[0].onmessage;
    act(() => sockets[0].emit(timeoutMessage));
    rerender({ matchId: 'match-2' });
    expect(useGameplayStore.getState().localMatchStatus).toBe('live');
    act(() => staleMessage?.({ data: JSON.stringify(timeoutMessage) }));
    expect(useGameplayStore.getState().localMatchStatus).toBe('live');
    expect(result.current.error).toBeNull();
    unmount();
  });
});

function reasonPause(
  reason: 'gm-absent' | 'opponent-fault',
  pendingSlots: readonly string[] = [],
): IServerMessage {
  return pendingSlots.length > 0
    ? {
        kind: 'MatchPaused',
        matchId: 'match-1',
        ts,
        reason,
        pendingSlots: [...pendingSlots],
        graceRemainingMs: 30_000,
        pendingExpiresAtMs: 40_000,
      }
    : { kind: 'MatchPaused', matchId: 'match-1', ts, reason, pendingSlots: [] };
}

describe('useMultiplayerSession pause reasons', () => {
  beforeEach(() => useGameplayStore.getState().reset());
  afterEach(() => useGameplayStore.getState().reset());

  it.each([
    ['gm-absent', 'Waiting for the GM to return.'],
    [
      'opponent-fault',
      'The server opponent hit an error; rejoining the match retries it.',
    ],
  ] as const)(
    'pauses on %s without inventing a reconnect grace',
    (reason, message) => {
      const { result, sockets, unmount } = mountLifecycleSession();
      act(() => sockets[0].emit(reasonPause(reason)));
      expect(result.current.status).toBe('paused');
      expect(result.current.pausedInfo).toEqual({
        reason,
        pendingSlots: [],
        graceRemainingMs: 0,
        pendingExpiresAtMs: null,
      });
      expect(result.current.error).toEqual({
        code: 'MATCH_PAUSED',
        reason: message,
      });
      expect(useGameplayStore.getState()).toMatchObject({
        localMatchStatus: 'live',
        localMatchGraceDeadlineMs: null,
        localMatchGraceRemainingMs: null,
      });
      unmount();
    },
  );

  it('drops the peer grace when the snapshot no longer names a pending seat', () => {
    const { result, sockets, unmount } = mountLifecycleSession();
    act(() => sockets[0].emit(pauseMessage));
    expect(useGameplayStore.getState().localMatchStatus).toBe('hostPending');
    act(() => sockets[0].emit(reasonPause('gm-absent')));
    expect(result.current.status).toBe('paused');
    expect(result.current.pausedInfo?.reason).toBe('gm-absent');
    expect(useGameplayStore.getState()).toMatchObject({
      localMatchStatus: 'live',
      localMatchGraceDeadlineMs: null,
    });
    unmount();
  });

  it('keeps the peer grace when a GM-absent snapshot still names a pending seat', () => {
    const { result, sockets, unmount } = mountLifecycleSession();
    act(() => sockets[0].emit(reasonPause('gm-absent', ['bravo-1'])));
    expect(result.current.pausedInfo).toEqual({
      reason: 'gm-absent',
      pendingSlots: ['bravo-1'],
      graceRemainingMs: 30_000,
      pendingExpiresAtMs: 40_000,
    });
    expect(useGameplayStore.getState()).toMatchObject({
      localMatchStatus: 'hostPending',
      localMatchGraceDeadlineMs: 40_000,
    });
    unmount();
  });

  it.each(['gm-absent', 'opponent-fault'] as const)(
    'clears a %s pause on MatchResumed',
    (reason) => {
      const { result, sockets, unmount } = mountLifecycleSession();
      act(() => sockets[0].emit(reasonPause(reason)));
      act(() =>
        sockets[0].emit({ kind: 'MatchResumed', matchId: 'match-1', ts }),
      );
      expect(result.current.status).toBe('ready');
      expect(result.current.pausedInfo).toBeNull();
      expect(result.current.error).toBeNull();
      unmount();
    },
  );

  it.each(['gm-absent', 'opponent-fault'] as const)(
    'keeps a timed-out match aborted through a %s pause',
    (reason) => {
      const { result, sockets, unmount } = mountLifecycleSession();
      act(() => sockets[0].emit(timeoutMessage));
      const aborted = useGameplayStore.getState();
      act(() => sockets[0].emit(reasonPause(reason)));
      expect(result.current.status).toBe('error');
      expect(result.current.pausedInfo).toBeNull();
      expect(useGameplayStore.getState()).toBe(aborted);
      unmount();
    },
  );
});

describe('useMultiplayerSession reconnect lifecycle', () => {
  beforeEach(() => {
    useGameplayStore.getState().reset();
  });

  afterEach(() => {
    useGameplayStore.getState().reset();
  });

  it('maps MatchPaused countdowns into local reconnect status', async () => {
    const sockets: MockSocket[] = [];
    const { result, unmount } = renderHook(() =>
      useMultiplayerSession('ws://example.test/socket', 'match-1', auth, {
        reconnect: false,
        socketFactory: () => {
          const socket = new MockSocket();
          sockets.push(socket);
          return socket;
        },
      }),
    );

    await waitFor(() => expect(sockets).toHaveLength(1));
    act(() => {
      sockets[0].onopen?.({});
      sockets[0].emit({
        kind: 'LobbyUpdated',
        matchId: 'match-1',
        ts,
        seats: [],
        status: 'active',
        hostPlayerId: 'pid_host',
      });
      sockets[0].emit({
        kind: 'MatchPaused',
        matchId: 'match-1',
        ts,
        reason: 'peer-pending',
        pendingSlots: ['bravo-1'],
        graceRemainingMs: 30_000,
        pendingExpiresAtMs: Date.now() + 30_000,
      });
    });

    expect(result.current.status).toBe('paused');
    expect(result.current.error).toEqual({
      code: 'MATCH_PAUSED',
      reason: 'Waiting for opponent to reconnect (30 seconds remaining)...',
    });
    expect(useGameplayStore.getState().localMatchStatus).toBe('guestPending');
    expect(
      useGameplayStore.getState().localMatchGraceRemainingMs,
    ).toBeGreaterThan(29_900);

    act(() => {
      sockets[0].emit({
        kind: 'MatchResumed',
        matchId: 'match-1',
        ts,
      });
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.error).toBeNull();
    expect(useGameplayStore.getState().localMatchStatus).toBe('live');

    unmount();
  });

  it('marks the local match aborted when the server emits SeatTimedOut', async () => {
    const sockets: MockSocket[] = [];
    renderHook(() =>
      useMultiplayerSession('ws://example.test/socket', 'match-1', auth, {
        reconnect: false,
        socketFactory: () => {
          const socket = new MockSocket();
          sockets.push(socket);
          return socket;
        },
      }),
    );

    await waitFor(() => expect(sockets).toHaveLength(1));
    act(() => {
      sockets[0].onopen?.({});
      sockets[0].emit({
        kind: 'SeatTimedOut',
        matchId: 'match-1',
        ts,
        slotId: 'bravo-1',
        playerId: 'pid_opp',
      });
    });

    expect(useGameplayStore.getState().localMatchStatus).toBe('aborted');
    expect(useGameplayStore.getState().localMatchGraceRemainingMs).toBe(0);
  });
});

// =============================================================================
// complete-multiplayer-game-surface — mirror session + intent forwarder
// =============================================================================

/**
 * Build a small authoritative event log through the engine reducer so
 * the hook test feeds the mirror builder a representative stream.
 */
function buildEventLog(): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 6,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    [
      {
        id: 'player-1',
        name: 'Atlas',
        side: GameSide.Player,
        unitRef: 'atlas-as7-d',
        pilotRef: 'pilot-1',
        gunnery: 4,
        piloting: 5,
      },
      {
        id: 'opponent-1',
        name: 'Marauder',
        side: GameSide.Opponent,
        unitRef: 'marauder-mad-3r',
        pilotRef: 'pilot-2',
        gunnery: 4,
        piloting: 5,
      },
    ],
    { id: 'match-1', createdAt: '2026-05-19T00:00:00.000Z' },
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Player);
  session = advancePhase(session);
  return session;
}

/**
 * Serves one replay on the open socket: ReplayStart (carrying `marker`
 * when given), then the body (see emitReplayBody).
 */
function emitReplay(
  socket: MockSocket,
  events: readonly unknown[],
  marker: { readonly replacesStream?: true } = {},
): void {
  emitReplayStart(socket, events.length, marker);
  emitReplayBody(socket, events);
}

/** Sends a ReplayStart for `totalEvents` items, carrying `marker` when given. */
function emitReplayStart(
  socket: MockSocket,
  totalEvents: number,
  marker: { readonly replacesStream?: true } = {},
): void {
  socket.emit({
    kind: 'ReplayStart',
    matchId: 'match-1',
    ts,
    fromSeq: 0,
    totalEvents,
    ...marker,
  } as IServerMessage);
}

/** Sends one chunk numbering `events` 0..n-1 in delivery space, then ReplayEnd. */
function emitReplayBody(socket: MockSocket, events: readonly unknown[]): void {
  socket.emit({
    kind: 'ReplayChunk',
    matchId: 'match-1',
    ts,
    events: [...events],
    deliverySequences: events.map((_event, index) => index),
  });
  socket.emit({
    kind: 'ReplayEnd',
    matchId: 'match-1',
    ts,
    toSeq: Math.max(0, events.length - 1),
  });
}

describe('useMultiplayerSession game surface', () => {
  beforeEach(() => {
    useGameplayStore.getState().reset();
  });
  afterEach(() => {
    useGameplayStore.getState().reset();
    jest
      .mocked(appendEvent)
      .mockImplementation(
        jest.requireActual<typeof import('@/utils/gameplay/gameSessionEvents')>(
          '@/utils/gameplay/gameSessionEvents',
        ).appendEvent,
      );
  });

  it.each([
    new GameEventIdCollisionError('injected'),
    new GameEventSequenceError(0, 1),
  ])(
    'hosted reconnect and GM rewind do not append wire events even with $name armed',
    (error) => {
      const authoritative = buildEventLog();
      const wireIds = new Set(authoritative.events.map((event) => event.id));
      const actual = jest.requireActual<
        typeof import('@/utils/gameplay/gameSessionEvents')
      >('@/utils/gameplay/gameSessionEvents');
      const incomingAppend = jest.fn();
      jest.mocked(appendEvent).mockImplementation((session, event) => {
        if (wireIds.has(event.id)) {
          incomingAppend(event);
          throw error;
        }
        return actual.appendEvent(session, event);
      });
      const { result, sockets, unmount } = mountLifecycleSession();
      act(() => emitReplay(sockets[0], authoritative.events.slice(0, 2)));
      expect(result.current.mirrorSession).not.toBeNull();
      act(() => {
        sockets[0].emit({
          kind: 'ReplayStart',
          matchId: 'match-1',
          ts,
          fromSeq: 2,
          totalEvents: authoritative.events.length - 2,
        });
        sockets[0].emit({
          kind: 'ReplayChunk',
          matchId: 'match-1',
          ts,
          events: authoritative.events.slice(2),
          deliverySequences: authoritative.events
            .slice(2)
            .map((_event, index) => index + 2),
        });
        sockets[0].emit({
          kind: 'ReplayEnd',
          matchId: 'match-1',
          ts,
          toSeq: authoritative.events.length - 1,
        });
      });
      expect(result.current.mirrorSession?.currentState).toEqual(
        authoritative.currentState,
      );
      act(() => emitReplayStart(sockets[0], 2, { replacesStream: true }));
      expect(result.current.mirrorSession?.currentState).toEqual(
        authoritative.currentState,
      );
      act(() => emitReplayBody(sockets[0], authoritative.events.slice(0, 2)));
      expect(result.current.mirrorEvents).toHaveLength(2);
      expect(result.current.error).toBeNull();
      expect(incomingAppend).not.toHaveBeenCalled();
      unmount();
    },
  );

  it('builds a mirror session from the broadcast Event stream', async () => {
    const authoritative = buildEventLog();
    const sockets: MockSocket[] = [];
    const { result, unmount } = renderHook(() =>
      useMultiplayerSession('ws://example.test/socket', 'match-1', auth, {
        reconnect: false,
        socketFactory: () => {
          const socket = new MockSocket();
          sockets.push(socket);
          return socket;
        },
      }),
    );

    await waitFor(() => expect(sockets).toHaveLength(1));
    act(() => {
      sockets[0].onopen?.({});
      // Drive the replay sequence so the client flips to `ready`, then
      // stream each engine event as a live `Event`.
      sockets[0].emit({
        kind: 'ReplayStart',
        matchId: 'match-1',
        ts,
        fromSeq: 0,
        totalEvents: 0,
      });
      sockets[0].emit({ kind: 'ReplayEnd', matchId: 'match-1', ts, toSeq: 0 });
      for (const event of authoritative.events) {
        sockets[0].emit({ kind: 'Event', matchId: 'match-1', ts, event });
      }
    });

    await waitFor(() => expect(result.current.mirrorSession).not.toBeNull());
    expect(result.current.mirrorSession?.currentState).toEqual(
      authoritative.currentState,
    );
    expect(result.current.mirrorEvents).toHaveLength(
      authoritative.events.length,
    );
    unmount();
  });

  it('a replace-stream replay replaces the mirror instead of appending to it', async () => {
    // U22a: after a GM rewind the server replays the rebuilt, shorter
    // stream to the open socket, marked as replacing it. The mirror must
    // end on the rebuilt head, not keep the superseded events.
    const authoritative = buildEventLog();
    const prefix = authoritative.events.slice(0, 2);
    const prefixPhase = buildMirrorSession(prefix)?.currentState.phase;
    expect(prefixPhase).not.toBe(authoritative.currentState.phase);
    const sockets: MockSocket[] = [];
    const { result, unmount } = renderHook(() =>
      useMultiplayerSession('ws://example.test/socket', 'match-1', auth, {
        reconnect: false,
        socketFactory: () => {
          const socket = new MockSocket();
          sockets.push(socket);
          return socket;
        },
      }),
    );

    await waitFor(() => expect(sockets).toHaveLength(1));
    act(() => {
      sockets[0].onopen?.({});
      emitReplay(sockets[0], authoritative.events);
    });
    await waitFor(() =>
      expect(result.current.mirrorEvents).toHaveLength(
        authoritative.events.length,
      ),
    );

    act(() => {
      emitReplayStart(sockets[0], prefix.length, { replacesStream: true });
    });
    // Between ReplayStart and the replayed body the surface still has
    // its mirror: an empty one would unmount everything rendered from it.
    expect(result.current.mirrorSession).not.toBeNull();
    expect(result.current.mirrorEvents).toHaveLength(
      authoritative.events.length,
    );

    act(() => {
      emitReplayBody(sockets[0], prefix);
    });

    await waitFor(() =>
      expect(result.current.mirrorEvents.map((event) => event.id)).toEqual(
        prefix.map((event) => event.id),
      ),
    );
    expect(result.current.mirrorSession?.currentState.phase).toBe(prefixPhase);
    unmount();
  });

  it('sendGameIntent forwards a mapped Intent envelope over the socket', async () => {
    const sockets: MockSocket[] = [];
    const { result, unmount } = renderHook(() =>
      useMultiplayerSession('ws://example.test/socket', 'match-1', auth, {
        reconnect: false,
        socketFactory: () => {
          const socket = new MockSocket();
          sockets.push(socket);
          return socket;
        },
      }),
    );

    await waitFor(() => expect(sockets).toHaveLength(1));
    act(() => {
      sockets[0].onopen?.({});
    });

    let sent = false;
    act(() => {
      sent = result.current.sendGameIntent({
        type: 'endPhase',
        payload: {},
        authorPeerId: 'player',
      });
    });
    expect(sent).toBe(true);
    // The SessionJoin is the first frame; the Intent is the second.
    const intentFrame = sockets[0].sent
      .map((raw) => JSON.parse(raw) as { kind: string; intent?: unknown })
      .find((frame) => frame.kind === 'Intent');
    expect(intentFrame?.intent).toEqual({ kind: 'AdvancePhase' });
    unmount();
  });

  it('surfaces a server Error envelope as a non-fatal intentError', async () => {
    const sockets: MockSocket[] = [];
    const { result, unmount } = renderHook(() =>
      useMultiplayerSession('ws://example.test/socket', 'match-1', auth, {
        reconnect: false,
        socketFactory: () => {
          const socket = new MockSocket();
          sockets.push(socket);
          return socket;
        },
      }),
    );

    await waitFor(() => expect(sockets).toHaveLength(1));
    act(() => {
      sockets[0].onopen?.({});
      sockets[0].emit({
        kind: 'Error',
        matchId: 'match-1',
        ts,
        code: 'INVALID_INTENT',
        reason: 'wrong phase',
      });
    });

    // Non-fatal: status stays connected, intentError carries the reason.
    expect(result.current.status).not.toBe('error');
    expect(result.current.intentError).toEqual({
      code: 'INVALID_INTENT',
      reason: 'wrong phase',
    });

    act(() => {
      result.current.clearIntentError();
    });
    expect(result.current.intentError).toBeNull();
    unmount();
  });

  it('captures the Close payload as closedInfo', async () => {
    const sockets: MockSocket[] = [];
    const { result, unmount } = renderHook(() =>
      useMultiplayerSession('ws://example.test/socket', 'match-1', auth, {
        reconnect: false,
        socketFactory: () => {
          const socket = new MockSocket();
          sockets.push(socket);
          return socket;
        },
      }),
    );

    await waitFor(() => expect(sockets).toHaveLength(1));
    act(() => {
      sockets[0].onopen?.({});
      sockets[0].emit({
        kind: 'Close',
        matchId: 'match-1',
        ts,
        reason: 'Match closed',
      });
    });

    expect(result.current.status).toBe('closed');
    expect(result.current.closedInfo?.reason).toBe('Match closed');
    unmount();
  });
});
