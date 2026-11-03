/**
 * FrankenMek internal structure: each location takes the internal points of its
 * own structure tonnage (MegaMek 48fcb2f6 Mek.java:1062-1087, MtfFile.java:669-691).
 */
import { calcTotalStructure } from '../validate-bv-unit-derived';

describe('FrankenMek per-location internal structure', () => {
  it('sums each location at its own tonnage (Schwerer Gustav: 132, not 152)', () => {
    expect(
      calcTotalStructure(100, 'Biped', {
        HEAD: 100,
        CENTER_TORSO: 100,
        LEFT_TORSO: 100,
        RIGHT_TORSO: 70,
        LEFT_ARM: 65,
        RIGHT_ARM: 65,
        LEFT_LEG: 100,
        RIGHT_LEG: 100,
      }),
    ).toBe(132);
  });

  it('uses the unit tonnage for locations the source leaves out', () => {
    expect(calcTotalStructure(50, 'Biped', { LEFT_ARM: 35 })).toBe(
      calcTotalStructure(50, 'Biped') - 8 + 6,
    );
  });

  it('keeps the tonnage table for ordinary meks', () => {
    expect(calcTotalStructure(100, 'Biped')).toBe(152);
  });
});
