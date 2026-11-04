import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';

import { isDirectFireBVWeapon } from '../battleValueWeapons';
import { calculateUnitBV } from '../bvAdapter';

describe('targeting computer eligibility from native weapon flags', () => {
  // MegaMek 48fcb2f64 BVCalculator.java:880 applies TC only to F_DIRECT_FIRE.
  it.each(['rl10', 'rocket-launcher-10', 'ISRocketLauncher10'])(
    '%s is a rocket launcher without F_DIRECT_FIRE',
    (id) => expect(isDirectFireBVWeapon(id)).toBe(false),
  );
  it('matches pinned Java for Partisan 3134 Upgrade', () => {
    const unit = getNodeCanonicalUnitService().getByIdSync(
      'vehicles:partisan-aa-vehicle-3134-upgrade',
    );
    expect(unit).not.toBeNull();
    expect(calculateUnitBV(unit)).toBe(553);
  });
  it('retains direct-fire PPCs and the fallback for unknown legacy fixture IDs', () => {
    expect(isDirectFireBVWeapon('ppc')).toBe(true);
    expect(isDirectFireBVWeapon('fixture-gun')).toBe(true);
  });
});
