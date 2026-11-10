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

/** Stable unit-contract spelling shared by all custom-unit encoders. */
export const RULES_LEVEL_TAGS = {
  [RulesLevel.INTRODUCTORY]: 'INTRODUCTORY',
  [RulesLevel.STANDARD]: 'STANDARD',
  [RulesLevel.ADVANCED]: 'ADVANCED',
  [RulesLevel.EXPERIMENTAL]: 'EXPERIMENTAL',
} as const satisfies Readonly<Record<RulesLevel, string>>;

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

/**
 * Decode a stored rules level: the contract tag the unit index and saved
 * records carry ("STANDARD") or the enum value ("Standard"). Undefined when the
 * text is empty or names no level.
 */
export function parseRulesLevel(
  value: string | null | undefined,
): RulesLevel | undefined {
  const text = value?.trim().toUpperCase();
  if (!text) return undefined;
  return ALL_RULES_LEVELS.find(
    (level) => RULES_LEVEL_TAGS[level] === text || level.toUpperCase() === text,
  );
}

/**
 * Whether a unit's stored level satisfies a rules-level filter. An empty filter
 * matches everything; a chosen one matches only units of that level.
 */
export function matchesRulesLevelFilter(
  value: string | null | undefined,
  filter: string,
): boolean {
  if (!filter) return true;
  const wanted = parseRulesLevel(filter);
  return wanted !== undefined && parseRulesLevel(value) === wanted;
}
