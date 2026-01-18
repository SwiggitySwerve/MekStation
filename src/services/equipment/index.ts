/**
 * Equipment Services
 * 
 * Central export for equipment loading, registry, and name mapping services.
 * 
 * @module services/equipment
 */

export {
  EquipmentLoaderService,
  getEquipmentLoader,
  type IEquipmentLoadResult,
  type IEquipmentValidationResult,
  type IEquipmentFilter,
} from './EquipmentLoaderService';

export {
  EquipmentRegistry,
  getEquipmentRegistry,
  type AnyEquipment,
  type EquipmentCategoryType,
  type IRegistryStats,
  type IEquipmentLookupResult,
} from './EquipmentRegistry';

export {
  EquipmentNameMapper,
  getEquipmentNameMapper,
  type INameMappingResult,
  type IMappingStats,
} from './EquipmentNameMapper';

export {
  EquipmentCalculatorService,
  equipmentCalculatorService,
  getEquipmentCalculatorService,
  _resetEquipmentCalculatorService,
  type IEquipmentCalculatorService,
  VARIABLE_EQUIPMENT,
} from './EquipmentCalculatorService';

export {
  EquipmentLookupService,
  equipmentLookupService,
  getEquipmentLookupService,
  _resetEquipmentLookupService,
  type IEquipmentLookupService,
} from './EquipmentLookupService';
