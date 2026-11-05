import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import { calculateUnitBV } from '../../bvAdapter';
import { calculateVehicleOffensiveBV } from '../vehicleBVOffensive';
import { baseInput } from './vehicleBV.test.helpers';

describe('pinned native six-side rear exemptions', () => {
  // MegaMek 48fcb2f6 CombatVehicleBVCalculator.java:126-129 retains Tank's
  // indices 5/6 (Tank.java:128-130). Six-side turrets are instead at 7/8
  // (SuperHeavyTank.java:69-74; LargeSupportTank.java:68-72).
  it('matches Java 2551 for the rear-dominant Destrier Siege Vehicle', () => {
    const unit = getNodeCanonicalUnitService().getByIdSync(
      'vehicles:destrier-siege-vehicle',
    );
    expect(unit).not.toBeNull();
    expect(calculateUnitBV(unit)).toBe(2551);
  });

  it.each([
    [false, 'Turret'],
    [false, 'Turret 2'],
    [true, 'Turret'],
    [true, 'Turret 2'],
  ] as const)(
    'six-side support=%s %s receives nominal-rear weighting',
    (isSupportVehicle, location) => {
      expect(
        calculateVehicleOffensiveBV(
          baseInput({
            tonnage: 200,
            isSupportVehicle,
            chassisEquipment: ['advanced-fire-control'],
            weapons: [
              { id: 'machine-gun', location: 'Rear', bvOverride: 10 },
              { id: 'ppc', location, isTurretMounted: true, bvOverride: 100 },
            ],
          }),
        ).weaponBV,
      ).toBe(60);
    },
  );

  it.each(['Rear', 'Rear Left'])(
    'reverse orientation still exempts six-side %s',
    (location) => {
      expect(
        calculateVehicleOffensiveBV(
          baseInput({
            tonnage: 200,
            weapons: [
              { id: 'machine-gun', location: 'Rear', bvOverride: 10 },
              { id: 'ppc', location, bvOverride: 100 },
            ],
          }),
        ).weaponBV,
      ).toBe(110);
    },
  );

  it.each([50, 200])(
    'equal front/rear pools leave a %s-ton physical turret at full BV',
    (tonnage) => {
      expect(
        calculateVehicleOffensiveBV(
          baseInput({
            tonnage,
            weapons: [
              { id: 'machine-gun', location: 'Front', bvOverride: 10 },
              { id: 'machine-gun', location: 'Rear', bvOverride: 10 },
              {
                id: 'ppc',
                location: 'Turret',
                isTurretMounted: true,
                bvOverride: 100,
              },
            ],
          }),
        ).weaponBV,
      ).toBe(tonnage === 50 ? 115 : 120);
    },
  );

  it('matches Java 2261 for Devastator II Superheavy Tank', () => {
    const unit = getNodeCanonicalUnitService().getByIdSync(
      'vehicles:devastator-ii-superheavy-tank',
    );
    expect(unit).not.toBeNull();
    expect(calculateUnitBV(unit)).toBe(2261);
  });
  it.each([
    ['Rear', 39],
    ['Rear Left', 39],
  ] as const)(
    '%s preserves the inherited Tank turret-index exemption',
    (location, bv) => {
      const input = baseInput({
        tonnage: 160,
        motionType: GroundMotionType.TRACKED,
        weapons: [
          { id: 'ppc', location: 'Front' },
          { id: 'srm-4', location },
        ],
      });
      expect(calculateVehicleOffensiveBV(input).weaponBV).toBe(176 + bv);
    },
  );
  it('retains the ordinary rear penalty', () => {
    expect(
      calculateVehicleOffensiveBV(
        baseInput({
          tonnage: 50,
          motionType: GroundMotionType.TRACKED,
          weapons: [
            { id: 'ppc', location: 'Front' },
            { id: 'srm-4', location: 'Rear' },
          ],
        }),
      ).weaponBV,
    ).toBe(176 + 39 / 2);
  });
});
