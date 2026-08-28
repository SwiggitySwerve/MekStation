/**
 * A player with two attached sockets must consume ONE delivery number
 * per frame, not one per socket.
 *
 * `broadcastEvent` walks attached sockets. `ViewerDeliveryCursors.assign`
 * is keyed per player and appends one entry per call. Before this, a
 * two-socket player was assigned twice for the same frame: socket A
 * was told delivery N, socket B was told N+1, and the durable record
 * held two entries for one authority event. A later resume via
 * `firstMissedAuthoritySequence` then walked a corrupted record.
 *
 * Viewer lookup is already cached by playerId so two sockets of one
 * player resolve once. Numbering must follow the same rule.
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

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { ServerMatchHost } from '../ServerMatchHost';

const MATCH = 'm-multisocket-delivery';

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

/** Authority sequences a socket was sent, live or replayed. */
function deliveredEvents(socket: { sent: unknown[] }): {
  sequence: number;
  deliverySequence?: number;
}[] {
  const out: { sequence: number; deliverySequence?: number }[] = [];
  for (const raw of socket.sent as {
    kind?: string;
    event?: { sequence: number };
    events?: { sequence: number }[];
    deliverySequence?: number;
  }[]) {
    if (raw?.kind === 'Event' && raw.event !== undefined) {
      out.push({
        sequence: raw.event.sequence,
        deliverySequence: raw.deliverySequence,
      });
      continue;
    }
    if (raw?.kind === 'ReplayChunk' && Array.isArray(raw.events)) {
      for (const event of raw.events) {
        out.push({ sequence: (event as { sequence: number }).sequence });
      }
    }
  }
  return out;
}

/** Two seated humans; pA is attached on TWO sockets. */
async function seatedHostWithTwoSockets() {
  const store = new InMemoryMatchStore({ quiet: true });
  const now = new Date().toISOString();
  await store.createMatch({
    matchId: MATCH,
    hostPlayerId: 'pA',
    playerIds: ['pA', 'pB'],
    sideAssignments: [
      { playerId: 'pA', side: 'player' },
      { playerId: 'pB', side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 6, turnLimit: 5 },
    layout: '1v1',
    seats: defaultSeats('1v1').map((seat) => {
      if (seat.slotId === 'alpha-1')
        return { ...seat, occupant: { playerId: 'pA', displayName: 'A' } };
      if (seat.slotId === 'bravo-1')
        return { ...seat, occupant: { playerId: 'pB', displayName: 'B' } };
      return seat;
    }),
    roomCode: 'MULTI1',
  });

  const host = ServerMatchHost.create(MATCH, store, {
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

  const sockA1 = makeSocket();
  const sockA2 = makeSocket();
  expect(await host.admitSocket(sockA1, 'pA')).not.toBeNull();
  expect(await host.admitSocket(sockA2, 'pA')).not.toBeNull();
  return { host, matchId: MATCH, sockA1, sockA2 };
}

async function advance(
  host: Awaited<ReturnType<typeof seatedHostWithTwoSockets>>['host'],
  n: number,
): Promise<void> {
  await host.handleIntent(
    {
      kind: 'Intent',
      matchId: MATCH,
      ts: nowIso(),
      playerId: 'pA',
      intentId: `adv-${n}`,
      intent: { kind: 'AdvancePhase' },
    } as unknown as IIntent,
    'conn-a',
    'pA',
  );
}

describe('broadcastEvent delivery numbering with two sockets per player', () => {
  it('gives both sockets the same deliverySequence for the same event', async () => {
    const { host, sockA1, sockA2 } = await seatedHostWithTwoSockets();
    await advance(host, 0);

    const liveA = deliveredEvents(sockA1);
    const liveB = deliveredEvents(sockA2);
    expect(liveA.length).toBeGreaterThan(0);
    expect(liveB.map((e) => e.sequence)).toEqual(liveA.map((e) => e.sequence));

    // The defect: socket B was told N+1 for the same frame socket A
    // was told N. They must share one number per authority event.
    expect(liveB.map((e) => e.deliverySequence)).toEqual(
      liveA.map((e) => e.deliverySequence),
    );
    expect(liveA.map((e) => e.deliverySequence)).toEqual(
      liveA.map((_, index) => index),
    );
  });

  it('advances the player cursor once per event so a resume starts at the missed frame', async () => {
    // After N events the durable record must have N entries, not 2N.
    // Quoting delivery cursor 0 ("I have frame 0, send me the rest")
    // must start replay at the SECOND live event. A doubled record
    // would answer with the first event again, because the second
    // entry is a duplicate of the first socket's assign.
    const { host, matchId, sockA1 } = await seatedHostWithTwoSockets();
    for (let n = 0; n < 3; n += 1) await advance(host, n);

    const live = deliveredEvents(sockA1);
    expect(live.length).toBeGreaterThan(1);
    expect(live[0]?.deliverySequence).toBe(0);

    const resumeSocket = makeSocket();
    await host.handleSessionJoin(
      resumeSocket as never,
      'pA',
      undefined,
      matchId,
      0,
    );

    const replayed = deliveredEvents(resumeSocket).map((e) => e.sequence);
    const firstMissing = live[1]?.sequence;
    expect(typeof firstMissing).toBe('number');
    expect(replayed[0]).toBe(firstMissing);
  });
});
