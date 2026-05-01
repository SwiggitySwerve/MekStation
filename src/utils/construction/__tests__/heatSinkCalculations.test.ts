/**
 * Heat sink calculation invariants.
 *
 * Per BattleTech rules:
 *  - Single HS: 1 dissipation/ton; Double HS: 2 dissipation/ton, same weight.
 *  - First 10 heat sinks are weight-free (paid for by chassis).
 *  - "External" = above engine-integral; consumes critical slots.
 *  - Engine-integral count = floor(rating/25) for fusion engines, 0 otherwise.
 *  - Minimum 10 heat sinks per mech.
 */

import { EngineType } from '@/types/construction/EngineType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';

import {
  calculateExternalHeatSinks,
  calculateExternalHeatSinkSlots,
  calculateHeatDissipation,
  calculateHeatSinkWeight,
  getHeatSinkSummary,
  MINIMUM_HEAT_SINKS,
  validateHeatSinks,
} from '../heatSinkCalculations';

describe('MINIMUM_HEAT_SINKS contract', () => {
  it('is exactly 10', () => {
    expect(MINIMUM_HEAT_SINKS).toBe(10);
  });
});

describe('calculateHeatDissipation', () => {
  it('Single HS: 1 dissipation per sink', () => {
    expect(calculateHeatDissipation(HeatSinkType.SINGLE, 10)).toBe(10);
    expect(calculateHeatDissipation(HeatSinkType.SINGLE, 18)).toBe(18);
  });

  it('Double HS: 2 dissipation per sink', () => {
    expect(calculateHeatDissipation(HeatSinkType.DOUBLE_IS, 10)).toBe(20);
    expect(calculateHeatDissipation(HeatSinkType.DOUBLE_CLAN, 12)).toBe(24);
  });
});

describe('calculateExternalHeatSinks', () => {
  it('subtracts engine-integral count from total', () => {
    // 250 fusion → 10 integral; 12 total → 2 external
    expect(calculateExternalHeatSinks(12, 250, EngineType.STANDARD)).toBe(2);
  });

  it('clamps to 0 when integral exceeds total', () => {
    // 400 fusion → 16 integral; 10 total → 0 external (clamped)
    expect(calculateExternalHeatSinks(10, 400, EngineType.STANDARD)).toBe(0);
  });

  it('returns total for non-fusion engines (no integral capacity)', () => {
    expect(calculateExternalHeatSinks(15, 250, EngineType.ICE)).toBe(15);
  });
});

describe('calculateHeatSinkWeight (canonical: first 10 free)', () => {
  it('returns 0 t for 10 or fewer heat sinks', () => {
    expect(calculateHeatSinkWeight(10, HeatSinkType.SINGLE)).toBe(0);
    expect(calculateHeatSinkWeight(5, HeatSinkType.SINGLE)).toBe(0);
  });

  it('charges 1 t per sink above 10 for Single HS', () => {
    expect(calculateHeatSinkWeight(15, HeatSinkType.SINGLE)).toBe(5);
    expect(calculateHeatSinkWeight(20, HeatSinkType.SINGLE)).toBe(10);
  });

  it('charges 1 t per sink above 10 for Double HS (same weight as singles)', () => {
    expect(calculateHeatSinkWeight(15, HeatSinkType.DOUBLE_IS)).toBe(5);
    expect(calculateHeatSinkWeight(15, HeatSinkType.DOUBLE_CLAN)).toBe(5);
  });
});

describe('calculateExternalHeatSinkSlots (slot count for external sinks)', () => {
  it('Single HS: 1 slot each', () => {
    expect(calculateExternalHeatSinkSlots(5, HeatSinkType.SINGLE)).toBe(5);
  });

  it('Double IS HS: 3 slots each', () => {
    expect(calculateExternalHeatSinkSlots(2, HeatSinkType.DOUBLE_IS)).toBe(6);
  });

  it('Double Clan HS: 2 slots each', () => {
    expect(calculateExternalHeatSinkSlots(3, HeatSinkType.DOUBLE_CLAN)).toBe(6);
  });
});

describe('validateHeatSinks', () => {
  it('flags fewer than 10 heat sinks', () => {
    const r = validateHeatSinks(
      5,
      HeatSinkType.SINGLE,
      200,
      EngineType.STANDARD,
    );
    expect(r.isValid).toBe(false);
    expect(r.errors.some((e) => /Minimum 10/.test(e))).toBe(true);
  });

  it('passes for 10+ heat sinks', () => {
    const r = validateHeatSinks(
      10,
      HeatSinkType.SINGLE,
      250,
      EngineType.STANDARD,
    );
    expect(r.isValid).toBe(true);
  });

  it('warns about excessive externals (>20)', () => {
    // 250 fusion = 10 integral; 35 total = 25 external → warning
    const r = validateHeatSinks(
      35,
      HeatSinkType.SINGLE,
      250,
      EngineType.STANDARD,
    );
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe('getHeatSinkSummary', () => {
  it('returns the full configuration breakdown', () => {
    // 250 fusion → 10 integral; 14 total → 4 external; first-10 free → 4 t weight
    const s = getHeatSinkSummary(
      14,
      HeatSinkType.SINGLE,
      250,
      EngineType.STANDARD,
    );
    expect(s.integrated).toBe(10);
    expect(s.external).toBe(4);
    expect(s.weight).toBe(4); // 14 - 10 = 4 paid sinks × 1 t
    expect(s.dissipation).toBe(14); // single, total 14
    expect(s.weightFree).toBe(10);
  });

  it('handles double heat sinks with proper dissipation', () => {
    const s = getHeatSinkSummary(
      12,
      HeatSinkType.DOUBLE_IS,
      250,
      EngineType.STANDARD,
    );
    expect(s.dissipation).toBe(24); // 12 × 2
  });
});
