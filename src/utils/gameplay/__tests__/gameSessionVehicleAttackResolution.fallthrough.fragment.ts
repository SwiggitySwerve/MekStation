import type {
  IDamageAppliedPayload,
  IAttackResolvedPayload,
  ICriticalHitResolvedPayload,
} from './gameSessionVehicleAttackResolution.test-helpers';

import {
  EngineType,
  VehicleLocation,
  VTOLLocation,
  GameEventType,
  TurretType,
  createGameSession,
  resolveAttack,
  config,
  mechUnit,
  vehicleUnit,
  frontWeaponCriticalAvailability,
  attackEvent,
  diceRollerFor,
  d6RollerFor,
  markTargetHullDown,
} from './gameSessionVehicleAttackResolution.test-helpers';
describe('resolveAttack vehicle target dispatch', () => {
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
