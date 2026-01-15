/**
 * Unit Validation Initialization
 *
 * Registers all validation rules with the registry on startup.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { UnitCategory } from '../../types/validation/UnitValidationInterfaces';
import { getUnitValidationRegistry } from './UnitValidationRegistry';

// Import all rule sets
import { UNIVERSAL_VALIDATION_RULES } from './rules/universal/UniversalValidationRules';
import { MECH_CATEGORY_RULES } from './rules/mech/MechCategoryRules';
import { VEHICLE_CATEGORY_RULES } from './rules/vehicle/VehicleCategoryRules';
import { AEROSPACE_CATEGORY_RULES } from './rules/aerospace/AerospaceCategoryRules';
import { PERSONNEL_CATEGORY_RULES } from './rules/personnel/PersonnelCategoryRules';

/**
 * Flag to track if rules have been initialized
 */
let rulesInitialized = false;

/**
 * Initialize all validation rules
 *
 * This function should be called once at application startup.
 * It registers all universal, category, and unit-type-specific rules.
 */
export function initializeUnitValidationRules(): void {
  if (rulesInitialized) {
    return;
  }

  const registry = getUnitValidationRegistry();

  // Register universal rules (apply to ALL unit types)
  for (const rule of UNIVERSAL_VALIDATION_RULES) {
    registry.registerUniversalRule(rule);
  }

  // Register mech category rules
  for (const rule of MECH_CATEGORY_RULES) {
    registry.registerCategoryRule(UnitCategory.MECH, rule);
  }

  // Register vehicle category rules
  for (const rule of VEHICLE_CATEGORY_RULES) {
    registry.registerCategoryRule(UnitCategory.VEHICLE, rule);
  }

  // Register aerospace category rules
  for (const rule of AEROSPACE_CATEGORY_RULES) {
    registry.registerCategoryRule(UnitCategory.AEROSPACE, rule);
  }

  // Register personnel category rules
  for (const rule of PERSONNEL_CATEGORY_RULES) {
    registry.registerCategoryRule(UnitCategory.PERSONNEL, rule);
  }

  rulesInitialized = true;
}

/**
 * Get rule statistics
 */
export function getValidationRuleStats(): {
  universal: number;
  mech: number;
  vehicle: number;
  aerospace: number;
  personnel: number;
  total: number;
} {
  return {
    universal: UNIVERSAL_VALIDATION_RULES.length,
    mech: MECH_CATEGORY_RULES.length,
    vehicle: VEHICLE_CATEGORY_RULES.length,
    aerospace: AEROSPACE_CATEGORY_RULES.length,
    personnel: PERSONNEL_CATEGORY_RULES.length,
    total:
      UNIVERSAL_VALIDATION_RULES.length +
      MECH_CATEGORY_RULES.length +
      VEHICLE_CATEGORY_RULES.length +
      AEROSPACE_CATEGORY_RULES.length +
      PERSONNEL_CATEGORY_RULES.length,
  };
}

/**
 * Reset initialization (for testing)
 */
export function resetUnitValidationRules(): void {
  rulesInitialized = false;
  getUnitValidationRegistry().clear();
}

/**
 * Check if rules have been initialized
 */
export function areRulesInitialized(): boolean {
  return rulesInitialized;
}
