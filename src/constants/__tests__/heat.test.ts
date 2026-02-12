import {
  HEAT_THRESHOLDS,
  HEAT_TO_HIT_TABLE,
  MAX_HEAT,
  HEAT_DISPLAY_THRESHOLDS,
  HEAT_EFFECTS,
  ENGINE_HIT_HEAT,
  getHeatColorClass,
  getActiveHeatEffects,
  getShutdownTN,
  getStartupTN,
  getAmmoExplosionTN,
  getHeatMovementPenalty,
  getHeatToHitModifier,
  getPilotHeatDamage,
} from '../heat';

describe('HEAT_THRESHOLDS', () => {
  it('should have correct canonical threshold values', () => {
    expect(HEAT_THRESHOLDS.MOVEMENT_PENALTY).toBe(5);
    expect(HEAT_THRESHOLDS.TO_HIT_1).toBe(8);
    expect(HEAT_THRESHOLDS.TO_HIT_2).toBe(13);
    expect(HEAT_THRESHOLDS.SHUTDOWN_CHECK).toBe(14);
    expect(HEAT_THRESHOLDS.PILOT_DAMAGE_1).toBe(15);
    expect(HEAT_THRESHOLDS.TO_HIT_3).toBe(17);
    expect(HEAT_THRESHOLDS.AMMO_EXPLOSION_1).toBe(19);
    expect(HEAT_THRESHOLDS.AMMO_EXPLOSION_2).toBe(23);
    expect(HEAT_THRESHOLDS.TO_HIT_4).toBe(24);
    expect(HEAT_THRESHOLDS.PILOT_DAMAGE_2).toBe(25);
    expect(HEAT_THRESHOLDS.AMMO_EXPLOSION_3).toBe(28);
    expect(HEAT_THRESHOLDS.AUTO_SHUTDOWN).toBe(30);
  });

  it('should have to-hit thresholds in ascending order', () => {
    expect(HEAT_THRESHOLDS.TO_HIT_1).toBeLessThan(HEAT_THRESHOLDS.TO_HIT_2);
    expect(HEAT_THRESHOLDS.TO_HIT_2).toBeLessThan(HEAT_THRESHOLDS.TO_HIT_3);
    expect(HEAT_THRESHOLDS.TO_HIT_3).toBeLessThan(HEAT_THRESHOLDS.TO_HIT_4);
  });
});

describe('HEAT_TO_HIT_TABLE', () => {
  it('should have 5 entries', () => {
    expect(HEAT_TO_HIT_TABLE).toHaveLength(5);
  });

  it('should map canonical to-hit penalties', () => {
    expect(HEAT_TO_HIT_TABLE[0]).toEqual({
      minHeat: 0,
      maxHeat: 7,
      modifier: 0,
    });
    expect(HEAT_TO_HIT_TABLE[1]).toEqual({
      minHeat: 8,
      maxHeat: 12,
      modifier: 1,
    });
    expect(HEAT_TO_HIT_TABLE[2]).toEqual({
      minHeat: 13,
      maxHeat: 16,
      modifier: 2,
    });
    expect(HEAT_TO_HIT_TABLE[3]).toEqual({
      minHeat: 17,
      maxHeat: 23,
      modifier: 3,
    });
    expect(HEAT_TO_HIT_TABLE[4]).toEqual({
      minHeat: 24,
      maxHeat: Infinity,
      modifier: 4,
    });
  });
});

describe('MAX_HEAT', () => {
  it('should match auto-shutdown threshold', () => {
    expect(MAX_HEAT).toBe(HEAT_THRESHOLDS.AUTO_SHUTDOWN);
  });
});

describe('ENGINE_HIT_HEAT', () => {
  it('should be 5 heat per engine hit', () => {
    expect(ENGINE_HIT_HEAT).toBe(5);
  });
});

