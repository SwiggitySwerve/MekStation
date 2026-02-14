/**
 * Mech Configuration System - Helpers
 *
 * Shared constants, location arrays, and utility functions used by
 * configuration definitions and consumers.
 */

import {
  MechLocation,
  MechConfiguration,
  ActuatorType,
  type IActuatorSlot,
  type ILocationDefinition,
} from './MechConfigTypes';

/**
 * Standard arm actuators (biped/tripod/LAM)
 */
export const ARM_ACTUATORS: readonly IActuatorSlot[] = [
  {
    type: ActuatorType.SHOULDER,
    slotIndex: 0,
    required: true,
    removable: false,
  },
  {
    type: ActuatorType.UPPER_ARM,
    slotIndex: 1,
    required: true,
    removable: false,
  },
  {
    type: ActuatorType.LOWER_ARM,
    slotIndex: 2,
    required: false,
    removable: true,
  },
  { type: ActuatorType.HAND, slotIndex: 3, required: false, removable: true },
];

/**
 * Standard leg actuators (all configurations)
 */
export const LEG_ACTUATORS: readonly IActuatorSlot[] = [
  { type: ActuatorType.HIP, slotIndex: 0, required: true, removable: false },
  {
    type: ActuatorType.UPPER_LEG,
    slotIndex: 1,
    required: true,
    removable: false,
  },
  {
    type: ActuatorType.LOWER_LEG,
    slotIndex: 2,
    required: true,
    removable: false,
  },
  { type: ActuatorType.FOOT, slotIndex: 3, required: true, removable: false },
];

export const BIPED_LOCATIONS: MechLocation[] = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
];

export const QUAD_LOCATIONS: MechLocation[] = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.FRONT_LEFT_LEG,
  MechLocation.FRONT_RIGHT_LEG,
  MechLocation.REAR_LEFT_LEG,
  MechLocation.REAR_RIGHT_LEG,
];

export const TRIPOD_LOCATIONS: MechLocation[] = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
  MechLocation.CENTER_LEG,
];

export const LAM_FIGHTER_LOCATIONS: MechLocation[] = [
  MechLocation.NOSE,
  MechLocation.LEFT_WING,
  MechLocation.RIGHT_WING,
  MechLocation.AFT,
  MechLocation.FUSELAGE,
];

/**
 * Get locations for a specific configuration
 *
 * Note: This function delegates to the centralized mechLocationRegistry
 * but maintains special handling for QuadVee -> Quad mapping.
 */
export function getLocationsForConfig(
  config: MechConfiguration,
): MechLocation[] {
  if (config === MechConfiguration.QUADVEE) {
    return QUAD_LOCATIONS;
  }

  const locationMap: Record<MechConfiguration, MechLocation[]> = {
    [MechConfiguration.BIPED]: BIPED_LOCATIONS,
    [MechConfiguration.QUAD]: QUAD_LOCATIONS,
    [MechConfiguration.TRIPOD]: TRIPOD_LOCATIONS,
    [MechConfiguration.LAM]: BIPED_LOCATIONS,
    [MechConfiguration.QUADVEE]: QUAD_LOCATIONS,
  };

  return locationMap[config] ?? BIPED_LOCATIONS;
}

export function isValidLocationForConfig(
  location: MechLocation,
  config: MechConfiguration,
): boolean {
  const validLocations = getLocationsForConfig(config);
  return validLocations.includes(location);
}

export function getLocationDisplayName(location: MechLocation): string {
  return location;
}

/**
 * Canonical location abbreviations for all mech locations
 *
 * Includes all configurations: biped, quad, tripod, and LAM fighter mode.
 * Use this as the single source of truth for location abbreviations.
 */
