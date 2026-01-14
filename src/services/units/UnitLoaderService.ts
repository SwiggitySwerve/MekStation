/**
 * Unit Loader Service
 * 
 * Fetches full unit data from canonical JSON files or SQLite custom units
 * and maps them to the UnitState format for the customizer.
 * 
 * This file serves as the main entry point and re-exports all functionality
 * from the modularized implementation files.
 * 
 * @spec openspec/specs/unit-services/spec.md
 */

// Type definitions
export type {
  UnitSource,
  ISerializedUnit,
  ILoadUnitResult,
} from './UnitLoaderService.types';

// Type guards
export {
  hasSerializedUnitStructure,
} from './UnitLoaderService.type-guards';

// Component mappers
export {
  mapEngineType,
  mapGyroType,
  mapStructureType,
  mapCockpitType,
  mapHeatSinkType,
  mapArmorType,
  mapTechBase,
  mapTechBaseMode,
  mapRulesLevel,
  mapMechLocation,
  mapArmorAllocation,
} from './UnitLoaderService.component-mappers';

// Equipment resolution
export {
  normalizeEquipmentId,
  resolveEquipmentId,
  inferPreferredTechBaseFromCriticalSlots,
  CRITICAL_SLOTS_LOCATION_KEYS,
} from './UnitLoaderService.equipment-resolution';

// Equipment mapping
export {
  mapEquipment,
} from './UnitLoaderService.equipment-mapping';

// Armor calculations
export {
  calculateArmorTonnage,
} from './UnitLoaderService.armor-calculations';

// Main service class
export {
  UnitLoaderService,
  unitLoaderService,
} from './UnitLoaderService.unit-loader';
