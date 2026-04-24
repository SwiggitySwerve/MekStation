/**
 * Tests for forceComparison utilities.
 *
 * @spec openspec/changes/add-pre-battle-force-comparison/specs/after-combat-report/spec.md
 */

import { GameSide } from '@/types/gameplay';

import {
  compareForces,
  formatDelta,
  formatMetricValue,
  getDecisionHint,
  getHighestSeverity,
  isPlayerAdvantage,
} from '../forceComparison';
import { deriveForceSummary } from '../forceSummary';

const summary = (
  side: GameSide,
  overrides: {
    totalBV?: number;
    totalTonnage?: number;
    heatDissipation?: number;
    avgGunnery?: number;
    avgPiloting?: number;
    weaponDamagePerTurnPotential?: number;
  } = {},
) => ({
  side,
  totalBV: 5000,
  totalTonnage: 100,
  heatDissipation: 20,
  avgGunnery: 4,
  avgPiloting: 5,
  weaponDamagePerTurnPotential: 30,
  spaSummary: [],
  unitCount: 2,
  warnings: [],
  ...overrides,
});

describe('compareForces', () => {
  it('produces a comparison with deltas and bvRatio for two empty forces', () => {
    const player = deriveForceSummary({
      side: GameSide.Player,
      units: [],
    });
    const opponent = deriveForceSummary({
      side: GameSide.Opponent,
      units: [],
    });
    const cmp = compareForces(player, opponent);
    expect(cmp.player).toBe(player);
    expect(cmp.opponent).toBe(opponent);
    expect(cmp.bvRatio).toBe(1);
    expect(cmp.deltas.totalBV.value).toBe(0);
    expect(cmp.deltas.totalBV.severity).toBe('low');
  });

  it('computes player − opponent delta sign correctly', () => {
    const cmp = compareForces(
      summary(GameSide.Player, { totalBV: 5325 }),
      summary(GameSide.Opponent, { totalBV: 5000 }),
    );
    expect(cmp.deltas.totalBV.value).toBe(325);
  });

  it('computes bvRatio as max / min', () => {
    const cmp = compareForces(
      summary(GameSide.Player, { totalBV: 5000 }),
      summary(GameSide.Opponent, { totalBV: 4000 }),
    );
    expect(cmp.bvRatio).toBe(1.25);
  });

  it('keeps bvRatio = 1 when one side has zero BV (no divide-by-zero)', () => {
    const cmp = compareForces(
      summary(GameSide.Player, { totalBV: 0 }),
      summary(GameSide.Opponent, { totalBV: 5000 }),
    );
    expect(cmp.bvRatio).toBe(1);
  });

  describe('severity tiers', () => {
    it('BV ratio > 1.25 → high', () => {
      const cmp = compareForces(
        summary(GameSide.Player, { totalBV: 6500 }),
        summary(GameSide.Opponent, { totalBV: 5000 }),
      );
      expect(cmp.bvRatio).toBeCloseTo(1.3, 5);
      expect(cmp.deltas.totalBV.severity).toBe('high');
    });

    it('BV ratio in [1.10, 1.25] → moderate', () => {
      const cmp = compareForces(
        summary(GameSide.Player, { totalBV: 5750 }),
        summary(GameSide.Opponent, { totalBV: 5000 }),
      );
      expect(cmp.bvRatio).toBeCloseTo(1.15, 5);
      expect(cmp.deltas.totalBV.severity).toBe('moderate');
    });

    it('BV ratio just above 1.0 → low', () => {
      const cmp = compareForces(
        summary(GameSide.Player, { totalBV: 5250 }),
        summary(GameSide.Opponent, { totalBV: 5000 }),
      );
      expect(cmp.bvRatio).toBeCloseTo(1.05, 5);
      expect(cmp.deltas.totalBV.severity).toBe('low');
    });

    it('tonnage delta at 20% exactly (100 vs 125) → high (spec boundary)', () => {
      // Spec scenario (after-combat-report § Tonnage severity based on
      // percentage): player=100, opponent=125 ⇒ |25|/125 = 0.20 exactly
      // SHALL produce "high". Boundary is inclusive (>=).
      const cmp = compareForces(
        summary(GameSide.Player, { totalTonnage: 100 }),
        summary(GameSide.Opponent, { totalTonnage: 125 }),
      );
      expect(cmp.deltas.totalTonnage.severity).toBe('high');
    });

    it('tonnage delta just below 20% (100 vs 124) → moderate (boundary-below)', () => {
      // |24|/124 ≈ 0.1935 → moderate. Verifies the inclusive boundary
      // at 0.20 doesn't leak to just-under-threshold values.
      const cmp = compareForces(
        summary(GameSide.Player, { totalTonnage: 100 }),
        summary(GameSide.Opponent, { totalTonnage: 124 }),
      );
      expect(cmp.deltas.totalTonnage.severity).toBe('moderate');
    });

    it('tonnage delta around 15% → moderate', () => {
      const cmp = compareForces(
        summary(GameSide.Player, { totalTonnage: 100 }),
        summary(GameSide.Opponent, { totalTonnage: 120 }),
      );
      // |delta|/max = 20/120 ≈ 0.167 → moderate (>=0.10, <0.20)
      expect(cmp.deltas.totalTonnage.severity).toBe('moderate');
    });

    it('tonnage delta below 10% → low', () => {
      const cmp = compareForces(
        summary(GameSide.Player, { totalTonnage: 100 }),
        summary(GameSide.Opponent, { totalTonnage: 105 }),
      );
      expect(cmp.deltas.totalTonnage.severity).toBe('low');
    });

    it('|gunnery| delta >= 1.0 → high', () => {
      const cmp = compareForces(
        summary(GameSide.Player, { avgGunnery: 3.0 }),
        summary(GameSide.Opponent, { avgGunnery: 4.2 }),
      );
      expect(cmp.deltas.avgGunnery.severity).toBe('high');
    });

    it('|piloting| delta around 0.6 → moderate', () => {
      const cmp = compareForces(
        summary(GameSide.Player, { avgPiloting: 4.0 }),
        summary(GameSide.Opponent, { avgPiloting: 4.6 }),
      );
      expect(cmp.deltas.avgPiloting.severity).toBe('moderate');
    });

    it('DPT delta of 30% vs max → high', () => {
      const cmp = compareForces(
        summary(GameSide.Player, { weaponDamagePerTurnPotential: 70 }),
        summary(GameSide.Opponent, { weaponDamagePerTurnPotential: 100 }),
      );
      // |30|/100 = 0.30 → high (>0.25)
      expect(cmp.deltas.weaponDamagePerTurnPotential.severity).toBe('high');
    });

    it('DPT delta around 18% → moderate', () => {
      const cmp = compareForces(
        summary(GameSide.Player, { weaponDamagePerTurnPotential: 82 }),
        summary(GameSide.Opponent, { weaponDamagePerTurnPotential: 100 }),
      );
      // |18|/100 = 0.18 → moderate (>0.15, ≤0.25)
      expect(cmp.deltas.weaponDamagePerTurnPotential.severity).toBe('moderate');
    });

    it('heat dissipation delta > 30% → high', () => {
      const cmp = compareForces(
        summary(GameSide.Player, { heatDissipation: 10 }),
        summary(GameSide.Opponent, { heatDissipation: 20 }),
      );
      // |10|/20 = 0.5 → high (>0.30)
      expect(cmp.deltas.heatDissipation.severity).toBe('high');
    });
  });
});

