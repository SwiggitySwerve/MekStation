import type {
  IEnvironmentalConditions,
  LightCondition,
} from '../environmentalModifiers';

import {
  DEFAULT_ENVIRONMENTAL_CONDITIONS,
  createEnvironmentalConditions,
  calculateLightModifier,
  calculatePrecipitationModifier,
  calculateFogModifier,
  calculateBlowingSandModifier,
  calculateWindMissileModifier,
  getWindJumpReduction,
  scaleJumpDistance,
  scaleFallDamage,
  getAtmosphereHeatModifier,
  getTemperatureHeatModifier,
  calculateEnvironmentalModifiers,
  calculateEnvironmentalHeatModifier,
  calculateEnvironmentalSpecialistPhysicalToHitModifier,
  calculateEnvironmentalSpecialistRangedToHitModifier,
} from '../environmentalModifiers';

// =============================================================================
// Default Conditions
// =============================================================================

describe('DEFAULT_ENVIRONMENTAL_CONDITIONS', () => {
  it('should default to standard daylight conditions', () => {
    expect(DEFAULT_ENVIRONMENTAL_CONDITIONS.light).toBe('daylight');
    expect(DEFAULT_ENVIRONMENTAL_CONDITIONS.precipitation).toBe('none');
    expect(DEFAULT_ENVIRONMENTAL_CONDITIONS.fog).toBe('none');
    expect(DEFAULT_ENVIRONMENTAL_CONDITIONS.blowingSand).toBe(false);
    expect(DEFAULT_ENVIRONMENTAL_CONDITIONS.wind).toBe('none');
    expect(DEFAULT_ENVIRONMENTAL_CONDITIONS.gravity).toBe(1.0);
    expect(DEFAULT_ENVIRONMENTAL_CONDITIONS.atmosphere).toBe('standard');
    expect(DEFAULT_ENVIRONMENTAL_CONDITIONS.temperature).toBe('normal');
  });
});

describe('createEnvironmentalConditions', () => {
  it('should return defaults when no overrides given', () => {
    const conditions = createEnvironmentalConditions();
    expect(conditions).toEqual(DEFAULT_ENVIRONMENTAL_CONDITIONS);
  });

  it('should override specific fields while keeping defaults for others', () => {
    const conditions = createEnvironmentalConditions({
      light: 'night',
      gravity: 0.5,
    });
    expect(conditions.light).toBe('night');
    expect(conditions.gravity).toBe(0.5);
    expect(conditions.precipitation).toBe('none');
    expect(conditions.fog).toBe('none');
    expect(conditions.blowingSand).toBe(false);
  });
});

// =============================================================================
// Light Condition Modifiers
// =============================================================================

describe('calculateLightModifier', () => {
  it('should return null for daylight (no penalty)', () => {
    expect(calculateLightModifier('daylight')).toBeNull();
  });

  it('should return +1 for dawn', () => {
    const mod = calculateLightModifier('dawn');
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(1);
    expect(mod!.source).toBe('environmental');
  });

  it('should return +1 for dusk', () => {
    const mod = calculateLightModifier('dusk');
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(1);
  });

  it('should return +2 for night', () => {
    const mod = calculateLightModifier('night');
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(2);
    expect(mod!.source).toBe('environmental');
  });

  it.each<{ readonly light: LightCondition; readonly expected: number }>([
    { light: 'full_moon', expected: 2 },
    { light: 'glare', expected: 2 },
    { light: 'moonless', expected: 3 },
    { light: 'solar_flare', expected: 3 },
    { light: 'pitch_black', expected: 4 },
  ])(
    'should return the MegaMek weapon light penalty for $light',
    ({ light, expected }) => {
      const mod = calculateLightModifier(light);
      expect(mod).not.toBeNull();
      expect(mod!.value).toBe(expected);
      expect(mod!.source).toBe('environmental');
    },
  );
});

// =============================================================================
// Precipitation Modifiers
// =============================================================================

describe('calculatePrecipitationModifier', () => {
  it('should return null for no precipitation', () => {
    expect(calculatePrecipitationModifier('none')).toBeNull();
  });

  it('should return +1 for light rain', () => {
    const mod = calculatePrecipitationModifier('light_rain');
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(1);
    expect(mod!.source).toBe('environmental');
  });

  it('should return +2 for heavy rain', () => {
    const mod = calculatePrecipitationModifier('heavy_rain');
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(2);
  });

  it('should return +1 for snow', () => {
    const mod = calculatePrecipitationModifier('snow');
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(1);
  });
});

// =============================================================================
// Fog Modifiers
// =============================================================================

describe('calculateFogModifier', () => {
  it('should return null for no fog', () => {
    expect(calculateFogModifier('none')).toBeNull();
  });

  it('should return +1 for light fog', () => {
    const mod = calculateFogModifier('light_fog');
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(1);
    expect(mod!.source).toBe('environmental');
  });

  it('should return +2 for heavy fog', () => {
    const mod = calculateFogModifier('heavy_fog');
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(2);
  });
});

