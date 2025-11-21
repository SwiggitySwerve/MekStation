/**
 * Type Conversion Utilities
 * 
 * Centralized exports for all type conversion utilities.
 * 
 * This module provides:
 * - Enum converters (string ↔ enum)
 * - Property mappers (snake_case ↔ camelCase)
 * - Property accessors (safe property access)
 * - Validators (data validation)
 * - Location mappers (location name conversion)
 * - API adapters (API ↔ internal format)
 */

// Enum converters
export {
  stringToTechBase,
  stringToTechBaseWithDefault,
  techBaseToString,
  stringToRulesLevel,
  stringToRulesLevelWithDefault,
  rulesLevelToString
} from './enumConverters';

// Property mappers
export {
  convertApiToInternal,
  convertInternalToApi,
  mapApiPropertyToInternal,
  mapInternalPropertyToApi,
  isApiPropertyFormat,
  isInternalPropertyFormat,
  API_TO_INTERNAL_PROPERTY_MAP,
  INTERNAL_TO_API_PROPERTY_MAP
} from './propertyMappers';

// Property accessors
export {
  getTechBase,
  getRulesLevel,
  getTonnage,
  getEra,
  hasTechBase,
  hasRulesLevel,
  hasTonnage
} from './propertyAccessors';

// Validators
export {
  validateFullUnit,
  validateUnitData,
  isValidTechBaseString,
  isValidRulesLevelValue,
  ValidationResult
} from './validators';

// Location mappers
export * from './locationMappers';

// API adapters
export {
  IUnitApiAdapter,
  UnitApiAdapter,
  unitApiAdapter
} from './apiAdapters/unitAdapter';
