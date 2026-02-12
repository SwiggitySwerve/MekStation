import type { IEnvironmentalConditions } from '../environmentalModifiers';

import {
  DEFAULT_ENVIRONMENTAL_CONDITIONS,
  createEnvironmentalConditions,
  calculateLightModifier,
  calculatePrecipitationModifier,
  calculateFogModifier,
  calculateWindMissileModifier,
  getWindJumpReduction,
  scaleJumpDistance,
  scaleFallDamage,
  getAtmosphereHeatModifier,
  getTemperatureHeatModifier,
  calculateEnvironmentalModifiers,
  calculateEnvironmentalHeatModifier,
} from '../environmentalModifiers';

// =============================================================================
// Default Conditions
// =============================================================================

describe('DEFAULT_ENVIRONMENTAL_CONDITIONS', () => {
  it('should default to standard daylight conditions', () => {
    expect(DEFAULT_ENVIRONMENTAL_CONDITIONS.light).toBe('daylight');
    expect(DEFAULT_ENVIRONMENTAL_CONDITIONS.precipitation).toBe('none');
    expect(DEFAULT_ENVIRONMENTAL_CONDITIONS.fog).toBe('none');
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

describe('calculateEnvironmentalModifiers', () => {
  it('should return empty array for default conditions', () => {
    const mods = calculateEnvironmentalModifiers(
      DEFAULT_ENVIRONMENTAL_CONDITIONS,
    );
    expect(mods).toEqual([]);
  });

  it('should return light modifier only for night conditions', () => {
    const conditions = createEnvironmentalConditions({ light: 'night' });
    const mods = calculateEnvironmentalModifiers(conditions);
    expect(mods).toHaveLength(1);
    expect(mods[0].name).toBe('Light Conditions');
    expect(mods[0].value).toBe(2);
  });

  it('should stack light and precipitation modifiers', () => {
    const conditions = createEnvironmentalConditions({
      light: 'dusk',
      precipitation: 'heavy_rain',
    });
    const mods = calculateEnvironmentalModifiers(conditions);
    expect(mods).toHaveLength(2);
    const total = mods.reduce((sum, m) => sum + m.value, 0);
    expect(total).toBe(3); // +1 dusk + +2 heavy rain
  });

  it('should stack all to-hit conditions together', () => {
    const conditions = createEnvironmentalConditions({
      light: 'night',
      precipitation: 'light_rain',
      fog: 'heavy_fog',
    });
    const mods = calculateEnvironmentalModifiers(conditions);
    expect(mods).toHaveLength(3);
    const total = mods.reduce((sum, m) => sum + m.value, 0);
    expect(total).toBe(5); // +2 night + +1 rain + +2 fog
  });

  it('should not include wind modifier for non-missile weapons', () => {
    const conditions = createEnvironmentalConditions({ wind: 'strong' });
    const mods = calculateEnvironmentalModifiers(conditions, {
      isMissileWeapon: false,
    });
    expect(mods).toHaveLength(0);
  });

  it('should include wind modifier for missile weapons', () => {
    const conditions = createEnvironmentalConditions({ wind: 'strong' });
    const mods = calculateEnvironmentalModifiers(conditions, {
      isMissileWeapon: true,
    });
    expect(mods).toHaveLength(1);
    expect(mods[0].name).toBe('Wind (Missiles)');
    expect(mods[0].value).toBe(2);
  });

  it('should default isMissileWeapon to false when not specified', () => {
    const conditions = createEnvironmentalConditions({ wind: 'moderate' });
    const mods = calculateEnvironmentalModifiers(conditions);
    expect(mods).toHaveLength(0);
  });

  it('should combine all modifiers including wind for missile weapons', () => {
    const conditions: IEnvironmentalConditions = {
      light: 'night',
      precipitation: 'snow',
      fog: 'light_fog',
      wind: 'moderate',
      gravity: 1.0,
      atmosphere: 'standard',
      temperature: 'normal',
    };
    const mods = calculateEnvironmentalModifiers(conditions, {
      isMissileWeapon: true,
    });
    expect(mods).toHaveLength(4); // night + snow + fog + wind
    const total = mods.reduce((sum, m) => sum + m.value, 0);
    expect(total).toBe(5); // +2 + +1 + +1 + +1
  });
});

// =============================================================================
// Combined Heat Dissipation Modifier
// =============================================================================

describe('calculateEnvironmentalHeatModifier', () => {
  it('should return 0 for default conditions', () => {
    const result = calculateEnvironmentalHeatModifier(
      DEFAULT_ENVIRONMENTAL_CONDITIONS,
    );
    expect(result).toBe(0);
  });

  it('should return -2 for thin atmosphere', () => {
    const conditions = createEnvironmentalConditions({ atmosphere: 'thin' });
    expect(calculateEnvironmentalHeatModifier(conditions)).toBe(-2);
  });

  it('should return -4 for vacuum', () => {
    const conditions = createEnvironmentalConditions({ atmosphere: 'vacuum' });
    expect(calculateEnvironmentalHeatModifier(conditions)).toBe(-4);
  });

  it('should return +2 for extreme cold with standard atmosphere', () => {
    const conditions = createEnvironmentalConditions({
      temperature: 'extreme_cold',
    });
    expect(calculateEnvironmentalHeatModifier(conditions)).toBe(2);
  });

  it('should return -2 for extreme heat with standard atmosphere', () => {
    const conditions = createEnvironmentalConditions({
      temperature: 'extreme_heat',
    });
    expect(calculateEnvironmentalHeatModifier(conditions)).toBe(-2);
  });

  it('should combine atmosphere and temperature: thin + extreme cold', () => {
    const conditions = createEnvironmentalConditions({
      atmosphere: 'thin',
      temperature: 'extreme_cold',
    });
    expect(calculateEnvironmentalHeatModifier(conditions)).toBe(0); // -2 + +2
  });

  it('should combine atmosphere and temperature: vacuum + extreme heat', () => {
    const conditions = createEnvironmentalConditions({
      atmosphere: 'vacuum',
      temperature: 'extreme_heat',
    });
    expect(calculateEnvironmentalHeatModifier(conditions)).toBe(-6); // -4 + -2
  });
});
