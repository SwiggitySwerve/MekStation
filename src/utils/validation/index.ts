/**
 * Validation Utilities
 *
 * Re-exports all validation utility functions for convenient importing.
 */

// Armor validation utilities
export {
  FRONT_ARMOR_RATIO,
  REAR_ARMOR_RATIO,
  buildArmorByLocation,
  getExpectedTorsoArmorMax,
  createArmorLocationEntry,
} from './armorValidationUtils';

// Slot validation utilities
export {
  LOCATION_DISPLAY_NAMES,
  getLocationsForConfiguration,
  buildSlotsByLocation,
  getLocationDisplayName,
  createSlotLocationEntry,
  getTotalSlotsUsed,
  getTotalSlotsAvailable,
  getOverflowLocations,
} from './slotValidationUtils';

// Weight validation utilities
export {
  calculateStructuralWeight,
  getEngineWeight,
  getGyroWeight,
  getStructureWeight,
  getCockpitWeight,
  getHeatSinkWeight,
  getRemainingWeight,
  isWithinWeightLimit,
  getWeightOverflow,
} from './weightValidationUtils';

// Re-export types
export type { StructuralWeightParams } from './weightValidationUtils';
export type { IArmorAllocationInput } from './armorValidationUtils';
export type { IEquipmentSlotInfo } from './slotValidationUtils';
