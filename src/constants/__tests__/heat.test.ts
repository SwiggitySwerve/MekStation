/**
 * Heat Constants Tests
 *
 * Tests for BattleTech heat scale thresholds and effects.
 */

import {
  HEAT_THRESHOLDS,
  MAX_HEAT,
  HEAT_DISPLAY_THRESHOLDS,
  HEAT_EFFECTS,
  getHeatColorClass,
  getActiveHeatEffects,
} from '../heat';

// =============================================================================
// Heat Thresholds Tests
// =============================================================================

describe('HEAT_THRESHOLDS', () => {
  it('should have correct BattleTech threshold values', () => {
    // Per TechManual heat scale
    expect(HEAT_THRESHOLDS.PENALTY_1).toBe(8);
    expect(HEAT_THRESHOLDS.PENALTY_2).toBe(13);
    expect(HEAT_THRESHOLDS.PENALTY_3).toBe(17);
    expect(HEAT_THRESHOLDS.PENALTY_4).toBe(18);
    expect(HEAT_THRESHOLDS.PENALTY_5).toBe(26);
    expect(HEAT_THRESHOLDS.AMMO_EXPLOSION_RISK).toBe(24);
    expect(HEAT_THRESHOLDS.SHUTDOWN).toBe(30);
  });

  it('should have movement penalty threshold', () => {
    expect(HEAT_THRESHOLDS.MOVEMENT_PENALTY).toBe(5);
  });

  it('should have thresholds in ascending order', () => {
    expect(HEAT_THRESHOLDS.PENALTY_1).toBeLessThan(HEAT_THRESHOLDS.PENALTY_2);
    expect(HEAT_THRESHOLDS.PENALTY_2).toBeLessThan(HEAT_THRESHOLDS.PENALTY_3);
    expect(HEAT_THRESHOLDS.PENALTY_3).toBeLessThan(HEAT_THRESHOLDS.PENALTY_4);
    expect(HEAT_THRESHOLDS.PENALTY_4).toBeLessThan(HEAT_THRESHOLDS.PENALTY_5);
    expect(HEAT_THRESHOLDS.PENALTY_5).toBeLessThan(HEAT_THRESHOLDS.SHUTDOWN);
  });
});

describe('MAX_HEAT', () => {
  it('should match shutdown threshold', () => {
    expect(MAX_HEAT).toBe(HEAT_THRESHOLDS.SHUTDOWN);
  });
});

describe('HEAT_EFFECTS', () => {
  it('should have descriptions for all penalty thresholds', () => {
    expect(HEAT_EFFECTS[HEAT_THRESHOLDS.PENALTY_1]).toBe('+1 to-hit penalty');
    expect(HEAT_EFFECTS[HEAT_THRESHOLDS.PENALTY_2]).toBe('+2 to-hit penalty');
    expect(HEAT_EFFECTS[HEAT_THRESHOLDS.PENALTY_3]).toBe('+3 to-hit penalty');
    expect(HEAT_EFFECTS[HEAT_THRESHOLDS.PENALTY_4]).toBe('+4 to-hit penalty');
    expect(HEAT_EFFECTS[HEAT_THRESHOLDS.PENALTY_5]).toBe('+5 to-hit penalty');
  });

  it('should have ammo explosion risk description', () => {
    expect(HEAT_EFFECTS[HEAT_THRESHOLDS.AMMO_EXPLOSION_RISK]).toBe('Ammo explosion risk');
  });

  it('should have shutdown description', () => {
    expect(HEAT_EFFECTS[HEAT_THRESHOLDS.SHUTDOWN]).toBe('SHUTDOWN');
  });
});

// =============================================================================
// Display Thresholds Tests
// =============================================================================

describe('HEAT_DISPLAY_THRESHOLDS', () => {
  it('should have display zones in ascending order', () => {
    expect(HEAT_DISPLAY_THRESHOLDS.SAFE).toBeLessThan(HEAT_DISPLAY_THRESHOLDS.CAUTION);
    expect(HEAT_DISPLAY_THRESHOLDS.CAUTION).toBeLessThan(HEAT_DISPLAY_THRESHOLDS.WARNING);
    expect(HEAT_DISPLAY_THRESHOLDS.WARNING).toBeLessThan(HEAT_DISPLAY_THRESHOLDS.DANGER);
    expect(HEAT_DISPLAY_THRESHOLDS.DANGER).toBeLessThan(HEAT_DISPLAY_THRESHOLDS.CRITICAL);
    expect(HEAT_DISPLAY_THRESHOLDS.CRITICAL).toBeLessThan(HEAT_DISPLAY_THRESHOLDS.SHUTDOWN);
  });
});

// =============================================================================
// getHeatColorClass Tests
// =============================================================================

