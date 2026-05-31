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

describe('resolveAttack vehicle target dispatch', () => {
  it('uses vehicle hit locations and vehicle damage for represented vehicles', () => {
    const session = createGameSession(config(), [
      mechUnit('attacker'),
      vehicleUnit(),
    ]);
    const diceRoller = diceRollerFor([
      [6, 6],
      [3, 3],
    ]);

    const resolved = resolveAttack(
      session,
      attackEvent(session.id),
      diceRoller,
    );

    const attackResolved = resolved.events.find(
      (event) => event.type === GameEventType.AttackResolved,
    )!;
    expect((attackResolved.payload as IAttackResolvedPayload).location).toBe(
      VehicleLocation.FRONT,
    );

    const damageApplied = resolved.events.find(
      (event) => event.type === GameEventType.DamageApplied,
    )!;
    const damagePayload = damageApplied.payload as IDamageAppliedPayload;
    expect(damagePayload.location).toBe(VehicleLocation.FRONT);
    expect(damagePayload.armorRemaining).toBe(5);
    expect(
      resolved.currentState.units.target.combatState?.kind === 'vehicle'
        ? (
            resolved.currentState.units.target.combatState.state
              .armor as Record<string, number>
          )[VehicleLocation.FRONT]
        : undefined,
    ).toBe(5);
    expect(diceRoller).toHaveBeenCalledTimes(2);
  });

  it('uses hull-down vehicle fixed turret location without consuming a location roll', () => {
    let session = createGameSession(config(), [
      mechUnit('attacker'),
      vehicleUnit({
        turretType: TurretType.SINGLE,
        armor: vehicleArmor({
          [VehicleLocation.FRONT]: 10,
          [VehicleLocation.TURRET]: 10,
        }),
        structure: vehicleArmor({
          [VehicleLocation.FRONT]: 5,
          [VehicleLocation.TURRET]: 5,
        }),
      }),
    ]);
    const target = session.currentState.units.target;
    session = appendEvent(
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
    const diceRoller = diceRollerFor([[6, 6]]);

    const resolved = resolveAttack(
      session,
      attackEvent(session.id, session.events.length),
      diceRoller,
    );

    const attackResolved = resolved.events.find(
      (event) => event.type === GameEventType.AttackResolved,
    )!;
    expect((attackResolved.payload as IAttackResolvedPayload).location).toBe(
      VehicleLocation.TURRET,
    );

    const damageApplied = resolved.events.find(
      (event) => event.type === GameEventType.DamageApplied,
    )!;
    expect((damageApplied.payload as IDamageAppliedPayload).location).toBe(
      VehicleLocation.TURRET,
    );
    expect(diceRoller).toHaveBeenCalledTimes(1);
  });

  it('emits VTOL crash checks when a rotor hit damages the rotor', () => {
    const session = createGameSession(config(), [
      mechUnit('attacker'),
      {
        ...vehicleUnit({
          motionType: GroundMotionType.VTOL,
          altitude: 3,
          armor: vehicleArmor({
            [VTOLLocation.FRONT]: 10,
            [VTOLLocation.ROTOR]: 0,
          }),
          structure: vehicleArmor({
            [VTOLLocation.FRONT]: 5,
            [VTOLLocation.ROTOR]: 1,
          }),
        }),
        unitType: UnitType.VTOL,
      },
    ]);
    const diceRoller = diceRollerFor([
      [6, 6],
      [6, 6],
    ]);

    const resolved = resolveAttack(
      session,
      attackEvent(session.id),
      diceRoller,
    );

    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.VTOLCrashCheck,
      ),
    ).toBe(true);
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.VehicleImmobilized,
      ),
    ).toBe(true);
  });
});
