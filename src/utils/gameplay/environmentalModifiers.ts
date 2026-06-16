/**
 * Environmental Modifiers Module
 * Implements BattleTech environmental combat modifiers for light, weather,
 * wind, gravity, and atmosphere conditions.
 *
 * @spec openspec/changes/full-combat-parity/specs/environmental-combat-modifiers/spec.md
 */

import type { IToHitModifierDetail } from '@/types/gameplay/CombatInterfaces';
import type {
  AtmosphereCondition,
  FogCondition,
  IEnvironmentalConditions,
  LightCondition,
  PrecipitationCondition,
  TemperatureCondition,
  WindCondition,
} from '@/types/gameplay/EnvironmentalConditions';

import { hasSPA } from './spaModifiers/canonicalize';

export type {
  AtmosphereCondition,
  FogCondition,
  IEnvironmentalConditions,
  LightCondition,
  PrecipitationCondition,
  TemperatureCondition,
  WindCondition,
} from '@/types/gameplay/EnvironmentalConditions';

// =============================================================================
// Constants
// =============================================================================

/** Heat dissipation penalty in thin atmosphere */
const THIN_ATMOSPHERE_HEAT_PENALTY = -2;

/** Heat dissipation penalty in trace/vacuum atmosphere */
const TRACE_VACUUM_HEAT_PENALTY = -4;

/** Heat dissipation bonus in extreme cold */
const EXTREME_COLD_HEAT_BONUS = 2;

/** Heat dissipation penalty in extreme heat */
const EXTREME_HEAT_PENALTY = -2;

/**
 * Default environmental conditions (normal daylight, standard everything).
 */
export const DEFAULT_ENVIRONMENTAL_CONDITIONS: IEnvironmentalConditions = {
  light: 'daylight',
  precipitation: 'none',
  fog: 'none',
  blowingSand: false,
  wind: 'none',
  gravity: 1.0,
  atmosphere: 'standard',
  temperature: 'normal',
};

/**
 * Create environmental conditions with defaults for unspecified fields.
 */
export function createEnvironmentalConditions(
  overrides: Partial<IEnvironmentalConditions> = {},
): IEnvironmentalConditions {
  return {
    ...DEFAULT_ENVIRONMENTAL_CONDITIONS,
    ...overrides,
  };
}

// =============================================================================
// Light Condition Modifiers
// =============================================================================

/** Light condition to-hit modifiers */
const LIGHT_MODIFIERS: Readonly<Record<LightCondition, number>> = {
  daylight: 0,
  dawn: 1,
  dusk: 1,
  night: 2,
  full_moon: 2,
  glare: 2,
  moonless: 3,
  solar_flare: 3,
  pitch_black: 4,
};

/**
 * Calculate to-hit modifier from light conditions.
 * MegaMek weapon light penalties: Dusk +1, Full Moon/Glare +2,
 * Moonless/Solar Flare +3, Pitch Black +4. Dawn/Night are legacy
 * MekStation states retained for existing scenarios.
 */
export function calculateLightModifier(
  light: LightCondition,
): IToHitModifierDetail | null {
  const value = LIGHT_MODIFIERS[light];
  if (value === 0) return null;

  return {
    name: 'Light Conditions',
    value,
    source: 'environmental',
    description: `${light} conditions: +${value}`,
  };
}

// =============================================================================
// Precipitation Modifiers
// =============================================================================

/** Precipitation to-hit modifiers */
const PRECIPITATION_MODIFIERS: Readonly<
  Record<PrecipitationCondition, number>
> = {
  none: 0,
  light_rain: 1,
  heavy_rain: 2,
  snow: 1,
};

/**
 * Calculate to-hit modifier from precipitation.
 * Light rain: +1, Heavy rain: +2, Snow: +1.
 */
export function calculatePrecipitationModifier(
  precipitation: PrecipitationCondition,
): IToHitModifierDetail | null {
  const value = PRECIPITATION_MODIFIERS[precipitation];
  if (value === 0) return null;

  const labels: Record<string, string> = {
    light_rain: 'Light rain',
    heavy_rain: 'Heavy rain',
    snow: 'Snowfall',
  };

  return {
    name: 'Precipitation',
    value,
    source: 'environmental',
    description: `${labels[precipitation]}: +${value}`,
  };
}

