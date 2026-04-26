/**
 * Aerospace fuel-related invariants.
 *
 * Per-subtype minimum fuel: ASF 5, CF 2, Small Craft 20 tons.
 * Per-engine fuel-points-per-ton: Fusion/XL/CompactFusion 80, ICE 40, FuelCell 60.
 */

import {
  AerospaceEngineType,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';

import {
  calculateFuelPoints,
  FUEL_BURN_PER_THRUST_POINT,
  FUEL_MINIMUM_TONS,
  FUEL_POINTS_PER_TON,
  minFuelTons,
} from '../fuelCalculations';

describe('FUEL_MINIMUM_TONS (subtype contract)', () => {
  it('matches the published per-subtype minima', () => {
    expect(FUEL_MINIMUM_TONS[AerospaceSubType.AEROSPACE_FIGHTER]).toBe(5);
    expect(FUEL_MINIMUM_TONS[AerospaceSubType.CONVENTIONAL_FIGHTER]).toBe(2);
    expect(FUEL_MINIMUM_TONS[AerospaceSubType.SMALL_CRAFT]).toBe(20);
  });
});

describe('FUEL_POINTS_PER_TON (engine contract)', () => {
  it('uses 80 pts/ton for Fusion family (Fusion, XL, CompactFusion)', () => {
    expect(FUEL_POINTS_PER_TON[AerospaceEngineType.FUSION]).toBe(80);
    expect(FUEL_POINTS_PER_TON[AerospaceEngineType.XL]).toBe(80);
    expect(FUEL_POINTS_PER_TON[AerospaceEngineType.COMPACT_FUSION]).toBe(80);
  });

  it('uses 40 pts/ton for ICE and 60 for fuel cell', () => {
    expect(FUEL_POINTS_PER_TON[AerospaceEngineType.ICE]).toBe(40);
    expect(FUEL_POINTS_PER_TON[AerospaceEngineType.FUEL_CELL]).toBe(60);
  });
});

describe('FUEL_BURN_PER_THRUST_POINT', () => {
  it('exposes the canonical 1-fuel-per-thrust constant', () => {
    expect(FUEL_BURN_PER_THRUST_POINT).toBe(1);
  });
});

describe('minFuelTons (subtype lookup)', () => {
  it('returns 5 for ASF, 2 for CF, 20 for small craft', () => {
    expect(minFuelTons(AerospaceSubType.AEROSPACE_FIGHTER)).toBe(5);
    expect(minFuelTons(AerospaceSubType.CONVENTIONAL_FIGHTER)).toBe(2);
    expect(minFuelTons(AerospaceSubType.SMALL_CRAFT)).toBe(20);
  });
});

describe('calculateFuelPoints (tons × pts-per-ton, floored)', () => {
  it('multiplies fuel tons by engine rate and floors', () => {
    expect(calculateFuelPoints(5, AerospaceEngineType.FUSION)).toBe(400);
    expect(calculateFuelPoints(2, AerospaceEngineType.ICE)).toBe(80);
    expect(calculateFuelPoints(20, AerospaceEngineType.FUEL_CELL)).toBe(1200);
  });

  it('floors fractional fuel tonnage results', () => {
    // 0.5 × 80 = 40 (exact, no flooring)
    expect(calculateFuelPoints(0.5, AerospaceEngineType.FUSION)).toBe(40);
    // 0.51 × 80 = 40.8 → floor → 40
    expect(calculateFuelPoints(0.51, AerospaceEngineType.FUSION)).toBe(40);
  });

  it('returns 0 for zero fuel tonnage', () => {
    expect(calculateFuelPoints(0, AerospaceEngineType.FUSION)).toBe(0);
  });
});
