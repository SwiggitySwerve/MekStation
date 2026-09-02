/**
 * The bounded queue, on the fact stream (E2E-14, finding #18).
 *
 * `MAX_BUFFERED_BYTES` was enforced in `ServerMatchBroadcaster.broadcast`
 * only. The per-viewer authorized event fan-out did not use it: it
 * resolves recipients from `lifecycle.attachedSockets()` and pushed each
 * frame with `broadcaster.safeSend`, which applies no cap and consults
 * no behind set. During a live match `broadcast` carries typed errors,
 * pause/resume and host migration - not the command traffic - so a
 * stalled viewer's buffer grew without limit and the viewer never
 * entered the behind state at all.
 *
 * These rows pin the bound where the facts actually flow, and pin the
 * recovery that makes the behind state RECOVERABLE rather than merely
 * silent. The numbering placement is the subtle half: a refusal is a
 * frame the viewer was OWED and lost, which per `ViewerDeliveryCursors`
 * must consume its delivery number so the hole is a true signal. The
 * resume row below is what proves it - move the check above `assign`
 * and the rejoin re-delivers frames the viewer already applied.
 *
 * WHY THE PROOF IS HERE AND NOT IN A BROWSER (finding #19). E2E-14 asks
 * for this behaviour against a real client, and that is not reachable at
 * match volume - measured, not assumed. `ws.bufferedAmount` is the Node
 * stream PENDING-WRITE backlog, not "bytes the client has not read", so
 * it stays at 0 until the OS send buffer refuses a write, which needs
 * O(100 KB) in flight. A turn-limited match puts roughly 37 frames /
 * ~17 KB on one socket. Measured in this harness: `bufferedAmount` was 0
 * on all 60 admission observations through a 45-second fully blocked
 * renderer and, separately, a 37-second ~1 KB/s CDP throttle left the
 * stalled client never behind, never reaped, and finally holding all 37
 * frames contiguously. Lowering the cap does not help - it compares
 * against zero. Closing E2E-14 honestly needs an APPLICATION-level
 * backlog bound (sent minus acknowledged over the existing DeliveryAck
 * stream), which is a design change with its own plan.
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
import { MAX_BUFFERED_BYTES } from '../ServerMatchBroadcaster';
import { ServerMatchHost } from '../ServerMatchHost';

const MATCH = 'm-backpressure-facts';

/** Minimal adapted unit; only identity and position matter here. */
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

/** Roster entry for a unit above. */
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

/**
 * A socket whose outbound buffer the test controls, so saturation is a
 * value this suite sets rather than a network condition it has to
 * produce. `bufferedAmount` is a getter because the broadcaster reads it
 * on every admission, and a row needs to change it mid-match.
 */
function makeSocket() {
  const socket = {
    sent: [] as unknown[],
    buffered: 0,
    send(data: string) {
      socket.sent.push(JSON.parse(data));
    },
    close() {},
    readyState: 1,
    get bufferedAmount() {
      return socket.buffered;
    },
  };
  return socket;
}

/**
 * The delivery sequences a socket was sent, live or replayed.
 *
 * Delivery numbers only: the authority sequence is deliberately absent
 * from a viewer's wire frames (concealing it is what stops a viewer
 * counting the events withheld from it), so the viewer's own numbering
 * is the only sequence there is to assert on.
 */
function deliveredSequences(socket: { sent: unknown[] }): number[] {
  const out: number[] = [];
  for (const raw of socket.sent as {
    kind?: string;
    event?: unknown;
    events?: unknown[];
    deliverySequence?: number;
    deliverySequences?: number[];
  }[]) {
    if (raw?.kind === 'Event' && raw.deliverySequence !== undefined) {
      out.push(raw.deliverySequence);
      continue;
    }
    if (raw?.kind === 'ReplayChunk' && Array.isArray(raw.deliverySequences)) {
      out.push(...raw.deliverySequences);
    }
  }
  return out;
}

/** Two seated humans, one socket each; pB is the one this suite stalls. */
async function seatedHost() {
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
    roomCode: 'BPRESS',
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

  const sockA = makeSocket();
  const sockB = makeSocket();
  expect(await host.admitSocket(sockA, 'pA')).not.toBeNull();
  expect(await host.admitSocket(sockB, 'pB')).not.toBeNull();
  return { host, sockA, sockB };
}

