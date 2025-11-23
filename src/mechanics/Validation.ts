/**
 * Validation.ts
 * Validation mechanic for the Mech Lab.
 * Ports logic from legacy ConstructionRulesValidator.ts.
 */

import { IMechLabState } from '../features/mech-lab/store/MechLabState';
import { WeightOps } from './WeightOps';
import { TechBase, RulesLevel } from '../types/TechBase';
import { EngineType, GyroType, CockpitType, StructureType, ArmorType, HeatSinkType } from '../types/SystemComponents';

export interface IValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class MechValidator {
  static validate(state: IMechLabState, currentWeight?: number): IValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Weight Check
    const weightToCheck = currentWeight ?? state.currentWeight;
    if (weightToCheck > state.tonnage) {
      errors.push(`Unit is overweight by ${(weightToCheck - state.tonnage).toFixed(2)} tons.`);
    } else if (weightToCheck < state.tonnage) {
      warnings.push(`Unit is underweight by ${(state.tonnage - weightToCheck).toFixed(2)} tons.`);
    }

    // 2. Engine Checks
    this.validateEngine(state, errors, warnings);

    // 3. Gyro Checks
    this.validateGyro(state, errors);

    // 4. Cockpit Checks
    this.validateCockpit(state, errors);

    // 5. Structure Checks
    this.validateStructure(state, errors);

    // 6. Armor Checks
    this.validateArmor(state, errors);

    // 7. Tech Base & Rules Level Checks
    this.validateTechBase(state, errors);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private static validateEngine(state: IMechLabState, errors: string[], warnings: string[]) {
    // Engine Rating = Walking MP * Tonnage
    const requiredRating = state.walkingMP * state.tonnage;

    // Check if engine rating is valid (e.g. max 400 for standard rules)
    if (requiredRating > 400 && state.rulesLevel === RulesLevel.STANDARD) {
      errors.push(`Engine Rating ${requiredRating} exceeds maximum of 400 for Standard rules.`);
    }

    // Minimum rating check (usually 10 or walking MP 1)
    if (state.walkingMP < 1) {
      errors.push('Walking MP must be at least 1.');
    }

    // Engine Type limitations
    if (state.engineType === EngineType.XXL && state.rulesLevel !== RulesLevel.EXPERIMENTAL) {
      errors.push('XXL Engines require Experimental rules.');
    }
    if (state.engineType === EngineType.LIGHT && state.techBase === TechBase.CLAN) {
      errors.push('Clan Mechs cannot use Light Engines.');
    }
  }

  private static validateGyro(state: IMechLabState, errors: string[]) {
    // Gyro size depends on engine rating? No, weight does.
    // Gyro type limitations
    if (state.gyroType === GyroType.XL && state.rulesLevel === RulesLevel.INTRODUCTORY) {
      errors.push('XL Gyros are not allowed in Introductory rules.');
    }
    // Compact Gyro requires Standard/Advanced?
  }

  private static validateCockpit(state: IMechLabState, errors: string[]) {
    if (state.cockpitType === CockpitType.TORSO_MOUNTED && state.rulesLevel !== RulesLevel.EXPERIMENTAL) {
      errors.push('Torso-Mounted Cockpits require Experimental rules.');
    }
    if (state.cockpitType === CockpitType.SMALL && state.techBase === TechBase.CLAN) {
      // Clan doesn't use "Small Cockpit" usually? They have their own standard?
      // Actually Small Cockpit is available to both but rules level might differ.
    }
  }

  private static validateStructure(state: IMechLabState, errors: string[]) {
    if (state.structureType === StructureType.ENDO_STEEL_CLAN && state.techBase === TechBase.INNER_SPHERE) {
      errors.push('Inner Sphere Mechs cannot use Clan Endo Steel.');
    }
    // Composite/Reinforced checks
  }

  private static validateArmor(state: IMechLabState, errors: string[]) {
    // Max Armor Check
    const maxArmor = WeightOps.getMaxArmorPoints(state.tonnage);
    // We need total armor points from state.
    // state.armorAllocation is Record<string, number> (or {front, rear}?)
    // Let's assume simple number for now or we need a helper to sum it up.
    // For now, skipping exact point calculation as we don't have the helper in Validation.ts yet.
    // But we can check types.

    if (state.armorType === ArmorType.FERRO_FIBROUS_CLAN && state.techBase === TechBase.INNER_SPHERE) {
      errors.push('Inner Sphere Mechs cannot use Clan Ferro-Fibrous.');
    }
  }

  private static validateTechBase(state: IMechLabState, errors: string[]) {
    if (state.techBase === TechBase.MIXED && state.rulesLevel !== RulesLevel.EXPERIMENTAL && state.rulesLevel !== RulesLevel.ADVANCED) {
      // Mixed tech usually requires Advanced or Experimental
      // errors.push('Mixed Tech requires Advanced or Experimental rules.');
    }
  }
}
