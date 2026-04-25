/**
 * Total BV calculation invariants — the public {@link calculateTotalBV}
 * entry point that combines defensive + offensive BV and applies a cockpit
 * modifier. These tests pin down the cockpit modifier table and the round
 * applied to the final composite figure.
 */

import {
  calculateTotalBV,
  getBVBreakdown,
  getCockpitModifier,
  type BVCalculationConfig,
} from '../battleValueTotals';

const baseConfig: BVCalculationConfig = {
  totalArmorPoints: 100,
  totalStructurePoints: 80,
  tonnage: 50,
  heatSinkCapacity: 10,
  walkMP: 4,
  runMP: 6,
  jumpMP: 0,
  weapons: [], // No weapons → no offensive BV from weapons
};

describe('getCockpitModifier (load-bearing constants)', () => {
  it('returns 1.0 for standard cockpit (default)', () => {
    expect(getCockpitModifier()).toBe(1.0);
    expect(getCockpitModifier('standard')).toBe(1.0);
  });

  it('returns 0.95 for small / torso-mounted / drone-OS / SCC', () => {
    // Per MegaMek BVCalculator: these all share the 0.95 modifier.
    expect(getCockpitModifier('small')).toBe(0.95);
    expect(getCockpitModifier('torso-mounted')).toBe(0.95);
    expect(getCockpitModifier('drone-operating-system')).toBe(0.95);
    expect(getCockpitModifier('small-command-console')).toBe(0.95);
  });

  it('returns 1.3 for interface cockpit', () => {
    expect(getCockpitModifier('interface')).toBe(1.3);
  });

  it('returns 1.0 for unknown / command-console (no MegaMek BV penalty)', () => {
    expect(getCockpitModifier('command-console')).toBe(1.0);
  });
});

describe('calculateTotalBV — composition + rounding', () => {
  it('returns an integer (rounded composite figure)', () => {
    const total = calculateTotalBV(baseConfig);
    expect(Number.isInteger(total)).toBe(true);
  });

  it('applies cockpit modifier to the combined defensive+offensive base', () => {
    const standard = calculateTotalBV(baseConfig);
    const small = calculateTotalBV({ ...baseConfig, cockpitType: 'small' });
    // Small = 0.95 × standard (after rounding)
    expect(small).toBe(Math.round(standard * 0.95));
  });

  it('higher armor → higher BV (monotonic in armor points)', () => {
    const lowArmor = calculateTotalBV({
      ...baseConfig,
      totalArmorPoints: 50,
    });
    const highArmor = calculateTotalBV({
      ...baseConfig,
      totalArmorPoints: 200,
    });
    expect(highArmor).toBeGreaterThan(lowArmor);
  });

  it('higher run MP increases defensive factor and offensive speed factor', () => {
    const slow = calculateTotalBV({ ...baseConfig, runMP: 4, walkMP: 3 });
    const fast = calculateTotalBV({ ...baseConfig, runMP: 9, walkMP: 6 });
    expect(fast).toBeGreaterThan(slow);
  });

  it('explosive penalties reduce defensive base BV', () => {
    const noPenalty = calculateTotalBV(baseConfig);
    const withPenalty = calculateTotalBV({
      ...baseConfig,
      explosivePenalties: 50,
    });
    expect(withPenalty).toBeLessThan(noPenalty);
  });
});

describe('getBVBreakdown — exposes the defensive/offensive split', () => {
  it('returns separate defensive and offensive sub-totals', () => {
    const bd = getBVBreakdown(baseConfig);
    expect(bd.defensiveBV).toBeGreaterThan(0);
    // No weapons supplied → offensive BV is just the weight bonus × speedFactor
    expect(bd.offensiveBV).toBeGreaterThan(0);
    // Total ≈ round((defensiveBV + offensiveBV) × cockpitModifier)
    expect(bd.totalBV).toBe(
      Math.round((bd.defensiveBV + bd.offensiveBV) * 1.0),
    );
  });

  it('exposes the offensive speed factor', () => {
    const bd = getBVBreakdown({ ...baseConfig, runMP: 5, walkMP: 4 });
    // run 5 → mp = 5 + 0 = 5 → sf = 1.0
    expect(bd.speedFactor).toBe(1.0);
  });
});
