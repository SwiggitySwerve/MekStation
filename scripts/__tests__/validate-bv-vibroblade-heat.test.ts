import type { UnitData } from '../validate-bv-types';

import { calculateUnitBV } from '../../src/utils/construction/mechBV/calculator';
import { buildMechBVWeapons } from '../../src/utils/construction/mechBV/weaponInputs';
import { scanCrits } from '../validate-bv-crit-scan';
import { createEmptyCritScan } from '../validate-bv-crit-scan-types';
import { calculatePhysicalBVTotal } from '../validate-bv-physical-weapons';

const unit: UnitData = {
  id: 'vibroblade-heat',
  chassis: 'Test',
  model: 'Vibroblade',
  unitType: 'BattleMech',
  configuration: 'Biped',
  techBase: 'INNER_SPHERE',
  tonnage: 70,
  engine: { type: 'FUSION', rating: 280 },
  gyro: { type: 'STANDARD' },
  cockpit: 'STANDARD',
  structure: { type: 'STANDARD' },
  armor: { type: 'STANDARD', allocation: { HEAD: 9 } },
  heatSinks: { type: 'SINGLE', count: 10 },
  movement: { walk: 4, jump: 0 },
  equipment: [],
  criticalSlots: {},
};

describe('mounted BV AES compatibility', () => {
  it('retains per-mount physical rounding and case-insensitive AES matching', () => {
    const crit = createEmptyCritScan();
    crit.aesLocs = ['left_arm'];
    crit.physicalWeapons = [
      { type: 'claw', location: 'LEFT_ARM' },
      { type: 'claw', location: 'RIGHT_ARM' },
    ];
    expect(calculatePhysicalBVTotal(crit, 70)).toBe(28.6875);
  });

  it('retains the weapon builder location parsing and AES flag', () => {
    const crit = createEmptyCritScan();
    crit.aesLocs = ['left_arm'];
    const result = buildMechBVWeapons(
      { ...unit, equipment: [{ id: 'medium-laser', location: 'LEFT_ARM' }] },
      crit,
      [],
    );
    expect(result.weapons).toHaveLength(1);
    expect(result.weapons[0].hasAES).toBe(true);
    expect(result.weapons[0].bv).toBe(46);
  });
});

// MegaMek 48fcb2f64: HeatTrackingBVCalculator.java:89-103 adds blades to
// the same heat-sorted weapon records. MekWithArms.java:242-270 forces
// active heat for BV: small3, medium5, large7, regardless of current mode.
describe('active vibroblade BV heat tracking', () => {
  it.each<[string, string, number, number]>([
    ['ISSmallVibroblade', 'vibroblade-small', 3, 12],
    ['ISMediumVibroblade', 'vibroblade-medium', 5, 17],
    ['ISLargeVibroblade', 'vibroblade-large', 7, 24],
  ])(
    'includes %s once in weapon heat and removes its flat addition',
    (raw, id, heat, bv) => {
      const mounted = { ...unit, criticalSlots: { LEFT_ARM: [raw, raw] } };
      const crit = scanCrits(mounted);
      const result = buildMechBVWeapons(mounted, crit, []);
      expect(result.weapons).toEqual([
        expect.objectContaining({
          id,
          heat,
          bv,
          isDirectFire: false,
          location: 'LEFT_ARM',
        }),
      ]);
      expect(calculatePhysicalBVTotal(crit, unit.tonnage)).toBe(0);
    },
  );

  const hotUnit: UnitData = {
    ...unit,
    equipment: Array.from({ length: 5 }, () => ({
      id: 'medium-laser',
      location: 'RIGHT_ARM',
    })),
    criticalSlots: {
      LEFT_ARM: Array<string>(4).fill('ISLargeVibroblade'),
      RIGHT_ARM: Array<string>(5).fill('Medium Laser'),
    },
  };

  it('halves the blade after the heat budget instead of adding its full BV', () => {
    const result = calculateUnitBV(hotUnit);
    expect(result.breakdown?.heatEfficiency).toBe(14);
    expect(result.breakdown?.weaponBV).toBe(242);
    expect(result.breakdown?.physicalWeaponBV).toBe(0);
    expect(result.breakdown?.offensiveBV).toBeCloseTo(349.44, 10);
  });

  it('applies the blade arm AES once before overheat weighting', () => {
    const result = calculateUnitBV({
      ...hotUnit,
      criticalSlots: {
        ...hotUnit.criticalSlots,
        LEFT_ARM: [...Array<string>(4).fill('ISLargeVibroblade'), 'ISAES'],
      },
    });
    expect(result.breakdown?.weaponBV).toBe(245);
    expect(result.breakdown?.physicalWeaponBV).toBe(0);
  });
});
