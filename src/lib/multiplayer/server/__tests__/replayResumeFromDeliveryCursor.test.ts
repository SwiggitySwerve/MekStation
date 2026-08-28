/**
 * A resume quoting a delivery cursor must send the frame the viewer LACKS.
 *
 * Two cursor conventions meet in `ServerMatchHost.handleSessionJoin` and
 * disagreed. `firstMissedAuthoritySequence` answers "the authority
 * sequence of the first frame this viewer has NOT had"; the replay entry
 * point's `lastSeq` means "the last sequence they HAVE" and requests
 * everything after it. Feeding the first into the second started the
 * replay one event LATE — skipping precisely the frame the recovery
 * existed to fetch.
 *
 * Nothing covered it. The delivery cursor is the newer of the two
 * numbers and no server-side test had ever quoted it on a resume, which
 * is how a recovery that asks the right question and gets an answer one
 * event short stayed invisible.
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

const MATCH = 'm-resume-cursor';

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
    // A replay arrives as chunks, not as individual live frames.
    if (raw?.kind === 'ReplayChunk' && Array.isArray(raw.events)) {
      for (const event of raw.events) {
        out.push({ sequence: (event as { sequence: number }).sequence });
      }
    }
  }
  return out;
}

/** Two seated humans; only pA is attached, so only pA is numbered. */
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
    roomCode: 'RESUME',
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
  expect(await host.admitSocket(sockA, 'pA')).not.toBeNull();
  return { host, matchId: MATCH, sockA };
}

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

describe('resuming a viewer from their delivery cursor', () => {
  it('replays the frame the cursor says is missing', async () => {
    const { host, matchId, sockA } = await seatedHost();
    for (let n = 0; n < 3; n += 1) await advance(host, n);

    // What pA actually received, in their own numbering.
    const live = deliveredEvents(sockA);
    expect(live.length).toBeGreaterThan(1);

    // Delivery frame 0 was the last that arrived; everything from
    // delivery frame 1 onward was lost in transit.
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
    // The whole point of the recovery: the first frame they lack has to
    // be in what comes back.
    expect(replayed).toContain(firstMissing);
  });

  it('still replays from the start for a viewer with no delivery record', async () => {
    // Control. After a restart the record is gone and a FULL replay is
    // the right answer; a translation that quietly produced a negative
    // start, or skipped frame 0, would break every cold reconnect.
    const { host, matchId } = await seatedHost();
    await advance(host, 0);

    const cold = makeSocket();
    await host.handleSessionJoin(cold as never, 'pB', undefined, matchId, 7);

    const seqs = deliveredEvents(cold).map((e) => e.sequence);
    expect(seqs.length).toBeGreaterThan(0);
    expect(Math.min(...seqs)).toBe(0);
  });
});
