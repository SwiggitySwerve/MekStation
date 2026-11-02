/**
 * Owner ruling 2026-11-02, question 1 (OWNER-RULINGS-20261030.md, last section):
 * equipment catalog values that differed from pinned MegaMek 48fcb2f6 are
 * corrected, each cited. These rows pin every corrected value to its Java line.
 */
import { getAmmunitionEntry, resolveEquipmentBV } from '../equipmentBVResolver';

// [catalog id, pinned Java BV, citation in megamek/common/equipment/AmmoType.java]
const AMMO_VALUES = [
  ['uac-2-ammo', 7, 'createISUltra2Ammo ammo.bv = 7 (AmmoType.java:5630)'],
  ['uac-5-ammo', 14, 'createISUltra5Ammo ammo.bv = 14 (AmmoType.java:5660)'],
  ['lb-2-x-ammo', 5, 'createISLB2XAmmo ammo.bv = 5 (AmmoType.java:5383)'],
  ['lb-5-x-ammo', 10, 'createISLB5XAmmo ammo.bv = 10 (AmmoType.java:5414)'],
  ['clan-ams-ammo', 22, 'createCLAMSAmmo ammo.bv = 22 (AmmoType.java:4096)'],
] as const;

// [catalog id, pinned Java BV, citation in megamek/common/weapons/artillery]
const WEAPON_VALUES = [
  ['sniper-cannon', 77, 'SniperCannon.java:78 bv = 77'],
  ['thumper-cannon', 41, 'ThumperCannon.java:78 bv = 41'],
] as const;

describe('equipment catalog values match pinned Java (ruling 2026-11-02 q1)', () => {
  it.each(AMMO_VALUES)('%s ammo BV is %s (%s)', (id, bv) => {
    expect(getAmmunitionEntry(id)?.battleValue).toBe(bv);
  });

  it.each(WEAPON_VALUES)('%s weapon BV is %s (%s)', (id, bv) => {
    expect(resolveEquipmentBV(id).battleValue).toBe(bv);
  });
});
