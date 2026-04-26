/**
 * Aerospace engine weight invariants.
 *
 * Base fusion weight comes from the TechManual table; per-engine multipliers
 * scale the base. ICE doubles, XL halves, FuelCell ×1.2, CompactFusion ×1.5.
 * Final weight is rounded UP to the nearest 0.5 t.
 */

import { AerospaceEngineType } from '@/types/unit/AerospaceInterfaces';

import { aerospaceEngineWeight } from '../engineWeightAerospace';

describe('aerospaceEngineWeight — fusion baseline', () => {
  it('matches the table value at common ratings', () => {
    expect(aerospaceEngineWeight(200, AerospaceEngineType.FUSION)).toBe(8.5);
    expect(aerospaceEngineWeight(300, AerospaceEngineType.FUSION)).toBe(17.5);
    expect(aerospaceEngineWeight(100, AerospaceEngineType.FUSION)).toBe(3.0);
  });

  it('handles small fighter ratings', () => {
    expect(aerospaceEngineWeight(50, AerospaceEngineType.FUSION)).toBe(1.5);
    expect(aerospaceEngineWeight(20, AerospaceEngineType.FUSION)).toBe(0.5);
  });
});

describe('aerospaceEngineWeight — engine-type multipliers', () => {
  it('XL halves fusion weight (rounded UP to 0.5)', () => {
    // Fusion 200 = 8.5 → ×0.5 = 4.25 → ceil 0.5 → 4.5
    expect(aerospaceEngineWeight(200, AerospaceEngineType.XL)).toBe(4.5);
  });

  it('ICE doubles fusion weight', () => {
    // Fusion 200 = 8.5 → ×2 = 17.0
    expect(aerospaceEngineWeight(200, AerospaceEngineType.ICE)).toBe(17.0);
  });

  it('Compact Fusion ×1.5', () => {
    // Fusion 100 = 3.0 → ×1.5 = 4.5
    expect(aerospaceEngineWeight(100, AerospaceEngineType.COMPACT_FUSION)).toBe(
      4.5,
    );
  });

  it('Fuel Cell ×1.2 rounds up to next 0.5', () => {
    // Fusion 100 = 3.0 → ×1.2 = 3.6 → ceil 0.5 → 4.0
    expect(aerospaceEngineWeight(100, AerospaceEngineType.FUEL_CELL)).toBe(4.0);
  });
});

describe('aerospaceEngineWeight — half-ton rounding rule', () => {
  it('always rounds UP to the nearest 0.5 t', () => {
    // Pick a rating that produces a non-half-ton multiplied weight.
    // Fusion 215 = 9.0 → XL ×0.5 = 4.5 (already half-ton)
    expect(aerospaceEngineWeight(215, AerospaceEngineType.XL)).toBe(4.5);
    // Fusion 210 = 9.0 → ICE ×2 = 18 (whole)
    expect(aerospaceEngineWeight(210, AerospaceEngineType.ICE)).toBe(18.0);
    // Fusion 50 = 1.5 → FuelCell ×1.2 = 1.8 → 2.0
    expect(aerospaceEngineWeight(50, AerospaceEngineType.FUEL_CELL)).toBe(2.0);
  });
});

describe('aerospaceEngineWeight — out-of-table fallback', () => {
  it('uses ceil(rating/25)×0.5 for very large ratings beyond the table', () => {
    // 405 isn't in the table → fallback ceil(405/25)*0.5 = ceil(16.2)*0.5 = 17*0.5 = 8.5
    // FUSION ×1.0 = 8.5
    expect(aerospaceEngineWeight(405, AerospaceEngineType.FUSION)).toBe(8.5);
  });
});
