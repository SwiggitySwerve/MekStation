/**
 * Reconnection flow integration test — Wave 4.
 *
 * Drives a real `ServerMatchHost` through the full disconnect → pause
 * → reconnect → resume cycle:
 *   1. Host + opponent each attach a socket for an `active` 1v1.
 *   2. Opponent socket detaches (simulated wifi drop).
 *   3. Host receives `MatchPaused` with the opponent's slotId.
 *   4. Engine-mutating intents are rejected with `MATCH_PAUSED`.
 *   5. Opponent reconnects and `handleSessionJoin(lastSeq=2)` replays
 *      only events with sequence > 2.
 *   6. `MatchResumed` is broadcast and mutating intents work again.
 *   7. Host's `MarkSeatAi` override clears pause without reconnect.
 *   8. Host's `ForfeitMatch` ends the match cleanly.
 */

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  GameEventType,
  type IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import {
  nowIso,
  RECONNECT_GRACE_MS,
  type IIntent,
  type IServerMessage,
} from '@/types/multiplayer/Protocol';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { addSpectatorSeat } from '../lobby/spectatorSeats';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';
import { raceMetaWrites } from './matchMetaRace.test-helpers';

// =============================================================================
// Helpers
// =============================================================================

interface IRecordedSend {
  parsed: IServerMessage;
}

function makeSocket(): IMatchSocket & {
  sent: IRecordedSend[];
  closed: boolean;
  clear: () => void;
} {
  const sent: IRecordedSend[] = [];
  let closed = false;
  return {
    send(data: string) {
      sent.push({ parsed: JSON.parse(data) as IServerMessage });
    },
    close() {
      closed = true;
    },
    get readyState() {
      return closed ? 3 : 1;
    },
    sent,
    get closed() {
      return closed;
    },
    clear() {
      sent.length = 0;
    },
  } as IMatchSocket & {
    sent: IRecordedSend[];
    closed: boolean;
    clear: () => void;
  };
}

async function makeActiveHost() {
  const store = new InMemoryMatchStore({ quiet: true });
  const matchId = 'match-reconnect';
  const now = new Date().toISOString();
  const seats = defaultSeats('1v1').map((s) => {
    if (s.slotId === 'alpha-1') {
      return {
        ...s,
        occupant: { playerId: 'pid_host', displayName: 'Host' },
        ready: true,
      };
    }
    if (s.slotId === 'bravo-1') {
      return {
        ...s,
        occupant: { playerId: 'pid_opp', displayName: 'Opp' },
        ready: true,
      };
    }
    return s;
  });
  await store.createMatch({
    matchId,
    hostPlayerId: 'pid_host',
    playerIds: ['pid_host', 'pid_opp'],
    sideAssignments: [
      { playerId: 'pid_host', side: 'player' },
      { playerId: 'pid_opp', side: 'opponent' },
    ],
    status: 'active', // skip the launch step — start directly active
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
    layout: '1v1',
    seats,
  });
  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(1),
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: [] as readonly IGameUnit[],
  });
  await Promise.resolve();
  await Promise.resolve();
  return { host, store, matchId };
}

/**
 * Drain enough microtask ticks for the socket-drop handler chain.
 * harden-multiplayer-transport (M2) added host migration ahead of the
 * grace-pause path, so a drop now runs two sequential async store
 * reads — a couple of `Promise.resolve()` ticks no longer suffice.
 */
