/**
 * Construction Services Exports
 *
 * @spec openspec/specs/construction-services/spec.md
 */

export {
  MechBuilderService,
  getMechBuilderService,
  _resetMechBuilderService,
} from './MechBuilderService';
export type {
  IMechBuilderService,
  IEditableMech,
  IArmorAllocation,
  IEquipmentSlot,
  IMechChanges,
} from './MechBuilderService';

export {
  ValidationService,
  getValidationService,
  _resetValidationService,
} from './ValidationService';
export type { IValidationService } from './ValidationService';

export {
  CalculationService,
  getCalculationService,
  _resetCalculationService,
} from './CalculationService';
export type {
  ICalculationService,
  IMechTotals,
  IHeatProfile,
  IMovementProfile,
} from './CalculationService';
