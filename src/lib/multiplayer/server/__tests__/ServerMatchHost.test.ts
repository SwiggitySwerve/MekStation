/**
 * ServerMatchHost integration test.
 *
 * Drives the host with a mock socket set, asserts intent dispatch +
 * broadcast + store write-through. Uses the same `createMinimalGrid`
 * helper as the engine tests so we exercise a real `InteractiveSession`
 * boot rather than a stub.
 */

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  GameEventType,
  type IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import { nowIso, type IIntent } from '@/types/multiplayer/Protocol';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';

// =============================================================================
// Test helpers
// =============================================================================

interface IRecordedSend {
  payload: string;
  parsed: { kind: string; matchId: string };
}

function makeMockSocket(): IMatchSocket & {
  sent: IRecordedSend[];
  closed: boolean;
} {
  const sent: IRecordedSend[] = [];
  let closed = false;
  return {
    send(data: string) {
      const parsed = JSON.parse(data) as { kind: string; matchId: string };
      sent.push({ payload: data, parsed });
    },
    close() {
      closed = true;
    },
    get readyState() {
      // 1 == OPEN in standard WebSocket spec
      return closed ? 3 : 1;
    },
    sent,
    get closed() {
      return closed;
    },
  } as IMatchSocket & { sent: IRecordedSend[]; closed: boolean };
}

async function makeHost(): Promise<{
  host: ServerMatchHost;
  store: InMemoryMatchStore;
}> {
  const store = new InMemoryMatchStore({ quiet: true });
  const matchId = 'match-test';
  const now = new Date().toISOString();
  await store.createMatch({
    matchId,
    hostPlayerId: 'p1',
    playerIds: ['p1'],
    sideAssignments: [{ playerId: 'p1', side: 'player' }],
    status: 'lobby',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
  });

  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(42),
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: [] as readonly IGameUnit[],
  });

  // Wait one microtask so the host's persistInitialEvents() has had a
  // chance to drain into the store.
  await Promise.resolve();
  await Promise.resolve();
  return { host, store };
}

// =============================================================================
// Tests
// =============================================================================

describe('ServerMatchHost', () => {
  it('persists initial GameCreated + GameStarted events on construction', async () => {
    const { host, store } = await makeHost();
    const events = await store.getEvents(host.matchId);
    const types = events.map((e) => e.type);
    expect(types).toContain(GameEventType.GameCreated);
    expect(types).toContain(GameEventType.GameStarted);
  });

  it('attachSocket + sendReplay sends ReplayStart, Chunk, End', async () => {
    const { host } = await makeHost();
    const socket = makeMockSocket();
    host.attachSocket(socket, 'p1');
    await host.sendReplay(socket);

    const kinds = socket.sent.map((s) => s.parsed.kind);
    expect(kinds[0]).toBe('ReplayStart');
    expect(kinds).toContain('ReplayEnd');
    // Should have at least one chunk for the initial events.
    expect(kinds).toContain('ReplayChunk');
  });

  it('handleIntent broadcasts new events to all sockets', async () => {
    const { host, store } = await makeHost();
    const a = makeMockSocket();
    const b = makeMockSocket();
    host.attachSocket(a, 'p1');
    host.attachSocket(b, 'p1');

    // Concede triggers GameEnded + outcome publish.
    const intent: IIntent = {
      kind: 'Intent',
      matchId: host.matchId,
      ts: nowIso(),
      playerId: 'p1',
      intent: { kind: 'Concede', side: 'player' },
    };
    const broadcasts = await host.handleIntent(intent);

    // The engine should have produced at least one event (GameEnded).
    expect(broadcasts.length).toBeGreaterThan(0);
    const aKinds = a.sent.map((s) => s.parsed.kind);
    const bKinds = b.sent.map((s) => s.parsed.kind);
    expect(aKinds).toContain('Event');
    expect(bKinds).toContain('Event');

    // Store now contains a GameEnded.
    const events = await store.getEvents(host.matchId);
    expect(events.some((e) => e.type === GameEventType.GameEnded)).toBe(true);
  });

  it('detachSocket removes the socket and stops broadcasting to it', async () => {
    const { host } = await makeHost();
    const a = makeMockSocket();
    const b = makeMockSocket();
    host.attachSocket(a, 'p1');
    host.attachSocket(b, 'p1');
    expect(host.socketCount()).toBe(2);

    host.detachSocket(a);
    expect(host.socketCount()).toBe(1);

    await host.handleIntent({
      kind: 'Intent',
      matchId: host.matchId,
      ts: nowIso(),
      playerId: 'p1',
      intent: { kind: 'Concede', side: GameSide.Player },
    });

    const aBroadcasts = a.sent.filter((s) => s.parsed.kind === 'Event');
    const bBroadcasts = b.sent.filter((s) => s.parsed.kind === 'Event');
    expect(aBroadcasts.length).toBe(0);
    expect(bBroadcasts.length).toBeGreaterThan(0);
  });

  it('closeMatch terminates the host and the store', async () => {
    const { host, store } = await makeHost();
    const socket = makeMockSocket();
    host.attachSocket(socket, 'p1');
    await host.closeMatch();
    expect(host.isClosed()).toBe(true);
    const meta = await store.getMatchMeta(host.matchId);
    expect(meta.status).toBe('completed');
    // The socket should have received a Close envelope.
    const kinds = socket.sent.map((s) => s.parsed.kind);
    expect(kinds).toContain('Close');
  });

  it('rejects intents after match is closed with UNKNOWN_MATCH error', async () => {
    const { host } = await makeHost();
    await host.closeMatch();
    const broadcasts = await host.handleIntent({
      kind: 'Intent',
      matchId: host.matchId,
      ts: nowIso(),
      playerId: 'p1',
      intent: { kind: 'AdvancePhase' },
    });
    expect(broadcasts.length).toBe(1);
    expect(broadcasts[0].kind).toBe('Error');
    if (broadcasts[0].kind === 'Error') {
      expect(broadcasts[0].code).toBe('UNKNOWN_MATCH');
    }
  });
});
