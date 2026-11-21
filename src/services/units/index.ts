/**
 * Unit Services
 *
 * Central export for unit management services.
 *
 * @module services/units
 */

export {
  CanonicalUnitService,
  getCanonicalUnitService,
  _resetCanonicalUnitService,
  type ICanonicalUnitService,
  type IFullUnit,
} from './CanonicalUnitService';

export {
  CustomUnitService,
  getCustomUnitService,
  _resetCustomUnitService,
  type ICustomUnitService,
  type IUnitNameEntry,
} from './CustomUnitService';

export {
  UnitRepository,
  getUnitRepository,
  resetUnitRepository,
  type IUnitRepository,
} from './UnitRepository';

export {
  VersionRepository,
  getVersionRepository,
  resetVersionRepository,
  type IVersionRepository,
} from './VersionRepository';

export {
  UnitSearchService,
  unitSearchService,
  type IUnitSearchService,
} from './UnitSearchService';

export {
  unitNameValidator,
  type IUnitNameValidator,
  type INameValidationResult,
  type IUnitNameComponents,
} from './UnitNameValidator';

export {
  CustomUnitApiService,
  customUnitApiService,
  type ICustomUnitApiService,
  type ISaveResult,
  type IVersionWithData,
} from './CustomUnitApiService';

export {
  UnitLoaderService,
  unitLoaderService,
  type UnitSource,
  type IRawSerializedUnit,
  type ILoadUnitResult,
} from './unitLoaderService';

export {
  UnitTypeRegistry,
  getUnitTypeRegistry,
  registerUnitTypeHandler,
  getUnitTypeHandler,
  isUnitTypeSupported,
} from './UnitTypeRegistry';

// Unit type handlers
export {
  AbstractUnitTypeHandler,
  createSuccessResult,
  createFailureResult,
  parseArrayField,
} from './handlers';

// Enum parsing utilities
export {
  getEnumParserRegistry,
  _resetEnumParserRegistry,
  parseEngineType,
  parseGyroType,
  parseCockpitType,
  parseStructureType,
  parseArmorType,
  parseHeatSinkType,
  parseTechBase,
  parseRulesLevel,
  parseEra,
  parseMechConfiguration,
  parseMechLocation,
  getWeightClass,
  type IEnumParserRegistry,
} from './EnumParserRegistry';
