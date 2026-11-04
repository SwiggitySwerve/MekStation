import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { calculateUnitBV } from '@/utils/construction/bvAdapter';

import { calculateInfantryFieldGunBV } from '../infantryBV';

describe('native infantry field-gun ammunition pools', () => {
  // MegaMek 48fcb2f64 BVCalculator.java:1199,1233: AmmoType:rackSize.
  it.each([
    ['field-gunners-lbx2', 225],
    ['clan-field-gun-point-motorized-ap-gauss-advanced', 298],
  ])('%s retains its ammunition and matches pinned Java BV', (id, expected) => {
    const unit = getNodeCanonicalUnitService().getByIdSync(`infantry:${id}`);
    expect(unit).not.toBeNull();
    expect(calculateUnitBV(unit)).toBe(expected);
  });

  it('caps unlike native bin spellings against the same weapon pool', () => {
    expect(
      calculateInfantryFieldGunBV([
        {
          id: 'lb-2-x-ac',
          bvOverride: 42,
          ammo: [{ id: 'is-lb-2-x-cluster-ammo-registry', bvOverride: 50 }],
        },
      ]),
    ).toEqual({ weaponBV: 42, ammoBV: 42, total: 84 });
  });

  it('keeps explicit caller grouping for unregistered ammunition', () => {
    expect(
      calculateInfantryFieldGunBV([
        {
          id: 'ac5',
          bvOverride: 70,
          ammo: [
            { id: 'custom-bin', bvOverride: 9, weaponTypeOverride: 'ac5' },
          ],
        },
      ]).ammoBV,
    ).toBe(9);
  });
});
