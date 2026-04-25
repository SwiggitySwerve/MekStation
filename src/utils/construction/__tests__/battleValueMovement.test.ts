/**
 * Battle Value movement helpers — TMM and speed factor invariants.
 *
 * The TMM table is the authoritative MegaMek mapping for run/jump MP buckets;
 * the offensive speed factor is the BV-2.0 formula
 *   sf = round(pow(1 + (mp - 5)/10, 1.2) × 100) / 100
 * with mp = runMP + round(max(jumpMP, umuMP) / 2). These invariants protect
 * BV parity for every mech we calculate.
 */

import {
  calculateOffensiveSpeedFactor,
  calculateSpeedFactor,
  calculateTMM,
  SPEED_FACTORS,
} from '../battleValueMovement';

describe('calculateTMM (run/jump bucket table)', () => {
  it('returns 0 for very slow units (run MP ≤ 2)', () => {
    expect(calculateTMM(0)).toBe(0);
    expect(calculateTMM(2)).toBe(0);
  });

  it('uses the canonical MegaMek run-bucket boundaries', () => {
    // mp ≤ 4 → 1, ≤ 6 → 2, ≤ 9 → 3, ≤ 17 → 4, ≤ 24 → 5, > 24 → 6
    expect(calculateTMM(3)).toBe(1);
    expect(calculateTMM(4)).toBe(1);
    expect(calculateTMM(5)).toBe(2);
    expect(calculateTMM(6)).toBe(2);
    expect(calculateTMM(7)).toBe(3);
    expect(calculateTMM(9)).toBe(3);
    expect(calculateTMM(10)).toBe(4);
    expect(calculateTMM(17)).toBe(4);
    expect(calculateTMM(18)).toBe(5);
    expect(calculateTMM(24)).toBe(5);
    expect(calculateTMM(25)).toBe(6);
  });

  it('grants jump bonus of +1 over the jump bucket when jumping', () => {
    // Run = 2 → bucket 0, jump = 3 → bucket 1, +1 = 2; max(0, 2) = 2
    expect(calculateTMM(2, 3)).toBe(2);
    // Run = 6 → bucket 2, jump = 4 → bucket 1, +1 = 2; max(2, 2) = 2
    expect(calculateTMM(6, 4)).toBe(2);
    // Run = 4 → bucket 1, jump = 6 → bucket 2 +1 = 3; max(1, 3) = 3
    expect(calculateTMM(4, 6)).toBe(3);
  });

  it('zero jump MP contributes no jump TMM', () => {
    expect(calculateTMM(6, 0)).toBe(2);
  });
});

describe('calculateSpeedFactor (defensive TMM-based factor)', () => {
  it('returns 1.0 for stationary units (TMM 0)', () => {
    expect(calculateSpeedFactor(0, 0)).toBe(1.0);
    expect(calculateSpeedFactor(1, 1)).toBe(1.0); // mp ≤ 2 → bucket 0
  });

  it('uses the SPEED_FACTORS lookup for each TMM bucket', () => {
    // Run 4 → bucket 1 → 1.1
    expect(calculateSpeedFactor(2, 4)).toBe(1.1);
    // Run 6 → bucket 2 → 1.2
    expect(calculateSpeedFactor(4, 6)).toBe(1.2);
    // Run 9 → bucket 3 → 1.3
    expect(calculateSpeedFactor(6, 9)).toBe(1.3);
    // Run 17 → bucket 4 → 1.4
    expect(calculateSpeedFactor(11, 17)).toBe(1.4);
  });

  it('applies a jump bonus when jumpMP > walkMP', () => {
    // walk 4, jump 5: bonus = min(0.5, (5-4)*0.1) = 0.1
    // run 6 → bucket 2 → 1.2; jump 5 → bucket 2+1 = 3 → bigger ⇒ baseFactor uses jump TMM
    // result floor: 1.3 + 0.1 = 1.4 (capped at 2.24)
    const sf = calculateSpeedFactor(4, 6, 5);
    expect(sf).toBeGreaterThan(1.2);
    expect(sf).toBeLessThanOrEqual(2.24);
  });

  it('caps the speed factor at 2.24', () => {
    // Massive jump (e.g. jump 30, walk 1) should never break the cap
    const sf = calculateSpeedFactor(1, 1, 30);
    expect(sf).toBeLessThanOrEqual(2.24);
  });

  it('exposes the SPEED_FACTORS table as a stable contract', () => {
    expect(SPEED_FACTORS[0]).toBe(1.0);
    expect(SPEED_FACTORS[5]).toBe(1.5);
    expect(SPEED_FACTORS[10]).toBe(2.0);
  });
});

describe('calculateOffensiveSpeedFactor (BV-2.0 formula)', () => {
  it('matches the canonical sf at run=5, no jump (baseline)', () => {
    // mp = 5 + round(0/2) = 5, sf = round(pow(1 + 0, 1.2) * 100) / 100 = 1.0
    expect(calculateOffensiveSpeedFactor(5, 0, 0)).toBe(1.0);
  });

  it('uses ceil-style round on max(jump,umu)/2 (round-half-up)', () => {
    // run=6, jump=3 → mp = 6 + round(1.5) = 6 + 2 = 8
    // sf = round(pow(1 + 3/10, 1.2) * 100) / 100 = round(1.3^1.2 * 100)/100
    // 1.3^1.2 ≈ 1.3724 → 1.37
    const sf = calculateOffensiveSpeedFactor(6, 3, 0);
    expect(sf).toBeCloseTo(1.37, 2);
  });

  it('rounds the speed factor to two decimal places', () => {
    const sf = calculateOffensiveSpeedFactor(7, 5, 0);
    // mp = 7 + round(2.5) = 7 + 3 = 10
    // sf = round(pow(1 + 5/10, 1.2) * 100)/100 = round(1.5^1.2 * 100)/100
    // 1.5^1.2 ≈ 1.62657 → ×100 = 162.657 → round = 163 → /100 = 1.63
    expect(sf).toBe(1.63);
    // Always 2 decimal places
    expect(Math.round(sf * 100) / 100).toBe(sf);
  });

  it('uses max(jumpMP, umuMP) for movement contribution', () => {
    // run=4, jump=0, umu=4 → mp = 4 + round(2) = 6
    const withUmu = calculateOffensiveSpeedFactor(4, 0, 4);
    // run=4, jump=4, umu=0 → mp = 4 + round(2) = 6 (same)
    const withJump = calculateOffensiveSpeedFactor(4, 4, 0);
    expect(withUmu).toBe(withJump);
  });

  it('produces sf < 1 for slow units (mp < 5)', () => {
    // mp = 3, sf = round(pow(1 - 2/10, 1.2) * 100)/100 = round(0.8^1.2*100)/100 ≈ 0.77
    const sf = calculateOffensiveSpeedFactor(3, 0, 0);
    expect(sf).toBeLessThan(1.0);
    expect(sf).toBeGreaterThan(0);
  });
});
