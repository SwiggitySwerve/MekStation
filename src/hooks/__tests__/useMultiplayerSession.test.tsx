import { act, renderHook, waitFor } from '@testing-library/react';

import type { IClientWebSocket } from '@/lib/multiplayer/client';
import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { useMultiplayerSession } from '@/hooks/useMultiplayerSession';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSessionCore';

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

describe('useMultiplayerSession game surface', () => {
  beforeEach(() => {
    useGameplayStore.getState().reset();
  });
  afterEach(() => {
    useGameplayStore.getState().reset();
  });

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
