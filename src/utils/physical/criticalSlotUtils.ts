/**
 * Critical Slot Utilities
 *
 * Utilities for working with critical slots per BattleTech rules.
 *
 * @spec openspec/specs/physical-properties-system/spec.md
 */

/**
 * Validate that a critical slot count is valid
 *
 * Critical slots must be a non-negative integer.
 *
 * @param slots - Slot count to validate
 * @returns True if slot count is valid
 */
export function isValidCriticalSlots(slots: number): boolean {
  return Number.isInteger(slots) && slots >= 0;
}

/**
 * Critical slot validation result
 */
export interface CriticalSlotsValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate critical slot properties
 *
 * @param slots - Slot count to validate
 * @param context - Optional context for error messages
 * @returns Validation result
 */
export function validateCriticalSlots(
  slots: number,
  context?: string,
): CriticalSlotsValidationResult {
  const errors: string[] = [];
  const prefix = context ? `${context}: ` : '';

  if (!Number.isInteger(slots)) {
    errors.push(`${prefix}Critical slots must be an integer`);
  } else if (slots < 0) {
    errors.push(`${prefix}Critical slots cannot be negative`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Standard mech location slot capacities
 */
export const LOCATION_SLOT_CAPACITY = {
  HEAD: 6,
  CENTER_TORSO: 12,
  LEFT_TORSO: 12,
  RIGHT_TORSO: 12,
  LEFT_ARM: 12,
  RIGHT_ARM: 12,
  LEFT_LEG: 6,
  RIGHT_LEG: 6,
} as const;

/**
 * Total slots available on a standard mech (78 total)
 */
export const TOTAL_MECH_SLOTS =
  LOCATION_SLOT_CAPACITY.HEAD +
  LOCATION_SLOT_CAPACITY.CENTER_TORSO +
  LOCATION_SLOT_CAPACITY.LEFT_TORSO +
  LOCATION_SLOT_CAPACITY.RIGHT_TORSO +
  LOCATION_SLOT_CAPACITY.LEFT_ARM +
  LOCATION_SLOT_CAPACITY.RIGHT_ARM +
  LOCATION_SLOT_CAPACITY.LEFT_LEG +
  LOCATION_SLOT_CAPACITY.RIGHT_LEG;

/**
 * Get slot capacity for a location
 *
 * @param location - Location name
 * @returns Slot capacity or undefined if not found
 */
export function getLocationSlotCapacity(location: string): number | undefined {
  const normalized = location.toUpperCase().replace(/[\s-]/g, '_');
  return (LOCATION_SLOT_CAPACITY as Record<string, number>)[normalized];
}

/**
 * Check if slot allocation fits within capacity
 *
 * @param allocated - Number of slots already allocated
 * @param required - Number of additional slots needed
 * @param capacity - Total slot capacity
 * @returns True if allocation fits
 */
export function canAllocateSlots(
  allocated: number,
  required: number,
  capacity: number,
): boolean {
  return (
    isValidCriticalSlots(allocated) &&
    isValidCriticalSlots(required) &&
    isValidCriticalSlots(capacity) &&
    allocated + required <= capacity
  );
}
