/**
 * Rules Level Utilities
 *
 * Functions for comparing and filtering by rules level.
 *
 * @spec openspec/specs/rules-level-system/spec.md
 */

import { RulesLevel } from '../../types/enums/RulesLevel';

/**
 * Ordered list of rules levels from least to most restrictive
 */
export const RULES_LEVEL_ORDER: readonly RulesLevel[] = [
  RulesLevel.INTRODUCTORY,
  RulesLevel.STANDARD,
  RulesLevel.ADVANCED,
  RulesLevel.EXPERIMENTAL,
] as const;

/**
 * Get numeric index for a rules level (for comparison)
 *
 * @param level - Rules level
 * @returns Numeric index (0-3)
 */
export function getRulesLevelIndex(level: RulesLevel): number {
  return RULES_LEVEL_ORDER.indexOf(level);
}

/**
 * Compare two rules levels
 *
 * @param a - First rules level
 * @param b - Second rules level
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
export function compareRulesLevels(a: RulesLevel, b: RulesLevel): number {
  return getRulesLevelIndex(a) - getRulesLevelIndex(b);
}

/**
 * Check if a rules level is at or below a maximum level
 *
 * Used for filtering components by maximum allowed rules level.
 *
 * @param level - Rules level to check
 * @param maxLevel - Maximum allowed rules level
 * @returns True if level is at or below maxLevel
 */
export function isWithinRulesLevel(
  level: RulesLevel,
  maxLevel: RulesLevel,
): boolean {
  return getRulesLevelIndex(level) <= getRulesLevelIndex(maxLevel);
}

/**
 * Get all rules levels at or below a maximum level
 *
 * @param maxLevel - Maximum allowed rules level
 * @returns Array of allowed rules levels
 */
export function getAllowedRulesLevels(maxLevel: RulesLevel): RulesLevel[] {
  const maxIndex = getRulesLevelIndex(maxLevel);
  return RULES_LEVEL_ORDER.filter((_, index) => index <= maxIndex);
}

/**
 * Get the most restrictive rules level from an array
 *
 * When a unit contains multiple components, its overall rules level
 * is the most restrictive (highest) of all components.
 *
 * @param levels - Array of rules levels
 * @returns Most restrictive rules level, or INTRODUCTORY if empty
 */
export function getMostRestrictiveLevel(levels: RulesLevel[]): RulesLevel {
  if (levels.length === 0) {
    return RulesLevel.INTRODUCTORY;
  }
  return levels.reduce((most, current) =>
    compareRulesLevels(current, most) > 0 ? current : most,
  );
}

/**
 * Get the least restrictive rules level from an array
 *
 * @param levels - Array of rules levels
 * @returns Least restrictive rules level, or EXPERIMENTAL if empty
 */
export function getLeastRestrictiveLevel(levels: RulesLevel[]): RulesLevel {
  if (levels.length === 0) {
    return RulesLevel.EXPERIMENTAL;
  }
  return levels.reduce((least, current) =>
    compareRulesLevels(current, least) < 0 ? current : least,
  );
}

/**
 * Filter entities by maximum rules level
 *
 * @param entities - Array of entities with rulesLevel property
 * @param maxLevel - Maximum allowed rules level
 * @returns Entities at or below the maximum rules level
 */
export function filterByRulesLevel<T extends { rulesLevel: RulesLevel }>(
  entities: T[],
  maxLevel: RulesLevel,
): T[] {
  return entities.filter((entity) =>
    isWithinRulesLevel(entity.rulesLevel, maxLevel),
  );
}

/**
 * Get display name for a rules level
 *
 * @param level - Rules level
 * @returns Human-readable name
 */
export function getRulesLevelDisplayName(level: RulesLevel): string {
  return level; // Enum values are already display-friendly
}

/**
 * Get description for a rules level
 *
 * @param level - Rules level
 * @returns Description of what this rules level means
 */
export function getRulesLevelDescription(level: RulesLevel): string {
  switch (level) {
    case RulesLevel.INTRODUCTORY:
      return 'Basic rules, suitable for new players';
    case RulesLevel.STANDARD:
      return 'Full BattleTech rules with common equipment';
    case RulesLevel.ADVANCED:
      return 'Complex rules with specialized equipment';
    case RulesLevel.EXPERIMENTAL:
      return 'Cutting-edge or prototype technology';
    default:
      return '';
  }
}
