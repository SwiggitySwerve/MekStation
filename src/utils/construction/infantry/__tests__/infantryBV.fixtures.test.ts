import { InfantryMotive } from '@/types/unit/InfantryInterfaces';
import { InfantryArmorKit } from '@/types/unit/PersonnelInterfaces';

import { calculateInfantryBV } from '../infantryBV';
import { baseInput } from './infantryBV.test.helpers';

describe('Tasks.md 8.2 fixtures end-to-end', () => {
  it('Foot Rifle Platoon computes a non-zero final BV', () => {
    const input = baseInput({
      motive: InfantryMotive.FOOT,
      totalTroopers: 28,
      primaryWeapon: {
        id: 'inf-rifle',
        bvOverride: 1.5,
        damageDivisor: 10,
      },
      armorKit: InfantryArmorKit.NONE,
    });
    const result = calculateInfantryBV(input);
    expect(result.final).toBeGreaterThan(0);
    expect(result.perTrooper).toBeCloseTo(0.15, 5);
    expect(result.platoonBV).toBeCloseTo(4.2, 5);
  });

  it('Jump SRM Platoon applies motive 1.1 + secondary ratio', () => {
    const input = baseInput({
      motive: InfantryMotive.JUMP,
      totalTroopers: 25,
      primaryWeapon: {
        id: 'inf-auto-rifle',
        bvOverride: 2,
        damageDivisor: 10,
      },
      secondaryWeapon: {
        id: 'inf-srm2',
        bvOverride: 25,
        damageDivisor: 6,
        secondaryRatio: 4,
      },
    });
    const result = calculateInfantryBV(input);
    expect(result.motiveMultiplier).toBe(1.1);
    expect(result.perTrooper).toBeCloseTo(0.2 + (25 / 6) * (1 / 4), 5);
  });

  it('Mechanized MG Platoon applies motive 1.15', () => {
    const input = baseInput({
      motive: InfantryMotive.MECHANIZED_TRACKED,
      totalTroopers: 20,
      primaryWeapon: {
        id: 'inf-mg',
        bvOverride: 5,
        damageDivisor: 10,
      },
      armorKit: InfantryArmorKit.FLAK,
    });
    const result = calculateInfantryBV(input);
    expect(result.motiveMultiplier).toBe(1.15);
    expect(result.perTrooper).toBeCloseTo(2.5, 5);
  });

  it('Foot Field Gun AC/5 adds full gun BV to platoon total', () => {
    const input = baseInput({
      motive: InfantryMotive.FOOT,
      totalTroopers: 28,
      primaryWeapon: {
        id: 'inf-rifle',
        bvOverride: 1.5,
        damageDivisor: 10,
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
    });
    const result = calculateInfantryBV(input);
    expect(result.fieldGunBV).toBe(79);
    expect(result.platoonBV).toBeCloseTo(83.2, 5);
  });
});
