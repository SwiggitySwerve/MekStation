import { describe, expect, it } from '@jest/globals';

import type { IWeaponStatus } from '@/types/gameplay';

import { VehicleLocation } from '@/types/construction/UnitLocation';
import { FiringArc } from '@/types/gameplay';

import {
  planningWeaponsForSelectedUnit,
  weaponStatusToPlanningWeapon,
} from './GameSessionPage.weaponPlanning';

function makeWeaponStatus(
  overrides: Partial<IWeaponStatus> = {},
): IWeaponStatus {
  return {
    id: 'ml-1',
    name: 'Medium Laser',
    location: 'Right Arm',
    destroyed: false,
    firedThisTurn: false,
    heat: 3,
    damage: 5,
    ranges: {
      short: 3,
      medium: 6,
      long: 9,
    },
    ...overrides,
  };
}

describe('weaponStatusToPlanningWeapon', () => {
  it('maps live weapon status into the attack planning weapon shape', () => {
    const weapon = weaponStatusToPlanningWeapon(
      makeWeaponStatus({
        id: 'ac5-1',
        name: 'AC/5',
        heat: 1,
        damage: '5',
        ammoRemaining: 12,
        ammoMax: 20,
        mountingArc: FiringArc.Left,
        mountingArcs: [FiringArc.Front, FiringArc.Left],
        vehicleMountLocation: VehicleLocation.FRONT,
        vehicleIsTurretMounted: false,
        ranges: {
          short: 6,
          medium: 12,
          long: 18,
          minimum: 3,
        },
      }),
    );

    expect(weapon).toMatchObject({
      id: 'ac5-1',
      name: 'AC/5',
      shortRange: 6,
      mediumRange: 12,
      longRange: 18,
      minRange: 3,
      damage: 5,
      heat: 1,
      ammoPerTon: 20,
      destroyed: false,
      location: 'Right Arm',
      mountingArc: FiringArc.Left,
      mountingArcs: [FiringArc.Front, FiringArc.Left],
      vehicleMountLocation: VehicleLocation.FRONT,
      vehicleIsTurretMounted: false,
    });
  });

  it('treats jammed weapons as disabled for the selector row', () => {
    expect(
      weaponStatusToPlanningWeapon(makeWeaponStatus({ jammed: true }))
        .destroyed,
    ).toBe(true);
  });

  it('keeps weapons without ammo status as energy or unlimited weapons', () => {
    expect(weaponStatusToPlanningWeapon(makeWeaponStatus()).ammoPerTon).toBe(
      -1,
    );
  });
});

describe('planningWeaponsForSelectedUnit', () => {
  it('returns the selected unit weapons for the live attack planning panel', () => {
    const weapons = planningWeaponsForSelectedUnit({
      selectedUnitId: 'unit-a',
      unitWeapons: {
        'unit-a': [makeWeaponStatus({ id: 'laser-a' })],
        'unit-b': [makeWeaponStatus({ id: 'laser-b' })],
      },
    });

    expect(weapons).toHaveLength(1);
    expect(weapons[0]).toMatchObject({ id: 'laser-a' });
  });

  it('returns no weapons when no unit is selected', () => {
    expect(
      planningWeaponsForSelectedUnit({
        selectedUnitId: null,
        unitWeapons: {
          'unit-a': [makeWeaponStatus()],
        },
      }),
    ).toEqual([]);
  });
});
