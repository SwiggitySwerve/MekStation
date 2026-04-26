/**
 * Armor calculation invariants.
 *
 * Standard armor: 16 points/ton, no slots, ×1 cost.
 * Ferro-Fibrous: IS 17.92 pts/t (14 slots), Clan 19.2 pts/t (7 slots).
 * Hardened: 16 pts/t but ×2 cost multiplier.
 * Maximum head armor is 9 points; per-location max = 2× internal structure.
 */

import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

import {
  calculateArmorCost,
  calculateArmorPoints,
  calculateArmorWeight,
  calculateOptimalArmorAllocation,
  getArmorCriticalSlots,
  getArmorFillPercent,
  getMaxArmorForLocation,
  getMaxTotalArmor,
  MAX_HEAD_ARMOR,
  validateLocationArmor,
} from '../armorCalculations';

describe('MAX_HEAD_ARMOR contract', () => {
  it('is exactly 9 (BattleTech rule)', () => {
    expect(MAX_HEAD_ARMOR).toBe(9);
  });
});

describe('calculateArmorPoints / calculateArmorWeight', () => {
  it('Standard armor: 16 pts per ton', () => {
    expect(calculateArmorPoints(10, ArmorTypeEnum.STANDARD)).toBe(160);
    expect(calculateArmorWeight(160, ArmorTypeEnum.STANDARD)).toBe(10);
  });

  it('Ferro-Fibrous IS: 17.92 pts/t (math truncates point count)', () => {
    // 10 t × 17.92 = 179.2 → floor → 179
    expect(calculateArmorPoints(10, ArmorTypeEnum.FERRO_FIBROUS_IS)).toBe(179);
  });

  it('Ferro-Fibrous Clan: 19.2 pts/t', () => {
    // 5 t × 19.2 = 96 → floor → 96
    expect(calculateArmorPoints(5, ArmorTypeEnum.FERRO_FIBROUS_CLAN)).toBe(96);
  });

  it('weight rounds UP to nearest 0.5 ton', () => {
    // 161 / 16 = 10.0625 → ceil 0.5 → 10.5
    expect(calculateArmorWeight(161, ArmorTypeEnum.STANDARD)).toBe(10.5);
  });
});

describe('getArmorCriticalSlots', () => {
  it('Standard armor consumes no critical slots', () => {
    expect(getArmorCriticalSlots(ArmorTypeEnum.STANDARD)).toBe(0);
  });

  it('Ferro-Fibrous IS uses 14 critical slots', () => {
    expect(getArmorCriticalSlots(ArmorTypeEnum.FERRO_FIBROUS_IS)).toBe(14);
  });

  it('Ferro-Fibrous Clan uses 7 critical slots', () => {
    expect(getArmorCriticalSlots(ArmorTypeEnum.FERRO_FIBROUS_CLAN)).toBe(7);
  });
});

describe('calculateArmorCost (10 000 cBills/pt × cost multiplier)', () => {
  it('Standard armor: 10 000 cBills per point', () => {
    expect(calculateArmorCost(100, ArmorTypeEnum.STANDARD)).toBe(1_000_000);
  });

  it('Hardened armor: ×2.5 cost multiplier (per ArmorType definitions)', () => {
    expect(calculateArmorCost(100, ArmorTypeEnum.HARDENED)).toBe(2_500_000);
  });
});

describe('getMaxArmorForLocation', () => {
  it('Head is always 9 regardless of tonnage', () => {
    expect(getMaxArmorForLocation(20, 'head')).toBe(9);
    expect(getMaxArmorForLocation(100, 'Head')).toBe(9);
  });

  it('Other locations cap at 2× internal structure', () => {
    // 50t CT internal = 16 → max armor 32
    expect(getMaxArmorForLocation(50, 'centerTorso')).toBe(32);
    // 50t arm internal = 8 → max 16
    expect(getMaxArmorForLocation(50, 'leftArm')).toBe(16);
  });
});