/** One phase advance driven by the host player. */
async function advance(
  host: Awaited<ReturnType<typeof seatedHost>>['host'],
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

describe('per-viewer fact fan-out honours the bounded queue', () => {
  it('refuses a saturated viewer while every healthy viewer keeps receiving', async () => {
    // The requirement in one row, on the stream that actually carries
    // the facts: one stalled consumer must not be handed more, and must
    // not cost anybody else a frame.
    const { host, sockA, sockB } = await seatedHost();
    await advance(host, 0);
    const healthyBefore = deliveredSequences(sockA).length;
    const stalledBefore = deliveredSequences(sockB).length;
    expect(healthyBefore).toBeGreaterThan(0);
    expect(stalledBefore).toBe(healthyBefore);

    sockB.buffered = MAX_BUFFERED_BYTES + 1;
    await advance(host, 1);
    await advance(host, 2);

    // The healthy viewer kept receiving...
    expect(deliveredSequences(sockA).length).toBeGreaterThan(healthyBefore);
    // ...and the stalled one received nothing further.
    expect(deliveredSequences(sockB).length).toBe(stalledBefore);
  });

  it('keeps the healthy viewer contiguous across the other viewer stall', async () => {
    // A refusal is per connection. It must not renumber, skip, or
    // duplicate anything in a different viewer's stream.
    const { host, sockA, sockB } = await seatedHost();
    await advance(host, 0);
    sockB.buffered = MAX_BUFFERED_BYTES + 1;
    await advance(host, 1);
    await advance(host, 2);

    const healthy = deliveredSequences(sockA);
    expect(healthy.length).toBeGreaterThan(1);
    expect(healthy).toEqual(healthy.map((_, index) => index));
  });

  it('stays behind after the buffer drains, so no viewer resumes mid-stream', async () => {
    // Recovering in place would leave a HOLE the viewer cannot see:
    // it would receive frame N+5 with nothing to tell it N+1..N+4 are
    // missing. The behind state is sticky until the connection is
    // reaped and the client rejoins.
    const { host, sockB } = await seatedHost();
    await advance(host, 0);
    const before = deliveredSequences(sockB).length;

    sockB.buffered = MAX_BUFFERED_BYTES + 1;
    await advance(host, 1);
    sockB.buffered = 0;
    await advance(host, 2);

    expect(deliveredSequences(sockB).length).toBe(before);
  });

  it('resumes a stalled viewer at the first frame it lacks, contiguously', async () => {
    // The row that makes the behind state RECOVERABLE, and the one that
    // pins WHERE the bound is applied. A refused frame was owed, so it
    // consumes its delivery number; the record's entry at `cursor + 1`
    // is therefore the first frame the viewer lacks, and the replay
    // hands it back under that same number. Move the check above
    // `assign` and this rejoin re-delivers frames the viewer already
    // applied - measured 15 frames of which 12 distinct - which the
    // no-duplicate assertion below is what catches.
    const { host, sockA, sockB } = await seatedHost();
    await advance(host, 0);

    const received = deliveredSequences(sockB);
    const lastHeld = received[received.length - 1];
    expect(typeof lastHeld).toBe('number');
    const healthyBefore = deliveredSequences(sockA).length;

    sockB.buffered = MAX_BUFFERED_BYTES + 1;
    await advance(host, 1);
    await advance(host, 2);

    // What pB was refused is what pA received meanwhile: no fog is
    // configured, so both viewers are owed the same authority stream.
    const missedCount = deliveredSequences(sockA).length - healthyBefore;
    expect(missedCount).toBeGreaterThan(0);

    // The reaped connection is replaced: the client rejoins quoting the
    // last delivery number it actually holds.
    const rejoined = makeSocket();
    await host.handleSessionJoin(
      rejoined as never,
      'pB',
      undefined,
      MATCH,
      lastHeld as number,
    );

    const replayed = deliveredSequences(rejoined);
    // Resumes at the FIRST frame the viewer lacks. Starting from the
    // top would put a 0 here, which is what refusing before `assign`
    // produces.
    expect(replayed[0]).toBe((lastHeld as number) + 1);
    // And it hands back everything that was refused, not a prefix.
    expect(replayed.length).toBeGreaterThanOrEqual(missedCount);

    // Contiguity across the gap, from the viewer's point of view: what
    // it held, then what it was replayed, is 0..n with no repeats.
    const viewerStream = [...received, ...replayed];
    expect(new Set(viewerStream).size).toBe(viewerStream.length);
    expect(viewerStream).toEqual(viewerStream.map((_, index) => index));
  });
});
