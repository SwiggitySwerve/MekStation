import type { CombatLocation } from './CombatLocationTypes';

import { MechLocation } from '../construction/CriticalSlotAllocation';

// =============================================================================
// Type Guards and Location Helpers
// =============================================================================

const FRONT_COMBAT_LOCATION_BY_REAR: Readonly<
  Partial<Record<CombatLocation, CombatLocation>>
> = {
  center_torso_rear: 'center_torso',
  left_torso_rear: 'left_torso',
  right_torso_rear: 'right_torso',
};

const TRANSFER_LOCATION_BY_DESTROYED_LOCATION: Readonly<
  Partial<Record<MechLocation, MechLocation>>
> = {
  [MechLocation.LEFT_ARM]: MechLocation.LEFT_TORSO,
  [MechLocation.RIGHT_ARM]: MechLocation.RIGHT_TORSO,
  [MechLocation.LEFT_LEG]: MechLocation.LEFT_TORSO,
  [MechLocation.RIGHT_LEG]: MechLocation.RIGHT_TORSO,
  [MechLocation.LEFT_TORSO]: MechLocation.CENTER_TORSO,
  [MechLocation.RIGHT_TORSO]: MechLocation.CENTER_TORSO,
};

const TRANSFER_COMBAT_LOCATION_BY_DESTROYED_LOCATION: Readonly<
  Partial<Record<CombatLocation, CombatLocation>>
> = {
  left_arm: 'left_torso',
  right_arm: 'right_torso',
  left_leg: 'left_torso',
  right_leg: 'right_torso',
  left_torso: 'center_torso',
  left_torso_rear: 'center_torso',
  right_torso: 'center_torso',
  right_torso_rear: 'center_torso',
};

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
  return FRONT_COMBAT_LOCATION_BY_REAR[location] ?? location;
}

/**
 * Get the damage transfer location for a destroyed limb.
 */
export function getTransferLocation(
  location: MechLocation,
): MechLocation | null {
  return TRANSFER_LOCATION_BY_DESTROYED_LOCATION[location] ?? null;
}

/**
 * Get the transfer combat location for a destroyed limb.
 */
export function getTransferCombatLocation(
  location: CombatLocation,
): CombatLocation | null {
  return TRANSFER_COMBAT_LOCATION_BY_DESTROYED_LOCATION[location] ?? null;
}
