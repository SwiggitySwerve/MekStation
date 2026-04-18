/**
 * Battle Armor Squad Composition Utilities
 *
 * Handles squad size defaults, validation, and tech-base rules.
 *
 * @spec openspec/changes/add-battlearmor-construction/specs/battle-armor-unit-system/spec.md
 * Requirement: Squad Composition
 */

import { TechBase } from '@/types/enums/TechBase';
import {
  BA_SQUAD_SIZE_MAX,
  BA_SQUAD_SIZE_MIN,
  BA_VALIDATION_RULES,
  defaultSquadSize,
} from '@/types/unit/BattleArmorInterfaces';

export interface SquadValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Return the canonical default squad size for a tech base.
 * IS = 4, Clan = 5.
 */
export function getDefaultSquadSize(techBase: TechBase): number {
  return defaultSquadSize(techBase);
}

/**
 * Validate squad size.
 * - Outside 1-6 is a hard error.
 * - Outside the tech-base default (4 IS / 5 Clan) is a warning only.
 */
export function validateSquadSize(
  squadSize: number,
  techBase: TechBase,
): SquadValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (squadSize < BA_SQUAD_SIZE_MIN || squadSize > BA_SQUAD_SIZE_MAX) {
    errors.push(
      `${BA_VALIDATION_RULES.VAL_BA_SQUAD}: Squad size ${squadSize} is outside legal range ${BA_SQUAD_SIZE_MIN}–${BA_SQUAD_SIZE_MAX}`,
    );
  } else {
    // Warn when non-standard for tech base
    const standard = defaultSquadSize(techBase);
    if (squadSize !== standard) {
      warnings.push(
        `${BA_VALIDATION_RULES.VAL_BA_SQUAD}: Non-standard squad size ${squadSize} for ${techBase} (standard is ${standard})`,
      );
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}
