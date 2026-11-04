import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';

import { calculateUnitBV } from '../bvAdapter';
import { baseInput } from '../vehicle/__tests__/vehicleBV.test.helpers';
import { calculateVehicleOffensiveBV } from '../vehicle/vehicleBVOffensive';

// MegaMek 48fcb2f64 BVCalculator.java:861-877 defines each linked multiplier.
describe('shared linked weapon BV multipliers', () => {
  it('links RISC to its immediate preceding eligible laser', () => {
    const weapons = ['medium-laser', 'large-laser'].map((id) => ({
      id,
      location: 'front',
    }));
    const input = baseInput({
      weapons,
      armorEquipment: [
        ...weapons,
        { id: 'risclaserpulsemodule', location: 'front' },
      ],
    });
    expect(calculateVehicleOffensiveBV(input).weaponBV).toBeCloseTo(
      46 + 123 * 1.15,
    );
  });
  it.each([
    ['artemisiv', 'lrm-20', 181, 1.2],
    ['artemisv', 'lrm-20', 181, 1.3],
    ['artemisivproto', 'lrm-20', 181, 1.1],
    ['apollo', 'mrm-20', 112, 1.15],
    ['risclaserpulsemodule', 'large-laser', 123, 1.15],
  ] as const)(
    '%s applies its pinned multiplier to %s',
    (module, weapon, bv, multiplier) => {
      const weapons = [{ id: weapon, location: 'front' }];
      expect(
        calculateVehicleOffensiveBV(
          baseInput({
            weapons,
            armorEquipment: [...weapons, { id: module, location: 'front' }],
          }),
        ).weaponBV,
      ).toBeCloseTo(bv * multiplier);
    },
  );
  it.each([
    ['vehicles:harasser-missile-platform-marian}', 487],
    ['vehicles:mamono-ifv', 1422],
    ['aerospace:oo-suzumebachi', 1750],
  ] as const)('%s matches pinned Java', (id, expected) => {
    const unit = getNodeCanonicalUnitService().getByIdSync(id);
    expect(unit).not.toBeNull();
    expect(calculateUnitBV(unit)).toBe(expected);
  });
});
