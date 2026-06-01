import { describe, expect, it } from '@jest/globals';

import type { IWeapon } from '@/simulation/ai/types';

import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  Facing,
  GameEventType,
  GameSide,
  LockState,
  MovementType,
  type IGameUnit,
  type IPhysicalAttackDeclaredPayload,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';

import type { IAdaptedUnit } from '../types';

import { createMinimalGrid } from '../GameEngine.helpers';
import { InteractiveSession } from '../InteractiveSession';
import { physicalContextByUnit } from '../InteractiveSession.resolvers';

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

function placeUnitsAdjacent(session: InteractiveSession): void {
  const attacker = session.getState().units['unit-player'];
  const target = session.getState().units['unit-opponent'];
  (attacker as unknown as { position: { q: number; r: number } }).position = {
    q: 0,
    r: 5,
  };
  (target as unknown as { position: { q: number; r: number } }).position = {
    q: 0,
    r: 4,
  };
}

describe('InteractiveSession.applyPhysicalAttack', () => {
  it('emits a PhysicalAttackDeclared event for first-class physical wire dispatch', () => {
    const session = makeSession();
    placeUnitsAdjacent(session);

    session.applyPhysicalAttack('unit-player', 'unit-opponent', 'punch');

    const event = session
      .getSession()
      .events.find(
        (entry) => entry.type === GameEventType.PhysicalAttackDeclared,
      );
    expect(event).toBeDefined();

    const payload = event!.payload as IPhysicalAttackDeclaredPayload;
    expect(payload).toMatchObject({
      attackerId: 'unit-player',
      targetId: 'unit-opponent',
      attackType: 'punch',
      toHitNumber: 5,
    });
  });

  it('hydrates Melee Specialist from unit abilities for physical declaration to-hit', () => {
    const session = makeSession();
    placeUnitsAdjacent(session);
    const attacker = session.getState().units['unit-player'];
    (attacker as unknown as { abilities: string[] }).abilities = [
      'melee-specialist',
    ];

    session.applyPhysicalAttack('unit-player', 'unit-opponent', 'punch');

    const event = session
      .getSession()
      .events.find(
        (entry) => entry.type === GameEventType.PhysicalAttackDeclared,
      );
    const payload = event!.payload as IPhysicalAttackDeclaredPayload;
    expect(payload.toHitNumber).toBe(4);
  });

  it('keeps Low Arms registry-only instead of rejecting elevated physical attacks', () => {
    const grid = createMinimalGrid(MAP_RADIUS);
    grid.hexes.set('0,5', {
      coord: { q: 0, r: 5 },
      occupantId: 'unit-player',
      terrain: TerrainType.Clear,
      elevation: 0,
    });
    grid.hexes.set('0,4', {
      coord: { q: 0, r: 4 },
      occupantId: 'unit-opponent',
      terrain: TerrainType.Clear,
      elevation: 1,
    });
    const session = new InteractiveSession(
      MAP_RADIUS,
      30,
      new SeededRandom(42),
      grid,
      [makeAdaptedUnit('unit-player', GameSide.Player)],
      [makeAdaptedUnit('unit-opponent', GameSide.Opponent)],
      makeGameUnits(),
    );
    const attacker = session.getState().units['unit-player'];
    const target = session.getState().units['unit-opponent'];
    (attacker as unknown as { position: { q: number; r: number } }).position = {
      q: 0,
      r: 5,
    };
    (target as unknown as { position: { q: number; r: number } }).position = {
      q: 0,
      r: 4,
    };
    (attacker as unknown as { unitQuirks: string[] }).unitQuirks = ['low_arms'];

    session.applyPhysicalAttack('unit-player', 'unit-opponent', 'punch');

    const declared = session
      .getSession()
      .events.find(
        (entry) => entry.type === GameEventType.PhysicalAttackDeclared,
      );
    const payload = declared!.payload as IPhysicalAttackDeclaredPayload;
    expect(payload.attackType).toBe('punch');
    expect(Number.isFinite(payload.toHitNumber)).toBe(true);
    expect(payload.toHitNumber).not.toBe(Infinity);
  });

  it('hydrates physical context underwater state from the encounter grid', () => {
    const grid = createMinimalGrid(MAP_RADIUS);
    grid.hexes.set('-2,5', {
      coord: { q: -2, r: 5 },
      occupantId: 'unit-player',
      terrain: 'water:1',
      elevation: 0,
    });
    grid.hexes.set('-2,4', {
      coord: { q: -2, r: 4 },
      occupantId: 'unit-opponent',
      terrain: TerrainType.Clear,
      elevation: 0,
    });
    const session = new InteractiveSession(
      MAP_RADIUS,
      30,
      new SeededRandom(42),
      grid,
      [makeAdaptedUnit('unit-player', GameSide.Player)],
      [makeAdaptedUnit('unit-opponent', GameSide.Opponent)],
      makeGameUnits(),
    );

    const context = physicalContextByUnit(
      session.getSession(),
      new Map([['unit-player', 100]]),
      new Map([['unit-player', 4]]),
      grid,
    );

    expect(context.get('unit-player')).toMatchObject({
      attackerTonnage: 100,
      pilotingSkill: 4,
      isUnderwater: true,
    });
    expect(context.get('unit-opponent')?.isUnderwater).toBe(false);
  });
});
