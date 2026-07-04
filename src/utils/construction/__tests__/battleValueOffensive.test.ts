/**
 * Offensive BV calculation invariants.
 *
 * Offensive BV = (weaponBV + ammoBV + physicalWeaponBV + weightBonus +
 *                 offensiveEquipmentBV) × speedFactor × typeModifier
 *
 * Heat tracking is the load-bearing piece: weapons that exceed heat
 * efficiency are halved. Speed factor uses the BV-2.0 formula.
 *
 * These tests cover the modifier chain (rear, AES, Artemis, TC),
 * ammo cap, heat efficiency, weight bonus (TSM/iTSM/AES), and
 * the IndustrialMech 0.9× type modifier.
 */

import { EngineType } from '@/types/construction/EngineType';

import {
  calculateAmmoBVWithExcessiveCap,
  calculateOffensiveBV,
  calculateOffensiveBVWithHeatTracking,
  type OffensiveBVConfig,
} from '../battleValueOffensive';

const baseConfig: OffensiveBVConfig = {
  weapons: [],
  tonnage: 50,
  walkMP: 4,
  runMP: 6,
  jumpMP: 0,
  heatDissipation: 10,
};

describe('calculateOffensiveBVWithHeatTracking — base flow', () => {
  it('handles a weapons-free configuration (only weight bonus)', () => {
    const result = calculateOffensiveBVWithHeatTracking({ ...baseConfig });
    expect(result.weaponBV).toBe(0);
    expect(result.ammoBV).toBe(0);
    expect(result.weightBonus).toBe(50); // tonnage × 1.0 (no TSM, no AES)
  });

  it('sums non-heat weapons without heat penalty', () => {
    const result = calculateOffensiveBVWithHeatTracking({
      ...baseConfig,
      weapons: [
        { id: 'mg', name: 'machine-gun', heat: 0, bv: 5 },
        { id: 'mg2', name: 'machine-gun', heat: 0, bv: 5 },
      ],
      heatDissipation: 0,
    });
    // 0-heat weapons sort first and never push heatSum past efficiency
    expect(result.weaponBV).toBe(10);
    expect(result.halvedWeaponCount).toBe(0);
  });
});

describe('calculateOffensiveBVWithHeatTracking — weapon modifiers', () => {
  it('halves rear-mounted weapon BV', () => {
    const result = calculateOffensiveBVWithHeatTracking({
      ...baseConfig,
      weapons: [
        { id: 'ml', name: 'medium-laser', heat: 3, bv: 46, rear: true },
      ],
      heatDissipation: 30,
    });
    expect(result.weaponBV).toBe(23);
  });

  it('multiplies AES-arm-mounted weapons by 1.25', () => {
    const result = calculateOffensiveBVWithHeatTracking({
      ...baseConfig,
      weapons: [
        { id: 'ml', name: 'medium-laser', heat: 3, bv: 46, hasAES: true },
      ],
      heatDissipation: 30,
    });
    expect(result.weaponBV).toBe(46 * 1.25);
  });

  it('multiplies Artemis IV weapons by 1.2', () => {
    const result = calculateOffensiveBVWithHeatTracking({
      ...baseConfig,
      weapons: [
        { id: 'lrm', name: 'lrm-15', heat: 5, bv: 136, artemisType: 'iv' },
      ],
      heatDissipation: 30,
    });
    expect(result.weaponBV).toBeCloseTo(136 * 1.2, 5);
  });

  it('applies TC bonus only to direct-fire weapons', () => {
    const result = calculateOffensiveBVWithHeatTracking({
      ...baseConfig,
      hasTargetingComputer: true,
      weapons: [
        {
          id: 'ml',
          name: 'medium-laser',
          heat: 3,
          bv: 46,
          isDirectFire: true,
        },
        { id: 'mg', name: 'machine-gun', heat: 0, bv: 5, isDirectFire: false },
      ],
      heatDissipation: 30,
    });
    // ml: 46 × 1.25 = 57.5; mg: 5 (unchanged)
    expect(result.weaponBV).toBeCloseTo(46 * 1.25 + 5, 5);
  });
});

