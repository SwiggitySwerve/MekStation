/**
 * Battle Armor Manipulator Utilities
 *
 * Validates manipulator selection and weapon/manipulator compatibility.
 *
 * @spec openspec/changes/add-battlearmor-construction/specs/battle-armor-unit-system/spec.md
 * Requirement: Weapon / Manipulator Compatibility
 */

import {
  BAChassisType,
  BAManipulator,
  BA_MANIPULATOR_DATA,
  BA_VALIDATION_RULES,
  IBAWeaponMount,
} from '@/types/unit/BattleArmorInterfaces';

export interface ManipulatorValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
}

/**
 * Compute the total mass (kg) contributed by a pair of manipulators.
 * Quad chassis has no manipulators — always returns 0.
 */
export function manipulatorMassKg(
  chassisType: BAChassisType,
  left: BAManipulator,
  right: BAManipulator,
): number {
  if (chassisType === BAChassisType.QUAD) return 0;
  return BA_MANIPULATOR_DATA[left].massKg + BA_MANIPULATOR_DATA[right].massKg;
}

/**
 * Validate that a weapon mounted on an arm has the required manipulator
 * type to support it.
 *
 * Heavy weapons (weaponWeight === 'heavy') require a manipulator that
 * has allowsHeavyWeapon === true (Battle Claw or Heavy Claw).
 */
export function validateWeaponManipulatorCompatibility(
  weapon: IBAWeaponMount,
  leftManipulator: BAManipulator,
  rightManipulator: BAManipulator,
): ManipulatorValidationResult {
  const errors: string[] = [];

  if (weapon.weaponWeight !== 'heavy') {
    return { isValid: true, errors };
  }

  // Determine which arm this weapon is mounted on and check that arm's manipulator
  const { location } = weapon;

  let manipulator: BAManipulator | null = null;
  if (location === 'Left Arm') {
    manipulator = leftManipulator;
  } else if (location === 'Right Arm') {
    manipulator = rightManipulator;
  }

  // Body/leg mounts do not need a manipulator gate
  if (manipulator === null) {
    return { isValid: true, errors };
  }

  const data = BA_MANIPULATOR_DATA[manipulator];
  if (!data.allowsHeavyWeapon) {
    errors.push(
      `${BA_VALIDATION_RULES.VAL_BA_MANIPULATOR}: ${weapon.name} requires Heavy Claw or Battle Claw`,
    );
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate all arm-mounted weapons against the squad's manipulators.
 * Returns combined errors for all incompatible weapons.
 */
export function validateAllManipulatorCompatibility(
  chassisType: BAChassisType,
  weapons: readonly IBAWeaponMount[],
  leftManipulator: BAManipulator,
  rightManipulator: BAManipulator,
): ManipulatorValidationResult {
  const errors: string[] = [];

  // Quad has no arms — arm mounts are already blocked elsewhere
  if (chassisType === BAChassisType.QUAD) {
    return { isValid: true, errors };
  }

  for (const weapon of weapons) {
    const result = validateWeaponManipulatorCompatibility(
      weapon,
      leftManipulator,
      rightManipulator,
    );
    errors.push(...result.errors);
  }

  return { isValid: errors.length === 0, errors };
}
