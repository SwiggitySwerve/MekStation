import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import { calculateUnitBV } from '../../bvAdapter';
import { calculateVehicleOffensiveBV } from '../vehicleBVOffensive';
import { baseInput } from './vehicleBV.test.helpers';

describe('pinned native six-side rear exemptions', () => {
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
