/**
 * Unit Loader Service
 *
 * Main entry point for the UnitLoaderService module.
 * This file barrel-exports all functionality from the modularized implementation.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

// Type definitions
export type { UnitSource, IRawSerializedUnit, ILoadUnitResult } from './types';

// Type guards
export { hasSerializedUnitStructure } from './typeGuards';

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
} from './componentMappers';

// Equipment resolution
export {
  normalizeEquipmentId,
  resolveEquipmentId,
  inferPreferredTechBaseFromCriticalSlots,
  CRITICAL_SLOTS_LOCATION_KEYS,
} from './equipmentResolution';

// Equipment mapping
export { mapEquipment } from './equipmentMapping';

// Armor calculations
export { calculateArmorTonnage } from './armorCalculations';

// Main service class
export { UnitLoaderService, unitLoaderService } from './unitLoader';
