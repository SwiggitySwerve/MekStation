import {
  calculatePhysicalWeaponBV,
  classifyPhysicalWeapon,
} from '../validate-bv-physical-weapons';

describe('validate-bv physical weapon helpers', () => {
  it('classifies official physical weapon aliases used by catalog slots', () => {
    expect(classifyPhysicalWeapon('Hatchet'.toLowerCase())).toBe('hatchet');
    expect(classifyPhysicalWeapon('IS Lance'.toLowerCase())).toBe('lance');
    expect(
      classifyPhysicalWeapon('Retractable Blade (OmniPod)'.toLowerCase()),
    ).toBe('retractable-blade');
    expect(classifyPhysicalWeapon('CLBuzzsaw'.toLowerCase())).toBe('buzzsaw');
    expect(classifyPhysicalWeapon('Heavy Duty Pile Driver'.toLowerCase())).toBe(
      'pile-driver',
    );
    expect(classifyPhysicalWeapon('ISLargeVibroblade'.toLowerCase())).toBe(
      'vibroblade-large',
    );
    expect(classifyPhysicalWeapon('unknown equipment')).toBeNull();
  });

  it('keeps tonnage and TSM-sensitive BV formulas stable', () => {
    expect(calculatePhysicalWeaponBV('hatchet', 55, false)).toBe(16.5);
    expect(calculatePhysicalWeaponBV('hatchet', 55, true)).toBe(33);
    expect(calculatePhysicalWeaponBV('sword', 50, false)).toBeCloseTo(10.35);
    expect(calculatePhysicalWeaponBV('mace', 70, true)).toBe(36);
    expect(calculatePhysicalWeaponBV('claw', 55, false)).toBe(10.2);
    expect(calculatePhysicalWeaponBV('talon', 55, true)).toBe(12);
  });

  it('keeps flat MegaMek physical weapon BV values stable', () => {
    expect(calculatePhysicalWeaponBV('flail', 100, true)).toBe(11);
    expect(calculatePhysicalWeaponBV('wrecking-ball', 100, true)).toBe(8);
    expect(calculatePhysicalWeaponBV('chain-whip', 100, true)).toBe(5.175);
    expect(calculatePhysicalWeaponBV('buzzsaw', 100, true)).toBe(67);
    expect(calculatePhysicalWeaponBV('vibroblade-large', 100, true)).toBe(24);
    expect(calculatePhysicalWeaponBV('unknown', 100, true)).toBe(0);
  });
});
