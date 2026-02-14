/**
 * Scenario conditions generation and effects system
 *
 * Generates random environmental conditions for scenarios and determines
 * force composition restrictions based on those conditions.
 *
 * @module campaign/scenario/scenarioConditions
 */

import { type IScenarioConditions } from '@/types/campaign/scenario/scenarioTypes';

import { type RandomFn } from './battleChance';

// =============================================================================
// Condition Effects Interface
// =============================================================================

/**
 * Effects of scenario conditions on force composition.
 *
 * Determines which unit types are restricted or banned based on
 * environmental conditions like gravity, atmosphere, etc.
 *
 * @example
 * const effects = getConditionEffects({ gravity: 0.15 });
 * if (effects.noTanks) {
 *   // Cannot deploy tanks in this scenario
 * }
 */
export interface IConditionEffect {
  /** Tanks are banned from this scenario */
  readonly noTanks: boolean;

  /** Conventional infantry are banned from this scenario */
  readonly noConvInfantry: boolean;

  /** Battle armor are banned from this scenario */
  readonly noBattleArmor: boolean;

  /** Aerospace units are banned from this scenario */
  readonly noAerospace: boolean;

  /** Human-readable description of restrictions */
  readonly description: string;
}

// =============================================================================
// Condition Generation
// =============================================================================

/**
 * Light level options for scenario generation.
 */
const LIGHT_LEVELS = [
  'daylight',
  'dusk',
  'full_moon',
  'moonless',
  'pitch_black',
] as const;

/**
 * Weather options for scenario generation.
 */
const WEATHER_TYPES = [
  'clear',
  'light_rain',
  'heavy_rain',
  'sleet',
  'snow',
  'fog',
  'sandstorm',
] as const;

/**
 * Atmosphere options for scenario generation.
 */
const ATMOSPHERE_TYPES = [
  'standard',
  'thin',
  'dense',
  'toxic',
  'tainted',
] as const;

/**
 * Generate random scenario conditions.
 *
 * Creates a complete set of environmental conditions for a scenario by
 * randomly selecting from valid ranges and enumerations.
 *
 * - Light: randomly selected from 5 levels
 * - Weather: randomly selected from 7 types
 * - Gravity: random value between 0.2 and 1.5 G
 * - Temperature: random value between -30 and +50 Celsius
 * - Atmosphere: randomly selected from 5 types
 *
 * @param random - Random number generator function (0 to 1)
 * @returns Complete scenario conditions with all fields populated
 *
 * @example
 * const conditions = generateRandomConditions(Math.random);
 * logger.debug(conditions.gravity); // 0.8
 * logger.debug(conditions.atmosphere); // 'toxic'
 */
export function generateRandomConditions(
  random: RandomFn,
): IScenarioConditions {
  // Select light level (5 options)
  const lightIndex = Math.floor(random() * LIGHT_LEVELS.length);
  const light = LIGHT_LEVELS[lightIndex];

  // Select weather (7 options)
  const weatherIndex = Math.floor(random() * WEATHER_TYPES.length);
  const weather = WEATHER_TYPES[weatherIndex];

  // Generate gravity (0.2 - 1.5 range)
  const gravityRange = 1.5 - 0.2;
  const gravity = random() * gravityRange + 0.2;

  // Generate temperature (-30 to +50 range)
  const tempRange = 50 - -30;
  const temperature = Math.floor(random() * tempRange - 30);

  // Select atmosphere (5 options)
  const atmosphereIndex = Math.floor(random() * ATMOSPHERE_TYPES.length);
  const atmosphere = ATMOSPHERE_TYPES[atmosphereIndex];

  return {
    light,
    weather,
    gravity,
    temperature,
    atmosphere,
  };
}

// =============================================================================
// Condition Effects
// =============================================================================

/**
 * Determine force composition restrictions based on scenario conditions.
 *
 * Analyzes environmental conditions and returns which unit types are
 * restricted or banned. Builds a human-readable description of all
 * restrictions.
 *
 * Restriction rules:
 * - Low gravity (≤0.2 G): Tanks banned (too heavy for low-G environment)
 * - Toxic/Tainted atmosphere: Conventional infantry and tanks banned
 *   (require environmental protection)
 *
 * @param conditions - Scenario environmental conditions
 * @returns Effects object with restriction flags and description
 *
 * @example
 * const effects = getConditionEffects({
 *   gravity: 0.15,
 *   atmosphere: 'toxic',
 * });
 * logger.debug(effects.noTanks); // true
 * logger.debug(effects.noConvInfantry); // true
 * logger.debug(effects.description);
 * // "Low gravity restricts tanks. Toxic atmosphere restricts infantry and tanks. "
 */
export function getConditionEffects(
  conditions: IScenarioConditions,
): IConditionEffect {
  let noTanks = false;
  let noConvInfantry = false;
  const noBattleArmor = false;
  const noAerospace = false;
  let description = '';

  // Low gravity restricts tanks
  if (conditions.gravity !== undefined && conditions.gravity <= 0.2) {
    noTanks = true;
    description += 'Low gravity restricts tanks. ';
  }

  // Toxic/tainted atmosphere restricts conventional infantry and tanks
  if (
    conditions.atmosphere === 'toxic' ||
    conditions.atmosphere === 'tainted'
  ) {
    noConvInfantry = true;
    noTanks = true;
    description += 'Toxic atmosphere restricts infantry and tanks. ';
  }

  return {
    noTanks,
    noConvInfantry,
    noBattleArmor,
    noAerospace,
    description,
  };
}