describe('HEAT_EFFECTS', () => {
  it('should have descriptions for all thresholds', () => {
    expect(HEAT_EFFECTS[HEAT_THRESHOLDS.TO_HIT_1]).toBe('+1 to-hit penalty');
    expect(HEAT_EFFECTS[HEAT_THRESHOLDS.TO_HIT_2]).toBe('+2 to-hit penalty');
    expect(HEAT_EFFECTS[HEAT_THRESHOLDS.TO_HIT_3]).toBe('+3 to-hit penalty');
    expect(HEAT_EFFECTS[HEAT_THRESHOLDS.TO_HIT_4]).toBe('+4 to-hit penalty');
    expect(HEAT_EFFECTS[HEAT_THRESHOLDS.AUTO_SHUTDOWN]).toBe(
      'Automatic shutdown',
    );
  });
});

describe('HEAT_DISPLAY_THRESHOLDS', () => {
  it('should have display zones in ascending order', () => {
    expect(HEAT_DISPLAY_THRESHOLDS.SAFE).toBeLessThan(
      HEAT_DISPLAY_THRESHOLDS.CAUTION,
    );
    expect(HEAT_DISPLAY_THRESHOLDS.CAUTION).toBeLessThan(
      HEAT_DISPLAY_THRESHOLDS.WARNING,
    );
    expect(HEAT_DISPLAY_THRESHOLDS.WARNING).toBeLessThan(
      HEAT_DISPLAY_THRESHOLDS.DANGER,
    );
    expect(HEAT_DISPLAY_THRESHOLDS.DANGER).toBeLessThan(
      HEAT_DISPLAY_THRESHOLDS.CRITICAL,
    );
    expect(HEAT_DISPLAY_THRESHOLDS.CRITICAL).toBeLessThan(
      HEAT_DISPLAY_THRESHOLDS.SHUTDOWN,
    );
  });
});

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

describe('getActiveHeatEffects', () => {
  it('should return empty array for heat below first threshold', () => {
    expect(getActiveHeatEffects(0)).toEqual([]);
    expect(getActiveHeatEffects(7)).toEqual([]);
  });

  it('should return +1 penalty at heat 8', () => {
    const effects = getActiveHeatEffects(8);
    expect(effects).toContain('+1 to-hit penalty');
    expect(effects).toHaveLength(1);
  });

  it('should return +1 and +2 penalties at heat 13', () => {
    const effects = getActiveHeatEffects(13);
    expect(effects).toContain('+1 to-hit penalty');
    expect(effects).toContain('+2 to-hit penalty');
  });

  it('should include shutdown check at heat 14+', () => {
    const effects = getActiveHeatEffects(14);
    expect(effects).toContain('Shutdown check');
  });

  it('should return automatic shutdown at heat 30', () => {
    const effects = getActiveHeatEffects(30);
    expect(effects).toContain('Automatic shutdown');
    expect(effects).toContain('+4 to-hit penalty');
    expect(effects).toContain('+3 to-hit penalty');
    expect(effects).toContain('+2 to-hit penalty');
    expect(effects).toContain('+1 to-hit penalty');
  });
});

describe('getShutdownTN', () => {
  it('should return 0 below threshold (no check needed)', () => {
    expect(getShutdownTN(13)).toBe(0);
    expect(getShutdownTN(0)).toBe(0);
  });

  it('should return TN 4 at heat 14', () => {
    expect(getShutdownTN(14)).toBe(4);
  });

  it('should return TN 6 at heat 18', () => {
    expect(getShutdownTN(18)).toBe(6);
  });

  it('should return TN 8 at heat 22', () => {
    expect(getShutdownTN(22)).toBe(8);
  });

  it('should return TN 10 at heat 26', () => {
    expect(getShutdownTN(26)).toBe(10);
  });

  it('should return Infinity at heat 30+ (auto-shutdown)', () => {
    expect(getShutdownTN(30)).toBe(Infinity);
    expect(getShutdownTN(35)).toBe(Infinity);
  });

  it('should apply Hot Dog SPA bonus (+3 threshold shift)', () => {
    expect(getShutdownTN(14, 3)).toBe(0);
    expect(getShutdownTN(17, 3)).toBe(4);
    expect(getShutdownTN(21, 3)).toBe(6);
  });
});

