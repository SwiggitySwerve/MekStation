/**
 * Vehicle critical-hit resolution tests.
 *
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/combat-resolution/spec.md
 *   #requirement vehicle-critical-hit-table
 */

import { EngineType } from '@/types/construction/EngineType';
import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import {
  applyTurretLocked,
  applyVehicleCritEffect,
  engineHasFuelTank,
  vehicleCritFromRoll,
} from '../vehicleCriticalHitResolution';
import { vehicleCritFromRollForLocation } from '../vehicleCriticalTables';
import { createVehicleCombatState } from '../vehicleDamage';

function mkState() {
  return createVehicleCombatState({
    unitId: 'tank-1',
    motionType: GroundMotionType.TRACKED,
    originalCruiseMP: 4,
    armor: {
      [VehicleLocation.FRONT]: 10,
    } as Partial<Record<VehicleLocation | VTOLLocation, number>>,
    structure: {
      [VehicleLocation.FRONT]: 5,
    } as Partial<Record<VehicleLocation | VTOLLocation, number>>,
  });
}

describe('vehicleCriticalHitResolution', () => {
  describe('vehicleCritFromRoll (2d6 table)', () => {
    const cases: {
      dice: readonly [number, number];
      kind: string;
    }[] = [
      { dice: [1, 1], kind: 'none' }, // 2
      { dice: [2, 2], kind: 'none' }, // 4
      { dice: [2, 3], kind: 'none' }, // 5
      { dice: [3, 3], kind: 'crew_stunned' }, // 6
      { dice: [3, 4], kind: 'weapon_destroyed' }, // 7
      { dice: [4, 4], kind: 'cargo_hit' }, // 8
      { dice: [4, 5], kind: 'driver_hit' }, // 9
      { dice: [5, 5], kind: 'fuel_tank' }, // 10
      { dice: [5, 6], kind: 'engine_hit' }, // 11
      { dice: [6, 6], kind: 'ammo_explosion' }, // 12
    ];

    for (const c of cases) {
      it(`roll ${c.dice[0] + c.dice[1]} -> ${c.kind}`, () => {
        const r = vehicleCritFromRoll(c.dice);
        expect(r.kind).toBe(c.kind);
      });
    }
  });

  describe('engineHasFuelTank', () => {
    it('ICE has fuel tank', () => {
      expect(engineHasFuelTank(EngineType.ICE)).toBe(true);
    });

    it('Fuel Cell has fuel tank', () => {
      expect(engineHasFuelTank(EngineType.FUEL_CELL)).toBe(true);
    });

    it('Standard fusion does NOT', () => {
      expect(engineHasFuelTank(EngineType.STANDARD)).toBe(false);
    });

    it('XL fusion does NOT', () => {
      expect(engineHasFuelTank(EngineType.XL_IS)).toBe(false);
      expect(engineHasFuelTank(EngineType.XL_CLAN)).toBe(false);
    });
  });

  describe('vehicleCritFromRollForLocation', () => {
    it('uses the front vehicle table for crew casualties', () => {
      const r = vehicleCritFromRollForLocation([6, 6], {
        location: VehicleLocation.FRONT,
        motionType: GroundMotionType.TRACKED,
        engineType: EngineType.ICE,
      });

      expect(r.kind).toBe('crew_killed');
    });

    it('uses engine type for rear roll 12 engine/fuel results', () => {
      const ice = vehicleCritFromRollForLocation([6, 6], {
        location: VehicleLocation.REAR,
        motionType: GroundMotionType.TRACKED,
        engineType: EngineType.ICE,
      });
      const fusion = vehicleCritFromRollForLocation([6, 6], {
        location: VehicleLocation.REAR,
        motionType: GroundMotionType.TRACKED,
        engineType: EngineType.STANDARD,
      });

      expect(ice.kind).toBe('fuel_tank');
      expect(fusion.kind).toBe('engine_hit');
    });

    it('maps turret roll 9 to turret locked', () => {
      const r = vehicleCritFromRollForLocation([4, 5], {
        location: VehicleLocation.TURRET,
        motionType: GroundMotionType.TRACKED,
        engineType: EngineType.STANDARD,
      });

      expect(r.kind).toBe('turret_locked');
    });

    it('maps VTOL rotor roll 11 to rotor destroyed', () => {
      const r = vehicleCritFromRollForLocation([5, 6], {
        location: VTOLLocation.ROTOR,
        motionType: GroundMotionType.VTOL,
        engineType: EngineType.STANDARD,
      });

      expect(r.kind).toBe('rotor_destroyed');
    });

    it('falls through unavailable rear ammo into engine/fuel results', () => {
      const noAmmoIce = vehicleCritFromRollForLocation([5, 6], {
        location: VehicleLocation.REAR,
        motionType: GroundMotionType.TRACKED,
        engineType: EngineType.ICE,
        hasAvailableAmmo: false,
      });
      const noAmmoFusion = vehicleCritFromRollForLocation([5, 6], {
        location: VehicleLocation.REAR,
        motionType: GroundMotionType.TRACKED,
        engineType: EngineType.STANDARD,
        hasAvailableAmmo: false,
      });

      expect(noAmmoIce.kind).toBe('fuel_tank');
      expect(noAmmoFusion.kind).toBe('engine_hit');
    });

    it('retries from roll 6 when rear ammo and fusion engine are unavailable', () => {
      const r = vehicleCritFromRollForLocation([5, 6], {
        location: VehicleLocation.REAR,
        motionType: GroundMotionType.TRACKED,
        engineType: EngineType.STANDARD,
        hasAvailableAmmo: false,
        engineAlreadyHit: true,
      });

      expect(r.kind).toBe('weapon_jammed');
    });

    it('falls through unavailable turret ammo into turret destruction', () => {
      const r = vehicleCritFromRollForLocation([5, 6], {
        location: VehicleLocation.TURRET,
        motionType: GroundMotionType.TRACKED,
        engineType: EngineType.STANDARD,
        hasAvailableAmmo: false,
      });

      expect(r.kind).toBe('turret_destroyed');
    });

    it('uses represented crew hit counters for front crew fallthrough', () => {
      const stunned = vehicleCritFromRollForLocation([3, 3], {
        location: VehicleLocation.FRONT,
        motionType: GroundMotionType.TRACKED,
        engineType: EngineType.STANDARD,
        driverAlreadyHit: true,
      });
      const killed = vehicleCritFromRollForLocation([3, 3], {
        location: VehicleLocation.FRONT,
        motionType: GroundMotionType.TRACKED,
        engineType: EngineType.STANDARD,
        driverAlreadyHit: true,
        commanderAlreadyHit: true,
      });

      expect(stunned.kind).toBe('crew_stunned');
      expect(killed.kind).toBe('crew_killed');
    });

    it('falls through front weapon/stabilizer crits when no weapon is present', () => {
      const r = vehicleCritFromRollForLocation([3, 4], {
        location: VehicleLocation.FRONT,
        motionType: GroundMotionType.TRACKED,
        engineType: EngineType.STANDARD,
        hasWeaponAtLocation: false,
      });

      expect(r.kind).toBe('sensor_hit');
    });

    it('keeps stabilizer crits available when only destroyed mounted weapons remain', () => {
      const r = vehicleCritFromRollForLocation([3, 4], {
        location: VehicleLocation.FRONT,
        motionType: GroundMotionType.TRACKED,
        engineType: EngineType.STANDARD,
        hasWeaponAtLocation: true,
        hasJammableWeaponAtLocation: false,
        hasDestroyableWeaponAtLocation: false,
      });

      expect(r.kind).toBe('stabilizer_hit');
    });

    it('falls through rear cargo crits when no cargo is loaded', () => {
      const r = vehicleCritFromRollForLocation([3, 4], {
        location: VehicleLocation.REAR,
        motionType: GroundMotionType.TRACKED,
        engineType: EngineType.STANDARD,
        hasCargoLoaded: false,
        hasWeaponAtLocation: false,
      });

      expect(r.kind).toBe('engine_hit');
    });

    it('falls through rotor damage when a VTOL is already immobile', () => {
      const stabilizer = vehicleCritFromRollForLocation([3, 3], {
        location: VTOLLocation.ROTOR,
        motionType: GroundMotionType.VTOL,
        engineType: EngineType.STANDARD,
        vehicleImmobile: true,
      });
      const rotorDestroyed = vehicleCritFromRollForLocation([3, 3], {
        location: VTOLLocation.ROTOR,
        motionType: GroundMotionType.VTOL,
        engineType: EngineType.STANDARD,
        vehicleImmobile: true,
        flightStabilizerAlreadyHit: true,
      });

      expect(stabilizer.kind).toBe('flight_stabilizer');
      expect(rotorDestroyed.kind).toBe('rotor_destroyed');
    });
  });

  describe('applyVehicleCritEffect', () => {
    it('none leaves state unchanged', () => {
      const state = mkState();
      const r = applyVehicleCritEffect(state, vehicleCritFromRoll([1, 1]), {
        engineType: EngineType.ICE,
        hasAmmoInSlot: false,
      });
      expect(r.state).toBe(state);
      expect(r.ammoExplosion).toBe(false);
    });

    it('crew_stunned adds 2 stunned phases', () => {
      const state = mkState();
      const r = applyVehicleCritEffect(state, vehicleCritFromRoll([3, 3]), {
        engineType: EngineType.ICE,
        hasAmmoInSlot: false,
      });
      expect(r.state.motive.crewStunnedPhases).toBe(2);
    });

    it('driver_hit increments; second kills crew and destroys vehicle', () => {
      let state = mkState();
      state = applyVehicleCritEffect(state, vehicleCritFromRoll([4, 5]), {
        engineType: EngineType.ICE,
        hasAmmoInSlot: false,
      }).state;
      expect(state.motive.driverHits).toBe(1);
      expect(state.destroyed).toBe(false);

      const r2 = applyVehicleCritEffect(state, vehicleCritFromRoll([4, 5]), {
        engineType: EngineType.ICE,
        hasAmmoInSlot: false,
      });
      expect(r2.state.motive.driverHits).toBe(2);
      expect(r2.state.destroyed).toBe(true);
      expect(r2.state.destructionCause).toBe('crew_killed');
    });

    it('engine_hit: first disables, second destroys', () => {
      let state = mkState();
      state = applyVehicleCritEffect(state, vehicleCritFromRoll([5, 6]), {
        engineType: EngineType.STANDARD,
        hasAmmoInSlot: false,
      }).state;
      expect(state.motive.engineHits).toBe(1);
      expect(state.destroyed).toBe(false);

      const r2 = applyVehicleCritEffect(state, vehicleCritFromRoll([5, 6]), {
        engineType: EngineType.STANDARD,
        hasAmmoInSlot: false,
      });
      expect(r2.state.motive.engineHits).toBe(2);
      expect(r2.state.destroyed).toBe(true);
      expect(r2.state.destructionCause).toBe('engine_destroyed');
    });

    it('fuel_tank on ICE destroys the vehicle; on fusion rerolls to none', () => {
      const state = mkState();
      const ice = applyVehicleCritEffect(state, vehicleCritFromRoll([5, 5]), {
        engineType: EngineType.ICE,
        hasAmmoInSlot: false,
      });
      expect(ice.state.destroyed).toBe(true);
      expect(ice.state.destructionCause).toBe('fuel_tank_explosion');

      const fusion = applyVehicleCritEffect(
        state,
        vehicleCritFromRoll([5, 5]),
        { engineType: EngineType.STANDARD, hasAmmoInSlot: false },
      );
      expect(fusion.applied.kind).toBe('none');
      expect(fusion.state).toBe(state);
    });

    it('ammo_explosion explodes if ammo present, otherwise has no effect', () => {
      const state = mkState();
      const withAmmo = applyVehicleCritEffect(
        state,
        vehicleCritFromRoll([6, 6]),
        { engineType: EngineType.ICE, hasAmmoInSlot: true },
      );
      expect(withAmmo.state.destroyed).toBe(true);
      expect(withAmmo.state.destructionCause).toBe('ammo_explosion');
      expect(withAmmo.ammoExplosion).toBe(true);

      const noAmmo = applyVehicleCritEffect(
        state,
        vehicleCritFromRoll([6, 6]),
        { engineType: EngineType.ICE, hasAmmoInSlot: false },
      );
      expect(noAmmo.applied.kind).toBe('none');
      expect(noAmmo.state.destroyed).toBe(false);
    });

    it('turret_locked marks the primary turret as locked', () => {
      const state = mkState();
      const r = applyVehicleCritEffect(
        state,
        vehicleCritFromRollForLocation([4, 5], {
          location: VehicleLocation.TURRET,
          motionType: GroundMotionType.TRACKED,
          engineType: EngineType.STANDARD,
        }),
        { engineType: EngineType.STANDARD, hasAmmoInSlot: false },
      );

      expect(r.state.turretLock.primaryLocked).toBe(true);
      expect(r.state.motive.turretLocked).toBe(true);
    });

    it('rotor_destroyed immobilizes VTOL movement', () => {
      const state = mkState();
      const r = applyVehicleCritEffect(
        state,
        vehicleCritFromRollForLocation([5, 6], {
          location: VTOLLocation.ROTOR,
          motionType: GroundMotionType.VTOL,
          engineType: EngineType.STANDARD,
        }),
        { engineType: EngineType.STANDARD, hasAmmoInSlot: false },
      );

      expect(r.state.motive.immobilized).toBe(true);
    });

    it('destroyed vehicle is idempotent to subsequent crits', () => {
      const state = { ...mkState(), destroyed: true };
      const r = applyVehicleCritEffect(state, vehicleCritFromRoll([6, 6]), {
        engineType: EngineType.ICE,
        hasAmmoInSlot: true,
      });
      expect(r.state).toBe(state);
      expect(r.ammoExplosion).toBe(false);
    });
  });

  describe('applyTurretLocked', () => {
    it('locks primary by default, sets motive.turretLocked', () => {
      const state = mkState();
      const next = applyTurretLocked(state);
      expect(next.turretLock.primaryLocked).toBe(true);
      expect(next.turretLock.secondaryLocked).toBe(false);
      expect(next.motive.turretLocked).toBe(true);
    });

    it('locks secondary when secondary=true; motive.turretLocked unchanged', () => {
      const state = mkState();
      const next = applyTurretLocked(state, true);
      expect(next.turretLock.primaryLocked).toBe(false);
      expect(next.turretLock.secondaryLocked).toBe(true);
      expect(next.motive.turretLocked).toBe(false);
    });
  });
});
