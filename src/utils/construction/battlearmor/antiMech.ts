/**
 * Battle Armor Anti-Mech Equipment Utilities
 *
 * Validates anti-mech equipment class restrictions and computes
 * the mass and slot contributions of special systems.
 *
 * @spec openspec/changes/add-battlearmor-construction/specs/battle-armor-unit-system/spec.md
 * Requirement: Anti-Mech Equipment
 */

import {
  BAAntiMechEquipment,
  BAWeightClass,
  BA_ANTI_MECH_EQUIPMENT,
  BA_VALIDATION_RULES,
} from '@/types/unit/BattleArmorInterfaces';

export interface AntiMechValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
}

/**
 * Validate a single anti-mech equipment item against the squad weight class.
 * Items with restrictedToClass set may only be installed on that class.
 */
export function validateAntiMechItem(
  item: BAAntiMechEquipment,
  weightClass: BAWeightClass,
): AntiMechValidationResult {
  const errors: string[] = [];

  if (
    item.restrictedToClass !== undefined &&
    item.restrictedToClass !== weightClass
  ) {
    errors.push(
      `${BA_VALIDATION_RULES.VAL_BA_CLASS}: ${item.name} is restricted to ${item.restrictedToClass} class`,
    );
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Look up a catalog entry by equipment ID.
 * Returns undefined if the item is not in the standard catalog.
 */
export function findAntiMechEquipment(
  equipmentId: string,
): BAAntiMechEquipment | undefined {
  return BA_ANTI_MECH_EQUIPMENT.find((e) => e.id === equipmentId);
}

/**
 * Compute the total bonus jump MP granted by anti-mech equipment
 * installed on the squad (e.g. Mechanical Jump Boosters).
 */
export function computeBonusJumpMP(installedIds: readonly string[]): number {
  return installedIds.reduce((total, id) => {
    const item = findAntiMechEquipment(id);
    return total + (item?.bonusJumpMP ?? 0);
  }, 0);
}

/**
 * Determine whether any installed equipment grants swarm attack eligibility.
 * Magnetic Clamps are the primary source.
 */
export function hasSwarmCapability(installedIds: readonly string[]): boolean {
  return installedIds.some(
    (id) => findAntiMechEquipment(id)?.grantsSwarm === true,
  );
}

/**
 * Validate all installed anti-mech equipment items against the weight class.
 */
export function validateAntiMechEquipment(
  installedIds: readonly string[],
  weightClass: BAWeightClass,
): AntiMechValidationResult {
  const errors: string[] = [];

  for (const id of installedIds) {
    const item = findAntiMechEquipment(id);
    if (!item) continue; // non-catalog items handled by general equipment validator
    const result = validateAntiMechItem(item, weightClass);
    errors.push(...result.errors);
  }

  return { isValid: errors.length === 0, errors };
}
