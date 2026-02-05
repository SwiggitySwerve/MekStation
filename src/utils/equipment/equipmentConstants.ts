/**
 * Equipment Constants
 *
 * Shared constants for equipment IDs used across equipment utility modules.
 * These are essential for construction and are hardcoded since they're
 * fundamental to the mech construction process.
 */

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';

// =============================================================================
// Internal Structure & Armor Slot Constants
// =============================================================================

/** Equipment ID prefix for internal structure slots */
export const INTERNAL_STRUCTURE_EQUIPMENT_ID = 'internal-structure-slot';

/** Equipment ID prefix for armor slots */
export const ARMOR_SLOTS_EQUIPMENT_ID = 'armor-slot';

/** Stealth armor locations (2 slots each in these 6 locations) */
export const STEALTH_ARMOR_LOCATIONS: MechLocation[] = [
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
];

// =============================================================================
// Equipment ID Arrays
// =============================================================================

/** Equipment IDs for movement enhancements */
export const ENHANCEMENT_EQUIPMENT_IDS = [
  'masc',
  'clan-masc',
  'supercharger',
  'tsm',
  'industrial-tsm',
];

/** Heat sink equipment IDs - hardcoded since these are essential for construction */
export const HEAT_SINK_EQUIPMENT_IDS = [
  'single-heat-sink',
  'double-heat-sink',
  'clan-double-heat-sink',
  'compact-heat-sink',
  'laser-heat-sink',
];

/** Jump jet equipment IDs - hardcoded since these are essential for construction */
export const JUMP_JET_EQUIPMENT_IDS = [
  'jump-jet-light',
  'jump-jet-medium',
  'jump-jet-heavy',
  'improved-jump-jet-light',
  'improved-jump-jet-medium',
  'improved-jump-jet-heavy',
];

/** Targeting computer equipment IDs - hardcoded since these are essential for construction */
export const TARGETING_COMPUTER_IDS = [
  'targeting-computer',
  'clan-targeting-computer',
];
