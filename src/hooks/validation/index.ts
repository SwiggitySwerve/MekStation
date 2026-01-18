/**
 * Validation Hooks
 *
 * Focused hooks for different aspects of unit validation.
 * These hooks can be used independently or composed together.
 */

export { useUnitMetadata } from './useUnitMetadata';
export type { UnitMetadata } from './useUnitMetadata';

export { useWeightValidation } from './useWeightValidation';
export type { WeightValidationData } from './useWeightValidation';

export { useArmorValidation } from './useArmorValidation';
export type { ArmorValidationData } from './useArmorValidation';

export { useEquipmentValidation } from './useEquipmentValidation';
export type { EquipmentValidationData } from './useEquipmentValidation';

export { useStructureValidation } from './useStructureValidation';
export type { StructureValidationData } from './useStructureValidation';