// =============================================================================
// Fog Modifiers
// =============================================================================

/** Fog to-hit modifiers */
const FOG_MODIFIERS: Readonly<Record<FogCondition, number>> = {
  none: 0,
  light_fog: 1,
  heavy_fog: 2,
};

/**
 * Calculate to-hit modifier from fog conditions.
 * Light fog: +1, Heavy fog: +2.
 */
export function calculateFogModifier(
  fog: FogCondition,
): IToHitModifierDetail | null {
  const value = FOG_MODIFIERS[fog];
  if (value === 0) return null;

  return {
    name: 'Fog',
    value,
    source: 'environmental',
    description: `${fog === 'light_fog' ? 'Light fog' : 'Heavy fog'}: +${value}`,
  };
}

// =============================================================================
// Blowing Sand Modifiers
// =============================================================================

/**
 * Calculate the MegaMek blowing-sand modifier.
 * Blowing sand applies +1 only to energy-weapon attacks.
 */
export function calculateBlowingSandModifier(
  blowingSand: boolean,
  isEnergyWeapon: boolean = false,
): IToHitModifierDetail | null {
  if (!blowingSand || !isEnergyWeapon) return null;

  return {
    name: 'Blowing Sand',
    value: 1,
    source: 'environmental',
    description: 'Blowing sand affects energy weapons: +1',
  };
}

// =============================================================================
// Wind Modifiers
// =============================================================================

/** Wind to-hit modifiers for missile weapons */
const WIND_MISSILE_MODIFIERS: Readonly<Record<WindCondition, number>> = {
  none: 0,
  moderate: 1,
  strong: 2,
};

/** Wind jump distance reduction in MP */
const WIND_JUMP_REDUCTION: Readonly<Record<WindCondition, number>> = {
  none: 0,
  moderate: 0,
  strong: 2,
};

/**
 * Calculate missile to-hit modifier from wind conditions.
 * Moderate wind: +1 missiles, Strong wind: +2 missiles.
 * Only applies to missile weapons — caller must filter.
 */
export function calculateWindMissileModifier(
  wind: WindCondition,
): IToHitModifierDetail | null {
  const value = WIND_MISSILE_MODIFIERS[wind];
  if (value === 0) return null;

  return {
    name: 'Wind (Missiles)',
    value,
    source: 'environmental',
    description: `${wind === 'moderate' ? 'Moderate' : 'Strong'} wind affects missiles: +${value}`,
  };
}

/**
 * Get jump distance reduction from wind conditions.
 * Strong wind: -2 jump MP.
 */
export function getWindJumpReduction(wind: WindCondition): number {
  return WIND_JUMP_REDUCTION[wind];
}

// =============================================================================
// Gravity Effects
// =============================================================================

/**
 * Scale jump distance by gravity factor.
 * Low gravity (< 1.0g): increased jump distance.
 * High gravity (> 1.0g): reduced jump distance.
 *
 * @param baseJumpMP - Base jump MP from unit
 * @param gravity - Gravity in G units (1.0 = standard)
 * @returns Adjusted jump MP (minimum 0)
 */
export function scaleJumpDistance(baseJumpMP: number, gravity: number): number {
  if (gravity <= 0) return baseJumpMP; // Safety: treat zero/negative as standard
  // Inverse scaling: low gravity = more MP, high gravity = less MP
  const scaled = Math.round(baseJumpMP / gravity);
  return Math.max(0, scaled);
}

/**
 * Scale fall damage by gravity factor.
 * Higher gravity = more fall damage, lower gravity = less.
 *
 * @param baseDamage - Base fall damage
 * @param gravity - Gravity in G units (1.0 = standard)
 * @returns Adjusted fall damage (minimum 0)
 */
export function scaleFallDamage(baseDamage: number, gravity: number): number {
  if (gravity <= 0) return 0; // Safety
  return Math.max(0, Math.round(baseDamage * gravity));
}

// =============================================================================
// Atmosphere Effects
// =============================================================================

