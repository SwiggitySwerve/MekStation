/**
 * Vehicle firing arc tests.
 *
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/firing-arc-calculation/spec.md
 */

import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import { FiringArc } from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { createVehicleCombatState } from '../vehicleDamage';
import {
  getTurretArcs,
  getVehicleWeaponArcs,
  isPrimaryTurretLocked,
  isSecondaryTurretLocked,
  VEHICLE_ARC_DEGREES,
} from '../vehicleFiringArc';

describe('vehicleFiringArc', () => {
  describe('VEHICLE_ARC_DEGREES', () => {
    it('Front + Left + Right + Rear = 360', () => {
      const total =
        VEHICLE_ARC_DEGREES[FiringArc.Front] +
        VEHICLE_ARC_DEGREES[FiringArc.Left] +
        VEHICLE_ARC_DEGREES[FiringArc.Right] +
        VEHICLE_ARC_DEGREES[FiringArc.Rear];
      expect(total).toBe(360);
    });

    it('Front & Rear are 60°; Left & Right are 120°', () => {
      expect(VEHICLE_ARC_DEGREES[FiringArc.Front]).toBe(60);
      expect(VEHICLE_ARC_DEGREES[FiringArc.Rear]).toBe(60);
      expect(VEHICLE_ARC_DEGREES[FiringArc.Left]).toBe(120);
      expect(VEHICLE_ARC_DEGREES[FiringArc.Right]).toBe(120);
    });
  });

  describe('getTurretArcs', () => {
    it('SINGLE turret unlocked → 360° (all four arcs)', () => {
      const arcs = getTurretArcs(TurretType.SINGLE, false);
      expect(arcs).toEqual([
        FiringArc.Front,
        FiringArc.Left,
        FiringArc.Right,
        FiringArc.Rear,
      ]);
    });

    it('DUAL / CHIN same as SINGLE (all four)', () => {
      expect(getTurretArcs(TurretType.DUAL, false)).toHaveLength(4);
      expect(getTurretArcs(TurretType.CHIN, false)).toHaveLength(4);
    });

    it('locked turret → Front only', () => {
      expect(getTurretArcs(TurretType.SINGLE, true)).toEqual([FiringArc.Front]);
    });

    it('SPONSON_LEFT → [Front, Left]', () => {
      expect(getTurretArcs(TurretType.SPONSON_LEFT, false)).toEqual([
        FiringArc.Front,
        FiringArc.Left,
      ]);
    });

    it('SPONSON_RIGHT → [Front, Right]', () => {
      expect(getTurretArcs(TurretType.SPONSON_RIGHT, false)).toEqual([
        FiringArc.Front,
        FiringArc.Right,
      ]);
    });

    it('NONE or undefined → []', () => {
      expect(getTurretArcs(TurretType.NONE, false)).toEqual([]);
      expect(getTurretArcs(undefined, false)).toEqual([]);
    });
  });

  describe('getVehicleWeaponArcs — chassis-mounted', () => {
    const base = {
      isTurretMounted: false,
      isSponsonMounted: false,
      turretLocked: false,
    };

    it('FRONT mount → [Front]', () => {
      const r = getVehicleWeaponArcs({
        ...base,
        mountLocation: VehicleLocation.FRONT,
      });
      expect(r).toEqual([FiringArc.Front]);
    });

    it('LEFT mount → [Left]', () => {
      const r = getVehicleWeaponArcs({
        ...base,
        mountLocation: VehicleLocation.LEFT,
      });
      expect(r).toEqual([FiringArc.Left]);
    });

    it('REAR mount → [Rear]', () => {
      const r = getVehicleWeaponArcs({
        ...base,
        mountLocation: VehicleLocation.REAR,
      });
      expect(r).toEqual([FiringArc.Rear]);
    });

    it('TURRET location without isTurretMounted → empty', () => {
      const r = getVehicleWeaponArcs({
        ...base,
        mountLocation: VehicleLocation.TURRET,
      });
      expect(r).toEqual([]);
    });
  });

  describe('getVehicleWeaponArcs — turret-mounted', () => {
    it('primary SINGLE turret unlocked → 360', () => {
      const r = getVehicleWeaponArcs({
        mountLocation: VehicleLocation.TURRET,
        isTurretMounted: true,
        isSponsonMounted: false,
        turretType: TurretType.SINGLE,
        turretLocked: false,
      });
      expect(r).toHaveLength(4);
    });

    it('primary SINGLE turret locked → Front only', () => {
      const r = getVehicleWeaponArcs({
        mountLocation: VehicleLocation.TURRET,
        isTurretMounted: true,
        isSponsonMounted: false,
        turretType: TurretType.SINGLE,
        turretLocked: true,
      });
      expect(r).toEqual([FiringArc.Front]);
    });

    it('secondary turret uses secondaryTurretType and secondaryTurretLocked', () => {
      const r = getVehicleWeaponArcs({
        mountLocation: VehicleLocation.TURRET,
        isTurretMounted: true,
        isSponsonMounted: false,
        turretType: TurretType.SINGLE,
        turretLocked: false,
        isSecondary: true,
        secondaryTurretType: TurretType.SINGLE,
        secondaryTurretLocked: true,
      });
      expect(r).toEqual([FiringArc.Front]);
    });
  });

  describe('getVehicleWeaponArcs — sponson-mounted', () => {
    it('sponson on LEFT side → [Front, Left]', () => {
      const r = getVehicleWeaponArcs({
        mountLocation: VehicleLocation.LEFT,
        isTurretMounted: false,
        isSponsonMounted: true,
        turretLocked: false,
      });
      expect(r).toEqual([FiringArc.Front, FiringArc.Left]);
    });

    it('sponson on RIGHT side → [Front, Right]', () => {
      const r = getVehicleWeaponArcs({
        mountLocation: VehicleLocation.RIGHT,
        isTurretMounted: false,
        isSponsonMounted: true,
        turretLocked: false,
      });
      expect(r).toEqual([FiringArc.Front, FiringArc.Right]);
    });
  });

  describe('lock helpers', () => {
    it('reports primary / secondary lock state from IVehicleCombatState', () => {
      const base = createVehicleCombatState({
        unitId: 'tank',
        motionType: GroundMotionType.TRACKED,
        originalCruiseMP: 4,
        armor: {} as Partial<Record<VehicleLocation | VTOLLocation, number>>,
        structure: {} as Partial<
          Record<VehicleLocation | VTOLLocation, number>
        >,
      });
      expect(isPrimaryTurretLocked(base)).toBe(false);
      expect(isSecondaryTurretLocked(base)).toBe(false);

      const locked = {
        ...base,
        turretLock: { primaryLocked: true, secondaryLocked: false },
      };
      expect(isPrimaryTurretLocked(locked)).toBe(true);
      expect(isSecondaryTurretLocked(locked)).toBe(false);
    });
  });
});
