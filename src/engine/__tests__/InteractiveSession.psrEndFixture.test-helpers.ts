/**
 * A real two-mech interactive session that reaches the End phase with a
 * damage PSR queued, for the guest-mirror dice tests (C-1c PR 0).
 *
 * The host is built with a seeded roller so its PSR resolution is
 * reproducible. A guest adopts the host's events; nothing here fakes the
 * engine.
 */

import type { IAdaptedUnit } from '@/engine/types';
import type { IWeapon } from '@/simulation/ai/types';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { InteractiveSession } from '@/engine/InteractiveSession';
import { SeededD6Roller, SeededRandom } from '@/simulation/core';
import {
  Facing,
  GameEventType,
  GameSide,
  LockState,
  MovementType,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay';
import { createEventBase } from '@/utils/gameplay/gameEvents/base';

export const PSR_FIXTURE_PLAYER = 'unit-player';
export const PSR_FIXTURE_OPPONENT = 'unit-opponent';
const MAP_RADIUS = 5;

function weapon(id: string): IWeapon {
  return {
    id,
    name: 'Medium Laser',
    shortRange: 20,
    mediumRange: 30,
    longRange: 40,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function adapted(id: string, side: GameSide): IAdaptedUnit {
  return {
    id,
    side,
    position:
      side === GameSide.Player
        ? { q: 0, r: MAP_RADIUS }
        : { q: 0, r: MAP_RADIUS - 1 },
    facing: side === GameSide.Player ? Facing.North : Facing.South,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: { center_torso: 31 },
    structure: { center_torso: 21 },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [weapon(`${id}-medium-laser`)],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

function gameUnits(): IGameUnit[] {
  return [
    {
      id: PSR_FIXTURE_PLAYER,
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-player',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: PSR_FIXTURE_OPPONENT,
      name: 'Marauder',
      side: GameSide.Opponent,
      unitRef: 'marauder-mad-3r',
      pilotRef: 'pilot-opponent',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

/** A host session with a seeded roller (the authority that rolls). */
export function makePsrFixtureHost(seed = 7): InteractiveSession {
  return new InteractiveSession(
    MAP_RADIUS,
    30,
    new SeededRandom(42),
    createMinimalGrid(MAP_RADIUS),
    [adapted(PSR_FIXTURE_PLAYER, GameSide.Player)],
    [adapted(PSR_FIXTURE_OPPONENT, GameSide.Opponent)],
    gameUnits(),
    {},
    new SeededD6Roller(seed).asD6Roller(),
  );
}

/** Take the host to the End phase with a 20-damage PSR queued. */
export function advanceHostToEndWithQueuedPsr(host: InteractiveSession): void {
  host.advancePhase(); // Initiative -> Movement
  host.advancePhase(); // Movement -> WeaponAttack
  const before = host.getSession();
  host.appendEvent({
    ...createEventBase(
      before.id,
      before.events.length,
      GameEventType.DamageApplied,
      before.currentState.turn,
      before.currentState.phase,
      PSR_FIXTURE_PLAYER,
    ),
    payload: {
      unitId: PSR_FIXTURE_PLAYER,
      location: 'center_torso',
      damage: 20,
      armorRemaining: 10,
      structureRemaining: 10,
      locationDestroyed: false,
    },
  });
  host.advancePhase(); // WeaponAttack -> PhysicalAttack (queues the PSR)
  host.advancePhase(); // PhysicalAttack -> Heat
  host.advancePhase(); // Heat -> End
}

/** The host's full first turn: End advance resolves the queued PSR. */
export function runHostThroughFirstTurn(): IGameSession {
  const host = makePsrFixtureHost();
  advanceHostToEndWithQueuedPsr(host);
  host.advancePhase(); // End -> next turn: the host resolves the PSR here
  return host.getSession();
}
