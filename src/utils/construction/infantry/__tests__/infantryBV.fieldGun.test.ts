import { InfantryMotive } from '@/types/unit/InfantryInterfaces';

import {
  calculateInfantryBV,
  calculateInfantryFieldGunBV,
} from '../infantryBV';
import { baseInput } from './infantryBV.test.helpers';

describe('Infantry Field Gun BV Addition (spec.md Infantry Field Gun BV Addition)', () => {
  it('AC/5 field gun contributes weapon BV 70 + ammo BV (capped)', () => {
    const result = calculateInfantryFieldGunBV([
      {
        id: 'ac5',
        bvOverride: 70,
        ammo: [
          {
            id: 'isammoac5',
            bvOverride: 9,
            weaponTypeOverride: 'ac5',
          },
        ],
      },
    ]);
    expect(result.weaponBV).toBe(70);
    expect(result.ammoBV).toBe(9);
    expect(result.total).toBe(79);
  });

  it('caps excessive ammo BV at weapon BV', () => {
    const result = calculateInfantryFieldGunBV([
      {
        id: 'ac5',
        bvOverride: 70,
        ammo: [
          {
            id: 'isammoac5',
            bvOverride: 500,
            weaponTypeOverride: 'ac5',
          },
        ],
      },
    ]);
    expect(result.weaponBV).toBe(70);
    expect(result.ammoBV).toBe(70);
    expect(result.total).toBe(140);
  });

  it('returns zero when no field guns are supplied', () => {
    expect(calculateInfantryFieldGunBV(undefined)).toEqual({
      weaponBV: 0,
      ammoBV: 0,
      total: 0,
    });
    expect(calculateInfantryFieldGunBV([])).toEqual({
      weaponBV: 0,
      ammoBV: 0,
      total: 0,
    });
  });

  it('field gun BV is added to platoonBV before pilot multiplier', () => {
    const input = baseInput({
      motive: InfantryMotive.FOOT,
      totalTroopers: 28,
      primaryWeapon: {
        id: 'inf-rifle',
        bvOverride: 10,
        damageDivisor: 1,
      },
      fieldGuns: [
        {
          id: 'ac5',
          bvOverride: 70,
          ammo: [
            {
              id: 'isammoac5',
              bvOverride: 9,
              weaponTypeOverride: 'ac5',
            },
          ],
        },
      ],
      gunnery: 4,
      piloting: 5,
    });
    const result = calculateInfantryBV(input);
    expect(result.fieldGunBV).toBe(79);
    expect(result.platoonBV).toBeCloseTo(359, 5);
    expect(result.final).toBe(359);
  });
});
