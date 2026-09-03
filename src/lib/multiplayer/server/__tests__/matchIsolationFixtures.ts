/**
 * Shared combat-match fixtures for 15.4 isolation and the host-registry
 * quarantine binder. One store, one real host log, then a punched hole
 * in a copy of that log so recovery names sequence-gap.
 */

import type { IAdaptedUnit } from '@/engine/types';
import type { IGameEvent, IGameUnit } from '@/types/gameplay';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { Facing, GameSide, LockState, MovementType } from '@/types/gameplay';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import { nowIso } from '@/types/multiplayer/Protocol';

import type { IMatchMeta } from '../IMatchStore';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { ServerMatchHost } from '../ServerMatchHost';

/**
 * WHAT: a host-ready adapted unit for isolation fixtures.
 * WHY: recovery needs a real GameCreated log, not a stub event list.
 */
export function isolationAdaptedUnit(
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
 * WHAT: catalog-facing game unit paired with isolationAdaptedUnit.
 * WHY: ServerMatchHost.create requires both adapted and game units.
 */
export function isolationGameUnit(id: string, side: GameSide): IGameUnit {
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
 * WHAT: durable match meta for an isolation pair.
 * WHY: listActiveMatches only returns status active; lobby stays the
 * control that recovery never saw.
 */
export function isolationMatchMeta(
  matchId: string,
  status: IMatchMeta['status'] = 'active',
): IMatchMeta {
  const now = nowIso();
  return {
    matchId,
    hostPlayerId: 'pA',
    playerIds: ['pA', 'pB'],
    sideAssignments: [
      { playerId: 'pA', side: 'player' },
      { playerId: 'pB', side: 'opponent' },
    ],
    status,
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

/**
 * WHAT: a live host whose appends become the store's authority log.
 * WHY: a gapped copy has to start from a real contiguous history.
 */
export async function isolationLiveHost(
  matchId: string,
  store: InMemoryMatchStore,
): Promise<ServerMatchHost> {
  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 6,
    turnLimit: 5,
    random: new SeededRandom(9),
    grid: createMinimalGrid(6),
    playerUnits: [
      isolationAdaptedUnit('unit-A', GameSide.Player, { q: 0, r: 0 }),
    ],
    opponentUnits: [
      isolationAdaptedUnit('unit-foe', GameSide.Opponent, { q: 0, r: 3 }),
    ],
    gameUnits: [
      isolationGameUnit('unit-A', GameSide.Player),
      isolationGameUnit('unit-foe', GameSide.Opponent),
    ],
    diceSeed: 9,
  });
  await Promise.resolve();
  await Promise.resolve();
  return host;
}

/**
 * WHAT: copies a healthy log onto another match with a sequence hole.
 * WHY: sequence-gap is the corruption class recovery will quarantine.
 */
export async function punchSequenceGap(
  store: InMemoryMatchStore,
  targetMatchId: string,
  healthyLog: readonly IGameEvent[],
): Promise<void> {
  const last = healthyLog[healthyLog.length - 1];
  if (last === undefined) {
    throw new Error('healthy log must contain at least one event');
  }
  for (const event of healthyLog.slice(0, -1)) {
    await store.appendEvent(targetMatchId, event);
  }
  await store.appendEvent(targetMatchId, {
    ...last,
    sequence: last.sequence + 1,
  });
}

/**
 * WHAT: probe socket that records outbound frames.
 * WHY: isolation asserts the healthy recovered host still admits.
 */
export function isolationProbeSocket(): {
  send(data: string): void;
  close(): void;
  readyState: number;
  sent: unknown[];
} {
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
