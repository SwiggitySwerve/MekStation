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
