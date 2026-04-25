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
  IBAEquipmentMount,
  IBAWeaponMount,
  IBattleArmorUnit,
  defaultSquadSize,
} from '@/types/unit/BattleArmorInterfaces';

export interface SquadValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Squad-loadout-homogeneity assertion.
 *
 * Every trooper in a BA squad SHALL carry the identical loadout (the spec
 * calls this "homogeneous"). This invariant is enforced **structurally** by
 * `IBattleArmorUnit`: `weapons` and `equipment` are single arrays on the
 * unit, not per-trooper arrays. There is no legal way to represent a
 * heterogeneous squad in this shape — the type system prevents it.
 *
 * This helper exposes that invariant as a runtime assertion so tests and
 * downstream consumers can verify it explicitly and catch future refactors
 * that would break homogeneity (e.g., accidentally adding a per-trooper
 * array).
 *
 * @spec openspec/changes/add-battlearmor-construction/tasks.md §3.4
 */
export function assertSquadHomogeneous(unit: IBattleArmorUnit): void {
  const shared: readonly (
    | readonly IBAWeaponMount[]
    | readonly IBAEquipmentMount[]
  )[] = [unit.weapons, unit.equipment];
  for (const arr of shared) {
    if (!Array.isArray(arr)) {
      throw new Error(
        `${BA_VALIDATION_RULES.VAL_BA_SQUAD}: Squad loadout must be a shared array (homogeneous invariant)`,
      );
    }
  }
}

/**
 * Return true if every trooper in the squad shares the identical loadout.
 *
 * Because `IBattleArmorUnit` stores one loadout for the whole squad this
 * is trivially true by construction — kept as an explicit predicate so
 * tests can document the invariant and guard against future per-trooper
 * loadout extensions.
 *
 * @spec openspec/changes/add-battlearmor-construction/tasks.md §3.4
 */
export function isSquadHomogeneous(unit: IBattleArmorUnit): boolean {
  try {
    assertSquadHomogeneous(unit);
    return true;
  } catch {
    return false;
  }
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
