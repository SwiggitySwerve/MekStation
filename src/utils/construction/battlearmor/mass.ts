/**
 * Battle Armor Trooper Mass Calculator
 *
 * Aggregates all per-trooper mass contributions (armor, manipulators,
 * weapons, equipment) and validates the total against the weight class range.
 *
 * @spec openspec/changes/add-battlearmor-construction/specs/battle-armor-unit-system/spec.md
 * Requirement: Trooper Mass Validation
 */

import {
  BAArmorType,
  BAChassisType,
  BAManipulator,
  BAWeightClass,
  BA_VALIDATION_RULES,
  BA_WEIGHT_CLASS_LIMITS,
  IBAEquipmentMount,
  IBAWeaponMount,
} from '@/types/unit/BattleArmorInterfaces';

import { armorMassKg } from './armor';
import { manipulatorMassKg } from './manipulators';

export interface TrooperMassBreakdown {
  /** Armor mass (kg) */
  readonly armorMass: number;
  /** Manipulator mass (kg) */
  readonly manipulatorMass: number;
  /** Weapon mass (kg) */
  readonly weaponMass: number;
  /** Equipment mass (kg) */
  readonly equipmentMass: number;
  /** Total trooper mass (kg) */
  readonly totalMass: number;
}

export interface MassValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly breakdown: TrooperMassBreakdown;
}

/**
 * Compute the full per-trooper mass breakdown.
 */
export function computeTrooperMass(
  armorPoints: number,
  armorType: BAArmorType,
  chassisType: BAChassisType,
  leftManipulator: BAManipulator,
  rightManipulator: BAManipulator,
  weapons: readonly IBAWeaponMount[],
  equipment: readonly IBAEquipmentMount[],
): TrooperMassBreakdown {
  const armorMass = armorMassKg(armorPoints, armorType);
  const manipulatorMass = manipulatorMassKg(
    chassisType,
    leftManipulator,
    rightManipulator,
  );
  const weaponMass = weapons.reduce((sum, w) => sum + w.massKg, 0);
  const equipmentMass = equipment.reduce((sum, e) => sum + e.massKg, 0);
  const totalMass = armorMass + manipulatorMass + weaponMass + equipmentMass;

  return { armorMass, manipulatorMass, weaponMass, equipmentMass, totalMass };
}

/**
 * Validate that the per-trooper mass falls within the weight class range.
 *
 * Emits VAL-BA-CLASS when mass exceeds the class maximum.
 */
export function validateTrooperMass(
  totalMassKg: number,
  weightClass: BAWeightClass,
): MassValidationResult {
  const errors: string[] = [];
  const limits = BA_WEIGHT_CLASS_LIMITS[weightClass];

  if (totalMassKg > limits.maxMassKg) {
    errors.push(
      `${BA_VALIDATION_RULES.VAL_BA_CLASS}: ${weightClass} class trooper mass ${totalMassKg} kg exceeds maximum ${limits.maxMassKg} kg`,
    );
  }

  // Placeholder breakdown — callers supply the full breakdown separately
  const breakdown: TrooperMassBreakdown = {
    armorMass: 0,
    manipulatorMass: 0,
    weaponMass: 0,
    equipmentMass: 0,
    totalMass: totalMassKg,
  };

  return { isValid: errors.length === 0, errors, breakdown };
}
