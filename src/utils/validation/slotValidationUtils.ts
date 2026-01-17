/**
 * Slot Validation Utilities
 *
 * Pure functions for building per-location critical slot data for validation.
 * Extracts slot calculation logic from useUnitValidation hook.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';
import { MechLocation, LOCATION_SLOT_COUNTS } from '@/types/construction/CriticalSlotAllocation';
import { ISlotsByLocation, ISlotLocationEntry } from '@/types/validation/UnitValidationInterfaces';

/**
 * Minimal equipment instance interface for slot calculation
 * Uses minimal fields to avoid circular dependency with unitState
 */
export interface IEquipmentSlotInfo {
  /** Location where equipment is placed (undefined = unallocated) */
  readonly location?: MechLocation;
  /** Critical slot indices in the location (undefined = unallocated) */
  readonly slots?: readonly number[];
}

/**
 * Location display names for slot validation
 */
export const LOCATION_DISPLAY_NAMES: Record<MechLocation, string> = {
  [MechLocation.HEAD]: 'Head',
  [MechLocation.CENTER_TORSO]: 'Center Torso',
  [MechLocation.LEFT_TORSO]: 'Left Torso',
  [MechLocation.RIGHT_TORSO]: 'Right Torso',
  [MechLocation.LEFT_ARM]: 'Left Arm',
  [MechLocation.RIGHT_ARM]: 'Right Arm',
  [MechLocation.LEFT_LEG]: 'Left Leg',
  [MechLocation.RIGHT_LEG]: 'Right Leg',
  [MechLocation.CENTER_LEG]: 'Center Leg',
  [MechLocation.FRONT_LEFT_LEG]: 'Front Left Leg',
  [MechLocation.FRONT_RIGHT_LEG]: 'Front Right Leg',
  [MechLocation.REAR_LEFT_LEG]: 'Rear Left Leg',
  [MechLocation.REAR_RIGHT_LEG]: 'Rear Right Leg',
  [MechLocation.NOSE]: 'Nose',
  [MechLocation.LEFT_WING]: 'Left Wing',
  [MechLocation.RIGHT_WING]: 'Right Wing',
  [MechLocation.AFT]: 'Aft',
  [MechLocation.FUSELAGE]: 'Fuselage',
};

/**
 * Get applicable locations for a mech configuration
 *
 * @param configuration - Mech configuration type
 * @returns Array of MechLocation values applicable to the configuration
 */
export function getLocationsForConfiguration(configuration?: MechConfiguration): MechLocation[] {
  const coreLocations = [
    MechLocation.HEAD,
    MechLocation.CENTER_TORSO,
    MechLocation.LEFT_TORSO,
    MechLocation.RIGHT_TORSO,
  ];

  if (configuration === MechConfiguration.QUAD || configuration === MechConfiguration.QUADVEE) {
    return [
      ...coreLocations,
      MechLocation.FRONT_LEFT_LEG,
      MechLocation.FRONT_RIGHT_LEG,
      MechLocation.REAR_LEFT_LEG,
      MechLocation.REAR_RIGHT_LEG,
    ];
  } else if (configuration === MechConfiguration.TRIPOD) {
    return [
      ...coreLocations,
      MechLocation.LEFT_ARM,
      MechLocation.RIGHT_ARM,
      MechLocation.LEFT_LEG,
      MechLocation.RIGHT_LEG,
      MechLocation.CENTER_LEG,
    ];
  } else {
    // Biped/LAM/default
    return [...coreLocations, MechLocation.LEFT_ARM, MechLocation.RIGHT_ARM, MechLocation.LEFT_LEG, MechLocation.RIGHT_LEG];
  }
}

/**
 * Build per-location slot usage data from equipment
 *
 * @param equipment - Array of mounted equipment instances
 * @param configuration - Mech configuration type
 * @returns Per-location slot usage data for validation
 */
export function buildSlotsByLocation(
  equipment: readonly IEquipmentSlotInfo[],
  configuration?: MechConfiguration
): ISlotsByLocation {
  const slotsByLocation: ISlotsByLocation = {};

  // Get locations for this configuration
  const locations = getLocationsForConfiguration(configuration);

  // Initialize all locations with 0 used and max from LOCATION_SLOT_COUNTS
  for (const location of locations) {
    const maxSlots = LOCATION_SLOT_COUNTS[location] || 0;
    if (maxSlots > 0) {
      slotsByLocation[location] = {
        used: 0,
        max: maxSlots,
        displayName: LOCATION_DISPLAY_NAMES[location] || location,
      };
    }
  }

  // Count slots used by equipment in each location
  for (const item of equipment) {
    if (item.location && item.slots && item.slots.length > 0) {
      const loc = item.location;
      if (slotsByLocation[loc]) {
        slotsByLocation[loc] = {
          ...slotsByLocation[loc],
          used: slotsByLocation[loc].used + item.slots.length,
        };
      }
    }
  }

  return slotsByLocation;
}

/**
 * Get the display name for a location
 *
 * @param location - MechLocation enum value
 * @returns Human-readable display name
 */
export function getLocationDisplayName(location: MechLocation): string {
  return LOCATION_DISPLAY_NAMES[location] || location;
}

/**
 * Create a single slot location entry
 *
 * @param used - Number of slots used
 * @param max - Maximum slots available
 * @param displayName - Display name for the location
 * @returns Slot location entry
 */
export function createSlotLocationEntry(used: number, max: number, displayName: string): ISlotLocationEntry {
  return { used, max, displayName };
}

/**
 * Calculate total slots used across all locations
 *
 * @param slotsByLocation - Per-location slot usage data
 * @returns Total slots used
 */
export function getTotalSlotsUsed(slotsByLocation: ISlotsByLocation): number {
  return Object.values(slotsByLocation).reduce((total, entry) => total + entry.used, 0);
}

/**
 * Calculate total slots available across all locations
 *
 * @param slotsByLocation - Per-location slot usage data
 * @returns Total slots available
 */
export function getTotalSlotsAvailable(slotsByLocation: ISlotsByLocation): number {
  return Object.values(slotsByLocation).reduce((total, entry) => total + entry.max, 0);
}

/**
 * Check if any location has exceeded its slot capacity
 *
 * @param slotsByLocation - Per-location slot usage data
 * @returns Array of locations that are over capacity
 */
export function getOverflowLocations(slotsByLocation: ISlotsByLocation): string[] {
  return Object.entries(slotsByLocation)
    .filter(([_, entry]) => entry.used > entry.max)
    .map(([location, entry]) => entry.displayName || location);
}
