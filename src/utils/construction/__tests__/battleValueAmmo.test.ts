import {
  calculateAmmoBVWithExcessiveCap,
  findMatchingWeaponBV,
  getCatalogAmmoBVGroup,
  extractWeaponTypeFromAmmoId,
} from '../battleValueAmmo';
import { resolveAmmoByPattern } from '../mechBV/ammoResolution';

describe('catalog ammunition cap identities', () => {
  it.each([
    ['ammo-lrm-20', 'lrm-20'],
    ['clan-lrm-20', 'lrm-20'],
    ['clan-lb-10-x-ac', 'lb-10-x'],
    ['lb-10-x-cluster-ammo', 'lb-10-x'],
    ['gauss-rifle', 'gauss'],
    ['gauss-ammo', 'gauss'],
    ['improvedheavygaussrifle', 'improvedheavygauss'],
    ['ammo-lrm', undefined],
    ['unresolved-ammo', undefined],
  ])('groups %s as %s', (id, group) => {
    expect(getCatalogAmmoBVGroup(id)).toBe(group);
  });
});

describe('shared ammunition matching precedence', () => {
  it('retains an exact zero before aliases or technology fallbacks', () => {
    expect(
      findMatchingWeaponBV('lb-2-x', {
        'lb-2-x': 0,
        'lb-2-x-ac': 42,
        'clan-lb-2-x-ac': 47,
      }),
    ).toBe(0);
  });

  it('retains the first exact alias instead of combining aliases', () => {
    expect(
      findMatchingWeaponBV('mortar', {
        'mech-mortar-1': 10,
        'mech-mortar-2': 20,
        'clan-mortar': 30,
      }),
    ).toBe(10);
  });

  it('keeps the original family technology fallback ahead of alias fallbacks', () => {
    expect(
      findMatchingWeaponBV('lb-2-x', {
        'clan-lb-2-x': 7,
        'clan-lb-2-x-ac': 47,
      }),
    ).toBe(7);
  });

  it('preserves numbered torpedo matching', () => {
    expect(findMatchingWeaponBV('lrtorpedo-15', { 'lrm-15': 136 })).toBe(136);
    expect(findMatchingWeaponBV('srtorpedo-4', { 'srm-4': 39 })).toBe(39);
    expect(findMatchingWeaponBV('lrtorpedo-15', { 'lrm-10': 90 })).toBe(0);
  });

  it('preserves unrelated families and the empty ammunition guard', () => {
    expect(findMatchingWeaponBV('lb-2-x', { 'clan-lb-5-x-ac': 93 })).toBe(0);
    expect(
      calculateAmmoBVWithExcessiveCap([{ id: 'CLLBXAC2', bv: 47 }], []),
    ).toBe(0);
  });

  it('groups duplicate weapons and bins before applying the cap', () => {
    expect(
      calculateAmmoBVWithExcessiveCap(
        [
          { id: 'clan-lrm-15', bv: 20 },
          { id: 'clan-lrm-15', bv: 30 },
        ],
        [
          { id: 'first', bv: 40, weaponType: 'lrm-15' },
          { id: 'second', bv: 40, weaponType: 'lrm-15' },
        ],
      ),
    ).toBe(50);
  });
});

describe('Clan weapon ammunition aliases', () => {
  it.each([
    ['CLLBXAC2', 'lb-2-x', 47, 6],
    ['CLLBXAC5', 'lb-5-x', 93, 12],
  ])(
    'retains %s ammunition through the shared cap',
    (id, weaponType, bv, ammoBV) => {
      expect(
        calculateAmmoBVWithExcessiveCap(
          [{ id, bv }],
          [{ id: `${weaponType}-ammo`, weaponType, bv: ammoBV }],
        ),
      ).toBe(ammoBV);
      expect(
        calculateAmmoBVWithExcessiveCap(
          [
            { id, bv },
            { id, bv },
          ],
          [{ id: `${weaponType}-ammo`, weaponType, bv: 1000 }],
        ),
      ).toBe(bv * 2);
    },
  );

  it('retains exact Inner Sphere alias precedence on a mixed-tech unit', () => {
    expect(
      findMatchingWeaponBV('lb-2-x', { 'lb-2-x-ac': 42, 'clan-lb-2-x-ac': 47 }),
    ).toBe(42);
  });

  it('retains the first technology-stripped alias instead of combining alias families', () => {
    expect(
      findMatchingWeaponBV('mortar', {
        'clan-mech-mortar-1': 10,
        'clan-mech-mortar-2': 20,
      }),
    ).toBe(10);
  });

  it('retains rack separation and gives orphaned ammunition no BV', () => {
    expect(
      calculateAmmoBVWithExcessiveCap(
        [{ id: 'CLLBXAC5', bv: 93 }],
        [{ id: 'lb-2-x-ammo', weaponType: 'lb-2-x', bv: 6 }],
      ),
    ).toBe(0);
    expect(
      calculateAmmoBVWithExcessiveCap(
        [],
        [{ id: 'lb-5-x-ammo', weaponType: 'lb-5-x', bv: 12 }],
      ),
    ).toBe(0);
  });
});

