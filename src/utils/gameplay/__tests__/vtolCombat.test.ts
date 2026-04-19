/**
 * VTOL combat helpers tests.
 *
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/combat-resolution/spec.md
 *   #requirement vehicle-hit-location-tables (VTOL rotor)
 */

import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import { createVehicleCombatState } from '../vehicleDamage';
import {
  reduceAltitude,
  resolveVTOLCrash,
  rotorDamageTriggersCrashCheck,
} from '../vtolCombat';

function mkVTOL(altitude: number) {
  return createVehicleCombatState({
    unitId: 'vtol-1',
    motionType: GroundMotionType.VTOL,
    originalCruiseMP: 8,
    altitude,
    armor: {
      [VTOLLocation.ROTOR]: 2,
    } as Partial<Record<VehicleLocation | VTOLLocation, number>>,
    structure: {
      [VTOLLocation.ROTOR]: 2,
    } as Partial<Record<VehicleLocation | VTOLLocation, number>>,
  });
}

describe('vtolCombat', () => {
  describe('resolveVTOLCrash', () => {
    it('fall damage = 10 × altitude', () => {
      expect(resolveVTOLCrash(mkVTOL(0)).fallDamage).toBe(0);
      expect(resolveVTOLCrash(mkVTOL(3)).fallDamage).toBe(30);
      expect(resolveVTOLCrash(mkVTOL(5)).fallDamage).toBe(50);
    });

    it('always flags crashed=true', () => {
      expect(resolveVTOLCrash(mkVTOL(2)).crashed).toBe(true);
    });

    it('records altitudeAtCrash', () => {
      expect(resolveVTOLCrash(mkVTOL(4)).altitudeAtCrash).toBe(4);
    });

    it('undefined altitude → 0 fall damage', () => {
      const state = createVehicleCombatState({
        unitId: 'vtol-no-alt',
        motionType: GroundMotionType.VTOL,
        originalCruiseMP: 8,
        armor: {} as Partial<Record<VehicleLocation | VTOLLocation, number>>,
        structure: {} as Partial<
          Record<VehicleLocation | VTOLLocation, number>
        >,
      });
      expect(resolveVTOLCrash(state).fallDamage).toBe(0);
    });
  });

  describe('rotorDamageTriggersCrashCheck', () => {
    it('rotor + structure damage → true', () => {
      expect(
        rotorDamageTriggersCrashCheck({
          location: VTOLLocation.ROTOR,
          structureDamage: 1,
          destroyed: false,
        }),
      ).toBe(true);
    });

    it('rotor + destroyed → true even with no structure damage', () => {
      expect(
        rotorDamageTriggersCrashCheck({
          location: VTOLLocation.ROTOR,
          structureDamage: 0,
          destroyed: true,
        }),
      ).toBe(true);
    });

    it('rotor + armor-only (no structure, not destroyed) → false', () => {
      expect(
        rotorDamageTriggersCrashCheck({
          location: VTOLLocation.ROTOR,
          structureDamage: 0,
          destroyed: false,
        }),
      ).toBe(false);
    });

    it('non-rotor location → false', () => {
      expect(
        rotorDamageTriggersCrashCheck({
          location: VehicleLocation.FRONT,
          structureDamage: 5,
          destroyed: true,
        }),
      ).toBe(false);
    });
  });

  describe('reduceAltitude', () => {
    it('reduces by delta', () => {
      const next = reduceAltitude(mkVTOL(5), 2);
      expect(next.altitude).toBe(3);
    });

    it('clamps to 0 on overshoot', () => {
      const next = reduceAltitude(mkVTOL(2), 5);
      expect(next.altitude).toBe(0);
    });

    it('handles undefined altitude (treats as 0)', () => {
      const state = createVehicleCombatState({
        unitId: 'x',
        motionType: GroundMotionType.VTOL,
        originalCruiseMP: 8,
        armor: {} as Partial<Record<VehicleLocation | VTOLLocation, number>>,
        structure: {} as Partial<
          Record<VehicleLocation | VTOLLocation, number>
        >,
      });
      const next = reduceAltitude(state, 2);
      expect(next.altitude).toBe(0);
    });
  });
});
