/**
 * Unit Services
 * 
 * Central export for unit factory and management services.
 * 
 * @module services/units
 */

export {
  UnitFactoryService,
  getUnitFactory,
  type IUnitFactoryResult,
} from './UnitFactoryService';

export {
  CanonicalUnitService,
  canonicalUnitService,
  type ICanonicalUnitService,
  type IFullUnit,
} from './CanonicalUnitService';

export {
  CustomUnitService,
  customUnitService,
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
  type IUnitWithVersion,
  type ISaveResult,
  type IVersionWithData,
} from './CustomUnitApiService';

export {
  UnitLoaderService,
  unitLoaderService,
  type UnitSource,
  type ISerializedUnit,
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
  parseNumericField,
  parseIntField,
  parseBooleanField,
  parseArrayField,
} from './handlers';
