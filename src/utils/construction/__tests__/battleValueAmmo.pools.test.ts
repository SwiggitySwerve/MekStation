import {
  calculateAmmoBVPools,
  calculateAmmoBVWithExcessiveCap,
  projectMechAmmoBVPools,
} from '@/utils/construction/battleValueAmmo';

// BVCalculator.assembleAmmo (48fcb2f64, BVCalculator.java:1189-1242) keys both
// pools by AmmoType:rackSize; ammoMap and weaponsForExcessiveAmmo are uncapped.
describe('native ammo BV pools', () => {
  const weapons = [
    { id: 'ac-5', bv: 70 },
    { id: 'lrm-10', bv: 90 },
    { id: 'medium-laser', bv: 46 },
  ];
  const ammo = [
    { id: 'ammo-ac-5', bv: 9, weaponType: 'ac-5' },
    { id: 'ammo-lrm-10', bv: 11, weaponType: 'lrm-10' },
    { id: 'ammo-lrm-10', bv: 11, weaponType: 'lrm-10' },
    { id: 'ammo-srm-6', bv: 7, weaponType: 'srm-6' },
  ];

  it('reports uncapped available ammo and weapon caps per native group', () => {
    expect(calculateAmmoBVPools(weapons, ammo)).toEqual({
      total: 31,
      available: { 'AC:5': 9, 'LRM:10': 22, 'SRM:6': 7 },
      cap: { 'AC:5': 70, 'LRM:10': 90 },
    });
  });

  it('keeps the capped total identical to the existing owner', () => {
    expect(calculateAmmoBVPools(weapons, ammo).total).toBe(
      calculateAmmoBVWithExcessiveCap(weapons, ammo),
    );
    expect(
      calculateAmmoBVPools(
        [{ id: 'lrm-15', bv: 136 }],
        [{ id: 'lrtorpedo-15-ammo', bv: 17, weaponType: 'lrtorpedo-15' }],
      ).total,
    ).toBe(17);
  });
});

describe('diagnostic cap emission', () => {
  it('preserves compatibility arithmetic separately from diagnostic exclusions', () => {
    expect(
      calculateAmmoBVPools(
        [
          { id: 'srm-2', bv: 21 },
          { id: 'issrm2ios-registry', bv: 4 },
        ],
        [{ id: 'ammo-srm-2', weaponType: 'srm-2', bv: 100 }],
      ),
    ).toEqual({ total: 25, available: { 'SRM:2': 100 }, cap: { 'SRM:2': 21 } });
  });
  it('retains normal empty-launcher caps and excludes one-shot and infantry caps', () => {
    expect(
      calculateAmmoBVPools(
        [
          { id: 'srm-2', bv: 21 },
          { id: 'issrm2ios-registry', bv: 4 },
          { id: 'vehicular-grenade-launcher', bv: 15 },
          { id: 'plasma-rifle-man-portable-registry', bv: 8.08 },
        ],
        [],
      ),
    ).toEqual({ total: 0, available: {}, cap: { 'SRM:2': 21 } });
  });

  it('replaces only the primitive mount compatibility cap without mutating pools', () => {
    const pools = {
      available: { 'AC_PRIMITIVE:10': 15 },
      cap: { 'AC:10': 246 },
    };
    const before = JSON.stringify(pools);
    expect(
      projectMechAmmoBVPools(pools, undefined, undefined, {
        weapons: [{ id: 'ac-10p', bv: 123 }],
        bins: [],
      }),
    ).toEqual({
      available: pools.available,
      cap: { 'AC:10': 123, 'AC_PRIMITIVE:10': 123 },
    });
    expect(JSON.stringify(pools)).toBe(before);
  });
});
