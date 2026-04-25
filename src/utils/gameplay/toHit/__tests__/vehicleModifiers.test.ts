/**
 * Tests for vehicle-specific to-hit modifiers.
 *
 * Closes the half-implemented chin-turret pivot penalty from archived
 * `add-vehicle-combat-behavior` task 9.3. Per design **D2** of
 * tier5-audit-cleanup, the rule is being LANDED (not de-scoped) since the
 * 360° chin-turret arc shipped with the parent change and the penalty is
 * canonical (mirrors MegaMek `Tank.java` chin-turret handling).
 *
 * @spec openspec/changes/tier5-audit-cleanup/specs/firing-arc-calculation/spec.md
 *   Requirement: Vehicle Chin Turret Pivot Penalty
 */

import { describe, expect, it } from '@jest/globals';

import { VehicleLocation } from '@/types/construction/UnitLocation';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { calculateChinTurretPivotModifier } from '../vehicleModifiers';

describe('calculateChinTurretPivotModifier', () => {
  describe('positive cases (penalty applies)', () => {
    it('returns +1 modifier when chin turret pivoted and weapon is turret-mounted', () => {
      const result = calculateChinTurretPivotModifier({
        turretType: TurretType.CHIN,
        turretPivotedThisTurn: true,
        weaponMountLocation: VehicleLocation.TURRET,
        weaponIsTurretMounted: true,
      });

      expect(result).not.toBeNull();
      expect(result?.value).toBe(1);
      expect(result?.name).toBe('Chin Turret Pivot');
      expect(result?.source).toBe('other');
      expect(result?.description).toContain('Chin turret pivoted');
    });
  });

  describe('negative cases (penalty does NOT apply)', () => {
    it('returns null when chin turret did NOT pivot this turn', () => {
      // Same chin-turret weapon, but no pivot occurred -> no penalty.
      const result = calculateChinTurretPivotModifier({
        turretType: TurretType.CHIN,
        turretPivotedThisTurn: false,
        weaponMountLocation: VehicleLocation.TURRET,
        weaponIsTurretMounted: true,
      });

      expect(result).toBeNull();
    });

    it('returns null for body-mounted weapon even when chin turret pivoted', () => {
      // Body weapons don't move with the chin turret -> no penalty.
      const result = calculateChinTurretPivotModifier({
        turretType: TurretType.CHIN,
        turretPivotedThisTurn: true,
        weaponMountLocation: VehicleLocation.FRONT,
        weaponIsTurretMounted: false,
      });

      expect(result).toBeNull();
    });

    it('returns null for sponson-mounted weapon (sponsons are independent of chin turret)', () => {
      const result = calculateChinTurretPivotModifier({
        turretType: TurretType.CHIN,
        turretPivotedThisTurn: true,
        weaponMountLocation: VehicleLocation.LEFT,
        weaponIsTurretMounted: false, // sponson, not main turret
      });

      expect(result).toBeNull();
    });

    it('returns null when turret type is SINGLE (only CHIN qualifies)', () => {
      const result = calculateChinTurretPivotModifier({
        turretType: TurretType.SINGLE,
        turretPivotedThisTurn: true,
        weaponMountLocation: VehicleLocation.TURRET,
        weaponIsTurretMounted: true,
      });

      expect(result).toBeNull();
    });

    it('returns null when turret type is DUAL (only CHIN qualifies)', () => {
      const result = calculateChinTurretPivotModifier({
        turretType: TurretType.DUAL,
        turretPivotedThisTurn: true,
        weaponMountLocation: VehicleLocation.TURRET,
        weaponIsTurretMounted: true,
      });

      expect(result).toBeNull();
    });

    it('returns null when no turret type is supplied', () => {
      const result = calculateChinTurretPivotModifier({
        turretType: undefined,
        turretPivotedThisTurn: true,
        weaponMountLocation: VehicleLocation.TURRET,
        weaponIsTurretMounted: true,
      });

      expect(result).toBeNull();
    });

    it('returns null when turret type is NONE', () => {
      const result = calculateChinTurretPivotModifier({
        turretType: TurretType.NONE,
        turretPivotedThisTurn: true,
        weaponMountLocation: VehicleLocation.TURRET,
        weaponIsTurretMounted: true,
      });

      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles all four spec scenarios as a regression matrix', () => {
      // Spec scenario 1: chin + pivot + turret-mounted weapon -> +1
      expect(
        calculateChinTurretPivotModifier({
          turretType: TurretType.CHIN,
          turretPivotedThisTurn: true,
          weaponMountLocation: VehicleLocation.TURRET,
          weaponIsTurretMounted: true,
        })?.value,
      ).toBe(1);

      // Spec scenario 2: chin + no-pivot + turret-mounted weapon -> no penalty
      expect(
        calculateChinTurretPivotModifier({
          turretType: TurretType.CHIN,
          turretPivotedThisTurn: false,
          weaponMountLocation: VehicleLocation.TURRET,
          weaponIsTurretMounted: true,
        }),
      ).toBeNull();

      // Spec scenario 3: chin + pivot + body weapon -> no penalty
      expect(
        calculateChinTurretPivotModifier({
          turretType: TurretType.CHIN,
          turretPivotedThisTurn: true,
          weaponMountLocation: VehicleLocation.FRONT,
          weaponIsTurretMounted: false,
        }),
      ).toBeNull();

      // Spec scenario 4: chin + pivot + sponson weapon -> no penalty
      expect(
        calculateChinTurretPivotModifier({
          turretType: TurretType.CHIN,
          turretPivotedThisTurn: true,
          weaponMountLocation: VehicleLocation.RIGHT,
          weaponIsTurretMounted: false,
        }),
      ).toBeNull();
    });
  });
});