// Catalog BV remains authoritative. Values follow pinned Java (owner ruling 2026-11-02 question 1):
// half-ton MG 0.5 (AmmoType.java:6665) and IS Ultra AC/5 14 (AmmoType.java:5660).
describe('ammunition resolution compatibility', () => {
  it.each([
    ['IS Machine Gun Ammo - Half', 0.5, 'machine-gun'],
    ['IS Ultra AC/5 Ammo', 14, 'uac-5'],
    ['Clan Ammo LRM-15', 21, 'lrm-15'],
    ['Clan Heavy Machine Gun Ammo - Full', 1, 'heavy-machine-gun'],
  ])('retains %s catalog BV and derived family', (name, bv, weaponType) => {
    expect(resolveAmmoByPattern(name, 'INNER_SPHERE')).toEqual({
      bv,
      weaponType,
    });
  });
});

describe('ammunition bin family derivation', () => {
  it.each([
    ['clan-heavy-machine-gun-ammo-full', 'heavy-machine-gun'],
    ['light-machine-gun-ammo-half', 'light-machine-gun'],
    ['lrm-15-ammo', 'lrm-15'],
    ['lb-5-x-ac-ammo', 'lb-5-x-ac'],
  ])('derives %s cap family', (id, family) => {
    expect(extractWeaponTypeFromAmmoId(id)).toBe(family);
  });
});

// Java pools are ammoType:rackSize (BVCalculator.java:1190-1240): the Sniper and
// Thumper cannons are not the Sniper and Thumper artillery pieces. Rows traced in
// CAT-Q2 (cannon-cap-trace.json) from the pinned Koschei KSC-6L and Shockwave SKW-8X.
describe('artillery cannon ammunition cap pools', () => {
  it('caps Sniper Cannon ammo by the Sniper Cannon, not Sniper artillery', () => {
    const bin = { id: 'ISSniperCannonAmmo', bv: 10, weaponType: 'sniper' };
    expect(
      calculateAmmoBVWithExcessiveCap(
        [{ id: 'sniper-cannon', bv: 77 }],
        [bin, bin],
      ),
    ).toBe(20);
  });

  it('caps Thumper Cannon ammo by the Thumper Cannon', () => {
    const uac = { id: 'IS Ultra AC/10 Ammo', bv: 26, weaponType: 'uac-10' };
    expect(
      calculateAmmoBVWithExcessiveCap(
        [
          { id: 'thumper-cannon', bv: 41 },
          { id: 'uac-10', bv: 210 },
        ],
        [{ id: 'ISThumperCannonAmmo', bv: 5, weaponType: 'thumper' }, uac, uac],
      ),
    ).toBe(57);
  });

  it('keeps artillery ammo and cannon weapons in separate pools', () => {
    expect(
      calculateAmmoBVWithExcessiveCap(
        [{ id: 'sniper-cannon', bv: 77 }],
        [{ id: 'ISSniperAmmo', bv: 11, weaponType: 'sniper' }],
      ),
    ).toBe(0);
    expect(
      calculateAmmoBVWithExcessiveCap(
        [{ id: 'issniper-registry', bv: 85 }],
        [{ id: 'ISSniperAmmo', bv: 11, weaponType: 'sniper' }],
      ),
    ).toBe(11);
  });
});
