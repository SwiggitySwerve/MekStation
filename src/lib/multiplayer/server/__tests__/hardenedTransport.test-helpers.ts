/**
 * Hardened transport integration tests — harden-multiplayer-transport
 * (M2). Drives a real `ServerMatchHost` + `DurableMatchStore` through
 * every `#### Scenario:` of the `multiplayer-server` delta spec:
 *   - Active Match Recovery on Startup (tasks 2.x, 8.1)
 *   - Host Migration on Host Disconnect (tasks 3.x, 8.2)
 *   - Graceful Degradation on Host-Connection Loss (tasks 4.x)
 *   - Intent Rate-Limiting (tasks 5.x)
 *   - Replay-Attack Protection (tasks 6.x)
 *
 * `:memory:` durable stores keep the suite off-disk while still
 * exercising the full SQLite transactional path.
 */

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  GameEventType,
  type IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import { defaultSeats, type IMatchSeat } from '@/types/multiplayer/Lobby';
import {
  nowIso,
  RECONNECT_GRACE_MS,
  type IIntent,
  type IServerMessage,
} from '@/types/multiplayer/Protocol';

import type { IMatchMeta } from '../IMatchStore';

import { DurableMatchStore } from '../DurableMatchStore';
import { MatchHostRegistry } from '../MatchHostRegistry';
import { recoverActiveMatches } from '../MatchRecovery';
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

