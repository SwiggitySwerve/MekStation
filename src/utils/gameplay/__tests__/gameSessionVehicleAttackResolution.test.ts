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
    session = markTargetHullDown(session);
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
    const d6Roller = d6RollerFor([1, 1]);

    const resolved = resolveAttack(
      session,
      attackEvent(session.id),
      diceRoller,
      d6Roller,
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

  it('dispatches vehicle TAC critical effects into replay-visible state', () => {
    const session = createGameSession(config(), [
      mechUnit('attacker'),
      vehicleUnit(),
    ]);
    const diceRoller = diceRollerFor([
      [6, 6],
      [1, 1],
    ]);
    const d6Roller = d6RollerFor([3, 3]);

    const resolved = resolveAttack(
      session,
      attackEvent(session.id),
      diceRoller,
      d6Roller,
    );

    const critical = resolved.events.find(
      (event) => event.type === GameEventType.CriticalHitResolved,
    )!;
    expect((critical.payload as ICriticalHitResolvedPayload).effect).toBe(
      'driver_hit',
    );

    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.VehicleCrewStunned,
      ),
    ).toBe(false);
    expect(
      resolved.currentState.units.target.combatState?.kind === 'vehicle'
        ? resolved.currentState.units.target.combatState.state.motive.driverHits
        : undefined,
    ).toBe(1);
  });

  it('emits crit-induced ammo explosions for vehicle ammo crits', () => {
    let session = createGameSession(config(), [
      mechUnit('attacker'),
      {
        ...vehicleUnit({
          turretType: TurretType.SINGLE,
          armor: vehicleArmor({
            [VehicleLocation.FRONT]: 10,
            [VehicleLocation.TURRET]: 0,
          }),
          structure: vehicleArmor({
            [VehicleLocation.FRONT]: 5,
            [VehicleLocation.TURRET]: 10,
          }),
        }),
        ammoConstruction: [
          {
            binId: 'ac10-turret',
            weaponType: 'AC/10',
            location: VehicleLocation.TURRET,
            maxRounds: 5,
            damagePerRound: 10,
            isExplosive: true,
          },
        ],
      },
    ]);
    session = markTargetHullDown(session);
    const diceRoller = diceRollerFor([[6, 6]]);
    const d6Roller = d6RollerFor([5, 6]);

    const resolved = resolveAttack(
      session,
      attackEvent(session.id, session.events.length),
      diceRoller,
      d6Roller,
    );

    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.AmmoExplosion,
      ),
    ).toBe(true);
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.UnitDestroyed,
      ),
    ).toBe(true);
    expect(resolved.currentState.units.target.destroyed).toBe(true);
    expect(
      resolved.currentState.units.target.combatState?.kind === 'vehicle'
        ? resolved.currentState.units.target.combatState.state.destructionCause
        : undefined,
    ).toBe('ammo_explosion');
  });

  it('falls through turret ammo crits when no explosive ammo is represented', () => {
    let session = createGameSession(config(), [
      mechUnit('attacker'),
      vehicleUnit({
        turretType: TurretType.SINGLE,
        armor: vehicleArmor({
          [VehicleLocation.FRONT]: 10,
          [VehicleLocation.TURRET]: 0,
        }),
        structure: vehicleArmor({
          [VehicleLocation.FRONT]: 5,
          [VehicleLocation.TURRET]: 10,
        }),
      }),
    ]);
    session = markTargetHullDown(session);
    const diceRoller = diceRollerFor([[6, 6]]);
    const d6Roller = d6RollerFor([5, 6]);

    const resolved = resolveAttack(
      session,
      attackEvent(session.id, session.events.length),
      diceRoller,
      d6Roller,
    );

    const critical = resolved.events.find(
      (event) => event.type === GameEventType.CriticalHitResolved,
    )!;
    expect((critical.payload as ICriticalHitResolvedPayload).effect).toBe(
      'turret_destroyed',
    );
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.AmmoExplosion,
      ),
    ).toBe(false);
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.UnitDestroyed,
      ),
    ).toBe(true);
    expect(resolved.currentState.units.target.destroyed).toBe(true);
    expect(
      resolved.currentState.units.target.combatState?.kind === 'vehicle'
        ? resolved.currentState.units.target.combatState.state.destructionCause
        : undefined,
    ).toBe('turret_destroyed');
  });

  it('front roll 12 kills vehicle crew instead of selecting ammo', () => {
    const session = createGameSession(config(), [
      mechUnit('attacker'),
      {
        ...vehicleUnit({
          engineType: EngineType.ICE,
        }),
        ammoConstruction: [
          {
            binId: 'ac10-front',
            weaponType: 'AC/10',
            location: VehicleLocation.FRONT,
            maxRounds: 5,
            damagePerRound: 10,
            isExplosive: true,
          },
        ],
      },
    ]);
    const diceRoller = diceRollerFor([
      [6, 6],
      [1, 1],
    ]);
    const d6Roller = d6RollerFor([6, 6]);

    const resolved = resolveAttack(
      session,
      attackEvent(session.id),
      diceRoller,
      d6Roller,
    );

    const critical = resolved.events.find(
      (event) => event.type === GameEventType.CriticalHitResolved,
    )!;
    expect((critical.payload as ICriticalHitResolvedPayload).effect).toBe(
      'crew_killed',
    );
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.AmmoExplosion,
      ),
    ).toBe(false);
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.UnitDestroyed,
      ),
    ).toBe(true);
    expect(resolved.currentState.units.target.destroyed).toBe(true);
    expect(
      resolved.currentState.units.target.combatState?.kind === 'vehicle'
        ? resolved.currentState.units.target.combatState.state.destructionCause
        : undefined,
    ).toBe('crew_killed');
  });

  it('uses target weapon availability to fall through front weapon criticals', () => {
    const session = createGameSession(config(), [
      mechUnit('attacker'),
      vehicleUnit({
        criticalAvailability: {
          weaponLocations: [],
          jammableWeaponLocations: [],
          destroyableWeaponLocations: [],
        },
      }),
    ]);
    const diceRoller = diceRollerFor([
      [6, 6],
      [1, 1],
    ]);
    const d6Roller = d6RollerFor([3, 4]);

    const resolved = resolveAttack(
      session,
      attackEvent(session.id),
      diceRoller,
      d6Roller,
    );

    const critical = resolved.events.find(
      (event) => event.type === GameEventType.CriticalHitResolved,
    )!;
    expect((critical.payload as ICriticalHitResolvedPayload).effect).toBe(
      'sensor_hit',
    );
  });

  it('keeps front stabilizer criticals available for represented mounted weapons already unavailable for weapon crits', () => {
    const session = createGameSession(config(), [
      mechUnit('attacker'),
      vehicleUnit({
        criticalAvailability: {
          weaponLocations: [VehicleLocation.FRONT],
          jammableWeaponLocations: [],
          destroyableWeaponLocations: [],
        },
      }),
    ]);
    const diceRoller = diceRollerFor([
      [6, 6],
      [1, 1],
    ]);
    const d6Roller = d6RollerFor([3, 4]);

    const resolved = resolveAttack(
      session,
      attackEvent(session.id),
      diceRoller,
      d6Roller,
    );

    const critical = resolved.events.find(
      (event) => event.type === GameEventType.CriticalHitResolved,
    )!;
    expect((critical.payload as ICriticalHitResolvedPayload).effect).toBe(
      'stabilizer_hit',
    );
  });

  it('uses runtime weapon destruction to reduce represented front weapon availability', () => {
    const session = createGameSession(config(), [
      mechUnit('attacker'),
      vehicleUnit({
        criticalAvailability: frontWeaponCriticalAvailability(),
      }),
    ]);
    const destroyedWeaponSession = resolveAttack(
      session,
      attackEvent(session.id),
      diceRollerFor([
        [6, 6],
        [1, 1],
      ]),
      d6RollerFor([5, 6]),
    );

    const resolved = resolveAttack(
      destroyedWeaponSession,
      attackEvent(
        destroyedWeaponSession.id,
        destroyedWeaponSession.events.length,
      ),
      diceRollerFor([
        [6, 6],
        [1, 1],
      ]),
      d6RollerFor([3, 4]),
    );

    const criticals = resolved.events.filter(
      (event) => event.type === GameEventType.CriticalHitResolved,
    );
    expect(
      (criticals[criticals.length - 1].payload as ICriticalHitResolvedPayload)
        .effect,
    ).toBe('stabilizer_hit');
    expect(
      resolved.currentState.units.target.componentDamage
        ?.vehicleCriticalsByLocation?.[VehicleLocation.FRONT]?.weaponsDestroyed,
    ).toBe(1);
  });

  it('uses runtime stabilizer hits to fall through later front stabilizer criticals', () => {
    const session = createGameSession(config(), [
      mechUnit('attacker'),
      vehicleUnit({
        criticalAvailability: frontWeaponCriticalAvailability(),
      }),
    ]);
    const stabilizerHitSession = resolveAttack(
      session,
      attackEvent(session.id),
      diceRollerFor([
        [6, 6],
        [1, 1],
      ]),
      d6RollerFor([4, 4]),
    );

    const resolved = resolveAttack(
      stabilizerHitSession,
      attackEvent(stabilizerHitSession.id, stabilizerHitSession.events.length),
      diceRollerFor([
        [6, 6],
        [1, 1],
      ]),
      d6RollerFor([4, 4]),
    );

    const criticals = resolved.events.filter(
      (event) => event.type === GameEventType.CriticalHitResolved,
    );
    expect(
      (criticals[criticals.length - 1].payload as ICriticalHitResolvedPayload)
        .effect,
    ).toBe('sensor_hit');
    expect(
      resolved.currentState.units.target.componentDamage
        ?.vehicleCriticalsByLocation?.[VehicleLocation.FRONT]?.stabilizerHit,
    ).toBe(true);
  });
});
