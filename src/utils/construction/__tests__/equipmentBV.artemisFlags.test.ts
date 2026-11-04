import { readFileSync } from 'fs';

import { UnitContract } from '@/types/contracts';

import {
  isArtemisCompatibleBVWeapon,
  linkArtemisBVWeapons,
} from '../equipmentBV/weaponLinks';
import { getEquipmentEntry } from '../equipmentBVResolver';

describe('native Artemis-compatible launcher flags', () => {
  // MegaMek 48fcb2f64 ExtendedLRMWeapon.java:52; LRMWeapon.java:72.
  it.each(['extended-lrm-20', 'enhanced-lrm-20', 'lrm-20', 'srm-6', 'mml-9'])(
    '%s carries F_ARTEMIS_COMPATIBLE',
    (id) => expect(isArtemisCompatibleBVWeapon(id)).toBe(true),
  );
  it.each(['mrm-20', 'streak-srm-6', 'medium-laser'])(
    '%s cannot consume an Artemis module',
    (id) => expect(isArtemisCompatibleBVWeapon(id)).toBe(false),
  );
  it('links both Left Side launchers on the real Trutzburg source in order', () => {
    const unit = UnitContract.parse(
      JSON.parse(
        readFileSync('public/data/units/capital/Trutzburg.json', 'utf8'),
      ),
    );
    const mounted = (unit.equipment ?? []).filter(
      (item) => item.location === 'LEFT_SIDE',
    );
    const launchers = mounted.flatMap((item) => {
      // (B) rows are bay headers; these are the two actual launcher rows.
      if (!['extended-lrm-20', 'r-lrm-20'].includes(item.id)) return [];
      const id = getEquipmentEntry(item.id)?.id ?? item.id;
      return ['extended-lrm-20', 'lrm-20'].includes(id)
        ? [
            {
              location: item.location,
              id,
              compatible: isArtemisCompatibleBVWeapon(id),
              artemisType: undefined as 'iv' | 'v' | undefined,
            },
          ]
        : [];
    });
    const links = mounted
      .filter((item) => getEquipmentEntry(item.id)?.id === 'artemisiv')
      .map((item) => ({ location: item.location, type: 'iv' as const }));
    expect(launchers).toHaveLength(2);
    expect(links).toHaveLength(2);
    expect(linkArtemisBVWeapons(launchers, links)).toEqual([]);
    expect(launchers.map((weapon) => weapon.artemisType)).toEqual(['iv', 'iv']);
  });
});