describe('getStartupTN', () => {
  it('should return base TN 4 below shutdown threshold', () => {
    expect(getStartupTN(10)).toBe(4);
  });

  it('should return TN 4 at heat 14', () => {
    expect(getStartupTN(14)).toBe(4);
  });

  it('should return TN 6 at heat 18', () => {
    expect(getStartupTN(18)).toBe(6);
  });

  it('should use same formula as shutdown', () => {
    expect(getStartupTN(22)).toBe(8);
    expect(getStartupTN(26)).toBe(10);
  });

  it('should still allow startup at heat 30+', () => {
    expect(getStartupTN(30)).toBe(12);
  });
});

describe('getAmmoExplosionTN', () => {
  it('should return 0 below heat 19 (no check needed)', () => {
    expect(getAmmoExplosionTN(0)).toBe(0);
    expect(getAmmoExplosionTN(18)).toBe(0);
  });

  it('should return TN 4 at heat 19-22', () => {
    expect(getAmmoExplosionTN(19)).toBe(4);
    expect(getAmmoExplosionTN(22)).toBe(4);
  });

  it('should return TN 6 at heat 23-27', () => {
    expect(getAmmoExplosionTN(23)).toBe(6);
    expect(getAmmoExplosionTN(27)).toBe(6);
  });

  it('should return TN 8 at heat 28-29', () => {
    expect(getAmmoExplosionTN(28)).toBe(8);
    expect(getAmmoExplosionTN(29)).toBe(8);
  });

  it('should return Infinity at heat 30+ (auto-explode)', () => {
    expect(getAmmoExplosionTN(30)).toBe(Infinity);
  });
});

describe('getHeatMovementPenalty', () => {
  it('should return 0 below threshold', () => {
    expect(getHeatMovementPenalty(0)).toBe(0);
    expect(getHeatMovementPenalty(4)).toBe(0);
  });

  it('should apply floor(heat/5) formula', () => {
    expect(getHeatMovementPenalty(5)).toBe(1);
    expect(getHeatMovementPenalty(9)).toBe(1);
    expect(getHeatMovementPenalty(10)).toBe(2);
    expect(getHeatMovementPenalty(15)).toBe(3);
    expect(getHeatMovementPenalty(20)).toBe(4);
    expect(getHeatMovementPenalty(25)).toBe(5);
  });
});

describe('getHeatToHitModifier', () => {
  it('should return 0 below heat 8', () => {
    expect(getHeatToHitModifier(0)).toBe(0);
    expect(getHeatToHitModifier(7)).toBe(0);
  });

  it('should return +1 at heat 8-12', () => {
    expect(getHeatToHitModifier(8)).toBe(1);
    expect(getHeatToHitModifier(12)).toBe(1);
  });

  it('should return +2 at heat 13-16', () => {
    expect(getHeatToHitModifier(13)).toBe(2);
    expect(getHeatToHitModifier(16)).toBe(2);
  });

  it('should return +3 at heat 17-23', () => {
    expect(getHeatToHitModifier(17)).toBe(3);
    expect(getHeatToHitModifier(23)).toBe(3);
  });

  it('should return +4 at heat 24+', () => {
    expect(getHeatToHitModifier(24)).toBe(4);
    expect(getHeatToHitModifier(30)).toBe(4);
    expect(getHeatToHitModifier(99)).toBe(4);
  });
});

describe('getPilotHeatDamage', () => {
  it('should return 0 with functional life support', () => {
    expect(getPilotHeatDamage(25, 0)).toBe(0);
    expect(getPilotHeatDamage(30, 0)).toBe(0);
  });

  it('should return 0 below heat 15 even with damaged life support', () => {
    expect(getPilotHeatDamage(14, 1)).toBe(0);
  });

  it('should return 1 at heat 15-24 with damaged life support', () => {
    expect(getPilotHeatDamage(15, 1)).toBe(1);
    expect(getPilotHeatDamage(24, 1)).toBe(1);
  });

  it('should return 2 at heat 25+ with damaged life support', () => {
    expect(getPilotHeatDamage(25, 1)).toBe(2);
    expect(getPilotHeatDamage(30, 2)).toBe(2);
  });
});