describe('calculateOffensiveBVWithHeatTracking — heat efficiency', () => {
  it('halves the BV of weapons that push past heat efficiency', () => {
    // heatDissipation = 5 → heatEfficiency = 6 + 5 - 2(running heat) = 9
    // Two 10-heat weapons of 100 BV each:
    //  weapon1: heatSum 10 ≥ 9 → next weapon halved
    //  weapon2: halved (50 BV)
    const result = calculateOffensiveBVWithHeatTracking({
      ...baseConfig,
      weapons: [
        { id: 'w1', name: 'w', heat: 10, bv: 100 },
        { id: 'w2', name: 'w', heat: 10, bv: 100 },
      ],
      heatDissipation: 5,
    });
    expect(result.heatEfficiency).toBe(9);
    expect(result.halvedWeaponCount).toBe(1);
    expect(result.weaponBV).toBeCloseTo(150, 5);
  });

  it('uses jump heat when greater than running heat', () => {
    // jumpMP = 4 → jumpHeat = max(3, 4) = 4 ⇒ moveHeat = max(2, 4) = 4
    const result = calculateOffensiveBVWithHeatTracking({
      ...baseConfig,
      jumpMP: 4,
      weapons: [{ id: 'w', name: 'w', heat: 0, bv: 10 }],
      heatDissipation: 10,
    });
    // heatEfficiency = 6 + 10 - 4 = 12
    expect(result.moveHeat).toBe(4);
    expect(result.heatEfficiency).toBe(12);
  });

  it('zeroes running heat for ICE / FuelCell engines', () => {
    const result = calculateOffensiveBVWithHeatTracking({
      ...baseConfig,
      engineType: EngineType.ICE,
      weapons: [{ id: 'w', name: 'w', heat: 0, bv: 10 }],
      heatDissipation: 10,
    });
    expect(result.moveHeat).toBe(0);
    expect(result.heatEfficiency).toBe(16);
  });

  it('uses 6 running heat for XXL engines', () => {
    const result = calculateOffensiveBVWithHeatTracking({
      ...baseConfig,
      engineType: EngineType.XXL,
      weapons: [{ id: 'w', name: 'w', heat: 0, bv: 10 }],
      heatDissipation: 10,
    });
    expect(result.moveHeat).toBe(6);
    expect(result.heatEfficiency).toBe(10);
  });

  it('subtracts 10 from heat efficiency for stealth armor', () => {
    const result = calculateOffensiveBVWithHeatTracking({
      ...baseConfig,
      hasStealthArmor: true,
      weapons: [{ id: 'w', name: 'w', heat: 0, bv: 10 }],
      heatDissipation: 10,
    });
    // 6 + 10 - 2 - 10 = 4
    expect(result.heatEfficiency).toBe(4);
  });
});

describe('calculateOffensiveBVWithHeatTracking — weight bonus', () => {
  it('uses tonnage as the default weight bonus', () => {
    const result = calculateOffensiveBVWithHeatTracking({ ...baseConfig });
    expect(result.weightBonus).toBe(50);
  });

  it('multiplies weight bonus by 1.5 for TSM mechs', () => {
    const result = calculateOffensiveBVWithHeatTracking({
      ...baseConfig,
      hasTSM: true,
    });
    expect(result.weightBonus).toBe(75);
  });

  it('multiplies weight bonus by 1.15 for Industrial TSM', () => {
    const result = calculateOffensiveBVWithHeatTracking({
      ...baseConfig,
      hasIndustrialTSM: true,
    });
    expect(result.weightBonus).toBeCloseTo(57.5, 5);
  });

  it('adds 10% per AES arm to the weight bonus', () => {
    const result = calculateOffensiveBVWithHeatTracking({
      ...baseConfig,
      aesArms: 2,
    });
    // 50 × (1.0 + 0.2) = 60
    expect(result.weightBonus).toBe(60);
  });
});

describe('calculateOffensiveBVWithHeatTracking — type modifier', () => {
  it('multiplies offensive BV by 0.9 for IndustrialMechs', () => {
    const baseline = calculateOffensiveBVWithHeatTracking({
      ...baseConfig,
      weapons: [{ id: 'ml', name: 'medium-laser', heat: 3, bv: 46 }],
      heatDissipation: 30,
    });
    const industrial = calculateOffensiveBVWithHeatTracking({
      ...baseConfig,
      weapons: [{ id: 'ml', name: 'medium-laser', heat: 3, bv: 46 }],
      heatDissipation: 30,
      isIndustrialMech: true,
    });
    expect(industrial.totalOffensiveBV).toBeCloseTo(
      baseline.totalOffensiveBV * 0.9,
      2,
    );
  });
});

describe('calculateAmmoBVWithExcessiveCap', () => {
  it('returns 0 when no ammo provided', () => {
    expect(calculateAmmoBVWithExcessiveCap([], [])).toBe(0);
  });

  it('caps ammo BV at the matching weapon BV (excessive ammo rule)', () => {
    // Weapon ac-10 with BV 100; ammo bv 200 (way too much)
    // Expected: ammoBV = min(200, 100) = 100
    const total = calculateAmmoBVWithExcessiveCap(
      [{ id: 'isac10', bv: 100 }],
      [{ id: 'isac10ammo', bv: 200, weaponType: 'ac-10' }],
    );
    expect(total).toBe(100);
  });

  it('returns 0 for ammo with no matching weapon', () => {
    const total = calculateAmmoBVWithExcessiveCap(
      [{ id: 'ml', bv: 46 }],
      [{ id: 'ammo-ac-10', bv: 30, weaponType: 'ac-10' }],
    );
    expect(total).toBe(0);
  });

  it('matches LRTorpedo ammo to LRM-equivalent LRT launcher BV', () => {
    const total = calculateAmmoBVWithExcessiveCap(
      [{ id: 'lrt-10', bv: 108 }],
      [{ id: 'ammo-lrtorpedo-10', bv: 11, weaponType: 'lrtorpedo-10' }],
    );
    expect(total).toBe(11);
  });
});

describe('calculateOffensiveBV (legacy, no heat tracking)', () => {
  it('returns 0 for empty weapons', () => {
    expect(calculateOffensiveBV([])).toBe(0);
  });

  it('halves rear-mounted weapon BV in legacy path', () => {
    const result = calculateOffensiveBV([
      { id: 'medium-laser', rear: true },
      { id: 'medium-laser' },
    ]);
    // Catalog lookup: medium-laser BV = 46 → 23 + 46 = 69
    expect(result).toBe(69);
  });
});
