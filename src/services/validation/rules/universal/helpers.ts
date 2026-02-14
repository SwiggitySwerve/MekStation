/**
 * Shared helpers for Universal Validation Rules
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { RulesLevel } from '../../../../types/enums';

/**
 * Rules level hierarchy for comparison
 */
export const RULES_LEVEL_HIERARCHY: Record<RulesLevel, number> = {
  [RulesLevel.INTRODUCTORY]: 0,
  [RulesLevel.STANDARD]: 1,
  [RulesLevel.ADVANCED]: 2,
  [RulesLevel.EXPERIMENTAL]: 3,
};

/**
 * Check if rules level exceeds filter
 */
export function rulesLevelExceedsFilter(
  level: RulesLevel,
  filter: RulesLevel,
): boolean {
  return RULES_LEVEL_HIERARCHY[level] > RULES_LEVEL_HIERARCHY[filter];
}
