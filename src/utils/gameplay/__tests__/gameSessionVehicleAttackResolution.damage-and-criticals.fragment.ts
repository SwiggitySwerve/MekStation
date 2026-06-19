import type {
  IDamageAppliedPayload,
  IAttackResolvedPayload,
  ICriticalHitResolvedPayload,
} from './gameSessionVehicleAttackResolution.test-helpers';

import {
  VehicleLocation,
  VTOLLocation,
  GameEventType,
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
} from './gameSessionVehicleAttackResolution.test-helpers';
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
});