// =============================================================================
// Blowing Sand Modifiers
// =============================================================================

describe('calculateBlowingSandModifier', () => {
  it('should return null when blowing sand is inactive', () => {
    expect(calculateBlowingSandModifier(false, true)).toBeNull();
  });

  it('should return null for non-energy weapons in blowing sand', () => {
    expect(calculateBlowingSandModifier(true, false)).toBeNull();
  });

  it('should return +1 for energy weapons in blowing sand', () => {
    const mod = calculateBlowingSandModifier(true, true);
    expect(mod).not.toBeNull();
    expect(mod!.name).toBe('Blowing Sand');
    expect(mod!.value).toBe(1);
    expect(mod!.source).toBe('environmental');
  });
});

// =============================================================================
// Wind Modifiers
// =============================================================================

describe('calculateWindMissileModifier', () => {
  it('should return null for no wind', () => {
    expect(calculateWindMissileModifier('none')).toBeNull();
  });

  it('should return +1 for moderate wind on missiles', () => {
    const mod = calculateWindMissileModifier('moderate');
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(1);
    expect(mod!.source).toBe('environmental');
  });

  it('should return +2 for strong wind on missiles', () => {
    const mod = calculateWindMissileModifier('strong');
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(2);
  });
});

describe('getWindJumpReduction', () => {
  it('should return 0 for no wind', () => {
    expect(getWindJumpReduction('none')).toBe(0);
  });

  it('should return 0 for moderate wind', () => {
    expect(getWindJumpReduction('moderate')).toBe(0);
  });

  it('should return 2 for strong wind', () => {
    expect(getWindJumpReduction('strong')).toBe(2);
  });
});

// =============================================================================
// Gravity Effects
// =============================================================================

describe('scaleJumpDistance', () => {
  it('should not change jump distance at 1.0g', () => {
    expect(scaleJumpDistance(5, 1.0)).toBe(5);
  });

  it('should increase jump distance at low gravity (0.5g)', () => {
    expect(scaleJumpDistance(5, 0.5)).toBe(10);
  });

  it('should decrease jump distance at high gravity (2.0g)', () => {
    expect(scaleJumpDistance(5, 2.0)).toBe(3);
  });

  it('should round to nearest integer', () => {
    expect(scaleJumpDistance(4, 0.3)).toBe(13);
  });

  it('should never go below 0', () => {
    expect(scaleJumpDistance(0, 2.0)).toBe(0);
  });

  it('should handle zero gravity as standard (no change)', () => {
    expect(scaleJumpDistance(5, 0)).toBe(5);
  });

  it('should handle negative gravity as standard (no change)', () => {
    expect(scaleJumpDistance(5, -1)).toBe(5);
  });
});

describe('scaleFallDamage', () => {
  it('should not change damage at 1.0g', () => {
    expect(scaleFallDamage(10, 1.0)).toBe(10);
  });

  it('should increase damage at high gravity (1.5g)', () => {
    expect(scaleFallDamage(10, 1.5)).toBe(15);
  });

  it('should decrease damage at low gravity (0.5g)', () => {
    expect(scaleFallDamage(10, 0.5)).toBe(5);
  });

  it('should round to nearest integer', () => {
    expect(scaleFallDamage(7, 1.5)).toBe(11);
  });

  it('should return 0 for zero gravity', () => {
    expect(scaleFallDamage(10, 0)).toBe(0);
  });

  it('should never go below 0', () => {
    expect(scaleFallDamage(0, 2.0)).toBe(0);
  });
});

// =============================================================================
// Atmosphere Effects
// =============================================================================

describe('getAtmosphereHeatModifier', () => {
  it('should return 0 for standard atmosphere', () => {
    expect(getAtmosphereHeatModifier('standard')).toBe(0);
  });

  it('should return -2 for thin atmosphere', () => {
    expect(getAtmosphereHeatModifier('thin')).toBe(-2);
  });

  it('should return -4 for trace atmosphere', () => {
    expect(getAtmosphereHeatModifier('trace')).toBe(-4);
  });

  it('should return -4 for vacuum', () => {
    expect(getAtmosphereHeatModifier('vacuum')).toBe(-4);
  });
});

// =============================================================================
// Temperature Effects
// =============================================================================

describe('getTemperatureHeatModifier', () => {
  it('should return 0 for normal temperature', () => {
    expect(getTemperatureHeatModifier('normal')).toBe(0);
  });

  it('should return +2 for extreme cold (better cooling)', () => {
    expect(getTemperatureHeatModifier('extreme_cold')).toBe(2);
  });

  it('should return -2 for extreme heat (worse cooling)', () => {
    expect(getTemperatureHeatModifier('extreme_heat')).toBe(-2);
  });
});

// =============================================================================
// Combined Environmental Modifiers
// =============================================================================
