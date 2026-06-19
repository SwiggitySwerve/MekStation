import { EngineType } from '@/types/construction/EngineType';
import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import {
  Facing,
  GameEventType,
  GameSide,
  type IDamageAppliedPayload,
  type IAttackResolvedPayload,
  type ICriticalHitResolvedPayload,
  type IGameConfig,
  type IGameEvent,
  type IGameUnit,
  MovementType,
  RangeBracket,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { type DiceRoller } from '../diceTypes';
import {
  createAttackDeclaredEvent,
  createMovementDeclaredEvent,
} from '../gameEvents';
import { appendEvent, createGameSession, resolveAttack } from '../gameSession';

function config(): IGameConfig {
  return {
    mapRadius: 10,
    turnLimit: 0,
    victoryConditions: ['elimination'],
    optionalRules: [],
  };
}

function mechUnit(id: string): IGameUnit {
  return {
    id,
    name: 'Attacker',
    side: GameSide.Player,
    unitRef: id,
    pilotRef: `${id}-pilot`,
    unitType: UnitType.BATTLEMECH,
    gunnery: 4,
    piloting: 5,
  };
}

function vehicleArmor(
  values: Record<string, number>,
): Partial<Record<VehicleLocation | VTOLLocation, number>> {
  return values as Partial<Record<VehicleLocation | VTOLLocation, number>>;
}

function vehicleUnit(
  overrides: Partial<IGameUnit['vehicleInit']> = {},
): IGameUnit {
  return {
    id: 'target',
    name: 'Tracked Target',
    side: GameSide.Opponent,
    unitRef: 'target',
    pilotRef: 'target-pilot',
    unitType: UnitType.VEHICLE,
    gunnery: 4,
    piloting: 5,
    vehicleInit: {
      motionType: GroundMotionType.TRACKED,
      engineType: EngineType.STANDARD,
      originalCruiseMP: 4,
      armor: vehicleArmor({
        [VehicleLocation.FRONT]: 10,
        [VehicleLocation.TURRET]: 10,
      }),
      structure: vehicleArmor({
        [VehicleLocation.FRONT]: 5,
        [VehicleLocation.TURRET]: 5,
      }),
      ...overrides,
    },
  };
}

function frontWeaponCriticalAvailability(): NonNullable<
  NonNullable<IGameUnit['vehicleInit']>['criticalAvailability']
> {
  return {
    weaponLocations: [VehicleLocation.FRONT],
    weaponLocationCounts: { [VehicleLocation.FRONT]: 1 },
    jammableWeaponLocations: [VehicleLocation.FRONT],
    jammableWeaponLocationCounts: { [VehicleLocation.FRONT]: 1 },
    destroyableWeaponLocations: [VehicleLocation.FRONT],
    destroyableWeaponLocationCounts: { [VehicleLocation.FRONT]: 1 },
  };
}

function attackEvent(sessionId: string, sequence = 1): IGameEvent {
  return createAttackDeclaredEvent(
    sessionId,
    sequence,
    0,
    'attacker',
    'target',
    ['medium-laser'],
    3,
    [],
    [
      {
        weaponId: 'medium-laser',
        weaponName: 'Medium Laser',
        damage: 5,
        heat: 3,
      },
    ],
    RangeBracket.Short,
  );
}

function diceRollerFor(
  rolls: readonly (readonly [number, number])[],
): jest.MockedFunction<DiceRoller> {
  const queue = [...rolls];
  return jest.fn(() => {
    const next = queue.shift();
    if (!next) {
      throw new Error('unexpected dice roll');
    }
    const total = next[0] + next[1];
    return {
      dice: next,
      total,
      isSnakeEyes: total === 2,
      isBoxcars: total === 12,
    };
  });
}

function d6RollerFor(
  rolls: readonly number[],
): jest.MockedFunction<() => number> {
  const queue = [...rolls];
  return jest.fn(() => {
    const next = queue.shift();
    if (next === undefined) {
      throw new Error('unexpected d6 roll');
    }
    return next;
  });
}

function markTargetHullDown(
  session: ReturnType<typeof createGameSession>,
): ReturnType<typeof createGameSession> {
  const target = session.currentState.units.target;
  return appendEvent(
    session,
    createMovementDeclaredEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      'target',
      target.position,
      target.position,
      Facing.South,
      MovementType.Stationary,
      1,
      0,
      [target.position],
      { hullDownEntryAttempt: true },
    ),
  );
}

export {
  EngineType,
  VehicleLocation,
  VTOLLocation,
  Facing,
  GameEventType,
  GameSide,
  MovementType,
  RangeBracket,
  GroundMotionType,
  UnitType,
  TurretType,
  createGameSession,
  resolveAttack,
  config,
  mechUnit,
  vehicleArmor,
  vehicleUnit,
  frontWeaponCriticalAvailability,
  attackEvent,
  diceRollerFor,
  d6RollerFor,
  markTargetHullDown,
};
export type {
  IDamageAppliedPayload,
  IAttackResolvedPayload,
  ICriticalHitResolvedPayload,
  IGameConfig,
  IGameEvent,
  IGameUnit,
  DiceRoller,
};