/**
 * Get heat dissipation modifier from atmosphere conditions.
 * Standard: no change, Thin: -2 dissipation, Trace/Vacuum: -4 dissipation.
 *
 * @param atmosphere - Atmosphere condition
 * @returns Heat dissipation modifier (negative = less cooling)
 */
export function getAtmosphereHeatModifier(
  atmosphere: AtmosphereCondition,
): number {
  switch (atmosphere) {
    case 'standard':
      return 0;
    case 'thin':
      return THIN_ATMOSPHERE_HEAT_PENALTY;
    case 'trace':
      return TRACE_VACUUM_HEAT_PENALTY;
    case 'vacuum':
      return TRACE_VACUUM_HEAT_PENALTY;
  }
}

// =============================================================================
// Temperature Effects
// =============================================================================

/**
 * Get heat dissipation modifier from temperature extremes.
 * Extreme cold: +2 effective heat sinks.
 * Extreme heat: -2 effective heat sinks.
 *
 * @param temperature - Temperature condition
 * @returns Heat dissipation modifier
 */
export function getTemperatureHeatModifier(
  temperature: TemperatureCondition,
): number {
  switch (temperature) {
    case 'extreme_cold':
      return EXTREME_COLD_HEAT_BONUS;
    case 'normal':
      return 0;
    case 'extreme_heat':
      return EXTREME_HEAT_PENALTY;
  }
}

// =============================================================================
// Combined Environmental Modifier Calculation
// =============================================================================

/**
 * Options for calculating environmental modifiers.
 */
export interface IEnvironmentalModifierOptions {
  /** Whether the weapon is an energy weapon (for blowing sand effects) */
  readonly isEnergyWeapon?: boolean;
  /** Whether the weapon is a missile weapon (for wind effects) */
  readonly isMissileWeapon?: boolean;
  /** Pilot SPA ids available to environmental combat modifiers. */
  readonly pilotAbilities?: readonly string[];
  /** Explicit Environmental Specialist selection copied from SPA designation state. */
  readonly designatedEnvironment?: string;
  /**
   * Explicit target illumination state for Environmental Specialist (Light).
   * Undefined means no represented illumination state was hydrated.
   */
  readonly targetIlluminated?: boolean;
}

