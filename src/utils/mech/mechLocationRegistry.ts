/**
 * Mech Location Registry
 *
 * Provides a centralized registry for mech locations by configuration type.
 * This is the single source of truth for location lists, eliminating duplicate
 * switch statements across the codebase.
 *
 * @module utils/mech/mechLocationRegistry
 */

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

/**
 * Biped location set
 */
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

/**
 * Quad location set (also used by QuadVee)
 */
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

/**
 * Tripod location set
 */
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

/**
 * LAM location set (same as biped in mech mode)
 */
export const LAM_LOCATIONS: MechLocation[] = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
];

/**
 * QuadVee location set (same as quad)
 */
export const QUADVEE_LOCATIONS: MechLocation[] = QUAD_LOCATIONS;

/**
 * Registry mapping mech configurations to their location sets.
 * To add a new configuration type, simply add a new entry to this registry.
 */
export const MECH_LOCATIONS_BY_CONFIG: Record<
  MechConfiguration,
  MechLocation[]
> = {
  [MechConfiguration.BIPED]: BIPED_LOCATIONS,
  [MechConfiguration.QUAD]: QUAD_LOCATIONS,
  [MechConfiguration.TRIPOD]: TRIPOD_LOCATIONS,
  [MechConfiguration.LAM]: LAM_LOCATIONS,
  [MechConfiguration.QUADVEE]: QUADVEE_LOCATIONS,
};

/**
 * Get locations for a specific mech configuration.
 * Returns biped locations as default if the configuration is not found.
 *
 * @param config - The mech configuration
 * @returns Array of MechLocation values for the configuration
 */
export function getLocationsForConfiguration(
  config: MechConfiguration,
): MechLocation[] {
  return MECH_LOCATIONS_BY_CONFIG[config] ?? BIPED_LOCATIONS;
}

/**
 * Get locations for a configuration string (case-insensitive).
 * This is a convenience function for services that receive configuration as a string.
 *
 * @param configString - The configuration as a string (e.g., 'Biped', 'Quad', 'quad')
 * @returns Array of MechLocation values for the configuration
 */
export function getLocationsForConfigurationString(
  configString: string,
): MechLocation[] {
  // Normalize the string to match enum values
  const normalized =
    configString.charAt(0).toUpperCase() + configString.slice(1).toLowerCase();

  // Map common variations
  const configMap: Record<string, MechConfiguration> = {
    Biped: MechConfiguration.BIPED,
    Quad: MechConfiguration.QUAD,
    Tripod: MechConfiguration.TRIPOD,
    Lam: MechConfiguration.LAM,
    Quadvee: MechConfiguration.QUADVEE,
  };

  const config = configMap[normalized];
  return config ? getLocationsForConfiguration(config) : BIPED_LOCATIONS;
}

/**
 * Get locations for a lowercase mech type string.
 * This matches the format used in printing/recordsheet utilities.
 *
 * @param mechType - The mech type as a lowercase string (e.g., 'biped', 'quad', 'tripod')
 * @returns Array of MechLocation values for the mech type
 */
export function getLocationsForMechType(mechType: string): MechLocation[] {
  const typeMap: Record<string, MechLocation[]> = {
    biped: BIPED_LOCATIONS,
    quad: QUAD_LOCATIONS,
    tripod: TRIPOD_LOCATIONS,
    lam: LAM_LOCATIONS,
    quadvee: QUADVEE_LOCATIONS,
  };

  return typeMap[mechType.toLowerCase()] ?? BIPED_LOCATIONS;
}