async function flushDrop(): Promise<void> {
  for (let i = 0; i < 32; i++) {
    await Promise.resolve();
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('Reconnection Flow (Wave 4)', () => {
  it('marks seat pending + broadcasts MatchPaused when a human seat socket drops', async () => {
    const { host } = await makeActiveHost();
    const hostSock = makeSocket();
    const oppSock = makeSocket();
    host.attachSocket(hostSock, 'pid_host');
    host.attachSocket(oppSock, 'pid_opp');

    // Opponent drops.
    host.detachSocket(oppSock);
    // The pending-mark path is async (meta lookup). Flush microtasks.
    await flushDrop();

    expect(host.isPausedForReconnect()).toBe(true);
    const pending = host.getPendingPeersForTests();
    expect(pending.length).toBe(1);
    expect(pending[0].playerId).toBe('pid_opp');
    expect(pending[0].slotId).toBe('bravo-1');

    // MatchPaused went out to the remaining socket (host).
    const pausedMsgs = hostSock.sent.filter(
      (s) => s.parsed.kind === 'MatchPaused',
    );
    expect(pausedMsgs.length).toBeGreaterThan(0);
    if (pausedMsgs[0].parsed.kind === 'MatchPaused') {
      expect(pausedMsgs[0].parsed.pendingSlots).toEqual(['bravo-1']);
      expect(pausedMsgs[0].parsed.reason).toBe('peer-pending');
      expect(pausedMsgs[0].parsed.graceRemainingMs).toBeGreaterThan(0);
      expect(pausedMsgs[0].parsed.pendingExpiresAtMs).toBeGreaterThan(
        Date.now(),
      );
    }
  });

  it('rejects engine-mutating intents with MATCH_PAUSED while paused', async () => {
    const { host, matchId } = await makeActiveHost();
    const hostSock = makeSocket();
    const oppSock = makeSocket();
    host.attachSocket(hostSock, 'pid_host');
    host.attachSocket(oppSock, 'pid_opp');
    host.detachSocket(oppSock);
    await flushDrop();

    const intent: IIntent = {
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'pid_host',
      intent: { kind: 'AdvancePhase' },
    };
    const broadcasts = await host.handleIntent(intent);
    const err = broadcasts.find((b) => b.kind === 'Error');
    expect(err).toBeDefined();
    if (err && err.kind === 'Error') {
      expect(err.code).toBe('MATCH_PAUSED');
    }
  });

  it('reconnect via handleSessionJoin streams events > lastSeq and resumes', async () => {
    const { host, matchId } = await makeActiveHost();
    const hostSock = makeSocket();
    const oppSock = makeSocket();
    host.attachSocket(hostSock, 'pid_host');
    host.attachSocket(oppSock, 'pid_opp');
    // Capture the initial highest seq the opponent "saw" before drop.
    const initialSeqBeforeDrop = host.highestSeq();

    // Drop opponent.
    host.detachSocket(oppSock);
    await flushDrop();
    expect(host.isPausedForReconnect()).toBe(true);

    // NOTE: we can't run any engine intent while paused, so the seq
    // floor equals the initial GameCreated/GameStarted seqs. Use that
    // as our `lastSeq` so the replay should be empty-past-floor.
    void matchId;
    void initialSeqBeforeDrop;

    // Opponent reconnects.
    const oppSock2 = makeSocket();
    host.attachSocket(oppSock2, 'pid_opp');
    await host.handleSessionJoin(oppSock2, 'pid_opp', initialSeqBeforeDrop);
    // Flush any async meta reads inside handleSessionJoin.
    await Promise.resolve();

    // The reconnecting socket should have received ReplayStart + at
    // least one ReplayChunk + ReplayEnd, in that order.
    const kinds = oppSock2.sent.map((s) => s.parsed.kind);
    const startIdx = kinds.indexOf('ReplayStart');
    const endIdx = kinds.indexOf('ReplayEnd');
    expect(startIdx).toBeGreaterThanOrEqual(0);
    expect(endIdx).toBeGreaterThan(startIdx);
    // A ReplayChunk must appear between start and end.
    expect(kinds.slice(startIdx, endIdx)).toContain('ReplayChunk');

    // Host socket should have received MatchResumed on the reconnect.
    const resumedOnHost = hostSock.sent.filter(
      (s) => s.parsed.kind === 'MatchResumed',
    );
    expect(resumedOnHost.length).toBeGreaterThan(0);
    expect(host.isPausedForReconnect()).toBe(false);
    expect(host.getPendingPeersForTests().length).toBe(0);

    oppSock2.clear();
    const afterResume = await host.handleIntent({
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'pid_host',
      intent: { kind: 'AdvancePhase' },
    } as IIntent);
    expect(afterResume.some((message) => message.kind === 'Event')).toBe(true);
    expect(oppSock2.sent.some((frame) => frame.parsed.kind === 'Event')).toBe(
      true,
    );
  });

  it('host MarkSeatAi clears the pending seat and broadcasts MatchResumed', async () => {
    const { host, matchId, store } = await makeActiveHost();
    const hostSock = makeSocket();
    const oppSock = makeSocket();
    host.attachSocket(hostSock, 'pid_host');
    host.attachSocket(oppSock, 'pid_opp');
    host.detachSocket(oppSock);
    await flushDrop();

    hostSock.clear();
    const markAi: IIntent = {
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'pid_host', // must be host
      intent: { kind: 'MarkSeatAi', slotId: 'bravo-1' },
    };
    const out = await host.handleIntent(markAi);
    // LobbyUpdated + MatchResumed should both have been broadcast.
    const kinds = out.map((b) => b.kind);
    expect(kinds).toContain('LobbyUpdated');
    // The resume happens post-broadcast via maybeResume, which goes
    // through the socket directly (not into the returned broadcasts),
    // so also verify on the host socket.
    const resumed = hostSock.sent.find((s) => s.parsed.kind === 'MatchResumed');
    expect(resumed).toBeDefined();

    // Seat is now AI in the persisted meta.
    const meta = await store.getMatchMeta(matchId);
    const seat = (meta.seats ?? []).find((s) => s.slotId === 'bravo-1');
    expect(seat?.kind).toBe('ai');
    expect(host.isPausedForReconnect()).toBe(false);
  });

  it('MarkSeatAi still converts the pending seat when a concurrent write forces a retry', async () => {
    const { host, matchId, store } = await makeActiveHost();
    const hostSock = makeSocket();
    const oppSock = makeSocket();
    host.attachSocket(hostSock, 'pid_host');
    host.attachSocket(oppSock, 'pid_opp');
    host.detachSocket(oppSock);
    await flushDrop();
    // Re-deriving after the conflict must still find the pending entry, so
    // the handler may only clear it once the seat write has been applied.
    const race = raceMetaWrites(store, matchId, (fresh) => ({
      layout: fresh.layout,
    }));

    const out = await host.handleIntent({
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'pid_host',
      intent: { kind: 'MarkSeatAi', slotId: 'bravo-1' },
    });

    expect(race.fired()).toBe(1);
    expect(out.map((frame) => frame.kind)).toContain('LobbyUpdated');
    const seat = (await store.getMatchMeta(matchId)).seats?.find(
      (s) => s.slotId === 'bravo-1',
    );
    expect(seat?.kind).toBe('ai');
    expect(host.getPendingPeersForTests()).toHaveLength(0);
    expect(host.isPausedForReconnect()).toBe(false);
  });

  it.each([
    'connected',
    'empty',
    'ai',
    'spectator',
    'wrong-slot',
    'completed',
  ] as const)(
    'MarkSeatAi rejects %s targets without changing seats or clearing pending',
    async (scenario) => {
      const { host, store, matchId } = await makeActiveHost();
      host.attachSocket(makeSocket(), 'pid_host');
      const opponent = makeSocket();
      host.attachSocket(opponent, 'pid_opp');
      if (scenario !== 'connected') {
        host.detachSocket(opponent);
        await flushDrop();
      }
      const meta = await store.getMatchMeta(matchId);
      const seats =
        scenario === 'spectator'
          ? addSpectatorSeat(meta.seats ?? [], {
              playerId: 'watcher',
              displayName: 'Watcher',
            })
          : meta.seats?.map((seat) =>
              seat.slotId !== 'bravo-1'
                ? seat
                : {
                    ...seat,
                    ...(scenario === 'empty' ? { occupant: null } : {}),
                    ...(scenario === 'ai' ? { kind: 'ai' as const } : {}),
                    ...(scenario === 'wrong-slot' ? { slotId: 'bravo-2' } : {}),
                  },
            );
      await store.updateMatchMeta(matchId, {
        seats,
        // An active match never returns to lobby; the lobby refusal is
        // pinned on the intent table in matchIntentKinds.test.ts.
        status: scenario === 'completed' ? 'completed' : 'active',
      });
      const before = await store.getMatchMeta(matchId);
      const pending = host.getPendingPeersForTests();
      const events = await store.getEvents(matchId);
      expect(
        await host.handleIntent({
          kind: 'Intent',
          matchId,
          playerId: 'pid_host',
          ts: nowIso(),
          intentId: 'mark-refusal',
          intent: {
            kind: 'MarkSeatAi',
            slotId:
              scenario === 'spectator'
                ? 'spectator-1'
                : scenario === 'wrong-slot'
                  ? 'bravo-2'
                  : 'bravo-1',
          },
        }),
      ).toEqual([
        expect.objectContaining({
          kind: 'Error',
          code: 'INVALID_INTENT',
          intentId: 'mark-refusal',
        }),
      ]);
      expect(await store.getMatchMeta(matchId)).toEqual(before);
      expect(await store.getEvents(matchId)).toEqual(events);
      expect(host.getPendingPeersForTests()).toEqual(pending);
      await host.closeMatch();
    },
  );

  it('MarkSeatAi from a non-host is rejected with AUTH_REJECTED', async () => {
    const { host, matchId } = await makeActiveHost();
    const hostSock = makeSocket();
    host.attachSocket(hostSock, 'pid_host');

    const badIntent: IIntent = {
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'pid_opp', // not host
      intent: { kind: 'MarkSeatAi', slotId: 'alpha-1' },
    };
    const out = await host.handleIntent(badIntent);
    const err = out.find((b) => b.kind === 'Error');
    expect(err).toBeDefined();
    if (err && err.kind === 'Error') {
      expect(err.code).toBe('AUTH_REJECTED');
    }
  });

  it('ForfeitMatch (host-only) concedes and produces a GameEnded event', async () => {
    const { host, matchId, store } = await makeActiveHost();
    const hostSock = makeSocket();
    host.attachSocket(hostSock, 'pid_host');

    const forfeit: IIntent = {
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'pid_host',
      intent: { kind: 'ForfeitMatch' },
    };
    const out = await host.handleIntent(forfeit);
    // At least one Event envelope should carry a GameEnded.
    const eventEnvs = out.filter((b) => b.kind === 'Event');
    expect(eventEnvs.length).toBeGreaterThan(0);

    const events = await store.getEvents(matchId);
    expect(events.some((e) => e.type === GameEventType.GameEnded)).toBe(true);
  });

  it('closeMatch clears all pending grace timers', async () => {
    const { host } = await makeActiveHost();
    const hostSock = makeSocket();
    const oppSock = makeSocket();
    host.attachSocket(hostSock, 'pid_host');
    host.attachSocket(oppSock, 'pid_opp');
    host.detachSocket(oppSock);
    await flushDrop();
    expect(host.getPendingPeersForTests().length).toBe(1);

    await host.closeMatch();
    expect(host.getPendingPeersForTests().length).toBe(0);
    expect(host.isClosed()).toBe(true);
  });

  it('grace timeout completes the match cleanly via concede, never the legacy abort', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000);
    try {
      const { host, store, matchId } = await makeActiveHost();
      const hostSock = makeSocket();
      const oppSock = makeSocket();
      host.attachSocket(hostSock, 'pid_host');
      host.attachSocket(oppSock, 'pid_opp');

      host.detachSocket(oppSock);
      await flushDrop();
      expect(host.isPausedForReconnect()).toBe(true);

      jest.advanceTimersByTime(RECONNECT_GRACE_MS);
      await flushDrop();

      // harden-multiplayer-transport (M2) design D5: grace expiry now
      // completes the match cleanly through the normal outcome path —
      // the timed-out player's side is conceded — and NEVER via the
      // legacy `reason: 'aborted'` abort. The opponent timed out, so
      // their side is conceded and the player side wins.
      const events = await store.getEvents(matchId);
      const ended = events.find((e) => e.type === GameEventType.GameEnded);
      expect(ended).toBeDefined();
      expect((ended?.payload as { reason?: string }).reason).not.toBe(
        'aborted',
      );
      expect(ended?.payload).toMatchObject({ reason: 'concede' });
      const meta = await store.getMatchMeta(matchId);
      expect(meta.status).toBe('completed');
      expect(host.isClosed()).toBe(true);
      expect(host.isPausedForReconnect()).toBe(false);
      expect(host.getPendingPeersForTests()).toHaveLength(0);
      expect(hostSock.sent.some((s) => s.parsed.kind === 'SeatTimedOut')).toBe(
        true,
      );
      expect(hostSock.sent.some((s) => s.parsed.kind === 'Close')).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not pause on drop if match is still in lobby', async () => {
    const store = new InMemoryMatchStore({ quiet: true });
    const matchId = 'match-lobby-drop';
    const now = new Date().toISOString();
    await store.createMatch({
      matchId,
      hostPlayerId: 'pid_host',
      playerIds: ['pid_host'],
      sideAssignments: [{ playerId: 'pid_host', side: 'player' }],
      status: 'lobby',
      createdAt: now,
      updatedAt: now,
      config: { mapRadius: 4, turnLimit: 5 },
      layout: '1v1',
      seats: defaultSeats('1v1').map((s) =>
        s.slotId === 'alpha-1'
          ? {
              ...s,
              occupant: { playerId: 'pid_host', displayName: 'Host' },
            }
          : s,
      ),
    });
    const host = ServerMatchHost.create(matchId, store, {
      mapRadius: 4,
      turnLimit: 5,
      random: new SeededRandom(1),
      grid: createMinimalGrid(4),
      playerUnits: [],
      opponentUnits: [],
      gameUnits: [] as readonly IGameUnit[],
    });
    await Promise.resolve();
    await Promise.resolve();

    const sock = makeSocket();
    host.attachSocket(sock, 'pid_host');
    host.detachSocket(sock);
    await flushDrop();

    expect(host.isPausedForReconnect()).toBe(false);
    expect(host.getPendingPeersForTests().length).toBe(0);
  });
});

describe('M-H3 pause snapshots and forfeit exits', () => {
  async function pausedForOpponent() {
    const active = await makeActiveHost();
    const hostSock = makeSocket();
    const oppSock = makeSocket();
    active.host.attachSocket(hostSock, 'pid_host');
    active.host.attachSocket(oppSock, 'pid_opp');
    active.host.detachSocket(oppSock);
    await flushDrop();
    expect(active.host.isPausedForReconnect()).toBe(true);
    return { ...active, hostSock };
  }

  function kindsOf(sock: ReturnType<typeof makeSocket>): string[] {
    return sock.sent.map((s) => s.parsed.kind);
  }

  it('sends a rejoining player the pause snapshot after replay and lobby frames', async () => {
    const { host } = await pausedForOpponent();
    const rejoined = makeSocket();
    host.attachSocket(rejoined, 'pid_host');
    await host.handleSessionJoin(rejoined, 'pid_host');
    const kinds = kindsOf(rejoined);
    const paused = kinds.lastIndexOf('MatchPaused');
    expect(paused).toBeGreaterThan(kinds.indexOf('ReplayEnd'));
    expect(paused).toBeGreaterThan(kinds.indexOf('LobbyUpdated'));
    expect(kinds).not.toContain('MatchResumed');
    expect(rejoined.sent[paused].parsed).toMatchObject({
      reason: 'peer-pending',
      pendingSlots: ['bravo-1'],
    });
    await host.closeMatch();
  });

  it('sends a joining spectator the pause snapshot', async () => {
    const { host, store, matchId } = await pausedForOpponent();
    const meta = await store.getMatchMeta(matchId);
    await store.updateMatchMeta(matchId, {
      seats: addSpectatorSeat(meta.seats ?? [], {
        playerId: 'watcher',
        displayName: 'Watcher',
      }),
    });
    const watcher = makeSocket();
    host.attachSocket(watcher, 'watcher');
    await host.handleSessionJoin(watcher, 'watcher');
    expect(
      watcher.sent.find((s) => s.parsed.kind === 'MatchPaused')?.parsed,
    ).toMatchObject({ reason: 'peer-pending', pendingSlots: ['bravo-1'] });
    expect(host.isPausedForReconnect()).toBe(true);
    await host.closeMatch();
  });

  it('broadcasts MatchResumed when the host forfeits a paused match', async () => {
    const { host, matchId, hostSock } = await pausedForOpponent();
    hostSock.clear();
    await host.handleIntent({
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'pid_host',
      intent: { kind: 'ForfeitMatch' },
    });
    expect(kindsOf(hostSock)).toContain('MatchResumed');
    expect(host.isPausedForReconnect()).toBe(false);
  });

  it('keeps the match paused when a non-host forfeit is refused', async () => {
    const { host, matchId, store, hostSock } = await pausedForOpponent();
    hostSock.clear();
    const refused = await host.handleIntent({
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'pid_opp',
      intent: { kind: 'ForfeitMatch' },
    });
    expect(refused).toEqual([
      expect.objectContaining({ kind: 'Error', code: 'AUTH_REJECTED' }),
    ]);
    expect(host.isPausedForReconnect()).toBe(true);
    expect(kindsOf(hostSock)).not.toContain('MatchResumed');
    const events = await store.getEvents(matchId);
    const advance = await host.handleIntent({
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'pid_host',
      intent: { kind: 'AdvancePhase' },
    });
    expect(advance).toEqual([
      expect.objectContaining({
        kind: 'Error',
        code: 'MATCH_PAUSED',
        reason: 'Match is paused waiting for a peer to reconnect',
      }),
    ]);
    expect(await store.getEvents(matchId)).toEqual(events);
    await host.closeMatch();
  });
});
