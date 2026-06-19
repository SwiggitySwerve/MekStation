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

  it('should default isEnergyWeapon to false when not specified', () => {
    const conditions = createEnvironmentalConditions({ blowingSand: true });
    const mods = calculateEnvironmentalModifiers(conditions);
    expect(mods).toHaveLength(0);
  });

  it('should include blowing sand only for energy weapons', () => {
    const conditions = createEnvironmentalConditions({ blowingSand: true });
    const mods = calculateEnvironmentalModifiers(conditions, {
      isEnergyWeapon: true,
    });
    expect(mods).toHaveLength(1);
    expect(mods[0]).toMatchObject({
      name: 'Blowing Sand',
      value: 1,
      source: 'environmental',
    });
  });

  it('should combine all modifiers including wind for missile weapons', () => {
    const conditions: IEnvironmentalConditions = {
      light: 'night',
      precipitation: 'snow',
      fog: 'light_fog',
      blowingSand: true,
      wind: 'moderate',
      gravity: 1.0,
      atmosphere: 'standard',
      temperature: 'normal',
    };
    const mods = calculateEnvironmentalModifiers(conditions, {
      isEnergyWeapon: true,
      isMissileWeapon: true,
    });
    expect(mods).toHaveLength(5); // night + snow + fog + sand + wind
    const total = mods.reduce((sum, m) => sum + m.value, 0);
    expect(total).toBe(6); // +2 + +1 + +1 + +1 + +1
  });

  it('applies Environmental Specialist only for explicit represented ranged selections', () => {
    const heavyFog = createEnvironmentalConditions({ fog: 'heavy_fog' });
    const snow = createEnvironmentalConditions({ precipitation: 'snow' });
    const heavyRain = createEnvironmentalConditions({
      precipitation: 'heavy_rain',
    });
    const moderateWind = createEnvironmentalConditions({ wind: 'moderate' });
    const moonless = createEnvironmentalConditions({ light: 'moonless' });
    const pitchBlack = createEnvironmentalConditions({ light: 'pitch_black' });

    expect(
      calculateEnvironmentalSpecialistRangedToHitModifier(heavyFog, {
        isEnergyWeapon: true,
        pilotAbilities: ['env_specialist'],
        designatedEnvironment: 'Fog',
      }),
    ).toMatchObject({
      name: 'Environmental Specialist (Fog)',
      value: -1,
      source: 'spa',
    });
    expect(
      calculateEnvironmentalSpecialistRangedToHitModifier(snow, {
        pilotAbilities: ['env_specialist'],
        designatedEnvironment: 'Snow',
      }),
    ).toMatchObject({
      name: 'Environmental Specialist (Snow)',
      value: -1,
      source: 'spa',
    });
    expect(
      calculateEnvironmentalSpecialistRangedToHitModifier(heavyRain, {
        pilotAbilities: ['env_specialist'],
        designatedEnvironment: 'Rain',
      }),
    ).toMatchObject({
      name: 'Environmental Specialist (Rain)',
      value: -1,
      source: 'spa',
    });
    expect(
      calculateEnvironmentalSpecialistRangedToHitModifier(moderateWind, {
        isMissileWeapon: true,
        pilotAbilities: ['env_specialist'],
        designatedEnvironment: 'Wind',
      }),
    ).toMatchObject({
      name: 'Environmental Specialist (Wind)',
      value: -1,
      source: 'spa',
    });
    expect(
      calculateEnvironmentalSpecialistRangedToHitModifier(moonless, {
        pilotAbilities: ['env_specialist'],
        designatedEnvironment: 'Light',
        targetIlluminated: false,
      }),
    ).toMatchObject({
      name: 'Environmental Specialist (Light)',
      value: -1,
      source: 'spa',
    });
    expect(
      calculateEnvironmentalSpecialistRangedToHitModifier(pitchBlack, {
        pilotAbilities: ['env_specialist'],
        designatedEnvironment: 'Light',
        targetIlluminated: true,
      }),
    ).toMatchObject({
      name: 'Environmental Specialist (Light)',
      value: -1,
      source: 'spa',
    });
    expect(
      calculateEnvironmentalSpecialistRangedToHitModifier(snow, {
        pilotAbilities: ['env_specialist'],
        designatedEnvironment: 'vacuum',
      }),
    ).toBeNull();
    expect(
      calculateEnvironmentalSpecialistRangedToHitModifier(
        createEnvironmentalConditions({
          fog: 'heavy_fog',
          precipitation: 'snow',
          wind: 'moderate',
          light: 'pitch_black',
        }),
        {
          isEnergyWeapon: true,
          isMissileWeapon: true,
          pilotAbilities: ['env_specialist'],
          designatedEnvironment: 'hail',
          targetIlluminated: true,
        },
      ),
    ).toBeNull();
    expect(
      calculateEnvironmentalSpecialistRangedToHitModifier(snow, {
        pilotAbilities: [],
        designatedEnvironment: 'snow',
      }),
    ).toBeNull();
    expect(
      calculateEnvironmentalSpecialistRangedToHitModifier(heavyFog, {
        isEnergyWeapon: false,
        pilotAbilities: ['env_specialist'],
        designatedEnvironment: 'fog',
      }),
    ).toBeNull();
    expect(
      calculateEnvironmentalSpecialistRangedToHitModifier(
        createEnvironmentalConditions({ fog: 'light_fog' }),
        {
          isEnergyWeapon: true,
          pilotAbilities: ['env_specialist'],
          designatedEnvironment: 'fog',
        },
      ),
    ).toBeNull();
    expect(
      calculateEnvironmentalSpecialistRangedToHitModifier(moderateWind, {
        isMissileWeapon: false,
        pilotAbilities: ['env_specialist'],
        designatedEnvironment: 'wind',
      }),
    ).toBeNull();
    expect(
      calculateEnvironmentalSpecialistRangedToHitModifier(
        createEnvironmentalConditions({ wind: 'strong' }),
        {
          isMissileWeapon: true,
          pilotAbilities: ['env_specialist'],
          designatedEnvironment: 'wind',
        },
      ),
    ).toBeNull();
    expect(
      calculateEnvironmentalSpecialistRangedToHitModifier(moonless, {
        pilotAbilities: ['env_specialist'],
        designatedEnvironment: 'light',
      }),
    ).toBeNull();
    expect(
      calculateEnvironmentalSpecialistRangedToHitModifier(
        createEnvironmentalConditions({ light: 'glare' }),
        {
          pilotAbilities: ['env_specialist'],
          designatedEnvironment: 'light',
          targetIlluminated: true,
        },
      ),
    ).toBeNull();
    expect(
      calculateEnvironmentalSpecialistRangedToHitModifier(
        createEnvironmentalConditions({ light: 'daylight' }),
        {
          pilotAbilities: ['env_specialist'],
          designatedEnvironment: 'light',
          targetIlluminated: false,
        },
      ),
    ).toBeNull();
    expect(
      calculateEnvironmentalSpecialistRangedToHitModifier(
        createEnvironmentalConditions({ precipitation: 'heavy_rain' }),
        {
          pilotAbilities: ['env_specialist'],
          designatedEnvironment: 'snow',
        },
      ),
    ).toBeNull();
    expect(
      calculateEnvironmentalSpecialistRangedToHitModifier(
        createEnvironmentalConditions({ precipitation: 'light_rain' }),
        {
          pilotAbilities: ['env_specialist'],
          designatedEnvironment: 'rain',
        },
      ),
    ).toBeNull();
  });

  it.each<LightCondition>(['moonless', 'solar_flare', 'pitch_black'])(
    'applies Environmental Specialist Light to physical to-hit in %s',
    (light) => {
      expect(
        calculateEnvironmentalSpecialistPhysicalToHitModifier(light, {
          pilotAbilities: ['env_specialist'],
          designatedEnvironment: 'Light',
          targetIlluminated: false,
        }),
      ).toMatchObject({
        name: 'Environmental Specialist (Light)',
        value: -1,
        source: 'spa',
      });
    },
  );

  it('gates Environmental Specialist physical to-hit on Light selection and illumination', () => {
    expect(
      calculateEnvironmentalSpecialistPhysicalToHitModifier('moonless', {
        pilotAbilities: ['env_specialist'],
        designatedEnvironment: 'snow',
      }),
    ).toBeNull();
    expect(
      calculateEnvironmentalSpecialistPhysicalToHitModifier('moonless', {
        pilotAbilities: [],
        designatedEnvironment: 'light',
      }),
    ).toBeNull();
    expect(
      calculateEnvironmentalSpecialistPhysicalToHitModifier('night', {
        pilotAbilities: ['env_specialist'],
        designatedEnvironment: 'light',
      }),
    ).toBeNull();
    expect(
      calculateEnvironmentalSpecialistPhysicalToHitModifier('pitch_black', {
        pilotAbilities: ['env_specialist'],
        designatedEnvironment: 'light',
        targetIlluminated: true,
      }),
    ).toBeNull();
  });
});

// =============================================================================
// Combined Heat Dissipation Modifier
// =============================================================================
