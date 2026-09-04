/**
 * Armed post-commit send fault at the per-viewer live send.
 *
 * The lever is match-scoped only, so the first recipient in the
 * fan-out is the victim. That viewer's wire cursor stays put; the
 * other viewer's advances; resume quoting the victim's last held
 * number starts at the missed deliverySequence.
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

import type { IMatchStore } from '../IMatchStore';

import {
  DurableMatchStore,
  _armE2EFaultOnce,
  _resetE2EFaultsForTests,
  throwForPostCommitSendFault,
} from '../DurableMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { ServerMatchHost } from '../ServerMatchHost';

const MATCH = 'm-post-commit-send-fault';

/**
 * WHAT: a seated unit the host can construct.
 * WHY: this suite needs a real match, not a send-path stub.
 */
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

/**
 * WHAT: roster row for an adapted unit.
 * WHY: ServerMatchHost.create requires gameUnits beside adapted units.
 */
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
 * WHAT: an in-memory socket that records parsed outbound frames.
 * WHY: the row keys on which viewer actually received a delivery number.
 */
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

/**
 * WHAT: live Event delivery numbers from one socket.
 * WHY: the failed send is the missing number, not an authority sequence.
 */
function deliveredSequences(socket: { sent: unknown[] }): number[] {
  const out: number[] = [];
  for (const raw of socket.sent as {
    kind?: string;
    deliverySequence?: number;
    deliverySequences?: number[];
  }[]) {
    if (raw?.kind === 'Event' && raw.deliverySequence !== undefined) {
      out.push(raw.deliverySequence);
      continue;
    }
    // A resume after a rejoin is replayed in chunks, each carrying the
    // delivery numbers it hands back; those count as delivered too.
    if (raw?.kind === 'ReplayChunk' && Array.isArray(raw.deliverySequences)) {
      out.push(...raw.deliverySequences);
    }
  }
  return out;
}

/**
 * WHAT: last contiguous delivery number from zero.
 * WHY: a later frame after a hole is not the cursor a resume may quote.
 */
function contiguousHead(numbers: readonly number[]): number {
  const sorted = [...numbers].sort((a, b) => a - b);
  let head = -1;
  for (const value of sorted) {
    if (value === head + 1) {
      head = value;
      continue;
    }
    break;
  }
  return head;
}

/**
 * WHAT: a 1v1 host with one admitted socket per player.
 * WHY: the fault is match-scoped, so two viewers are how a victim appears.
 */
async function seatedHost(store: IMatchStore, matchId: string) {
  const now = new Date().toISOString();
  await store.createMatch({
    matchId,
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
    roomCode: 'SENDFLT',
  });

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
  const sockB = makeSocket();
  expect(await host.admitSocket(sockA, 'pA')).not.toBeNull();
  expect(await host.admitSocket(sockB, 'pB')).not.toBeNull();
  return { host, sockA, sockB };
}

/**
 * WHAT: commit one host-driven phase advance.
 * WHY: the fault must fire on a real post-commit fan-out, not a stub send.
 */
async function advance(
  host: Awaited<ReturnType<typeof seatedHost>>['host'],
  n: number,
  matchId: string,
): Promise<void> {
  await host.handleIntent(
    {
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'pA',
      intentId: `adv-${n}`,
      intent: { kind: 'AdvancePhase' },
    } as unknown as IIntent,
    'conn-a',
    'pA',
  );
}

describe('ServerMatchHostEvents post-commit send fault', () => {
  afterEach(() => {
    _resetE2EFaultsForTests();
  });

  /**
   * WHAT: one `it` against in-memory and durable stores.
   * WHY: finding #103 first blamed the durable store's rejoin; this
   * matrix pins that both stores resume at the missed number.
   */
  describe.each([
    ['in-memory', (): IMatchStore => new InMemoryMatchStore({ quiet: true })],
    ['durable', (): IMatchStore => new DurableMatchStore({ path: ':memory:' })],
  ] as const)('%s store', (storeName, createStore) => {
    it('throws on exactly one per-viewer send and leaves only that cursor unadvanced', async () => {
      const matchId = `${MATCH}-${storeName}`;
      const { host, sockA, sockB } = await seatedHost(createStore(), matchId);
      await advance(host, 0, matchId);
      const beforeA = deliveredSequences(sockA);
      const beforeB = deliveredSequences(sockB);
      expect(beforeA.length).toBeGreaterThan(0);
      expect(beforeA).toEqual(beforeB);

      _armE2EFaultOnce('post-commit-send', { matchId });
      await advance(host, 1, matchId);
      expect(() => throwForPostCommitSendFault(matchId)).not.toThrow();

      const afterA = deliveredSequences(sockA);
      const afterB = deliveredSequences(sockB);
      const missedByB = afterA.filter((value) => !afterB.includes(value));
      const missedByA = afterB.filter((value) => !afterA.includes(value));
      expect(missedByA.length + missedByB.length).toBeGreaterThan(0);
      expect(missedByA.length === 0 || missedByB.length === 0).toBe(true);

      const victimIsA = missedByA.length > 0;
      const victimBefore = victimIsA ? beforeA : beforeB;
      const healthyAfter = victimIsA ? afterB : afterA;
      const victimAfter = victimIsA ? afterA : afterB;
      const missed = victimIsA ? missedByA[0] : missedByB[0];
      expect(typeof missed).toBe('number');
      expect(victimAfter).not.toContain(missed);
      expect(healthyAfter).toContain(missed);
      expect(contiguousHead(victimAfter)).toBe(contiguousHead(victimBefore));

      const victimId = victimIsA ? 'pA' : 'pB';
      const lastHeld = contiguousHead(victimAfter);
      const rejoined = makeSocket();
      await host.handleSessionJoin(
        rejoined as never,
        victimId,
        undefined,
        matchId,
        lastHeld,
      );
      expect(deliveredSequences(rejoined)[0]).toBe(missed);
    });
  });
});
