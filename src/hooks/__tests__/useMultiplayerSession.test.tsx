import { act, renderHook, waitFor } from '@testing-library/react';

import type { IClientWebSocket } from '@/lib/multiplayer/client';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { useMultiplayerSession } from '@/hooks/useMultiplayerSession';
import { useGameplayStore } from '@/stores/useGameplayStore';

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
