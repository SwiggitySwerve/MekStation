/**
 * Aerospace Structural Integrity invariants.
 *
 * Default SI = ceil(tonnage / 10).
 * Per-class hard maximum: ASF 20, CF 15, Small Craft 30.
 * Each SI point above default costs floor(tonnage/10)×0.5 tons; default is free.
 */

import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';

import {
  defaultSI,
  maxSI,
  siExtraWeightTons,
  siWeightCost,
} from '../siCalculations';

describe('defaultSI (ceil(tonnage / 10))', () => {
  it('returns 1 for the smallest fighters (≤10 t)', () => {
    expect(defaultSI(10)).toBe(1);
    expect(defaultSI(5)).toBe(1);
  });

  it('rounds up to the next 10-t bucket', () => {
    expect(defaultSI(45)).toBe(5);
    expect(defaultSI(50)).toBe(5);
    expect(defaultSI(51)).toBe(6);
    expect(defaultSI(100)).toBe(10);
  });

  it('handles small craft tonnage range', () => {
    expect(defaultSI(150)).toBe(15);
    expect(defaultSI(200)).toBe(20);
  });
});

describe('maxSI (per-subtype hard cap)', () => {
  it('returns 20 for aerospace fighters', () => {
    expect(maxSI(AerospaceSubType.AEROSPACE_FIGHTER)).toBe(20);
  });

  it('returns 15 for conventional fighters', () => {
    expect(maxSI(AerospaceSubType.CONVENTIONAL_FIGHTER)).toBe(15);
  });

  it('returns 30 for small craft', () => {
    expect(maxSI(AerospaceSubType.SMALL_CRAFT)).toBe(30);
  });
});

describe('siWeightCost (extra-only formula)', () => {
  it('returns 0 when SI equals the default for that tonnage', () => {
    // 50 t default = 5; SI = 5 → 0 t cost
    expect(siWeightCost(5, 50)).toBe(0);
    expect(siWeightCost(10, 100)).toBe(0);
  });

  it('returns 0 when SI is below default (treats negative extra as zero)', () => {
    expect(siWeightCost(2, 100)).toBe(0);
  });

  it('costs (tonnage/10) × 0.5 per extra SI point', () => {
    // 100 t default 10; +2 SI = 12; cost = 2 × (100/10) × 0.5 = 10 t
    expect(siWeightCost(12, 100)).toBe(10);
    // 50 t default 5; +1 SI = 6; cost = 1 × 5 × 0.5 = 2.5 t
    expect(siWeightCost(6, 50)).toBe(2.5);
  });

  it('siExtraWeightTons mirrors siWeightCost (only the extra portion is charged)', () => {
    expect(siExtraWeightTons(12, 100)).toBe(siWeightCost(12, 100));
    expect(siExtraWeightTons(5, 50)).toBe(0);
  });
});
