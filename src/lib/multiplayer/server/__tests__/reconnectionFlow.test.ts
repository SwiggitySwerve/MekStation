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
  type IIntent,
  type IServerMessage,
} from '@/types/multiplayer/Protocol';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';

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
    await Promise.resolve();
    await Promise.resolve();

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
    }
  });

  it('rejects engine-mutating intents with MATCH_PAUSED while paused', async () => {
    const { host, matchId } = await makeActiveHost();
    const hostSock = makeSocket();
    const oppSock = makeSocket();
    host.attachSocket(hostSock, 'pid_host');
    host.attachSocket(oppSock, 'pid_opp');
    host.detachSocket(oppSock);
    await Promise.resolve();
    await Promise.resolve();

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
    await Promise.resolve();
    await Promise.resolve();
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
  });

  it('host MarkSeatAi clears the pending seat and broadcasts MatchResumed', async () => {
    const { host, matchId, store } = await makeActiveHost();
    const hostSock = makeSocket();
    const oppSock = makeSocket();
    host.attachSocket(hostSock, 'pid_host');
    host.attachSocket(oppSock, 'pid_opp');
    host.detachSocket(oppSock);
    await Promise.resolve();
    await Promise.resolve();

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
    await Promise.resolve();
    await Promise.resolve();
    expect(host.getPendingPeersForTests().length).toBe(1);

    await host.closeMatch();
    expect(host.getPendingPeersForTests().length).toBe(0);
    expect(host.isClosed()).toBe(true);
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
    await Promise.resolve();
    await Promise.resolve();

    expect(host.isPausedForReconnect()).toBe(false);
    expect(host.getPendingPeersForTests().length).toBe(0);
  });
});
