import { describe, expect, it } from '@jest/globals';

import type { IWeapon } from '@/simulation/ai/types';

import {
  _resetCombatOutcomeBus,
  subscribeToCombatOutcome,
} from '@/engine/combatOutcomeBus';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  Facing,
  GameEventType,
  GameSide,
  LockState,
  MovementType,
  type IGameUnit,
} from '@/types/gameplay';

import type { IAdaptedUnit } from '../types';

import { createMinimalGrid } from '../GameEngine.helpers';
import { InteractiveSession } from '../InteractiveSession';

const MAP_RADIUS = 5;

function makeWeapon(id: string): IWeapon {
  return {
    id,
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function makeAdaptedUnit(id: string, side: GameSide): IAdaptedUnit {
  return {
    id,
    side,
    position:
      side === GameSide.Player
        ? { q: 0, r: MAP_RADIUS }
        : { q: 0, r: -MAP_RADIUS },
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
    weapons: [makeWeapon(`${id}-medium-laser`)],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

function makeGameUnits(): IGameUnit[] {
  return [
    {
      id: 'unit-player',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-player',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'unit-opponent',
      name: 'Marauder',
      side: GameSide.Opponent,
      unitRef: 'marauder-mad-3r',
      pilotRef: 'pilot-opponent',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

function makeSession(): InteractiveSession {
  return new InteractiveSession(
    MAP_RADIUS,
    30,
    new SeededRandom(42),
    createMinimalGrid(MAP_RADIUS),
    [makeAdaptedUnit('unit-player', GameSide.Player)],
    [makeAdaptedUnit('unit-opponent', GameSide.Opponent)],
    makeGameUnits(),
  );
}

describe('InteractiveSession.ejectUnit', () => {
  afterEach(() => {
    _resetCombatOutcomeBus();
  });

  it('emits UnitEjected and removes the unit from active combat', () => {
    const session = makeSession();
    const before = session.getState().units['unit-player'];

    session.ejectUnit('unit-player');

    const event = session
      .getSession()
      .events.find((entry) => entry.type === GameEventType.UnitEjected);
    expect(event).toBeDefined();
    expect(event!.payload).toMatchObject({
      unitId: 'unit-player',
      reason: 'player_declared',
    });

    const after = session.getState().units['unit-player'];
    expect(after.hasEjected).toBe(true);
    expect(after.destroyed).toBe(false);
    expect(after.armor).toEqual(before.armor);
    expect(after.structure).toEqual(before.structure);
    expect(session.getAvailableActions('unit-player')).toEqual({
      validMoves: [],
      validTargets: [],
    });
    expect(
      session
        .getAvailableActions('unit-opponent')
        .validTargets.some((target) => target.unitId === 'unit-player'),
    ).toBe(false);
  });

  it('is idempotent for an already-ejected unit', () => {
    const session = makeSession();

    session.ejectUnit('unit-player');
    const eventCount = session.getSession().events.length;
    session.ejectUnit('unit-player');

    expect(session.getSession().events).toHaveLength(eventCount);
  });

  it('finalizes the match once when the last active player unit ejects', () => {
    const session = makeSession();
    const publishedMatchIds: string[] = [];
    subscribeToCombatOutcome((event) => {
      publishedMatchIds.push(event.matchId);
    });

    session.ejectUnit('unit-player');

    expect(session.isGameOver()).toBe(true);
    expect(session.hasPublishedOutcome()).toBe(true);
    expect(publishedMatchIds).toEqual([session.getSession().id]);
    expect(
      session
        .getSession()
        .events.filter((event) => event.type === GameEventType.GameEnded),
    ).toHaveLength(1);

    const eventCount = session.getSession().events.length;
    session.ejectUnit('unit-player');
    expect(session.getSession().events).toHaveLength(eventCount);
    expect(publishedMatchIds).toHaveLength(1);
  });
});
