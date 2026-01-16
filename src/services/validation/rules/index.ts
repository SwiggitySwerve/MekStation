/**
 * Validation Rules Index
 *
 * Central export point for all validation rules.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

// Universal rules
export { UNIVERSAL_VALIDATION_RULES } from './universal/UniversalValidationRules';
export * from './universal/UniversalValidationRules';

// Mech category rules
export { MECH_CATEGORY_RULES } from './mech/MechCategoryRules';
export * from './mech/MechCategoryRules';

// BattleMech-specific rules (extends Mech category)
export { BATTLEMECH_RULES } from './battlemech/BattleMechRules';
export * from './battlemech/BattleMechRules';

// Vehicle category rules
export { VEHICLE_CATEGORY_RULES } from './vehicle/VehicleCategoryRules';
export * from './vehicle/VehicleCategoryRules';

// Aerospace category rules
export { AEROSPACE_CATEGORY_RULES } from './aerospace/AerospaceCategoryRules';
export * from './aerospace/AerospaceCategoryRules';

// Personnel category rules
export { PERSONNEL_CATEGORY_RULES } from './personnel/PersonnelCategoryRules';
export * from './personnel/PersonnelCategoryRules';
