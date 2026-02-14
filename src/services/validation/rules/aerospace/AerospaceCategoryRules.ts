/**
 * Aerospace Category Validation Rules
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { IUnitValidationRuleDefinition } from '@/types/validation/UnitValidationInterfaces';

import {
  AeroMaxFuelCapacity,
  AeroMinFuelCapacity,
  AeroRearArcWeaponRestrictions,
  AeroThrustWeightRatio,
  AeroWeaponArcAssignments,
} from './AerospaceCategoryAdvancedRules';
import {
  AeroEngineRequired,
  AeroFuelCapacityValid,
  AeroStructuralIntegrityRequired,
  AeroThrustRatingValid,
} from './AerospaceCategoryCoreRules';

export {
  AeroEngineRequired,
  AeroThrustRatingValid,
  AeroStructuralIntegrityRequired,
  AeroFuelCapacityValid,
  AeroThrustWeightRatio,
  AeroMinFuelCapacity,
  AeroMaxFuelCapacity,
  AeroWeaponArcAssignments,
  AeroRearArcWeaponRestrictions,
};

export const AEROSPACE_CATEGORY_RULES: readonly IUnitValidationRuleDefinition[] =
  [
    AeroEngineRequired,
    AeroThrustRatingValid,
    AeroStructuralIntegrityRequired,
    AeroFuelCapacityValid,
    AeroThrustWeightRatio,
    AeroMinFuelCapacity,
    AeroMaxFuelCapacity,
    AeroWeaponArcAssignments,
    AeroRearArcWeaponRestrictions,
  ];
