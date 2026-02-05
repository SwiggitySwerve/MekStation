/**
 * Heat Management Tests
 *
 * Tests for heat scale effects, shutdown risks, and ammo explosion calculations.
 *
 * @spec openspec/specs/heat-overflow-effects/spec.md
 */

import {
  HEAT_SCALE_EFFECTS,
  TSM_ACTIVATION_THRESHOLD,
  getHeatScaleEffect,
  isShutdownRisk,
  getAmmoExplosionRisk,
  isTSMActive,
  getHeatMovementPenalty,
} from '@/types/validation/HeatManagement';

describe('Heat Scale Effects', () => {
  describe('HEAT_SCALE_EFFECTS constant', () => {
    it('should have complete thresholds', () => {
      const thresholds = HEAT_SCALE_EFFECTS.map((e) => e.threshold);
      expect(thresholds).toContain(0);
      expect(thresholds).toContain(5);
      expect(thresholds).toContain(10);
      expect(thresholds).toContain(15);
      expect(thresholds).toContain(18);
      expect(thresholds).toContain(20);
      expect(thresholds).toContain(22);
      expect(thresholds).toContain(24);
      expect(thresholds).toContain(25);
      expect(thresholds).toContain(26);
      expect(thresholds).toContain(28);
      expect(thresholds).toContain(30);
    });

    it('should be sorted by threshold ascending', () => {
      for (let i = 1; i < HEAT_SCALE_EFFECTS.length; i++) {
        expect(HEAT_SCALE_EFFECTS[i].threshold).toBeGreaterThan(
          HEAT_SCALE_EFFECTS[i - 1].threshold,
        );
      }
    });
  });

  describe('TSM_ACTIVATION_THRESHOLD', () => {
    it('should be 9', () => {
      expect(TSM_ACTIVATION_THRESHOLD).toBe(9);
    });
  });

  describe('getHeatScaleEffect', () => {
    it('should return no penalties at 0 heat', () => {
      const effect = getHeatScaleEffect(0);
      expect(effect.movementPenalty).toBe(0);
      expect(effect.toHitPenalty).toBe(0);
      expect(effect.shutdownRoll).toBeUndefined();
      expect(effect.ammoExplosionRoll).toBeUndefined();
    });

    it('should return -1 movement at 5 heat', () => {
      const effect = getHeatScaleEffect(5);
      expect(effect.movementPenalty).toBe(-1);
      expect(effect.toHitPenalty).toBe(0);
    });

    it('should return -1 movement at 9 heat (TSM activation threshold)', () => {
      const effect = getHeatScaleEffect(9);
      expect(effect.movementPenalty).toBe(-1);
      expect(effect.toHitPenalty).toBe(0);
    });

    it('should return -2 movement and +1 to-hit at 10 heat', () => {
      const effect = getHeatScaleEffect(10);
      expect(effect.movementPenalty).toBe(-2);
      expect(effect.toHitPenalty).toBe(1);
    });

    it('should return -3 movement and +2 to-hit at 15 heat', () => {
      const effect = getHeatScaleEffect(15);
      expect(effect.movementPenalty).toBe(-3);
      expect(effect.toHitPenalty).toBe(2);
    });

    it('should return -4 movement and +3 to-hit at 18 heat', () => {
      const effect = getHeatScaleEffect(18);
      expect(effect.movementPenalty).toBe(-4);
      expect(effect.toHitPenalty).toBe(3);
    });

    it('should return shutdown risk at 20 heat', () => {
      const effect = getHeatScaleEffect(20);
      expect(effect.movementPenalty).toBe(-5);
      expect(effect.toHitPenalty).toBe(4);
      expect(effect.shutdownRoll).toBe(8);
      expect(effect.ammoExplosionRoll).toBeUndefined();
    });

    it('should return ammo explosion risk at 24 heat', () => {
      const effect = getHeatScaleEffect(24);
      expect(effect.movementPenalty).toBe(-7);
      expect(effect.shutdownRoll).toBe(6);
      expect(effect.ammoExplosionRoll).toBe(8);
    });

    it('should return auto shutdown/explosion at 30+ heat', () => {
      const effect = getHeatScaleEffect(30);
      expect(effect.shutdownRoll).toBe(0); // Auto shutdown
      expect(effect.ammoExplosionRoll).toBe(0); // Auto explosion
    });

    it('should handle very high heat (35)', () => {
      const effect = getHeatScaleEffect(35);
      expect(effect.threshold).toBe(30);
      expect(effect.shutdownRoll).toBe(0);
    });
  });

  describe('isShutdownRisk', () => {
    it('should return false below 20 heat', () => {
      expect(isShutdownRisk(0)).toBe(false);
      expect(isShutdownRisk(10)).toBe(false);
      expect(isShutdownRisk(15)).toBe(false);
      expect(isShutdownRisk(19)).toBe(false);
    });

    it('should return true at 20+ heat', () => {
      expect(isShutdownRisk(20)).toBe(true);
      expect(isShutdownRisk(25)).toBe(true);
      expect(isShutdownRisk(30)).toBe(true);
    });
  });

  describe('getAmmoExplosionRisk', () => {
    it('should return null below 24 heat', () => {
      expect(getAmmoExplosionRisk(0)).toBeNull();
      expect(getAmmoExplosionRisk(10)).toBeNull();
      expect(getAmmoExplosionRisk(20)).toBeNull();
      expect(getAmmoExplosionRisk(23)).toBeNull();
    });

    it('should return target number at 24+ heat', () => {
      expect(getAmmoExplosionRisk(24)).toBe(8);
      expect(getAmmoExplosionRisk(25)).toBe(8);
      expect(getAmmoExplosionRisk(26)).toBe(6);
      expect(getAmmoExplosionRisk(28)).toBe(4);
    });

    it('should return 0 (auto explosion) at 30+ heat', () => {
      expect(getAmmoExplosionRisk(30)).toBe(0);
    });
  });

  describe('isTSMActive', () => {
    it('should return false below 9 heat', () => {
      expect(isTSMActive(0)).toBe(false);
      expect(isTSMActive(5)).toBe(false);
      expect(isTSMActive(8)).toBe(false);
    });

    it('should return true at 9+ heat', () => {
      expect(isTSMActive(9)).toBe(true);
      expect(isTSMActive(10)).toBe(true);
      expect(isTSMActive(20)).toBe(true);
    });
  });

  describe('getHeatMovementPenalty', () => {
    it('should return 0 at low heat', () => {
      expect(getHeatMovementPenalty(0)).toBe(0);
      expect(getHeatMovementPenalty(4)).toBe(0);
    });

    it('should return -1 at 5-9 heat', () => {
      expect(getHeatMovementPenalty(5)).toBe(-1);
      expect(getHeatMovementPenalty(9)).toBe(-1);
    });

    it('should return progressively worse penalties', () => {
      expect(getHeatMovementPenalty(10)).toBe(-2);
      expect(getHeatMovementPenalty(15)).toBe(-3);
      expect(getHeatMovementPenalty(18)).toBe(-4);
      expect(getHeatMovementPenalty(20)).toBe(-5);
    });

    it('should return -999 (shutdown) at 30+ heat', () => {
      expect(getHeatMovementPenalty(30)).toBe(-999);
      expect(getHeatMovementPenalty(35)).toBe(-999);
    });
  });
});
