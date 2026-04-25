/**
 * Battle Armor Movement Utilities
 *
 * Validates movement type legality and MP caps by weight class.
 *
 * @spec openspec/changes/add-battlearmor-construction/specs/battle-armor-unit-system/spec.md
 * Requirement: Movement MP Caps by Class and Type
 */

import {
  BAMovementType,
  BAWeightClass,
  BA_EXTRA_MP_MASS_KG,
  BA_VALIDATION_RULES,
  BA_WEIGHT_CLASS_LIMITS,
} from '@/types/unit/BattleArmorInterfaces';

/**
 * Base MP is free; every point beyond the first in the **dominant movement
 * track** (max of ground / jump / UMU) costs the weight-class kg-per-MP rate.
 *
 * Examples:
 *   PA(L) ground 2 + jump 0 + UMU 0 → extras = max(2,0,0) − 1 = 1 MP, mass = 25 kg
 *   Medium jump 3 + ground 1 + UMU 0 → extras = max(1,3,0) − 1 = 2 MP, mass = 160 kg
 *   Assault ground 1 + jump 0 → extras = max(1,0,0) − 1 = 0 MP, mass = 0 kg
 *
 * The free base point is paid from the chassis budget, so this helper only
 * bills the **extra** points (>= 2 MP in the dominant track).
 *
 * @spec openspec/changes/add-battlearmor-construction/tasks.md §4.5
 */
export function extraMPMassKg(
  groundMP: number,
  jumpMP: number,
  umuMP: number,
  weightClass: BAWeightClass,
): number {
  const dominant = Math.max(groundMP, jumpMP, umuMP);
  const extras = Math.max(0, dominant - 1);
  return extras * BA_EXTRA_MP_MASS_KG[weightClass];
}

export interface MovementValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
}

/**
 * Validate that the chosen movement type is legal for the weight class.
 *
 * Rules:
 * - VTOL requires Light or Medium class (VAL-BA-MOVE-TYPE)
 * - JUMP with mp > 0 is forbidden for Assault (VAL-BA-MP via maxJumpMP = 0)
 */
export function validateMovementType(
  movementType: BAMovementType,
  weightClass: BAWeightClass,
): MovementValidationResult {
  const errors: string[] = [];
  const limits = BA_WEIGHT_CLASS_LIMITS[weightClass];

  if (movementType === BAMovementType.VTOL && !limits.vtolAllowed) {
    errors.push(
      `${BA_VALIDATION_RULES.VAL_BA_MOVE_TYPE}: VTOL movement requires Light or Medium class`,
    );
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate ground MP against the weight-class cap.
 */
export function validateGroundMP(
  groundMP: number,
  weightClass: BAWeightClass,
): MovementValidationResult {
  const errors: string[] = [];
  const limits = BA_WEIGHT_CLASS_LIMITS[weightClass];

  if (groundMP > limits.maxGroundMP) {
    errors.push(
      `${BA_VALIDATION_RULES.VAL_BA_MP}: ${weightClass} class ground MP cap is ${limits.maxGroundMP}`,
    );
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate jump MP against the weight-class cap.
 *
 * Assault class has maxJumpMP = 0, so any jump MP >= 1 fires the error.
 */
export function validateJumpMP(
  jumpMP: number,
  weightClass: BAWeightClass,
): MovementValidationResult {
  const errors: string[] = [];
  const limits = BA_WEIGHT_CLASS_LIMITS[weightClass];

  if (jumpMP > limits.maxJumpMP) {
    if (limits.maxJumpMP === 0) {
      errors.push(
        `${BA_VALIDATION_RULES.VAL_BA_MP}: Assault class cannot jump`,
      );
    } else {
      errors.push(
        `${BA_VALIDATION_RULES.VAL_BA_MP}: ${weightClass} class jump MP cap is ${limits.maxJumpMP}`,
      );
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate UMU MP against the weight-class cap.
 */
export function validateUmuMP(
  umuMP: number,
  weightClass: BAWeightClass,
): MovementValidationResult {
  const errors: string[] = [];
  const limits = BA_WEIGHT_CLASS_LIMITS[weightClass];

  if (umuMP > limits.maxUmuMP) {
    errors.push(
      `${BA_VALIDATION_RULES.VAL_BA_MP}: ${weightClass} class UMU MP cap is ${limits.maxUmuMP}`,
    );
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Run all movement validations and aggregate results.
 */
export function validateMovement(
  movementType: BAMovementType,
  groundMP: number,
  jumpMP: number,
  umuMP: number,
  weightClass: BAWeightClass,
): MovementValidationResult {
  const errors: string[] = [];

  const typeResult = validateMovementType(movementType, weightClass);
  errors.push(...typeResult.errors);

  const groundResult = validateGroundMP(groundMP, weightClass);
  errors.push(...groundResult.errors);

  const jumpResult = validateJumpMP(jumpMP, weightClass);
  errors.push(...jumpResult.errors);

  const umuResult = validateUmuMP(umuMP, weightClass);
  errors.push(...umuResult.errors);

  return { isValid: errors.length === 0, errors };
}
