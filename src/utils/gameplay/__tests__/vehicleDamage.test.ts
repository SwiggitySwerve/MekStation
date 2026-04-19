/**
 * Vehicle damage pipeline tests.
 *
 * Covers:
 *  - Armor → structure → no-transfer chain (task 3.1–3.3)
 *  - Location destruction → vehicle destroyed on fatal loc (task 3.4)
 *  - Motive roll triggers on structure exposure / any-hit for Hover (task 4.1/4.6)
 *  - Turret destruction does NOT destroy vehicle
 *  - Rotor destruction → crash check + immobilized (task 7.2)
 *
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/combat-resolution/spec.md
 */

import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import { IVehicleHitLocationResult } from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import { motiveDamageFromRoll } from '../motiveDamage';
import {
  createVehicleCombatState,
  vehicleResolveDamage,
} from '../vehicleDamage';

function mkHit(
  location: IVehicleHitLocationResult['location'],
  direction: IVehicleHitLocationResult['direction'] = 'front',
  roll = 7,
  isTAC = false,
): IVehicleHitLocationResult {
  return {
    dice: [3, 4],
    roll,
    direction,
    location,
    isTAC,
  };
}

function mkState() {
  return createVehicleCombatState({
    unitId: 'tank-1',
    motionType: GroundMotionType.TRACKED,
    originalCruiseMP: 4,
    armor: {
      [VehicleLocation.FRONT]: 10,
      [VehicleLocation.LEFT]: 8,
      [VehicleLocation.RIGHT]: 8,
      [VehicleLocation.REAR]: 6,
      [VehicleLocation.TURRET]: 8,
      [VehicleLocation.BODY]: 0,
    } as Partial<Record<VehicleLocation | VTOLLocation, number>>,
    structure: {
      [VehicleLocation.FRONT]: 5,
      [VehicleLocation.LEFT]: 5,
      [VehicleLocation.RIGHT]: 5,
      [VehicleLocation.REAR]: 5,
      [VehicleLocation.TURRET]: 5,
      [VehicleLocation.BODY]: 5,
    } as Partial<Record<VehicleLocation | VTOLLocation, number>>,
  });
}

describe('vehicleDamage', () => {
  describe('armor → structure transfer (tasks 3.1, 3.2)', () => {
    it('small damage to armor only — no structure exposure, no motive roll', () => {
      const state = mkState();
      const result = vehicleResolveDamage(state, mkHit('front'), 3);

      const loc = result.locationDamages[0];
      expect(loc.armorDamage).toBe(3);
      expect(loc.structureDamage).toBe(0);
      expect(loc.armorRemaining).toBe(7);
      expect(loc.structureExposed).toBe(false);
      expect(result.motiveRoll).toBeUndefined();
    });

    it('damage > armor → structure exposed + motive roll triggered', () => {
      const state = mkState();
      const result = vehicleResolveDamage(state, mkHit('front'), 12, {
        forcedMotiveRoll: motiveDamageFromRoll([3, 4]), // minor -1
      });

      const loc = result.locationDamages[0];
      expect(loc.armorDamage).toBe(10);
      expect(loc.structureDamage).toBe(2);
      expect(loc.structureExposed).toBe(true);
      expect(result.motiveRoll?.severity).toBe('minor');
      expect(result.state.motive.penaltyMP).toBe(1);
    });
  });

  describe('no-adjacent-transfer (task 3.3)', () => {
    it('overflow damage past structure does NOT transfer to another location', () => {
      const state = mkState();
      const result = vehicleResolveDamage(state, mkHit('front'), 100, {
        forcedMotiveRoll: motiveDamageFromRoll([3, 3]),
      });

      expect(result.locationDamages).toHaveLength(1);
      expect(result.locationDamages[0].location).toBe(VehicleLocation.FRONT);
      expect(result.locationDamages[0].destroyed).toBe(true);
      // Other locations untouched.
      expect(
        (result.state.armor as Record<string, number>)[VehicleLocation.LEFT],
      ).toBe(8);
    });
  });

  describe('destruction (task 3.4)', () => {
    it('fatal-location destruction destroys the vehicle', () => {
      const state = mkState();
      const result = vehicleResolveDamage(state, mkHit('front'), 100, {
        forcedMotiveRoll: motiveDamageFromRoll([3, 3]),
      });
      expect(result.unitDestroyed).toBe(true);
      expect(result.destructionCause).toBe('damage');
    });

    it('turret destruction does NOT destroy the vehicle', () => {
      const state = mkState();
      const result = vehicleResolveDamage(
        state,
        mkHit('turret', 'front', 10),
        100,
      );
      const locDmg = result.locationDamages[0];
      expect(locDmg.location).toBe(VehicleLocation.TURRET);
      expect(locDmg.destroyed).toBe(true);
      expect(result.unitDestroyed).toBe(false);
    });
  });

  describe('motive roll policy (task 4.1, 4.6)', () => {
    it('armor-only hit on a Tracked vehicle does NOT trigger a roll', () => {
      const state = mkState();
      const result = vehicleResolveDamage(state, mkHit('left_side'), 4);
      expect(result.motiveRoll).toBeUndefined();
    });

    it('armor-only hit on a Hover vehicle DOES trigger a roll (any hit)', () => {
      const state = {
        ...mkState(),
        motionType: GroundMotionType.HOVER,
      };
      const result = vehicleResolveDamage(state, mkHit('left_side'), 4, {
        forcedMotiveRoll: motiveDamageFromRoll([3, 3]), // minor
      });
      expect(result.motiveRoll).toBeDefined();
      expect(result.motiveRoll?.severity).toBe('minor');
    });

    it('turret hit does NOT trigger motive roll even with structure exposure', () => {
      const state = mkState();
      const result = vehicleResolveDamage(state, mkHit('turret'), 100);
      expect(result.motiveRoll).toBeUndefined();
    });
  });

  describe('VTOL rotor (task 7.2)', () => {
    it('rotor damage triggers crash check and immobilizes the VTOL', () => {
      const state = createVehicleCombatState({
        unitId: 'vtol-1',
        motionType: GroundMotionType.VTOL,
        originalCruiseMP: 8,
        altitude: 3,
        armor: {
          [VTOLLocation.ROTOR]: 2,
          [VTOLLocation.FRONT]: 6,
        } as Partial<Record<VehicleLocation | VTOLLocation, number>>,
        structure: {
          [VTOLLocation.ROTOR]: 2,
          [VTOLLocation.FRONT]: 5,
        } as Partial<Record<VehicleLocation | VTOLLocation, number>>,
      });

      const result = vehicleResolveDamage(state, mkHit('rotor'), 5);
      expect(result.crashCheckTriggered).toBe(true);
      expect(result.state.motive.immobilized).toBe(true);
    });
  });

  describe('aggravation (task 5)', () => {
    it('wheeled heavy motive is aggravated to immobilized', () => {
      const state = {
        ...mkState(),
        motionType: GroundMotionType.WHEELED,
      };
      const result = vehicleResolveDamage(state, mkHit('front'), 12, {
        forcedMotiveRoll: motiveDamageFromRoll([5, 5]), // heavy
      });
      expect(result.motiveRoll?.severity).toBe('immobilized');
      expect(result.state.motive.immobilized).toBe(true);
    });

    it('naval heavy sets sinking flag', () => {
      const state = {
        ...mkState(),
        motionType: GroundMotionType.NAVAL,
      };
      const result = vehicleResolveDamage(state, mkHit('front'), 12, {
        forcedMotiveRoll: motiveDamageFromRoll([5, 5]), // heavy
      });
      expect(result.state.motive.sinking).toBe(true);
    });
  });
});
