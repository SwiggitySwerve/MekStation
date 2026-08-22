/**
 * SessionJoin publication adoption (authority-audit PR 8).
 *
 * Pins: baseline + replay frames match store contents for an admitted
 * member, and viewer-resolution failure produces a typed Close with no
 * baseline or replay frames.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/gm-authority-redaction/spec.md
 */

import type { IGameUnit } from '@/types/gameplay';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { defaultSeats } from '@/types/multiplayer/Lobby';

import { InMemoryMatchStore } from '../../InMemoryMatchStore';
import { ServerMatchHost, type IMatchSocket } from '../../ServerMatchHost';

interface IRecorded {
  parsed: IServerMessage;
}

/** Records outbound frames and close() for join proofs. */
function makeMockSocket(): IMatchSocket & {
  sent: IRecorded[];
  closed: boolean;
} {
  const sent: IRecorded[] = [];
  const socket = {
    send(data: string) {
      sent.push({ parsed: JSON.parse(data) as IServerMessage });
    },
    close() {
      socket.closed = true;
    },
    get readyState() {
      return 1;
    },
    sent,
    closed: false,
  } as IMatchSocket & { sent: IRecorded[]; closed: boolean };
  return socket;
}

/** Real host with both 1v1 seats occupied. */
async function makeSeatedHost(): Promise<{
  host: ServerMatchHost;
  store: InMemoryMatchStore;
  matchId: string;
}> {
  const store = new InMemoryMatchStore({ quiet: true });
  const matchId = 'match-publication-join';
  const now = '2026-08-21T23:00:00.000Z';
  await store.createMatch({
    matchId,
    hostPlayerId: 'pid_host',
    playerIds: ['pid_host', 'pid_guest'],
    sideAssignments: [
      { playerId: 'pid_host', side: 'player' },
      { playerId: 'pid_guest', side: 'opponent' },
    ],
    status: 'lobby',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
    layout: '1v1',
    seats: defaultSeats('1v1').map((seat) => {
      if (seat.slotId === 'alpha-1') {
        return {
          ...seat,
          occupant: { playerId: 'pid_host', displayName: 'Host' },
        };
      }
      if (seat.slotId === 'bravo-1') {
        return {
          ...seat,
          occupant: { playerId: 'pid_guest', displayName: 'Guest' },
        };
      }
      return seat;
    }),
    roomCode: 'JOINPUB',
  });
  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(13),
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: [] as readonly IGameUnit[],
  });
  await Promise.resolve();
  await Promise.resolve();
  return { host, store, matchId };
}

describe('viewer publication SessionJoin', () => {
  it('replays the same store events the member would have received before adoption', async () => {
    const { host, store, matchId } = await makeSeatedHost();
    const socket = makeMockSocket();
    expect(await host.admitSocket(socket, 'pid_guest')).not.toBeNull();
    socket.sent.length = 0;

    await host.handleSessionJoin(socket, 'pid_guest');

    const kinds = socket.sent.map((row) => row.parsed.kind);
    expect(kinds[0]).toBe('ReplayStart');
    expect(kinds).toContain('ReplayChunk');
    expect(kinds).toContain('ReplayEnd');

    const storeEvents = await store.getEvents(matchId, 0);
    const received: IGameEvent[] = [];
    for (const row of socket.sent) {
      if (row.parsed.kind === 'ReplayChunk') {
        for (const event of row.parsed.events) {
          received.push(event as IGameEvent);
        }
      }
    }
    expect(received).toEqual(storeEvents);
    const start = socket.sent[0]?.parsed;
    if (start?.kind === 'ReplayStart') {
      expect(start.totalEvents).toBe(storeEvents.length);
      expect(start.fromSeq).toBe(0);
    }
  });

  it('closes join without baseline or replay when viewer resolution fails', async () => {
    const { host } = await makeSeatedHost();
    const socket = makeMockSocket();
    host.attachSocket(socket, 'pid_stranger');

    await host.handleSessionJoin(socket, 'pid_stranger');

    const kinds = socket.sent.map((row) => row.parsed.kind);
    expect(kinds).toEqual(['Close']);
    expect(socket.sent[0]?.parsed.kind).toBe('Close');
    if (socket.sent[0]?.parsed.kind === 'Close') {
      // A stranger is an authorization REFUSAL, not a server fault
      // (PR 2/3 auth-vs-infra split).
      expect(socket.sent[0].parsed.code).toBe('AUTH_REJECTED');
    }
    expect(kinds).not.toContain('ReplayStart');
    expect(kinds).not.toContain('ReplayChunk');
    expect(kinds).not.toContain('ReplayEnd');
    expect(kinds).not.toContain('LobbyUpdated');
    expect(kinds).not.toContain('Event');
  });

  it('a broken membership store closes join with INTERNAL_ERROR, never an auth verdict', async () => {
    const { host, store } = await makeSeatedHost();
    const socket = makeMockSocket();
    host.attachSocket(socket, 'pid_host');
    const originalGet = store.getMatchMeta.bind(store);
    store.getMatchMeta = async () => {
      throw new Error('disk exploded');
    };
    await host.handleSessionJoin(socket, 'pid_host');
    store.getMatchMeta = originalGet;
    expect(socket.sent).toHaveLength(1);
    const frame = socket.sent[0]?.parsed;
    expect(frame?.kind).toBe('Close');
    if (frame?.kind === 'Close') {
      expect(frame.code).toBe('INTERNAL_ERROR');
    }
  });
});
