import type { UnitData } from '../validate-bv-types';

import { scanCrits } from '../validate-bv-crit-scan';
import {
  calculatePhysicalBVTotal,
  calculatePhysicalWeaponBV,
  classifyPhysicalWeapon,
} from '../validate-bv-physical-weapons';

function scanPhysical(criticalSlots: UnitData['criticalSlots']) {
  return scanCrits({
    id: 'physical-mount-test',
    chassis: 'Test',
    model: 'Physical mounts',
    unitType: 'BattleMech',
    configuration: 'Biped',
    techBase: 'INNER_SPHERE',
    tonnage: 70,
    engine: { type: 'FUSION', rating: 280 },
    gyro: { type: 'STANDARD' },
    cockpit: 'STANDARD',
    structure: { type: 'STANDARD' },
    armor: { type: 'STANDARD', allocation: {} },
    heatSinks: { type: 'SINGLE', count: 10 },
    movement: { walk: 4, jump: 0 },
    equipment: [],
    criticalSlots,
  });
}

describe('validate-bv physical weapon helpers', () => {
  // MegaMek 48fcb2f64: MiscType.java:4310-4316 marks Talons spreadable;
  // MtfFile.java:1053-1068 reuses one mount across locations.
  it.each<[number, boolean, string[], number]>([
    [95, false, ['LEFT_LEG', 'RIGHT_LEG'], 10],
    [35, false, ['LEFT_LEG', 'RIGHT_LEG'], 4],
    [
      50,
      true,
      ['FRONT_LEFT_LEG', 'FRONT_RIGHT_LEG', 'REAR_LEFT_LEG', 'REAR_RIGHT_LEG'],
      10,
    ],
  ])(
    'counts one Talons mount at %it with TSM=%s',
    (tonnage, tsm, limbs, bv) => {
      const crit = scanPhysical({
        ...Object.fromEntries(limbs.map((loc) => [loc, ['Talons', 'Talons']])),
        CENTER_TORSO: tsm ? ['Triple Strength Myomer'] : [],
      });
      expect(crit.physicalWeapons).toEqual([
        { type: 'talon', location: limbs[0] },
      ]);
      expect(calculatePhysicalBVTotal(crit, tonnage)).toBe(bv);
    },
  );

  it('retains separate claws and their AES bonus alongside spread Talons', () => {
    const crit = scanPhysical({
      LEFT_ARM: ['ISClaw', 'ISClaw'],
      RIGHT_ARM: ['ISClaw', 'ISClaw'],
      LEFT_LEG: ['Talons', 'Talons'],
      RIGHT_LEG: ['Talons', 'Talons'],
    });
    expect(
      crit.physicalWeapons.filter((pw) => pw.type === 'claw'),
    ).toHaveLength(2);
    expect(
      calculatePhysicalBVTotal({ ...crit, aesLocs: ['LEFT_ARM'] }, 70),
    ).toBe(35.6875);
  });

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