describe('validateLocationArmor', () => {
  it('flags total exceeding location max', () => {
    const r = validateLocationArmor(50, 'centerTorso', 30, 5);
    expect(r.isValid).toBe(false);
    expect(r.errors[0]).toMatch(/exceeds maximum/);
  });

  it('rejects negative armor values', () => {
    const r = validateLocationArmor(50, 'centerTorso', -1, 0);
    expect(r.isValid).toBe(false);
  });

  it('rejects rear armor on non-torso locations', () => {
    const r = validateLocationArmor(50, 'leftArm', 10, 5);
    expect(r.isValid).toBe(false);
    expect(r.errors.some((e) => /rear armor/.test(e))).toBe(true);
  });

  it('allows rear armor on torso locations', () => {
    const r = validateLocationArmor(50, 'centerTorso', 20, 5);
    expect(r.isValid).toBe(true);
  });
});

describe('getMaxTotalArmor', () => {
  it('returns the sum across all biped locations', () => {
    // 50 t biped: head 9, CT 32, LT 24, RT 24, LA 16, RA 16, LL 24, RL 24
    // sum = 169
    const total = getMaxTotalArmor(50, MechConfiguration.BIPED);
    expect(total).toBe(169);
  });

  it('default configuration is biped', () => {
    expect(getMaxTotalArmor(50)).toBe(
      getMaxTotalArmor(50, MechConfiguration.BIPED),
    );
  });
});

describe('getArmorFillPercent', () => {
  it('returns 0 for non-positive expectedMax', () => {
    expect(getArmorFillPercent(10, 0)).toBe(0);
    expect(getArmorFillPercent(10, -5)).toBe(0);
  });

  it('returns percentage of expected max (can exceed 100)', () => {
    expect(getArmorFillPercent(50, 100)).toBe(50);
    expect(getArmorFillPercent(120, 100)).toBe(120);
  });
});

describe('calculateOptimalArmorAllocation (biped)', () => {
  it('totalAllocated never exceeds availablePoints', () => {
    const r = calculateOptimalArmorAllocation(100, 50);
    expect(r.totalAllocated).toBeLessThanOrEqual(100);
  });

  it('respects head cap of 9', () => {
    const r = calculateOptimalArmorAllocation(200, 50);
    expect(r.head).toBeLessThanOrEqual(MAX_HEAD_ARMOR);
  });

  it('CT rear is 25% of CT total (rounded)', () => {
    const r = calculateOptimalArmorAllocation(150, 50);
    // ctRear = round(ct × 0.25); ctFront = ct - ctRear
    expect(r.centerTorsoRear).toBe(
      Math.round((r.centerTorsoFront + r.centerTorsoRear) * 0.25),
    );
  });

  it('side torsos are symmetric (LT == RT, LA == RA, LL == RL)', () => {
    const r = calculateOptimalArmorAllocation(120, 50);
    expect(r.leftTorsoFront).toBe(r.rightTorsoFront);
    expect(r.leftTorsoRear).toBe(r.rightTorsoRear);
    expect(r.leftArm).toBe(r.rightArm);
    expect(r.leftLeg).toBe(r.rightLeg);
  });

  it('clamps to maximum total armor for the chassis', () => {
    // 50 t biped max = 169; ask for 500
    const r = calculateOptimalArmorAllocation(500, 50);
    expect(r.totalAllocated).toBeLessThanOrEqual(169);
  });
});

describe('calculateOptimalArmorAllocation (quad)', () => {
  it('uses front/rear leg locations for quads', () => {
    const r = calculateOptimalArmorAllocation(100, 50, MechConfiguration.QUAD);
    expect(r.frontLeftLeg).toBeGreaterThan(0);
    expect(r.rearLeftLeg).toBeGreaterThan(0);
    expect(r.frontLeftLeg).toBe(r.frontRightLeg);
    expect(r.rearLeftLeg).toBe(r.rearRightLeg);
  });
});
