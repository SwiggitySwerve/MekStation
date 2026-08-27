/**
 * A seated player may command only units on their own side.
 *
 * Measured 2026-08-26: before this guard a seated OPPONENT moved a
 * Player-side mech and the server committed it (movement_declared +
 * movement_locked, position changed). Authorization could not catch it:
 * a Move claims no forceId, so the force-scope subset check passes on an
 * empty claim, and the engine dispatch handler is `(session, intent)` -
 * it never receives the commanding principal at all.
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

const MATCH = 'm-seated';

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

/**
 * Boots a real host with two seated humans and two Player-side mechs.
 *
 * `coop` decides the ONLY thing that differs between the two cases: a
 * co-op match carries a `coopCampaign` and pools both players' units on
 * the shared `player` side, so a seat's side says nothing about who owns
 * a mech. A versus match has no campaign and the sides mean what they
 * say.
 */
async function makeHost(coop: boolean) {
  const matchId = coop ? 'm-coop' : 'm-versus';
  const store = new InMemoryMatchStore({ quiet: true });
  const now = new Date().toISOString();
  await store.createMatch({
    matchId,
    hostPlayerId: 'pA',
    playerIds: ['pA', 'pB'],
    // Both shapes seat the guest on bravo, which `lobbySideAssignments`
    // resolves to `opponent` either way.
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
    roomCode: coop ? 'COOP01' : 'SEAT01',
    ...(coop
      ? {
          coopCampaign: {
            campaignId: 'camp-1',
            state: {},
            arbitrationMode: 'host-review' as const,
          },
        }
      : {}),
  } as Parameters<InMemoryMatchStore['createMatch']>[0]);

  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 6,
    turnLimit: 5,
    random: new SeededRandom(9),
    grid: createMinimalGrid(6),
    playerUnits: [
      adapted('unit-A', GameSide.Player, { q: 0, r: 0 }),
      adapted('unit-A2', GameSide.Player, { q: 2, r: 0 }),
    ],
    opponentUnits: [adapted('unit-foe', GameSide.Opponent, { q: 0, r: 3 })],
    gameUnits: [
      gameUnit('unit-A', GameSide.Player),
      gameUnit('unit-A2', GameSide.Player),
      gameUnit('unit-foe', GameSide.Opponent),
    ],
    diceSeed: 9,
  });
  await Promise.resolve();
  await Promise.resolve();

  expect(await host.admitSocket(makeSocket(), 'pA')).not.toBeNull();
  expect(await host.admitSocket(makeSocket(), 'pB')).not.toBeNull();

  // Into the movement phase.
  await host.handleIntent(
    {
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'pA',
      intentId: 'adv',
      intent: { kind: 'AdvancePhase' },
    } as unknown as IIntent,
    'conn-a',
    'pA',
  );

  const posOf = (unitId: string) =>
    host.getSessionForTests().currentState.units[unitId]?.position;

  // Walk one hex from wherever the host actually deployed the unit.
  const move = async (sender: string, unitId: string) => {
    const live = posOf(unitId);
    const before = JSON.stringify(live);
    const out = await host.handleIntent(
      {
        kind: 'Intent',
        matchId,
        ts: nowIso(),
        playerId: sender,
        intentId: `mv-${sender}-${unitId}`,
        intent: {
          kind: 'Move',
          unitId,
          to: { q: live?.q ?? 0, r: (live?.r ?? 0) - 1 },
          facing: 0,
          movementType: 'walk',
        },
      } as unknown as IIntent,
      `conn-${sender}`,
      sender,
    );
    return {
      frames: out as readonly { kind: string; code?: string }[],
      moved: JSON.stringify(posOf(unitId)) !== before,
    };
  };

  return { move };
}

describe('ServerMatchHost unit ownership', () => {
  it('refuses a command for a unit on a side the caller does not hold', async () => {
    const { move } = await makeHost(false);

    // CONTROL: the owner moves their own unit. This must keep working -
    // a guard that refused everyone would pass the row below while
    // breaking the game.
    const own = await move('pA', 'unit-A');
    expect(own.moved).toBe(true);
    expect(own.frames.some((f) => f.kind === 'Error')).toBe(false);

    // GUARD: the opponent moves a Player-side mech that is not theirs.
    const foreign = await move('pB', 'unit-A2');
    expect(
      foreign.frames.some(
        (f) => f.kind === 'Error' && f.code === 'AUTH_REJECTED',
      ),
    ).toBe(true);
    // And it must not have moved: refusing loudly while committing anyway
    // is not a fix.
    expect(foreign.moved).toBe(false);
  });

  it('does not refuse a co-op guest, whose side is not their ownership', async () => {
    // Co-op pools every deploying player's units onto the shared `player`
    // side while the guest still sits in a `bravo` seat, so a side check
    // reads a co-op teammate as an intruder and locks them out of the
    // whole roster. Side is simply not an ownership signal here.
    const { move } = await makeHost(true);

    const guest = await move('pB', 'unit-A2');
    expect(guest.frames.some((f) => f.kind === 'Error')).toBe(false);
    expect(guest.moved).toBe(true);
  });
});
