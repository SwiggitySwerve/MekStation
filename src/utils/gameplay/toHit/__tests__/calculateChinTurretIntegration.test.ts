/**
 * Integration tests for `calculateToHit` + chin-turret pivot wiring.
 *
 * Closes the integration gap left by the Tier 5 audit-cleanup wave: the
 * `calculateChinTurretPivotModifier` utility was tested in isolation
 * (`vehicleModifiers.test.ts`) but never composed into the to-hit
 * accumulator. These tests assert that, when the attacker state carries
 * the vehicle-only chin-turret context fields, the +1 modifier appears
 * in the final modifier breakdown and the final to-hit reflects it.
 *
 * @spec openspec/specs/firing-arc-calculation/spec.md
 *   Requirement: Vehicle Chin Turret Pivot Penalty
 */

import { describe, expect, it } from '@jest/globals';

import { VehicleLocation } from '@/types/construction/UnitLocation';
import {
  MovementType,
  RangeBracket,
  type IAttackerState,
  type ITargetState,
} from '@/types/gameplay';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { calculateToHit } from '../calculate';

// ---------------------------------------------------------------------------
// Fixtures — minimal stationary attacker / target so the chin-turret penalty
// is the only optional modifier in play.
// ---------------------------------------------------------------------------

const baseTarget: ITargetState = {
  movementType: MovementType.Stationary,
  hexesMoved: 0,
  prone: false,
  immobile: false,
  partialCover: false,
};

function vehicleAttacker(
  overrides: Partial<IAttackerState> = {},
): IAttackerState {
  return {
    gunnery: 4,
    movementType: MovementType.Stationary,
    heat: 0,
    damageModifiers: [],
    ...overrides,
  };
}

describe('calculateToHit — chin-turret pivot integration', () => {
  it('includes the +1 chin-turret modifier when a chin-turret weapon fires after pivoting', () => {
    const attacker = vehicleAttacker({
      vehicleTurretType: TurretType.CHIN,
      vehicleTurretPivotedThisTurn: true,
      vehicleWeaponMountLocation: VehicleLocation.TURRET,
      vehicleWeaponIsTurretMounted: true,
    });

    const result = calculateToHit(attacker, baseTarget, RangeBracket.Short, 3);

    const chinMod = result.modifiers.find(
      (m) => m.name === 'Chin Turret Pivot',
    );
    expect(chinMod).toBeDefined();
    expect(chinMod?.value).toBe(1);

    // Sanity: stationary 4-gunnery, short range, stationary target, no other
    // modifiers fire — base 4 + short-range 0 + attacker movement 0 + TMM 0
    // + heat 0 + chin-turret +1 = 5. Confirms the modifier was actually
    // summed into the final to-hit, not just present in the list.
    expect(result.finalToHit).toBe(5);
  });

  it('omits the chin-turret modifier when the chin turret did NOT pivot this turn', () => {
    const attacker = vehicleAttacker({
      vehicleTurretType: TurretType.CHIN,
      vehicleTurretPivotedThisTurn: false,
      vehicleWeaponMountLocation: VehicleLocation.TURRET,
      vehicleWeaponIsTurretMounted: true,
    });

    const result = calculateToHit(attacker, baseTarget, RangeBracket.Short, 3);

    expect(
      result.modifiers.find((m) => m.name === 'Chin Turret Pivot'),
    ).toBeUndefined();
    // Without the chin-turret penalty: 4 + 0 + 0 + 0 + 0 = 4.
    expect(result.finalToHit).toBe(4);
  });

  it('omits the chin-turret modifier for body-mounted weapons even when the chin turret pivoted', () => {
    const attacker = vehicleAttacker({
      vehicleTurretType: TurretType.CHIN,
      vehicleTurretPivotedThisTurn: true,
      vehicleWeaponMountLocation: VehicleLocation.FRONT,
      vehicleWeaponIsTurretMounted: false,
    });

    const result = calculateToHit(attacker, baseTarget, RangeBracket.Short, 3);

    expect(
      result.modifiers.find((m) => m.name === 'Chin Turret Pivot'),
    ).toBeUndefined();
    expect(result.finalToHit).toBe(4);
  });

  it('omits the chin-turret modifier for non-CHIN turret types (Single, Dual)', () => {
    const single = calculateToHit(
      vehicleAttacker({
        vehicleTurretType: TurretType.SINGLE,
        vehicleTurretPivotedThisTurn: true,
        vehicleWeaponMountLocation: VehicleLocation.TURRET,
        vehicleWeaponIsTurretMounted: true,
      }),
      baseTarget,
      RangeBracket.Short,
      3,
    );
    expect(
      single.modifiers.find((m) => m.name === 'Chin Turret Pivot'),
    ).toBeUndefined();
    expect(single.finalToHit).toBe(4);

    const dual = calculateToHit(
      vehicleAttacker({
        vehicleTurretType: TurretType.DUAL,
        vehicleTurretPivotedThisTurn: true,
        vehicleWeaponMountLocation: VehicleLocation.TURRET,
        vehicleWeaponIsTurretMounted: true,
      }),
      baseTarget,
      RangeBracket.Short,
      3,
    );
    expect(
      dual.modifiers.find((m) => m.name === 'Chin Turret Pivot'),
    ).toBeUndefined();
    expect(dual.finalToHit).toBe(4);
  });

  it('does not fire the chin-turret modifier for a mech attacker (no vehicle fields supplied)', () => {
    // A bare mech attacker has none of the vehicle-* fields. The whole
    // chin-turret branch should be skipped, leaving the to-hit unchanged.
    const mech = vehicleAttacker();
    const result = calculateToHit(mech, baseTarget, RangeBracket.Short, 3);

    expect(
      result.modifiers.find((m) => m.name === 'Chin Turret Pivot'),
    ).toBeUndefined();
    expect(result.finalToHit).toBe(4);
  });
});
