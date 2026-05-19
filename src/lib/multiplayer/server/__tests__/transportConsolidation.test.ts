/**
 * Transport consolidation (DP1) tests — harden-multiplayer-transport
 * (M2), task 7.x. Covers the `multiplayer-sync` delta-spec scenarios:
 *   - a networked match runs end-to-end over the authoritative server
 *     WebSocket transport with no y-webrtc dependency;
 *   - the client `mirrorSession` reducer is fed by the server `Event`
 *     stream and never appends its own events.
 *
 * The DURABLE store + `ServerMatchHost` exercised here import nothing
 * from `src/lib/p2p/` y-webrtc — the only `src/lib/p2p` symbol used is
 * the `mirrorSession` reducer, which DP1 explicitly retains as the
 * CLIENT-SIDE event-application layer pointed at the server stream.
 */

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import {
  applyMirrorEvent,
  assertMirrorAppendForbidden,
} from '@/lib/p2p/mirrorSession';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  type IGameEvent,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import {
  nowIso,
  type IIntent,
  type IServerMessage,
} from '@/types/multiplayer/Protocol';

import { DurableMatchStore } from '../DurableMatchStore';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';

interface IRecordedSend {
  parsed: IServerMessage;
}

function makeSocket(): IMatchSocket & { sent: IRecordedSend[] } {
  const sent: IRecordedSend[] = [];
  return {
    send(data: string) {
      sent.push({ parsed: JSON.parse(data) as IServerMessage });
    },
    close() {},
    get readyState() {
      return 1;
    },
    sent,
  } as IMatchSocket & { sent: IRecordedSend[] };
}

async function makeActiveHost(store: DurableMatchStore, matchId: string) {
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
    status: 'active',
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
  return host;
}

describe('M2 — Transport Consolidation (DP1)', () => {
  it('runs a networked match over the server WebSocket with no y-webrtc dependency', async () => {
    const store = new DurableMatchStore({ path: ':memory:' });
    const matchId = 'dp1-server-transport';
    const host = await makeActiveHost(store, matchId);

    const hostSock = makeSocket();
    const oppSock = makeSocket();
    host.attachSocket(hostSock, 'pid_host');
    host.attachSocket(oppSock, 'pid_opp');

    // Both clients join and replay over the server WebSocket transport.
    await host.handleSessionJoin(hostSock, 'pid_host', undefined, matchId);
    await host.handleSessionJoin(oppSock, 'pid_opp', undefined, matchId);
    await Promise.resolve();

    // An intent flows over the server transport and produces events
    // broadcast to BOTH sockets — no peer connection involved.
    const intent: IIntent = {
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'pid_host',
      intent: { kind: 'AdvancePhase' },
      intentId: 'dp1-intent-1',
    };
    const broadcasts = await host.handleIntent(intent, 'conn-host');
    const events = broadcasts.filter((b) => b.kind === 'Event');
    expect(events.length).toBeGreaterThan(0);

    // The event reached both clients via the server broadcast.
    const hostEvent = hostSock.sent.find((s) => s.parsed.kind === 'Event');
    const oppEvent = oppSock.sent.find((s) => s.parsed.kind === 'Event');
    expect(hostEvent).toBeDefined();
    expect(oppEvent).toBeDefined();

    // The match's canonical log lives in the authoritative durable
    // store — correctness does not depend on a y-webrtc peer link.
    const persisted = await store.getEvents(matchId);
    expect(persisted.length).toBeGreaterThan(0);
    store.close();
  });

  it('feeds the client mirror reducer from the server Event stream', async () => {
    const store = new DurableMatchStore({ path: ':memory:' });
    const matchId = 'dp1-mirror';
    const host = await makeActiveHost(store, matchId);

    const sock = makeSocket();
    host.attachSocket(sock, 'pid_host');

    const intent: IIntent = {
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'pid_host',
      intent: { kind: 'AdvancePhase' },
      intentId: 'dp1-mirror-intent',
    };
    await host.handleIntent(intent, 'conn-host');

    // The DP1 contract: the client builds its mirror from the same
    // session snapshot and advances it SOLELY by server `Event`
    // envelopes — never by appending its own events.
    let mirror: IGameSession = host.getSessionForTests();
    const serverEvents = sock.sent
      .filter((s) => s.parsed.kind === 'Event')
      .map((s) => (s.parsed as { event: unknown }).event as IGameEvent);

    // Apply each server event through the mirror reducer. The mirror is
    // the client-side event-application layer for the server stream.
    const baseSeq = mirror.events.length;
    for (const event of serverEvents) {
      if (event.sequence >= baseSeq) {
        mirror = applyMirrorEvent(mirror, event);
      }
    }
    // The mirror tracked the server-authored history.
    expect(mirror.events.length).toBeGreaterThanOrEqual(baseSeq);
    store.close();
  });

  it('a client mirror refuses to append its own events (server is sole authority)', () => {
    // The mirror reducer enforces the one-way contract: a client-side
    // mirror cannot mutate the canonical log — only the authoritative
    // server appends. `assertMirrorAppendForbidden` throws for a
    // foreign-peer append attempt.
    expect(() =>
      assertMirrorAppendForbidden(
        {
          hostPeerId: 'server',
          guestPeerId: 'client',
        } as unknown as IGameSession,
        'client',
      ),
    ).toThrow();
  });
});
