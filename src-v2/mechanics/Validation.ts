/**
 * Validation.ts
 * Simple validation mechanic for the Mech Lab.
 */

import { IMechLabState } from '../features/mech-lab/store/MechLabState';

export interface IValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class MechValidator {
  static validate(state: IMechLabState, currentWeight: number): IValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Weight Check
    if (currentWeight > state.tonnage) {
      errors.push(`Unit is overweight by ${(currentWeight - state.tonnage).toFixed(2)} tons.`);
    } else if (currentWeight < state.tonnage) {
      warnings.push(`Unit is underweight by ${(state.tonnage - currentWeight).toFixed(2)} tons.`);
    }

    // 2. Engine Rating Check
    // Rule: Engine Rating must be at least WalkMP * Tonnage (already enforced by calc, but check for negatives)
    if (state.walkingMP < 1) {
      errors.push('Walking MP must be at least 1.');
    }

    // 3. Critical Slot Checks (Placeholder)
    // TODO: Implement slot counting logic

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