export const LOCATION_ABBREVIATION_MAP: Readonly<Record<MechLocation, string>> =
  {
    [MechLocation.HEAD]: 'HD',
    [MechLocation.CENTER_TORSO]: 'CT',
    [MechLocation.LEFT_TORSO]: 'LT',
    [MechLocation.RIGHT_TORSO]: 'RT',
    [MechLocation.LEFT_ARM]: 'LA',
    [MechLocation.RIGHT_ARM]: 'RA',
    [MechLocation.LEFT_LEG]: 'LL',
    [MechLocation.RIGHT_LEG]: 'RL',
    [MechLocation.CENTER_LEG]: 'CL',
    [MechLocation.FRONT_LEFT_LEG]: 'FLL',
    [MechLocation.FRONT_RIGHT_LEG]: 'FRL',
    [MechLocation.REAR_LEFT_LEG]: 'RLL',
    [MechLocation.REAR_RIGHT_LEG]: 'RRL',
    [MechLocation.NOSE]: 'NOS',
    [MechLocation.LEFT_WING]: 'LW',
    [MechLocation.RIGHT_WING]: 'RW',
    [MechLocation.AFT]: 'AFT',
    [MechLocation.FUSELAGE]: 'FUS',
  };

export function getLocationAbbreviation(location: MechLocation): string {
  return LOCATION_ABBREVIATION_MAP[location] || location;
}

export function getLocationSlotCount(
  location: MechLocation,
  _config: MechConfiguration,
): number {
  if (location === MechLocation.HEAD) {
    return 6;
  }

  if (
    [
      MechLocation.CENTER_TORSO,
      MechLocation.LEFT_TORSO,
      MechLocation.RIGHT_TORSO,
    ].includes(location)
  ) {
    return 12;
  }

  if ([MechLocation.LEFT_ARM, MechLocation.RIGHT_ARM].includes(location)) {
    return 12;
  }

  if (
    [
      MechLocation.LEFT_LEG,
      MechLocation.RIGHT_LEG,
      MechLocation.CENTER_LEG,
    ].includes(location)
  ) {
    return 6;
  }

  if (
    [
      MechLocation.FRONT_LEFT_LEG,
      MechLocation.FRONT_RIGHT_LEG,
      MechLocation.REAR_LEFT_LEG,
      MechLocation.REAR_RIGHT_LEG,
    ].includes(location)
  ) {
    return 6;
  }

  return 0;
}

export function isLegLocation(location: MechLocation): boolean {
  return [
    MechLocation.LEFT_LEG,
    MechLocation.RIGHT_LEG,
    MechLocation.CENTER_LEG,
    MechLocation.FRONT_LEFT_LEG,
    MechLocation.FRONT_RIGHT_LEG,
    MechLocation.REAR_LEFT_LEG,
    MechLocation.REAR_RIGHT_LEG,
  ].includes(location);
}

export function isArmLocation(location: MechLocation): boolean {
  return [MechLocation.LEFT_ARM, MechLocation.RIGHT_ARM].includes(location);
}

export function hasRearArmor(location: MechLocation): boolean {
  return [
    MechLocation.CENTER_TORSO,
    MechLocation.LEFT_TORSO,
    MechLocation.RIGHT_TORSO,
  ].includes(location);
}

export function getActuatorsForLocation(
  location: MechLocation,
  config: MechConfiguration,
): readonly IActuatorSlot[] {
  if (
    [
      MechLocation.HEAD,
      MechLocation.CENTER_TORSO,
      MechLocation.LEFT_TORSO,
      MechLocation.RIGHT_TORSO,
    ].includes(location)
  ) {
    return [];
  }

  if (isArmLocation(location)) {
    if (
      config === MechConfiguration.QUAD ||
      config === MechConfiguration.QUADVEE
    ) {
      return [];
    }
    return ARM_ACTUATORS;
  }

  if (isLegLocation(location)) {
    return LEG_ACTUATORS;
  }

  return [];
}

/**
 * Helper to create a location definition.
 * Used by all 5 configuration definitions.
 */
export function createLocationDef(
  id: MechLocation,
  displayName: string,
  abbreviation: string,
  criticalSlots: number,
  options: {
    hasRearArmor?: boolean;
    isLimb?: boolean;
    actuators?: readonly IActuatorSlot[];
    transfersTo?: MechLocation;
    maxArmorMultiplier?: number;
  } = {},
): ILocationDefinition {
  return {
    id,
    displayName,
    abbreviation,
    criticalSlots,
    hasRearArmor: options.hasRearArmor ?? false,
    isLimb: options.isLimb ?? false,
    actuators: options.actuators ?? [],
    transfersTo: options.transfersTo,
    maxArmorMultiplier: options.maxArmorMultiplier ?? 2,
  };
}
