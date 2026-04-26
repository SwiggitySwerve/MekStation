/**
 * Defensive BV calculation invariants.
 *
 * Defensive BV = (armorBV + structureBV + gyroBV + defEquipBV - explosivePenalties)
 *                × defensiveFactor
 * where:
 *   armorBV = round(armorPoints × 2.5 × armorMult × bar) / 10
 *   structureBV = structurePoints × 1.5 × structureMult × engineMult
 *   gyroBV = tonnage × gyroMult
 *   defensiveFactor = 1 + maxTMM/10  (TMM may be boosted by ECM-style stealth)
 *
 * These tests cover the core formula path and each significant branch
 * (stealth bonuses, void sig minimum, tunnage, blue shield).
 */

import { EngineType } from '@/types/construction/EngineType';

import { calculateDefensiveBV } from '../battleValueDefensive';

const baseConfig = {
  totalArmorPoints: 100,
  totalStructurePoints: 80,
  tonnage: 50,
  runMP: 6,
  jumpMP: 0,
};

describe('calculateDefensiveBV — base formula', () => {
  it('computes armor, structure, and gyro BV with standard multipliers', () => {
    const result = calculateDefensiveBV({ ...baseConfig });
    // armorBV = round(100 × 2.5 × 1.0 × 10) / 10 = 250
    expect(result.armorBV).toBe(250);
    // structureBV = 80 × 1.5 × 1.0 × 1.0 = 120
    expect(result.structureBV).toBe(120);
    // gyroBV = 50 × 0.5 = 25
    expect(result.gyroBV).toBe(25);
  });

  it('applies the TMM-based defensive factor (1 + TMM/10)', () => {
    // run 6 → TMM 2 → factor 1.2
    const result = calculateDefensiveBV({ ...baseConfig });
    expect(result.defensiveFactor).toBe(1.2);
    expect(result.totalDefensiveBV).toBeCloseTo((250 + 120 + 25) * 1.2, 2);
  });

  it('subtracts explosive penalties from base defensive sum', () => {
    const result = calculateDefensiveBV({
      ...baseConfig,
      explosivePenalties: 50,
    });
    // base = 250 + 120 + 25 - 50 = 345; ×1.2 = 414
    expect(result.totalDefensiveBV).toBeCloseTo(345 * 1.2, 2);
  });
});

describe('calculateDefensiveBV — armor type multipliers', () => {
  it('doubles armor BV for hardened armor (mult 2.0)', () => {
    const result = calculateDefensiveBV({
      ...baseConfig,
      armorType: 'hardened',
    });
    // 100 × 2.5 × 2.0 × 10 = 5000 → /10 = 500
    expect(result.armorBV).toBe(500);
  });

  it('uses 1.5× for reactive/reflective/ballistic-reinforced', () => {
    const reactive = calculateDefensiveBV({
      ...baseConfig,
      armorType: 'reactive',
    });
    expect(reactive.armorBV).toBe(375);
  });
});

describe('calculateDefensiveBV — structure type & engine multipliers', () => {
  it('halves structure BV for industrial structure (mult 0.5)', () => {
    const result = calculateDefensiveBV({
      ...baseConfig,
      structureType: 'industrial',
    });
    // 80 × 1.5 × 0.5 × 1.0 = 60
    expect(result.structureBV).toBe(60);
  });

  it('applies engine BV multiplier to structure (XL_IS = 0.5)', () => {
    const result = calculateDefensiveBV({
      ...baseConfig,
      engineType: EngineType.XL_IS,
    });
    // 80 × 1.5 × 1.0 × 0.5 = 60
    expect(result.structureBV).toBe(60);
  });

  it('uses superheavy engine multipliers when tonnage > 100', () => {
    const result = calculateDefensiveBV({
      ...baseConfig,
      tonnage: 110, // superheavy
      engineType: EngineType.XL_IS,
    });
    // Superheavy IS XL = 0.75 (was 0.5 below 100t)
    expect(result.structureBV).toBe(80 * 1.5 * 1.0 * 0.75);
  });

  it('honors explicit engineMultiplier override', () => {
    const result = calculateDefensiveBV({
      ...baseConfig,
      engineMultiplier: 0.25,
    });
    expect(result.structureBV).toBe(80 * 1.5 * 1.0 * 0.25);
  });
});

describe('calculateDefensiveBV — stealth and signature bonuses', () => {
  it('adds +2 TMM for stealth armor', () => {
    // run 6 → TMM 2; stealth +2 = 4 → factor 1.4
    const result = calculateDefensiveBV({
      ...baseConfig,
      hasStealthArmor: true,
    });
    expect(result.defensiveFactor).toBe(1.4);
  });

  it('adds +2 TMM for null sig system', () => {
    const result = calculateDefensiveBV({ ...baseConfig, hasNullSig: true });
    expect(result.defensiveFactor).toBe(1.4);
  });

  it('adds +2 TMM for chameleon LPS', () => {
    const result = calculateDefensiveBV({
      ...baseConfig,
      hasChameleonLPS: true,
    });
    expect(result.defensiveFactor).toBe(1.4);
  });

  it('void sig clamps minimum TMM to 3 for slow units', () => {
    // run 2 → TMM 0; void sig forces ≥3 → factor 1.3
    const result = calculateDefensiveBV({
      ...baseConfig,
      runMP: 2,
      hasVoidSig: true,
    });
    expect(result.defensiveFactor).toBe(1.3);
  });

  it('void sig increments when TMM is exactly 3', () => {
    // run 7 → TMM 3, void sig should bump to 4 → factor 1.4
    const result = calculateDefensiveBV({
      ...baseConfig,
      runMP: 7,
      hasVoidSig: true,
    });
    expect(result.defensiveFactor).toBe(1.4);
  });
});

describe('calculateDefensiveBV — Blue Shield bonus', () => {
  it('adds +0.2 to both armor and structure multipliers when blue shield is set', () => {
    const result = calculateDefensiveBV({
      ...baseConfig,
      hasBlueShield: true,
    });
    // armor mult = 1.0 + 0.2 = 1.2 → 100 × 2.5 × 1.2 × 10 = 3000 → /10 = 300
    expect(result.armorBV).toBe(300);
    // structure mult = 1.0 + 0.2 = 1.2 → 80 × 1.5 × 1.2 × 1.0 = 144
    expect(result.structureBV).toBeCloseTo(144, 5);
  });
});

describe('calculateDefensiveBV — UMU MP and BAR', () => {
  it('uses max(jumpMP, umuMP) for TMM calculation', () => {
    // run 4 → TMM 1; jump 0, umu 6 → jump TMM = 2+1 = 3 ⇒ factor 1.3
    const result = calculateDefensiveBV({
      ...baseConfig,
      runMP: 4,
      jumpMP: 0,
      umuMP: 6,
    });
    expect(result.defensiveFactor).toBe(1.3);
  });

  it('honors a non-default BAR value (lower armor effectiveness)', () => {
    const result = calculateDefensiveBV({ ...baseConfig, bar: 5 });
    // armor BV scales linearly with bar: 100 × 2.5 × 1.0 × 5 = 1250 → /10 = 125
    expect(result.armorBV).toBe(125);
  });
});