describe('isPlayerAdvantage', () => {
  it('positive BV delta means player advantage', () => {
    expect(isPlayerAdvantage('totalBV', 100)).toBe(true);
  });

  it('negative BV delta means opponent advantage', () => {
    expect(isPlayerAdvantage('totalBV', -100)).toBe(false);
  });

  it('inverts sign for gunnery (lower is better)', () => {
    expect(isPlayerAdvantage('avgGunnery', -0.5)).toBe(true);
    expect(isPlayerAdvantage('avgGunnery', 0.5)).toBe(false);
  });

  it('inverts sign for piloting (lower is better)', () => {
    expect(isPlayerAdvantage('avgPiloting', -0.5)).toBe(true);
    expect(isPlayerAdvantage('avgPiloting', 0.5)).toBe(false);
  });

  it('returns null for zero delta', () => {
    expect(isPlayerAdvantage('totalBV', 0)).toBeNull();
  });
});

describe('formatDelta', () => {
  it('formats BV delta with + sign and BV suffix', () => {
    expect(formatDelta('totalBV', 325)).toBe('+325 BV');
  });

  it('formats negative tonnage with en-dash and tons suffix', () => {
    expect(formatDelta('totalTonnage', -4.2)).toBe('−4.2 tons');
  });

  it('formats integer tonnage without decimal', () => {
    expect(formatDelta('totalTonnage', 5)).toBe('+5 tons');
  });

  it('formats gunnery with one decimal and no unit', () => {
    expect(formatDelta('avgGunnery', 0.5)).toBe('+0.5');
    expect(formatDelta('avgGunnery', -1.2)).toBe('−1.2');
  });

  it('returns no sign for zero', () => {
    expect(formatDelta('totalBV', 0)).toBe('0 BV');
  });
});

describe('formatMetricValue', () => {
  it('formats BV with thousands separator', () => {
    expect(formatMetricValue('totalBV', 5325)).toBe('5,325');
  });

  it('formats tonnage with t suffix', () => {
    expect(formatMetricValue('totalTonnage', 100)).toBe('100 t');
  });

  it('formats gunnery with one decimal', () => {
    expect(formatMetricValue('avgGunnery', 3.5)).toBe('3.5');
  });

  it('em-dashes a zero gunnery (no units → no average)', () => {
    expect(formatMetricValue('avgGunnery', 0)).toBe('—');
  });
});

describe('getDecisionHint', () => {
  it('returns "evenly matched" when all deltas are low', () => {
    const cmp = compareForces(
      summary(GameSide.Player),
      summary(GameSide.Opponent),
    );
    expect(getDecisionHint(cmp)).toBe('Forces look evenly matched');
  });

  it('reports BV percentage when BV is the highest-severity delta', () => {
    const cmp = compareForces(
      summary(GameSide.Player, { totalBV: 5000 }),
      summary(GameSide.Opponent, { totalBV: 6500 }),
    );
    // bvRatio = 1.30 → 30% advantage to opponent
    expect(getDecisionHint(cmp)).toContain('30%');
    expect(getDecisionHint(cmp)).toContain('Opponent');
  });
});

describe('getHighestSeverity', () => {
  it('returns "low" when all deltas are low', () => {
    const cmp = compareForces(
      summary(GameSide.Player),
      summary(GameSide.Opponent),
    );
    expect(getHighestSeverity(cmp)).toBe('low');
  });

  it('returns "high" when at least one delta is high', () => {
    const cmp = compareForces(
      summary(GameSide.Player, { totalBV: 8000 }),
      summary(GameSide.Opponent, { totalBV: 5000 }),
    );
    expect(getHighestSeverity(cmp)).toBe('high');
  });
});