function normalizedDesignation(value: string | undefined): string | undefined {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function calculateEnvironmentalSpecialistRangedToHitModifier(
  conditions: IEnvironmentalConditions,
  options: Pick<
    IEnvironmentalModifierOptions,
    | 'designatedEnvironment'
    | 'isEnergyWeapon'
    | 'isMissileWeapon'
    | 'pilotAbilities'
    | 'targetIlluminated'
  > = {},
): IToHitModifierDetail | null {
  if (!hasSPA(options.pilotAbilities ?? [], 'env_specialist')) return null;
  const designation = normalizedDesignation(options.designatedEnvironment);

  if (designation === 'light') {
    const targetIlluminated = options.targetIlluminated;
    if (targetIlluminated === undefined) return null;
    const appliesToUnilluminated =
      !targetIlluminated &&
      RANGED_LIGHT_SPECIALIST_UNILLUMINATED_CONDITIONS.has(conditions.light);
    const appliesToIlluminatedPitchBlack =
      targetIlluminated && conditions.light === 'pitch_black';

    if (appliesToUnilluminated || appliesToIlluminatedPitchBlack) {
      return {
        name: 'Environmental Specialist (Light)',
        value: -1,
        source: 'spa',
        description:
          'Environmental Specialist (Light): -1 with represented target illumination state',
      };
    }
  }

  if (
    designation === 'fog' &&
    conditions.fog === 'heavy_fog' &&
    options.isEnergyWeapon === true
  ) {
    return {
      name: 'Environmental Specialist (Fog)',
      value: -1,
      source: 'spa',
      description:
        'Environmental Specialist (Fog): -1 with energy weapons in heavy fog',
    };
  }

  if (designation === 'snow' && conditions.precipitation === 'snow') {
    return {
      name: 'Environmental Specialist (Snow)',
      value: -1,
      source: 'spa',
      description: 'Environmental Specialist (Snow): -1 in snow',
    };
  }

  if (designation === 'rain' && conditions.precipitation === 'heavy_rain') {
    return {
      name: 'Environmental Specialist (Rain)',
      value: -1,
      source: 'spa',
      description: 'Environmental Specialist (Rain): -1 in heavy rain',
    };
  }

  if (
    designation === 'wind' &&
    conditions.wind === 'moderate' &&
    options.isMissileWeapon === true
  ) {
    return {
      name: 'Environmental Specialist (Wind)',
      value: -1,
      source: 'spa',
      description:
        'Environmental Specialist (Wind): -1 for missiles in moderate wind',
    };
  }

  return null;
}

const RANGED_LIGHT_SPECIALIST_UNILLUMINATED_CONDITIONS: ReadonlySet<LightCondition> =
  new Set<LightCondition>([
    'dusk',
    'full_moon',
    'glare',
    'moonless',
    'solar_flare',
    'pitch_black',
  ]);

const PHYSICAL_LIGHT_SPECIALIST_CONDITIONS: ReadonlySet<LightCondition> =
  new Set<LightCondition>(['moonless', 'solar_flare', 'pitch_black']);

export function calculateEnvironmentalSpecialistPhysicalToHitModifier(
  light: LightCondition | undefined,
  options: Pick<
    IEnvironmentalModifierOptions,
    'designatedEnvironment' | 'pilotAbilities'
  > & { readonly targetIlluminated?: boolean } = {},
): IToHitModifierDetail | null {
  if (!hasSPA(options.pilotAbilities ?? [], 'env_specialist')) return null;
  if (normalizedDesignation(options.designatedEnvironment) !== 'light') {
    return null;
  }
  if (light === undefined || !PHYSICAL_LIGHT_SPECIALIST_CONDITIONS.has(light)) {
    return null;
  }
  if (options.targetIlluminated === true) return null;

  return {
    name: 'Environmental Specialist (Light)',
    value: -1,
    source: 'spa',
    description:
      'Environmental Specialist (Light): -1 against unilluminated targets',
  };
}

/**
 * Calculate all applicable environmental to-hit modifiers.
 * Returns array of modifier details for inclusion in to-hit calculation.
 *
 * @param conditions - Current environmental conditions
 * @param options - Additional options (e.g., weapon type for wind)
 * @returns Array of environmental modifiers (empty if all conditions are normal)
 */
export function calculateEnvironmentalModifiers(
  conditions: IEnvironmentalConditions,
  options: IEnvironmentalModifierOptions = {},
): readonly IToHitModifierDetail[] {
  const modifiers: IToHitModifierDetail[] = [];

  // Light
  const lightMod = calculateLightModifier(conditions.light);
  if (lightMod) modifiers.push(lightMod);

  // Precipitation
  const precipMod = calculatePrecipitationModifier(conditions.precipitation);
  if (precipMod) modifiers.push(precipMod);

  const envSpecialistMod = calculateEnvironmentalSpecialistRangedToHitModifier(
    conditions,
    options,
  );
  if (envSpecialistMod) modifiers.push(envSpecialistMod);

  // Fog
  const fogMod = calculateFogModifier(conditions.fog);
  if (fogMod) modifiers.push(fogMod);

  // Blowing sand (energy only)
  const sandMod = calculateBlowingSandModifier(
    conditions.blowingSand,
    options.isEnergyWeapon,
  );
  if (sandMod) modifiers.push(sandMod);

  // Wind (missile only)
  if (options.isMissileWeapon) {
    const windMod = calculateWindMissileModifier(conditions.wind);
    if (windMod) modifiers.push(windMod);
  }

  return modifiers;
}

/**
 * Calculate total heat dissipation adjustment from environmental conditions.
 * Combines atmosphere and temperature effects.
 *
 * @param conditions - Current environmental conditions
 * @returns Net heat dissipation modifier (positive = more cooling, negative = less)
 */
export function calculateEnvironmentalHeatModifier(
  conditions: IEnvironmentalConditions,
): number {
  return (
    getAtmosphereHeatModifier(conditions.atmosphere) +
    getTemperatureHeatModifier(conditions.temperature)
  );
}
