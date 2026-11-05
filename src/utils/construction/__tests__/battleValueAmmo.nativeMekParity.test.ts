import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { calculateAmmoBVWithExcessiveCap } from '@/utils/construction/battleValueAmmo';
import { calculateUnitBV } from '@/utils/construction/bvAdapter';

// MegaMek 48fcb2f64 BVCalculator.java:1199,1233 groups AmmoType:rackSize.
describe('Mek native ammo cap groups and vehicle flamers', () => {
  it.each([
    ['battlemechs:crossbow-d', 1154],
    ['battlemechs:osteon-a', 2291],
    ['battlemechs:deep-lord-rcl-z1m-militiamech', 686],
    ['battlemechs:dig-lord-rcl-z1-armed-miningmech', 681],
    ['battlemechs:phoenix-px-1kr', 760],
    ['battlemechs:crimson-hawk-4', 1372],
    ['battlemechs:phantom-f', 1375],
    ['battlemechs:pouncer-f', 1308],
    ['battlemechs:crosscut-ed-x2-flamer', 168],
    ['battlemechs:demeter-wld-1-m-agromech-mod', 332],
    ['battlemechs:pompier-gm-4p-policemech', 148],
    ['battlemechs:avatar-av1-ou', 1359],
    ['vehicles:asher-hover-scout', 386],
    ['vehicles:coolant-truck-hover', 347],
  ] as const)('%s matches pinned Java', (id, expected) => {
    const unit = getNodeCanonicalUnitService().getByIdSync(id);
    expect(unit).not.toBeNull();
    expect(calculateUnitBV(unit)).toBe(expected);
  });

  it('retains legacy launcher matching when no native torpedo pool exists', () => {
    expect(
      calculateAmmoBVWithExcessiveCap(
        [{ id: 'lrm-15', bv: 136 }],
        [{ id: 'lrtorpedo-15-ammo', bv: 17, weaponType: 'lrtorpedo-15' }],
      ),
    ).toBe(17);
  });
});
