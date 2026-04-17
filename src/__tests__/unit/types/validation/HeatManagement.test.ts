/**
 * Heat Management Tests
 *
 * Verifies `HeatManagement.ts` is a thin derived view over the canonical
 * thresholds in `src/constants/heat.ts`. After the `fix-combat-rule-accuracy`
 * consolidation, all to-hit penalties, shutdown TNs, and movement penalties
 * SHALL come from the canonical source — no divergent tables.
 *
 * @spec openspec/specs/heat-overflow-effects/spec.md
 * @spec openspec/changes/fix-combat-rule-accuracy/proposal.md (Bug #3)
 */

import { HEAT_THRESHOLDS } from '@/constants/heat';
import {
  HeatLevel,
  TSM_ACTIVATION_THRESHOLD,
  getAmmoExplosionRisk,
  getHeatMovementPenalty,
  getHeatScaleEffect,
  isShutdownRisk,
  isTSMActive,
} from '@/types/validation/HeatManagement';

describe('HeatLevel enum values match canonical thresholds', () => {
  it('COOL is 0', () => expect(HeatLevel.COOL).toBe(0));
  it('WARM equals TO_HIT_1 (8)', () =>
    expect(HeatLevel.WARM).toBe(HEAT_THRESHOLDS.TO_HIT_1));
  it('HOT equals TO_HIT_2 (13)', () =>
    expect(HeatLevel.HOT).toBe(HEAT_THRESHOLDS.TO_HIT_2));
  it('SHUTDOWN_RISK equals SHUTDOWN_CHECK (14)', () =>
    expect(HeatLevel.SHUTDOWN_RISK).toBe(HEAT_THRESHOLDS.SHUTDOWN_CHECK));
  it('DANGEROUS equals TO_HIT_3 (17)', () =>
    expect(HeatLevel.DANGEROUS).toBe(HEAT_THRESHOLDS.TO_HIT_3));
  it('CRITICAL equals TO_HIT_4 (24)', () =>
    expect(HeatLevel.CRITICAL).toBe(HEAT_THRESHOLDS.TO_HIT_4));
  it('MELTDOWN equals AUTO_SHUTDOWN (30)', () =>
    expect(HeatLevel.MELTDOWN).toBe(HEAT_THRESHOLDS.AUTO_SHUTDOWN));
});

describe('TSM_ACTIVATION_THRESHOLD', () => {
  it('is 9', () => expect(TSM_ACTIVATION_THRESHOLD).toBe(9));
});

describe('getHeatScaleEffect returns canonical-derived values', () => {
  it('at heat 0 returns no penalties', () => {
    const effect = getHeatScaleEffect(0);
    expect(effect.movementPenalty).toBe(0);
    expect(effect.toHitPenalty).toBe(0);
    expect(effect.shutdownRoll).toBeUndefined();
    expect(effect.ammoExplosionRoll).toBeUndefined();
  });

  it('at heat 7 (below first to-hit threshold) has no to-hit penalty', () => {
    const effect = getHeatScaleEffect(7);
    expect(effect.toHitPenalty).toBe(0);
  });

  it('at heat 8 applies +1 to-hit (first canonical threshold)', () => {
    const effect = getHeatScaleEffect(8);
    expect(effect.toHitPenalty).toBe(1);
  });

  it('at heat 13 applies +2 to-hit', () => {
    const effect = getHeatScaleEffect(13);
    expect(effect.toHitPenalty).toBe(2);
  });

  it('at heat 14 shutdown check begins', () => {
    const effect = getHeatScaleEffect(14);
    expect(effect.shutdownRoll).toBeGreaterThan(0);
  });

  it('at heat 17 applies +3 to-hit', () => {
    const effect = getHeatScaleEffect(17);
    expect(effect.toHitPenalty).toBe(3);
  });

  it('at heat 19 ammo explosion risk begins (TN 4)', () => {
    const effect = getHeatScaleEffect(19);
    expect(effect.ammoExplosionRoll).toBe(4);
  });

  it('at heat 24 applies +4 to-hit and ammo TN 6', () => {
    const effect = getHeatScaleEffect(24);
    expect(effect.toHitPenalty).toBe(4);
    expect(effect.ammoExplosionRoll).toBe(6);
  });

  it('at heat 28 ammo TN becomes 8', () => {
    const effect = getHeatScaleEffect(28);
    expect(effect.ammoExplosionRoll).toBe(8);
  });

  it('at heat 30+ shutdown is automatic', () => {
    const effect = getHeatScaleEffect(30);
    expect(effect.shutdownRoll).toBe(Infinity);
  });

  it('at heat 40 stays at max bracket (+4, no cumulative)', () => {
    const effect = getHeatScaleEffect(40);
    expect(effect.toHitPenalty).toBe(4);
  });
});

describe('isShutdownRisk', () => {
  it('is false below 14 heat (shutdown check threshold)', () => {
    expect(isShutdownRisk(0)).toBe(false);
    expect(isShutdownRisk(13)).toBe(false);
  });

  it('is true at and above 14 heat', () => {
    expect(isShutdownRisk(14)).toBe(true);
    expect(isShutdownRisk(20)).toBe(true);
    expect(isShutdownRisk(30)).toBe(true);
  });
});

describe('getAmmoExplosionRisk', () => {
  it('is null below 19 heat (first ammo threshold)', () => {
    expect(getAmmoExplosionRisk(0)).toBeNull();
    expect(getAmmoExplosionRisk(18)).toBeNull();
  });

  it('returns canonical TN at each ammo bracket', () => {
    expect(getAmmoExplosionRisk(19)).toBe(4);
    expect(getAmmoExplosionRisk(22)).toBe(4);
    expect(getAmmoExplosionRisk(23)).toBe(6);
    expect(getAmmoExplosionRisk(27)).toBe(6);
    expect(getAmmoExplosionRisk(28)).toBe(8);
    expect(getAmmoExplosionRisk(29)).toBe(8);
  });

  it('returns Infinity (auto explode) at 30+ heat', () => {
    expect(getAmmoExplosionRisk(30)).toBe(Infinity);
  });
});

describe('isTSMActive', () => {
  it('is false below 9 heat', () => {
    expect(isTSMActive(0)).toBe(false);
    expect(isTSMActive(8)).toBe(false);
  });

  it('is true at 9+ heat', () => {
    expect(isTSMActive(9)).toBe(true);
    expect(isTSMActive(20)).toBe(true);
  });
});

describe('getHeatMovementPenalty (canonical floor(heat/5))', () => {
  it('returns 0 at low heat', () => {
    expect(getHeatMovementPenalty(0)).toBe(0);
    expect(getHeatMovementPenalty(4)).toBe(0);
  });

  it('returns canonical floor(heat/5) values', () => {
    expect(getHeatMovementPenalty(5)).toBe(1);
    expect(getHeatMovementPenalty(10)).toBe(2);
    expect(getHeatMovementPenalty(15)).toBe(3);
    expect(getHeatMovementPenalty(18)).toBe(3);
    expect(getHeatMovementPenalty(20)).toBe(4);
    expect(getHeatMovementPenalty(25)).toBe(5);
  });
});
