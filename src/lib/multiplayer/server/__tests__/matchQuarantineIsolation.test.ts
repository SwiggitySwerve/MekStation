/**
 * One corrupt session is isolated; the healthy one keeps serving
 * (umbrella task 15.4, the letter's control).
 *
 * One store, one recovery sweep, two active matches built from the same
 * host code: one whose authority sequence has a hole in it, one intact.
 * The corrupt session is refused by name and quarantined; the healthy
 * session recovers into a live host that still admits a socket. The
 * isolation is per scope key - there is no global flag that could take
 * the healthy session down with it.
 *
 * Before this slice a gapped log was not corruption to anything:
 * hydration folds whatever it is handed, so the match was rebuilt and
 * served as though its history were whole.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/event-store/spec.md
 */

import type { IAdaptedUnit } from '@/engine/types';
import type { IGameUnit } from '@/types/gameplay';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { ReplayQuarantineRegistry } from '@/lib/events/replay/ReplayQuarantineRegistry';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { Facing, GameSide, LockState, MovementType } from '@/types/gameplay';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import { nowIso } from '@/types/multiplayer/Protocol';

import type { IMatchMeta } from '../IMatchStore';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { recoverActiveMatches } from '../MatchRecovery';
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

function matchMeta(matchId: string): IMatchMeta {
  const now = nowIso();
  return {
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
      if (seat.slotId === 'alpha-1') {
        return { ...seat, occupant: { playerId: 'pA', displayName: 'A' } };
      }
      if (seat.slotId === 'bravo-1') {
        return { ...seat, occupant: { playerId: 'pB', displayName: 'B' } };
      }
      return seat;
    }),
  };
}

/** A real host over the shared store, so the log is a real log. */
async function liveHost(
  matchId: string,
  store: InMemoryMatchStore,
): Promise<ServerMatchHost> {
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
  return host;
}

describe('per-session quarantine isolation', () => {
  it('a gapped session is quarantined while the healthy one keeps serving', async () => {
    const store = new InMemoryMatchStore();
    await store.createMatch(matchMeta('match-healthy'));
    await liveHost('match-healthy', store);
    const healthyLog = await store.getEvents('match-healthy', 0);
    expect(healthyLog.length).toBeGreaterThanOrEqual(2);

    // The same history with a hole punched in its authority sequence:
    // every event kept, but the last one lands one slot too far along, so
    // the log is missing a revision it claims to have passed.
    await store.createMatch(matchMeta('match-gapped'));
    const last = healthyLog[healthyLog.length - 1];
    for (const event of healthyLog.slice(0, -1)) {
      await store.appendEvent('match-gapped', event);
    }
    await store.appendEvent('match-gapped', {
      ...last,
      sequence: last.sequence + 1,
    });

    const quarantine = new ReplayQuarantineRegistry();
    const result = await recoverActiveMatches(store, quarantine);

    // The corrupt session: refused by name, nothing built from it.
    expect(result.blocked.map((entry) => entry.matchId)).toEqual([
      'match-gapped',
    ]);
    expect(result.blocked[0]?.reason).toBe('sequence-gap');
    expect(result.hosts.has('match-gapped')).toBe(false);
    expect(
      quarantine.isQuarantined({
        authorityType: 'match',
        authorityId: 'match-gapped',
      }),
    ).toBe(true);

    // The control: the healthy session recovered and still serves.
    const recovered = result.hosts.get('match-healthy');
    expect(recovered).toBeDefined();
    expect(
      quarantine.isQuarantined({
        authorityType: 'match',
        authorityId: 'match-healthy',
      }),
    ).toBe(false);
    expect(() =>
      quarantine.assertScopeOperational({
        authorityType: 'match',
        authorityId: 'match-healthy',
      }),
    ).not.toThrow();
    expect(await recovered!.admitSocket(makeSocket(), 'pA')).not.toBeNull();
  });
});