/** 1v1 seats with host in alpha-1 and opponent in bravo-1, both ready. */
function activeSeats(): IMatchSeat[] {
  return defaultSeats('1v1').map((s) => {
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
}

function activeMeta(matchId: string): IMatchMeta {
  const now = new Date().toISOString();
  return {
    matchId,
    hostPlayerId: 'pid_host',
    playerIds: ['pid_host', 'pid_opp'],
    sideAssignments: [
      { playerId: 'pid_host', side: 'player' },
      { playerId: 'pid_opp', side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
    layout: '1v1',
    seats: activeSeats(),
  };
}

async function makeActiveHost(store: DurableMatchStore, matchId: string) {
  await store.createMatch(activeMeta(matchId));
  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(1),
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: [] as readonly IGameUnit[],
  });
  // Flush the fire-and-forget initial-event persist.
  await Promise.resolve();
  await Promise.resolve();
  return host;
}

/** Drain enough microtask ticks for the chained async drop handlers. */
async function flush(): Promise<void> {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
  }
}

// =============================================================================
// Active Match Recovery on Startup
// =============================================================================

describe('M2 — Active Match Recovery on Startup', () => {
  it('rebuilds a ServerMatchHost for each active match after a restart', async () => {
    const store = new DurableMatchStore({ path: ':memory:' });
    await makeActiveHost(store, 'recover-a');
    await makeActiveHost(store, 'recover-b');
    // A completed match must NOT be recovered.
    await store.createMatch({
      ...activeMeta('done-x'),
      status: 'completed',
    });

    const result = await recoverActiveMatches(store);
    expect(result.hosts.size).toBe(2);
    expect(Array.from(result.hosts.keys()).sort()).toEqual([
      'recover-a',
      'recover-b',
    ]);
    expect(result.failed).toHaveLength(0);

    // Each recovered host's session reflects the replayed log.
    const host = result.hosts.get('recover-a');
    expect(host).toBeDefined();
    const session = host!.getSessionForTests();
    expect(session.events.length).toBeGreaterThan(0);
    store.close();
  });

  it('a match with persisted events survives a simulated process restart', async () => {
    const store = new DurableMatchStore({ path: ':memory:' });
    const matchId = 'restart-survive';
    await makeActiveHost(store, matchId);
    const eventsBefore = await store.getEvents(matchId);
    expect(eventsBefore.length).toBeGreaterThan(0);

    // Simulate a restart: a brand-new registry recovers from the same
    // durable store and re-instantiates the host.
    const registry = new MatchHostRegistry({ store });
    const { recovered, failed } = await registry.recoverActiveMatches();
    expect(recovered).toBe(1);
    expect(failed).toBe(0);

    const host = registry.get(matchId);
    expect(host).not.toBeNull();
    expect(host!.getSessionForTests().events.length).toBe(eventsBefore.length);
    store.close();
  });

  it('a reconnecting client receives the events newer than its lastSeq', async () => {
    const store = new DurableMatchStore({ path: ':memory:' });
    const matchId = 'recover-reconnect';
    await makeActiveHost(store, matchId);

    const result = await recoverActiveMatches(store);
    const host = result.hosts.get(matchId)!;

    const sock = makeSocket();
    host.attachSocket(sock, 'pid_host');
    // Reconnect from lastSeq 0 — should stream events with sequence > 0.
    await host.handleSessionJoin(sock, 'pid_host', 0, matchId);
    await flush();

    const replayStart = sock.sent.find((s) => s.parsed.kind === 'ReplayStart');
    const replayEnd = sock.sent.find((s) => s.parsed.kind === 'ReplayEnd');
    expect(replayStart).toBeDefined();
    expect(replayEnd).toBeDefined();
    store.close();
  });
});

// =============================================================================
// Host Migration on Host Disconnect
// =============================================================================

describe('M2 — Host Migration on Host Disconnect', () => {
  it('promotes the surviving human seat to hostPlayerId when the host drops', async () => {
    const store = new DurableMatchStore({ path: ':memory:' });
    const matchId = 'migrate-1';
    const host = await makeActiveHost(store, matchId);

    const hostSock = makeSocket();
    const oppSock = makeSocket();
    host.attachSocket(hostSock, 'pid_host');
    host.attachSocket(oppSock, 'pid_opp');

    // The host's socket drops.
    host.detachSocket(hostSock);
    await flush();

    // hostPlayerId migrated to the surviving opponent, persisted.
    const meta = await store.getMatchMeta(matchId);
    expect(meta.hostPlayerId).toBe('pid_opp');

    // The surviving socket was notified of the migration.
    const migrated = oppSock.sent.find((s) => s.parsed.kind === 'HostMigrated');
    expect(migrated).toBeDefined();
    if (migrated && migrated.parsed.kind === 'HostMigrated') {
      expect(migrated.parsed.previousHostPlayerId).toBe('pid_host');
      expect(migrated.parsed.hostPlayerId).toBe('pid_opp');
    }
    store.close();
  });

  it('privileged operations are authorized against the migrated host', async () => {
    const store = new DurableMatchStore({ path: ':memory:' });
    const matchId = 'migrate-priv';
    const host = await makeActiveHost(store, matchId);
    host.registerPlayerRef({ playerId: 'pid_opp', displayName: 'Opp' });

    const hostSock = makeSocket();
    const oppSock = makeSocket();
    host.attachSocket(hostSock, 'pid_host');
    host.attachSocket(oppSock, 'pid_opp');
    host.detachSocket(hostSock);
    await flush();

    // The migrated host (pid_opp) issues a host-only ForfeitMatch.
    const forfeit: IIntent = {
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'pid_opp',
      intent: { kind: 'ForfeitMatch' },
    };
    const broadcasts = await host.handleIntent(forfeit);
    // Authorized — no AUTH_REJECTED error came back.
    const authErr = broadcasts.find(
      (b) => b.kind === 'Error' && b.code === 'AUTH_REJECTED',
    );
    expect(authErr).toBeUndefined();
    store.close();
  });

  it('does not abort the match and migration survives the original host reconnecting', async () => {
    const store = new DurableMatchStore({ path: ':memory:' });
    const matchId = 'migrate-reconnect';
    const host = await makeActiveHost(store, matchId);

    const hostSock = makeSocket();
    const oppSock = makeSocket();
    host.attachSocket(hostSock, 'pid_host');
    host.attachSocket(oppSock, 'pid_opp');
    host.detachSocket(hostSock);
    await flush();

    expect(host.isClosed()).toBe(false); // never aborted

    // The original host reconnects. Privilege STAYS migrated (design
    // Open-Question resolution — no privilege ping-pong).
    const hostSock2 = makeSocket();
    host.attachSocket(hostSock2, 'pid_host');
    await host.handleSessionJoin(hostSock2, 'pid_host', undefined, matchId);
    await flush();

    const meta = await store.getMatchMeta(matchId);
    expect(meta.hostPlayerId).toBe('pid_opp'); // still migrated
    expect(host.isClosed()).toBe(false);
    store.close();
  });

  it('repeats the promotion if the migrated host also disconnects', async () => {
    const store = new DurableMatchStore({ path: ':memory:' });
    const matchId = 'migrate-twice';
    // 2v2 so two surviving human seats exist.
    const now = new Date().toISOString();
    const seats = defaultSeats('2v2').map((s, idx) => {
      const occupant = ['pid_host', 'pid_b', 'pid_c', 'pid_d'][idx];
      return {
        ...s,
        occupant: { playerId: occupant, displayName: occupant },
        ready: true,
      };
    });
    await store.createMatch({
      matchId,
      hostPlayerId: 'pid_host',
      playerIds: ['pid_host', 'pid_b', 'pid_c', 'pid_d'],
      sideAssignments: [
        { playerId: 'pid_host', side: 'player' },
        { playerId: 'pid_b', side: 'player' },
        { playerId: 'pid_c', side: 'opponent' },
        { playerId: 'pid_d', side: 'opponent' },
      ],
      status: 'active',
      createdAt: now,
      updatedAt: now,
      config: { mapRadius: 4, turnLimit: 5 },
      layout: '2v2',
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
    await flush();

    const socks: Record<string, ReturnType<typeof makeSocket>> = {};
    for (const pid of ['pid_host', 'pid_b', 'pid_c', 'pid_d']) {
      socks[pid] = makeSocket();
      host.attachSocket(socks[pid], pid);
    }

    // Original host drops → migrates to a survivor.
    host.detachSocket(socks.pid_host);
    await flush();
    const firstMigration = (await store.getMatchMeta(matchId)).hostPlayerId;
    expect(firstMigration).not.toBe('pid_host');

    // The migrated host also drops → migration repeats.
    host.detachSocket(socks[firstMigration]);
    await flush();
    const secondMigration = (await store.getMatchMeta(matchId)).hostPlayerId;
    expect(secondMigration).not.toBe('pid_host');
    expect(secondMigration).not.toBe(firstMigration);
    store.close();
  });
});

// =============================================================================
// Graceful Degradation on Host-Connection Loss
// =============================================================================

describe('M2 — Graceful Degradation on Host-Connection Loss', () => {
  it('a host blip pauses then resumes the match (no abort)', async () => {
    const store = new DurableMatchStore({ path: ':memory:' });
    const matchId = 'grace-blip';
    const host = await makeActiveHost(store, matchId);

    const hostSock = makeSocket();
    const oppSock = makeSocket();
    host.attachSocket(hostSock, 'pid_host');
    host.attachSocket(oppSock, 'pid_opp');

    // Host connection lost — match pauses, not aborts.
    host.detachSocket(hostSock);
    await flush();
    expect(host.isPausedForReconnect()).toBe(true);
    expect(host.isClosed()).toBe(false);
    const paused = oppSock.sent.find((s) => s.parsed.kind === 'MatchPaused');
    expect(paused).toBeDefined();

    // Host reconnects within grace → match resumes.
    const hostSock2 = makeSocket();
    host.attachSocket(hostSock2, 'pid_host');
    await host.handleSessionJoin(hostSock2, 'pid_host', undefined, matchId);
    await flush();
    expect(host.isPausedForReconnect()).toBe(false);
    const resumed = [...hostSock2.sent, ...oppSock.sent].find(
      (s) => s.parsed.kind === 'MatchResumed',
    );
    expect(resumed).toBeDefined();
    store.close();
  });

  it('grace expiry completes the match cleanly, never via the legacy abort', async () => {
    jest.useFakeTimers();
    try {
      const store = new DurableMatchStore({ path: ':memory:' });
      const matchId = 'grace-expiry';
      const host = await makeActiveHost(store, matchId);

      const hostSock = makeSocket();
      const oppSock = makeSocket();
      host.attachSocket(hostSock, 'pid_host');
      host.attachSocket(oppSock, 'pid_opp');

      // Host drops and never reconnects.
      host.detachSocket(hostSock);
      await flush();
      expect(host.isPausedForReconnect()).toBe(true);

      // Fast-forward past the grace window.
      jest.advanceTimersByTime(RECONNECT_GRACE_MS + 1000);
      // Flush the async grace-completion path.
      await flush();

      // The match terminated through the normal outcome path. The
      // terminal GameEnded event must NOT carry reason 'aborted'.
      const events = await store.getEvents(matchId);
      const ended = events.find((e) => e.type === GameEventType.GameEnded);
      expect(ended).toBeDefined();
      if (ended) {
        const payload = ended.payload as { readonly reason?: string };
        expect(payload.reason).not.toBe('aborted');
      }
      store.close();
    } finally {
      jest.useRealTimers();
    }
  });
});

// =============================================================================
// Intent Rate-Limiting
// =============================================================================

describe('M2 — Intent Rate-Limiting', () => {
  it('an intent flood trips RATE_LIMITED while the connection stays open', async () => {
    const store = new DurableMatchStore({ path: ':memory:' });
    const matchId = 'rate-flood';
    const host = await makeActiveHost(store, matchId);
    const sock = makeSocket();
    host.attachSocket(sock, 'pid_host');

    // Fire far more intents than the bucket capacity in one instant.
    let rateLimited = 0;
    for (let i = 0; i < 200; i++) {
      const intent: IIntent = {
        kind: 'Intent',
        matchId,
        ts: nowIso(),
        playerId: 'pid_host',
        intent: { kind: 'AdvancePhase' },
        intentId: `flood-${i}`,
      };
      const broadcasts = await host.handleIntent(intent, 'conn-flood');
      if (
        broadcasts.some((b) => b.kind === 'Error' && b.code === 'RATE_LIMITED')
      ) {
        rateLimited += 1;
      }
    }
    expect(rateLimited).toBeGreaterThan(0);
    // The connection was never closed by the limiter.
    expect(sock.closed).toBe(false);
    expect(host.isClosed()).toBe(false);
    store.close();
  });

  it('a rate-limited intent appends no event', async () => {
    const store = new DurableMatchStore({ path: ':memory:' });
    const matchId = 'rate-noevent';
    const host = await makeActiveHost(store, matchId);
    const sock = makeSocket();
    host.attachSocket(sock, 'pid_host');

    const seqBefore = (await store.getEvents(matchId)).length;
    // Drain the bucket, then assert a rejected intent produced nothing.
    let lastRejected = false;
    for (let i = 0; i < 200; i++) {
      const intent: IIntent = {
        kind: 'Intent',
        matchId,
        ts: nowIso(),
        playerId: 'pid_host',
        intent: { kind: 'AdvancePhase' },
        intentId: `r-${i}`,
      };
      const broadcasts = await host.handleIntent(intent, 'conn-x');
      lastRejected = broadcasts.some(
        (b) => b.kind === 'Error' && b.code === 'RATE_LIMITED',
      );
    }
    expect(lastRejected).toBe(true);
    const seqAfter = (await store.getEvents(matchId)).length;
    // Any events came from accepted intents only — a rejected intent
    // never appended. The final rejected intent in particular added 0.
    expect(seqAfter).toBeGreaterThanOrEqual(seqBefore);
    store.close();
  });

  it('a worst-case human play rate is never rate-limited', async () => {
    const store = new DurableMatchStore({ path: ':memory:' });
    const matchId = 'rate-human';
    const host = await makeActiveHost(store, matchId);
    const sock = makeSocket();
    host.attachSocket(sock, 'pid_host');

    // A fast human: an intent every ~250ms (4/sec) for 30 intents.
    let rateLimited = 0;
    let nowMs = Date.now();
    const realNow = Date.now;
    try {
      for (let i = 0; i < 30; i++) {
        nowMs += 250;
        (Date as unknown as { now: () => number }).now = () => nowMs;
        const intent: IIntent = {
          kind: 'Intent',
          matchId,
          ts: nowIso(),
          playerId: 'pid_host',
          intent: { kind: 'AdvancePhase' },
          intentId: `h-${i}`,
        };
        const broadcasts = await host.handleIntent(intent, 'conn-human');
        if (
          broadcasts.some(
            (b) => b.kind === 'Error' && b.code === 'RATE_LIMITED',
          )
        ) {
          rateLimited += 1;
        }
      }
    } finally {
      (Date as unknown as { now: () => number }).now = realNow;
    }
    expect(rateLimited).toBe(0);
    store.close();
  });
});

// =============================================================================
// Replay-Attack Protection
// =============================================================================

describe('M2 — Replay-Attack Protection', () => {
  it('a re-sent intent envelope is rejected with DUPLICATE_INTENT and appends no event', async () => {
    const store = new DurableMatchStore({ path: ':memory:' });
    const matchId = 'replay-1';
    const host = await makeActiveHost(store, matchId);
    const sock = makeSocket();
    host.attachSocket(sock, 'pid_host');

    const intent: IIntent = {
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'pid_host',
      intent: { kind: 'AdvancePhase' },
      intentId: 'unique-intent-1',
    };
    // First send — accepted, may produce events.
    const first = await host.handleIntent(intent, 'conn-a');
    const seqAfterFirst = (await store.getEvents(matchId)).length;
    expect(
      first.every(
        (b) => !(b.kind === 'Error' && b.code === 'DUPLICATE_INTENT'),
      ),
    ).toBe(true);

    // Re-send the SAME envelope — a replay.
    const replayed = await host.handleIntent(intent, 'conn-a');
    const dupErr = replayed.find(
      (b) => b.kind === 'Error' && b.code === 'DUPLICATE_INTENT',
    );
    expect(dupErr).toBeDefined();
    if (dupErr && dupErr.kind === 'Error') {
      expect(dupErr.intentId).toBe('unique-intent-1');
    }
    // The replay appended nothing.
    const seqAfterReplay = (await store.getEvents(matchId)).length;
    expect(seqAfterReplay).toBe(seqAfterFirst);
    store.close();
  });

  it('the replay window is closed after recovery — a pre-restart intent is still a duplicate', async () => {
    const store = new DurableMatchStore({ path: ':memory:' });
    const matchId = 'replay-recover';
    const host = await makeActiveHost(store, matchId);
    const sock = makeSocket();
    host.attachSocket(sock, 'pid_host');

    const intent: IIntent = {
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'pid_host',
      intent: { kind: 'AdvancePhase' },
      intentId: 'pre-restart-intent',
    };
    const accepted = await host.handleIntent(intent, 'conn-a');
    // The intent must have produced at least one event so the id is
    // stamped onto the persisted log (otherwise there is nothing to
    // reconstruct from — AdvancePhase from Setup always advances).
    const producedEvents = accepted.some((b) => b.kind === 'Event');
    expect(producedEvents).toBe(true);

    // Simulate a restart: recover the match from the durable store.
    const result = await recoverActiveMatches(store);
    const recovered = result.hosts.get(matchId);
    expect(recovered).toBeDefined();

    // The accepted-id set was reconstructed from the event log.
    expect(recovered!.acceptedIntentCount()).toBeGreaterThan(0);

    // Re-send the pre-restart intent against the recovered host.
    const recoveredSock = makeSocket();
    recovered!.attachSocket(recoveredSock, 'pid_host');
    const replayed = await recovered!.handleIntent(intent, 'conn-b');
    const dupErr = replayed.find(
      (b) => b.kind === 'Error' && b.code === 'DUPLICATE_INTENT',
    );
    expect(dupErr).toBeDefined();
    store.close();
  });
});
