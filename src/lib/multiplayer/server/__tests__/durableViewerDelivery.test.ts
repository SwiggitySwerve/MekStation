/**
 * Durable per-viewer delivery mapping (leaf 3.1).
 *
 * The in-memory record (`ViewerDeliveryCursors`) is the mapping a
 * reconnecting player quotes. Until this slice it died with the
 * process, so a post-restart SessionJoin fell back to a full replay.
 * These rows pin the store-backed survival of that same record:
 * restart resumes from the first missed frame, a viewer with no rows
 * still starts at 0, write-through matches the in-memory slots
 * including send-failure (-1), and a store without the port stays
 * byte-identical to today.
 */

import type { IAdaptedUnit } from '@/engine/types';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  type IGameUnit,
} from '@/types/gameplay';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import { type IIntent, nowIso } from '@/types/multiplayer/Protocol';

import { DurableMatchStore } from '../DurableMatchStore';
import {
  hasViewerDeliveryStore,
  type IMatchMeta,
  type IViewerDeliveryRecord,
} from '../IMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { recoverActiveMatches } from '../MatchRecovery';
import { ViewerDeliveryCursors } from '../projection/ViewerDeliveryCursors';
import { ServerMatchHost } from '../ServerMatchHost';

function adapted(
  id: string,
  side: GameSide,
  position: { q: number; r: number },
): IAdaptedUnit {
  return {
    id,
    side,
    position,
    facing: side === GameSide.Player ? Facing.North : Facing.South,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 31,
      left_torso: 22,
      right_torso: 22,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    structure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  } as unknown as IAdaptedUnit;
}

function gameUnit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: 'default',
    gunnery: 4,
    piloting: 5,
  };
}

function makeSocket() {
  const sent: unknown[] = [];
  return {
    send(data: string) {
      sent.push(JSON.parse(data));
    },
    close() {},
    readyState: 1,
    sent,
  };
}

function deliveredEvents(socket: { sent: unknown[] }): {
  sequence?: number;
  deliverySequence?: number;
  id?: string;
}[] {
  const out: {
    sequence?: number;
    deliverySequence?: number;
    id?: string;
  }[] = [];
  for (const raw of socket.sent as {
    kind?: string;
    event?: { sequence?: number; id?: string };
    events?: { sequence?: number; id?: string }[];
    deliverySequence?: number;
    deliverySequences?: number[];
  }[]) {
    if (raw?.kind === 'Event' && raw.event !== undefined) {
      out.push({
        sequence: raw.event.sequence,
        deliverySequence: raw.deliverySequence,
        id: raw.event.id,
      });
      continue;
    }
    if (raw?.kind === 'ReplayChunk' && Array.isArray(raw.events)) {
      for (let index = 0; index < raw.events.length; index += 1) {
        const event = raw.events[index];
        out.push({
          sequence: event.sequence,
          deliverySequence: raw.deliverySequences?.[index],
          id: event.id,
        });
      }
    }
  }
  return out;
}

function matchMeta(matchId: string, hostPlayerId = 'pA'): IMatchMeta {
  const now = new Date().toISOString();
  return {
    matchId,
    hostPlayerId,
    playerIds: [hostPlayerId, 'pB'],
    sideAssignments: [
      { playerId: hostPlayerId, side: 'player' },
      { playerId: 'pB', side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 6, turnLimit: 5 },
    layout: '1v1',
    seats: defaultSeats('1v1').map((seat) => {
      if (seat.slotId === 'alpha-1') {
        return {
          ...seat,
          occupant: { playerId: hostPlayerId, displayName: 'A' },
        };
      }
      if (seat.slotId === 'bravo-1') {
        return { ...seat, occupant: { playerId: 'pB', displayName: 'B' } };
      }
      return seat;
    }),
    roomCode: matchId.slice(0, 6).toUpperCase(),
  };
}

async function seatedDurableHost(matchId: string, store: DurableMatchStore) {
  await store.createMatch(matchMeta(matchId));
  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 6,
    turnLimit: 5,
    random: new SeededRandom(9),
    grid: createMinimalGrid(6),
    playerUnits: [adapted('unit-A', GameSide.Player, { q: 0, r: 0 })],
    opponentUnits: [adapted('unit-foe', GameSide.Opponent, { q: 0, r: 3 })],
    gameUnits: [
      gameUnit('unit-A', GameSide.Player),
      gameUnit('unit-foe', GameSide.Opponent),
    ],
    diceSeed: 9,
  });
  await Promise.resolve();
  await Promise.resolve();
  const sockA = makeSocket();
  expect(await host.admitSocket(sockA, 'pA')).not.toBeNull();
  return { host, sockA };
}

async function advance(
  host: ServerMatchHost,
  matchId: string,
  n: number,
): Promise<void> {
  await host.handleIntent(
    {
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'pA',
      intentId: `adv-${matchId}-${n}`,
      intent: { kind: 'AdvancePhase' },
    } as unknown as IIntent,
    'conn-a',
    'pA',
  );
}

function persistThroughAssign(
  store: DurableMatchStore,
  matchId: string,
): ViewerDeliveryCursors {
  const cursors = new ViewerDeliveryCursors(
    (playerId, deliverySequence, authoritySequence) => {
      void store.appendViewerDeliveryRecord({
        matchId,
        playerId,
        deliverySequence,
        authoritySequence,
      });
    },
  );
  return cursors;
}

