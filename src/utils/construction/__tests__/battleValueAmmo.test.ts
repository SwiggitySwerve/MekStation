import {
  calculateAmmoBVWithExcessiveCap,
  findMatchingWeaponBV,
} from '../battleValueAmmo';

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
