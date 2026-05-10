import type { CombatLocation } from './CombatLocationTypes';

import { MechLocation } from '../construction/CriticalSlotAllocation';

// =============================================================================
// Type Guards and Location Helpers
// =============================================================================

/**
 * Check if a combat location is a rear location.
 */
export function isRearCombatLocation(location: CombatLocation): boolean {
  return (
    location === 'center_torso_rear' ||
    location === 'left_torso_rear' ||
    location === 'right_torso_rear'
  );
}

/**
 * Check if a location is a limb.
 */
export function isLimbLocation(location: MechLocation): boolean {
  return (
    location === MechLocation.LEFT_ARM ||
    location === MechLocation.RIGHT_ARM ||
    location === MechLocation.LEFT_LEG ||
    location === MechLocation.RIGHT_LEG
  );
}

/**
 * Check if a location is a torso.
 */
export function isTorsoLocation(location: MechLocation): boolean {
  return (
    location === MechLocation.CENTER_TORSO ||
    location === MechLocation.LEFT_TORSO ||
    location === MechLocation.RIGHT_TORSO
  );
}

/**
 * Get the front version of a rear combat location.
 */
export function getFrontCombatLocation(
  location: CombatLocation,
): CombatLocation {
  switch (location) {
    case 'center_torso_rear':
      return 'center_torso';
    case 'left_torso_rear':
      return 'left_torso';
    case 'right_torso_rear':
      return 'right_torso';
    default:
      return location;
  }
}

/**
 * Get the damage transfer location for a destroyed limb.
 */
export function getTransferLocation(
  location: MechLocation,
): MechLocation | null {
  switch (location) {
    case MechLocation.LEFT_ARM:
      return MechLocation.LEFT_TORSO;
    case MechLocation.RIGHT_ARM:
      return MechLocation.RIGHT_TORSO;
    case MechLocation.LEFT_LEG:
      return MechLocation.LEFT_TORSO;
    case MechLocation.RIGHT_LEG:
      return MechLocation.RIGHT_TORSO;
    case MechLocation.LEFT_TORSO:
      return MechLocation.CENTER_TORSO;
    case MechLocation.RIGHT_TORSO:
      return MechLocation.CENTER_TORSO;
    default:
      return null; // Head and CT don't transfer
  }
}

/**
 * Get the transfer combat location for a destroyed limb.
 */
export function getTransferCombatLocation(
  location: CombatLocation,
): CombatLocation | null {
  switch (location) {
    case 'left_arm':
      return 'left_torso';
    case 'right_arm':
      return 'right_torso';
    case 'left_leg':
      return 'left_torso';
    case 'right_leg':
      return 'right_torso';
    case 'left_torso':
    case 'left_torso_rear':
      return 'center_torso';
    case 'right_torso':
    case 'right_torso_rear':
      return 'center_torso';
    default:
      return null; // Head and CT don't transfer
  }
}