describe('durable viewer delivery mapping', () => {
  let store: DurableMatchStore;

  beforeEach(() => {
    store = new DurableMatchStore({ path: ':memory:' });
  });

  afterEach(() => {
    store.close();
  });

  it('replays the first missed frame after a host rebuild, not from zero', async () => {
    const matchId = 'm-durable-resume';
    const otherId = 'm-durable-other';
    const { host, sockA } = await seatedDurableHost(matchId, store);
    for (let n = 0; n < 3; n += 1) await advance(host, matchId, n);

    const live = deliveredEvents(sockA);
    expect(live.length).toBeGreaterThan(1);

    // A second match with the same player id: loading its rows for
    // matchId would shift the resume start (mutation M2).
    const other = await seatedDurableHost(otherId, store);
    for (let n = 0; n < 5; n += 1) await advance(other.host, otherId, n);

    const rebuilt = await recoverActiveMatches(store);
    const recovered = rebuilt.hosts.get(matchId);
    expect(recovered).toBeDefined();

    const resumeSocket = makeSocket();
    expect(await recovered!.admitSocket(resumeSocket, 'pA')).not.toBeNull();
    await recovered!.handleSessionJoin(
      resumeSocket as never,
      'pA',
      undefined,
      matchId,
      0,
    );

    const replayed = deliveredEvents(resumeSocket);
    expect(replayed[0]?.id).toBe(live[1]?.id);
    expect(replayed[0]?.id).not.toBe(live[0]?.id);
    expect(replayed[0]?.sequence).toBe(live[1]?.sequence);
  });

  it('still full-replays from 0 for a viewer with no persisted rows on a rebuilt host', async () => {
    const matchId = 'm-durable-fallback';
    const { host } = await seatedDurableHost(matchId, store);
    await advance(host, matchId, 0);

    const rebuilt = await recoverActiveMatches(store);
    const recovered = rebuilt.hosts.get(matchId);
    expect(recovered).toBeDefined();

    const cold = makeSocket();
    expect(await recovered!.admitSocket(cold, 'pB')).not.toBeNull();
    await recovered!.handleSessionJoin(
      cold as never,
      'pB',
      undefined,
      matchId,
      7,
    );

    const seqs = deliveredEvents(cold).map((e) => e.deliverySequence ?? -1);
    expect(seqs.length).toBeGreaterThan(0);
    expect(Math.min(...seqs)).toBe(0);
  });

  it('persists the in-memory record exactly, including a send-failure slot', async () => {
    const matchId = 'm-durable-shape';
    await store.createMatch(matchMeta(matchId));
    expect(hasViewerDeliveryStore(store)).toBe(true);

    const cursors = persistThroughAssign(store, matchId);
    expect(cursors.assign('p1', 2)).toBe(0);
    expect(cursors.assign('p1', null)).toBe(1);
    expect(cursors.assign('p1', 7)).toBe(2);

    const rows = await store.listViewerDeliveryRecords(matchId);
    const expected: readonly IViewerDeliveryRecord[] = [
      {
        matchId,
        playerId: 'p1',
        deliverySequence: 0,
        authoritySequence: 2,
      },
      {
        matchId,
        playerId: 'p1',
        deliverySequence: 1,
        authoritySequence: -1,
      },
      {
        matchId,
        playerId: 'p1',
        deliverySequence: 2,
        authoritySequence: 7,
      },
    ];
    expect(rows).toEqual(expected);

    const reloaded = new ViewerDeliveryCursors();
    reloaded.loadFromRecords(rows);
    expect(reloaded.issued('p1')).toBe(3);
    expect(reloaded.firstMissedAuthoritySequence('p1', 1)).toBe(7);
  });

  it('does not throw or write rows when the store has no delivery port', async () => {
    const memory = new InMemoryMatchStore({ quiet: true });
    expect(hasViewerDeliveryStore(memory)).toBe(false);

    const cursors = new ViewerDeliveryCursors();
    expect(() => cursors.assign('p1', 4)).not.toThrow();
    expect(cursors.issued('p1')).toBe(1);
    expect(cursors.firstMissedAuthoritySequence('p1', 0)).toBeNull();
  });

  it('does not let a persist throw fail or reorder assign', () => {
    const cursors = new ViewerDeliveryCursors(() => {
      throw new Error('disk full');
    });
    expect(cursors.assign('p1', 2)).toBe(0);
    expect(cursors.assign('p1', null)).toBe(1);
    expect(cursors.assign('p1', 9)).toBe(2);
    expect(cursors.issued('p1')).toBe(3);
    expect(cursors.firstMissedAuthoritySequence('p1', 0)).toBe(9);
  });

  it('pins the delivery-record primary key and match isolation', async () => {
    const matchId = 'm-durable-pk';
    await store.createMatch(matchMeta(matchId));
    await store.createMatch(matchMeta('m-durable-pk-b', 'pA'));

    await store.appendViewerDeliveryRecord({
      matchId,
      playerId: 'p1',
      deliverySequence: 0,
      authoritySequence: 4,
    });
    await expect(
      store.appendViewerDeliveryRecord({
        matchId,
        playerId: 'p1',
        deliverySequence: 0,
        authoritySequence: 99,
      }),
    ).rejects.toThrow();

    const rows = await store.listViewerDeliveryRecords(matchId);
    expect(rows).toEqual([
      {
        matchId,
        playerId: 'p1',
        deliverySequence: 0,
        authoritySequence: 4,
      },
    ]);
    expect(await store.listViewerDeliveryRecords('m-durable-pk-b')).toEqual([]);
  });
});
