/**
 * RulesLevel - Rules complexity enumeration
 * Defines the complexity/availability level of equipment.
 *
 * @spec core-enumerations/spec.md
 */

/**
 * Rules level for equipment and game modes.
 * Determines which rule sets include this equipment.
 */
export enum RulesLevel {
  /** Basic equipment available in introductory games */
  INTRODUCTORY = 'Introductory',

  /** Standard equipment for regular games */
  STANDARD = 'Standard',

  /** Advanced equipment requiring additional rules */
  ADVANCED = 'Advanced',

  /** Experimental equipment with limited availability */
  EXPERIMENTAL = 'Experimental',
}

/**
 * Array of all RulesLevel values in order of complexity
 */
export const ALL_RULES_LEVELS: readonly RulesLevel[] = Object.freeze([
  RulesLevel.INTRODUCTORY,
  RulesLevel.STANDARD,
  RulesLevel.ADVANCED,
  RulesLevel.EXPERIMENTAL,
]);

/**
 * Numeric ordering for rules levels (lower = simpler)
 */
export const RULES_LEVEL_ORDER: Readonly<Record<RulesLevel, number>> =
  Object.freeze({
    [RulesLevel.INTRODUCTORY]: 0,
    [RulesLevel.STANDARD]: 1,
    [RulesLevel.ADVANCED]: 2,
    [RulesLevel.EXPERIMENTAL]: 3,
  });

/**
 * Compare two rules levels.
 * @returns negative if a < b, 0 if equal, positive if a > b
 */
export function compareRulesLevels(a: RulesLevel, b: RulesLevel): number {
  return RULES_LEVEL_ORDER[a] - RULES_LEVEL_ORDER[b];
}

/**
 * Check if a rules level is at or below a maximum level
 */
export function isWithinRulesLevel(
  level: RulesLevel,
  maxLevel: RulesLevel,
): boolean {
  return RULES_LEVEL_ORDER[level] <= RULES_LEVEL_ORDER[maxLevel];
}

/**
 * Get all rules levels up to and including the specified level
 */
export function getRulesLevelsUpTo(maxLevel: RulesLevel): RulesLevel[] {
  const maxOrder = RULES_LEVEL_ORDER[maxLevel];
  return ALL_RULES_LEVELS.filter(
    (level) => RULES_LEVEL_ORDER[level] <= maxOrder,
  );
}
