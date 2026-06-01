import {
  INDIRECT_FIRE_AIRBORNE_TARGET_REJECTION,
  calculateGroundToAirAltitudeModifier,
  getAerospaceAltitudeTier,
  groundToAirIndirectWeaponBlockedReason,
} from '../groundToAir';
import { createAerospaceCombatState } from '../state';

function groundUnit() {
  return { combatState: undefined };
}

function aeroUnit(altitude: number) {
  return {
    combatState: {
      kind: 'aero' as const,
      state: createAerospaceCombatState({
        maxSI: 10,
        armorByArc: { nose: 10, leftWing: 8, rightWing: 8, aft: 6 },
        heatSinks: 10,
        fuelPoints: 20,
        safeThrust: 6,
        maxThrust: 9,
        altitude,
      }),
    },
  };
}

describe('ground-to-air aerospace altitude modifier', () => {
  it.each([
    [0, null],
    [1, 'low'],
    [3, 'low'],
    [4, 'medium'],
    [6, 'medium'],
    [7, 'high'],
    [10, 'high'],
    [11, 'high'],
  ] as const)('classifies altitude %i as %s', (altitude, tier) => {
    expect(getAerospaceAltitudeTier(altitude)).toBe(tier);
  });

  it('adds the OpenSpec ground-to-air penalty for a high-altitude aero target', () => {
    expect(
      calculateGroundToAirAltitudeModifier(groundUnit(), aeroUnit(7)),
    ).toEqual({
      name: 'Ground-to-air altitude',
      value: 3,
      source: 'other',
      description: 'Airborne aerospace target at altitude 7 (high tier): +3',
    });
  });

  it('does not apply when the target is grounded or the attacker is airborne', () => {
    expect(
      calculateGroundToAirAltitudeModifier(groundUnit(), aeroUnit(0)),
    ).toBeNull();
    expect(
      calculateGroundToAirAltitudeModifier(aeroUnit(4), aeroUnit(7)),
    ).toBeNull();
  });

  it('blocks indirect-fire-capable weapons in indirect mode against airborne aerospace targets', () => {
    expect(
      groundToAirIndirectWeaponBlockedReason(groundUnit(), aeroUnit(3), {
        id: 'minimum-lrm',
        mode: 'Indirect',
      }),
    ).toBe(INDIRECT_FIRE_AIRBORNE_TARGET_REJECTION);
  });

  it('does not block direct shots, airborne attackers, or grounded targets', () => {
    expect(
      groundToAirIndirectWeaponBlockedReason(groundUnit(), aeroUnit(3), {
        id: 'minimum-lrm',
        mode: 'Direct',
      }),
    ).toBeUndefined();
    expect(
      groundToAirIndirectWeaponBlockedReason(aeroUnit(4), aeroUnit(3), {
        id: 'minimum-lrm',
        mode: 'Indirect',
      }),
    ).toBeUndefined();
    expect(
      groundToAirIndirectWeaponBlockedReason(groundUnit(), aeroUnit(0), {
        id: 'minimum-lrm',
        mode: 'Indirect',
      }),
    ).toBeUndefined();
  });
});