describe('getHeatColorClass', () => {
  it('should return green for safe heat levels', () => {
    expect(getHeatColorClass(0)).toBe('bg-green-500');
    expect(getHeatColorClass(7)).toBe('bg-green-500');
  });

  it('should return yellow-400 for caution levels (8-12)', () => {
    expect(getHeatColorClass(8)).toBe('bg-yellow-400');
    expect(getHeatColorClass(12)).toBe('bg-yellow-400');
  });

  it('should return yellow-500 for warning levels (13-16)', () => {
    expect(getHeatColorClass(13)).toBe('bg-yellow-500');
    expect(getHeatColorClass(16)).toBe('bg-yellow-500');
  });

  it('should return orange for danger levels (17-22)', () => {
    expect(getHeatColorClass(17)).toBe('bg-orange-500');
    expect(getHeatColorClass(22)).toBe('bg-orange-500');
  });

  it('should return red-500 for critical levels (23-29)', () => {
    expect(getHeatColorClass(23)).toBe('bg-red-500');
    expect(getHeatColorClass(29)).toBe('bg-red-500');
  });

  it('should return red-600 for shutdown levels (30+)', () => {
    expect(getHeatColorClass(30)).toBe('bg-red-600');
    expect(getHeatColorClass(35)).toBe('bg-red-600');
  });
});

// =============================================================================
// getActiveHeatEffects Tests
// =============================================================================

describe('getActiveHeatEffects', () => {
  it('should return empty array for heat below first threshold', () => {
    expect(getActiveHeatEffects(0)).toEqual([]);
    expect(getActiveHeatEffects(7)).toEqual([]);
  });

  it('should return +1 penalty at heat 8', () => {
    const effects = getActiveHeatEffects(8);
    expect(effects).toContain('+1 to-hit penalty');
    expect(effects.length).toBe(1);
  });

  it('should return +1 and +2 penalties at heat 13', () => {
    const effects = getActiveHeatEffects(13);
    expect(effects).toContain('+1 to-hit penalty');
    expect(effects).toContain('+2 to-hit penalty');
    expect(effects.length).toBe(2);
  });

  it('should include +3 penalty at heat 17', () => {
    const effects = getActiveHeatEffects(17);
    expect(effects).toContain('+3 to-hit penalty');
    expect(effects).toContain('+2 to-hit penalty');
    expect(effects).toContain('+1 to-hit penalty');
    expect(effects.length).toBe(3);
  });

  it('should include +4 penalty at heat 18', () => {
    const effects = getActiveHeatEffects(18);
    expect(effects).toContain('+4 to-hit penalty');
    expect(effects).toContain('+3 to-hit penalty');
    expect(effects).toContain('+2 to-hit penalty');
    expect(effects).toContain('+1 to-hit penalty');
    expect(effects.length).toBe(4);
  });

  it('should include ammo explosion risk at heat 24', () => {
    const effects = getActiveHeatEffects(24);
    expect(effects).toContain('Ammo explosion risk');
  });

  it('should include +5 penalty at heat 26', () => {
    const effects = getActiveHeatEffects(26);
    expect(effects).toContain('+5 to-hit penalty');
    expect(effects).toContain('Ammo explosion risk');
  });

  it('should include SHUTDOWN at heat 30', () => {
    const effects = getActiveHeatEffects(30);
    expect(effects).toContain('SHUTDOWN');
    expect(effects).toContain('+5 to-hit penalty');
    expect(effects).toContain('Ammo explosion risk');
    expect(effects).toContain('+4 to-hit penalty');
    expect(effects).toContain('+3 to-hit penalty');
    expect(effects).toContain('+2 to-hit penalty');
    expect(effects).toContain('+1 to-hit penalty');
    expect(effects.length).toBe(7);
  });

  it('should return effects in severity order (highest first)', () => {
    const effects = getActiveHeatEffects(30);
    // Verify highest severity effects come first
    expect(effects.indexOf('SHUTDOWN')).toBeLessThan(effects.indexOf('+5 to-hit penalty'));
    expect(effects.indexOf('+5 to-hit penalty')).toBeLessThan(effects.indexOf('Ammo explosion risk'));
  });

  it('should handle heat values between thresholds correctly', () => {
    // Heat 16 - between +2 (13) and +3 (17)
    const effects16 = getActiveHeatEffects(16);
    expect(effects16).toContain('+2 to-hit penalty');
    expect(effects16).toContain('+1 to-hit penalty');
    expect(effects16).not.toContain('+3 to-hit penalty');
    expect(effects16.length).toBe(2);

    // Heat 25 - between ammo risk (24) and +5 (26)
    const effects25 = getActiveHeatEffects(25);
    expect(effects25).toContain('Ammo explosion risk');
    expect(effects25).not.toContain('+5 to-hit penalty');
  });
});
