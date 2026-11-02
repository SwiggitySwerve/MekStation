/**
 * Owner ruling 2026-11-02, question 1 (OWNER-RULINGS-20261030.md, last section):
 * equipment catalog values that differed from pinned MegaMek 48fcb2f6 are
 * corrected, each cited. These rows pin every corrected value to its Java line.
 */
import { getAmmunitionEntry } from '../equipmentBVResolver';

// [catalog id, pinned Java BV, citation in megamek/common/equipment/AmmoType.java]
const AMMO_VALUES = [
  ['uac-2-ammo', 7, 'createISUltra2Ammo ammo.bv = 7 (AmmoType.java:5630)'],
] as const;

describe('equipment catalog values match pinned Java (ruling 2026-11-02 q1)', () => {
  it.each(AMMO_VALUES)('%s ammo BV is %s (%s)', (id, bv) => {
    expect(getAmmunitionEntry(id)?.battleValue).toBe(bv);
  });
});
