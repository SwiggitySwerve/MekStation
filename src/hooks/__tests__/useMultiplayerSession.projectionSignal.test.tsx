/**
 * The client binding's projection-signal producer (umbrella 19.2, 3b-i).
 *
 * Before this seam the reserved `rebuilding` / `rewound` postures were
 * unreachable in a live match for a reason nobody had written down: the
 * derivation accepted a signal, but NOTHING produced one. The server has
 * refused engine-mutating intents with `PROJECTION_REBUILDING` since
 * `add-authoritative-history-branches` task 2.2, and that refusal arrived
 * here as a toast - a dismissible notice on a board the client already
 * knew was not current.
 *
 * These rows drive the REAL client binding (mock socket -> `connect()` ->
 * `useMultiplayerSession`), not a hand-called mapper, because the miss
 * this program keeps hitting is a guard that cannot see the wiring it
 * guards.
 */

import { act, renderHook, waitFor } from '@testing-library/react';

import type { IClientWebSocket } from '@/lib/multiplayer/client';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { useMultiplayerSession } from '@/hooks/useMultiplayerSession';
import { deriveTacticalLifecyclePosture } from '@/lib/multiplayer/tacticalLifecycleState';
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
const ts = '2026-09-02T00:00:00.000Z';

/** One authoritative match event - the frame that clears the signal. */
const AUTHORITATIVE_EVENT = {
  id: 'evt-1',
  type: 'PhaseChanged',
  sequence: 1,
  turn: 1,
  phase: 'movement',
  payload: { fromPhase: 'initiative', toPhase: 'movement' },
};

function mountSession(sockets: MockSocket[]) {
  return renderHook(() =>
    useMultiplayerSession('ws://example.test/socket', 'match-1', auth, {
      reconnect: false,
      socketFactory: () => {
        const socket = new MockSocket();
        sockets.push(socket);
        return socket;
      },
    }),
  );
}

describe('useMultiplayerSession projection signal', () => {
  beforeEach(() => {
    useGameplayStore.getState().reset();
  });
  afterEach(() => {
    useGameplayStore.getState().reset();
  });

  it('lights the rebuilding signal from a server PROJECTION_REBUILDING refusal', async () => {
    const sockets: MockSocket[] = [];
    const { result, unmount } = mountSession(sockets);

    await waitFor(() => expect(sockets).toHaveLength(1));
    act(() => {
      sockets[0].onopen?.({});
      sockets[0].emit({
        kind: 'Error',
        matchId: 'match-1',
        ts,
        code: 'PROJECTION_REBUILDING',
        reason: 'correction lease rebuilding history',
      });
    });

    expect(result.current.projectionSignal).toBe('PROJECTION_REBUILDING');
    // The posture the tactical surface actually derives from it.
    expect(
      deriveTacticalLifecyclePosture({
        client: result.current.clientLifecycle ?? {
          blockedBySequenceCollision: false,
          pendingIntentCount: 0,
          ready: true,
          reconnectScheduled: false,
          recoveringFromGap: false,
        },
        finalizationLanded: false,
        projectionSignal: result.current.projectionSignal ?? null,
        sealedChoiceAwaitingReveal: false,
      }).state,
    ).toBe('rebuilding');
    // The refusal is still a refusal: the toast keeps its own channel.
    expect(result.current.intentError).toStrictEqual({
      code: 'PROJECTION_REBUILDING',
      reason: 'correction lease rebuilding history',
    });
    unmount();
  });

  it('clears the rebuilding signal on the next authoritative match event', async () => {
    const sockets: MockSocket[] = [];
    const { result, unmount } = mountSession(sockets);

    await waitFor(() => expect(sockets).toHaveLength(1));
    act(() => {
      sockets[0].onopen?.({});
      sockets[0].emit({
        kind: 'ReplayStart',
        matchId: 'match-1',
        ts,
        fromSeq: 0,
        totalEvents: 0,
      });
      sockets[0].emit({ kind: 'ReplayEnd', matchId: 'match-1', ts, toSeq: 0 });
      sockets[0].emit({
        kind: 'Error',
        matchId: 'match-1',
        ts,
        code: 'PROJECTION_REBUILDING',
        reason: 'correction lease rebuilding history',
      });
    });
    expect(result.current.projectionSignal).toBe('PROJECTION_REBUILDING');

    act(() => {
      sockets[0].emit({
        kind: 'Event',
        matchId: 'match-1',
        ts,
        event: AUTHORITATIVE_EVENT,
      } as unknown as IServerMessage);
    });

    expect(result.current.projectionSignal).toBeNull();
    unmount();
  });

  it('leaves the signal dark for a refusal that is not a rebuild', async () => {
    const sockets: MockSocket[] = [];
    const { result, unmount } = mountSession(sockets);

    await waitFor(() => expect(sockets).toHaveLength(1));
    act(() => {
      sockets[0].onopen?.({});
      sockets[0].emit({
        kind: 'Error',
        matchId: 'match-1',
        ts,
        code: 'RATE_LIMITED',
        reason: 'slow down',
      });
    });

    expect(result.current.projectionSignal).toBeNull();
    expect(result.current.intentError?.code).toBe('RATE_LIMITED');
    unmount();
  });

  it('lights the blocked branch-refusal signal from a server STALE_BRANCH refusal', async () => {
    const sockets: MockSocket[] = [];
    const { result, unmount } = mountSession(sockets);

    await waitFor(() => expect(sockets).toHaveLength(1));
    act(() => {
      sockets[0].onopen?.({});
      sockets[0].emit({
        kind: 'Error',
        matchId: 'match-1',
        ts,
        code: 'STALE_BRANCH',
        reason: 'not the effective branch',
        conflictHead: { branchId: 'root', revision: 7 },
        recoveryAction: 'resync-to-active-head',
      });
    });

    expect(result.current.projectionSignal).toEqual({
      code: 'STALE_BRANCH',
      conflictHead: { branchId: 'root', revision: 7 },
      recoveryAction: 'resync-to-active-head',
    });
    expect(
      deriveTacticalLifecyclePosture({
        client: result.current.clientLifecycle ?? {
          blockedBySequenceCollision: false,
          pendingIntentCount: 0,
          ready: true,
          reconnectScheduled: false,
          recoveringFromGap: false,
        },
        finalizationLanded: false,
        projectionSignal: result.current.projectionSignal ?? null,
        sealedChoiceAwaitingReveal: false,
      }).state,
    ).toBe('blocked');
    unmount();
  });
});
