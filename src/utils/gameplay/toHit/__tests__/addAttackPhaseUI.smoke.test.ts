/**
 * Per-change smoke test for add-attack-phase-ui.
 *
 * Asserts the to-hit forecast helper builds per-weapon TN +
 * modifier breakdown + 2d6 hit probability, and the expected-hits
 * total matches the per-weapon sum.
 *
 * @spec openspec/changes/add-attack-phase-ui/tasks.md § 6
 */

import type { IAttackerState, ITargetState } from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';
import {
  buildToHitForecast,
  expectedHitsTotal,
  getTwoD6HitProbability,
  TWO_D6_HIT_PROBABILITY,
  type IForecastInput,
} from '@/utils/gameplay/toHit';

const baseAttacker: IAttackerState = {
  gunnery: 4,
  movementType: MovementType.Stationary,
  heat: 0,
  damageModifiers: [],
};

const baseTarget: ITargetState = {
  movementType: MovementType.Stationary,
  hexesMoved: 0,
  prone: false,
  immobile: false,
  partialCover: false,
};

const mediumLaser: IForecastInput = {
  weaponId: 'ml-1',
  weaponName: 'Medium Laser',
  minRange: 0,
  shortRange: 3,
  mediumRange: 6,
  longRange: 9,
};

const ppc: IForecastInput = {
  weaponId: 'ppc-1',
  weaponName: 'PPC',
  minRange: 3,
  shortRange: 6,
  mediumRange: 12,
  longRange: 18,
};

describe('add-attack-phase-ui — to-hit forecast smoke test', () => {
  describe('getTwoD6HitProbability', () => {
    it('returns 100% for TN ≤ 2', () => {
      expect(getTwoD6HitProbability(2)).toBe(100);
      expect(getTwoD6HitProbability(1)).toBe(100);
    });

    it('returns 0% for TN ≥ 13 (impossible roll)', () => {
      expect(getTwoD6HitProbability(13)).toBe(0);
      expect(getTwoD6HitProbability(20)).toBe(0);
    });

    it('matches the canonical 2d6 probability table for common TNs', () => {
      // TN 4 → 92%, TN 7 → 58%, TN 10 → 17% per BattleTech tables
      expect(getTwoD6HitProbability(4)).toBe(92);
      expect(getTwoD6HitProbability(7)).toBe(58);
      expect(getTwoD6HitProbability(10)).toBe(17);
    });

    it('table covers every TN from 2 through 12', () => {
      for (let tn = 2; tn <= 12; tn++) {
        expect(TWO_D6_HIT_PROBABILITY[tn]).toBeDefined();
      }
    });
  });

  describe('buildToHitForecast', () => {
    it('produces a forecast row per weapon with modifier breakdown', () => {
      const forecast = buildToHitForecast(
        baseAttacker,
        baseTarget,
        [mediumLaser, ppc],
        3,
      );
      expect(forecast).toHaveLength(2);
      expect(forecast[0].weaponId).toBe('ml-1');
      expect(forecast[1].weaponId).toBe('ppc-1');
      // Modifier breakdown is non-empty (gunnery base + range bracket etc.)
      expect(forecast[0].modifiers.length).toBeGreaterThan(0);
    });

    it('marks weapons beyond long range as outOfRange with finalToHit=Infinity', () => {
      // Range 100 hexes — way beyond ML's longRange=9
      const forecast = buildToHitForecast(
        baseAttacker,
        baseTarget,
        [mediumLaser],
        100,
      );
      expect(forecast[0].outOfRange).toBe(true);
      expect(forecast[0].finalToHit).toBe(Infinity);
      expect(forecast[0].hitProbability).toBe(0);
    });

    it('hit probability matches the 2d6 table at the final TN', () => {
      // Stationary attacker (gun 4) firing at stationary target at short
      // range gives base TN 4 + short range mod 0 = TN 4 → 92%.
      const forecast = buildToHitForecast(
        baseAttacker,
        baseTarget,
        [mediumLaser],
        3,
      );
      expect(forecast[0].finalToHit).toBe(4);
      expect(forecast[0].hitProbability).toBe(92);
    });

    it('captures heat modifier in the breakdown when attacker is hot', () => {
      const hotAttacker: IAttackerState = { ...baseAttacker, heat: 14 };
      const forecast = buildToHitForecast(
        hotAttacker,
        baseTarget,
        [mediumLaser],
        3,
      );
      // Heat 14 = +2 to-hit per canonical thresholds.
      expect(forecast[0].finalToHit).toBe(6);
      const heatMod = forecast[0].modifiers.find((m) =>
        m.source.toLowerCase().includes('heat'),
      );
      expect(heatMod).toBeDefined();
      expect(heatMod!.value).toBe(2);
    });
  });

  describe('expectedHitsTotal', () => {
    it('sums per-weapon hit probabilities (out-of-range contribute 0)', () => {
      const forecast = buildToHitForecast(
        baseAttacker,
        baseTarget,
        [mediumLaser, ppc],
        3,
      );
      // Both at TN 4 → 92% each. Wait, PPC has minRange=3 so range=3 hits
      // its minRange penalty. Let me allow either result as long as total
      // is the sum of per-weapon probs.
      const total = expectedHitsTotal(forecast);
      const expected = forecast.reduce(
        (s, r) => s + (r.outOfRange ? 0 : r.hitProbability / 100),
        0,
      );
      expect(total).toBeCloseTo(expected, 5);
    });

    it('returns 0 when forecast is empty', () => {
      expect(expectedHitsTotal([])).toBe(0);
    });
  });
});
