/**
 * Critical Slot Utilities
 *
 * Helper functions for critical slot allocation, engine slots, gyro slots, and fixed equipment.
 */

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';

const ENGINE_PLACEHOLDER = 'ENGINE_PLACEHOLDER';

const HEAD_FIXED_SLOTS: readonly (string | null)[] = [
  'Life Support',
  'Sensors',
  'Cockpit',
  null,
  'Sensors',
  'Life Support',
];

const ARM_FIXED_SLOTS: readonly string[] = [
  'Shoulder',
  'Upper Arm Actuator',
  'Lower Arm Actuator',
  'Hand Actuator',
];

const LEG_FIXED_SLOTS: readonly string[] = [
  'Hip',
  'Upper Leg Actuator',
  'Lower Leg Actuator',
  'Foot Actuator',
];

const SIDE_TORSO_LOCATIONS = new Set<MechLocation>([
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
]);

const FIXED_ACTUATOR_SLOTS_BY_LOCATION: Partial<
  Record<MechLocation, readonly string[]>
> = {
  [MechLocation.LEFT_ARM]: ARM_FIXED_SLOTS,
  [MechLocation.RIGHT_ARM]: ARM_FIXED_SLOTS,
  [MechLocation.LEFT_LEG]: LEG_FIXED_SLOTS,
  [MechLocation.RIGHT_LEG]: LEG_FIXED_SLOTS,
  [MechLocation.CENTER_LEG]: LEG_FIXED_SLOTS,
  [MechLocation.FRONT_LEFT_LEG]: LEG_FIXED_SLOTS,
  [MechLocation.FRONT_RIGHT_LEG]: LEG_FIXED_SLOTS,
  [MechLocation.REAR_LEFT_LEG]: LEG_FIXED_SLOTS,
  [MechLocation.REAR_RIGHT_LEG]: LEG_FIXED_SLOTS,
};

function fixedIndexedContent(
  slots: readonly (string | null)[],
  slotIndex: number,
): string | null {
  return slots[slotIndex] ?? null;
}

function getCenterTorsoFixedSlotContent(
  slotIndex: number,
  gyroSlots: number,
): string | null {
  const firstEngineSlots = 3;
  const gyroStart = firstEngineSlots;
  const secondEngineStart = gyroStart + gyroSlots;
  const secondEngineEnd = secondEngineStart + 3;

  if (slotIndex < firstEngineSlots) {
    return ENGINE_PLACEHOLDER;
  }
  if (slotIndex < secondEngineStart) {
    return 'Gyro';
  }
  if (slotIndex < secondEngineEnd) {
    return ENGINE_PLACEHOLDER;
  }
  return null;
}

/**
 * Get fixed slot content for a location and slot index
 */
export function getFixedSlotContent(
  location: MechLocation,
  slotIndex: number,
  engineSlots: { ct: number; sideTorso: number },
  gyroSlots: number,
): string | null {
  if (location === MechLocation.HEAD) {
    return fixedIndexedContent(HEAD_FIXED_SLOTS, slotIndex);
  }

  if (location === MechLocation.CENTER_TORSO) {
    return getCenterTorsoFixedSlotContent(slotIndex, gyroSlots);
  }

  if (SIDE_TORSO_LOCATIONS.has(location)) {
    return slotIndex < engineSlots.sideTorso ? ENGINE_PLACEHOLDER : null;
  }

  const actuatorSlots = FIXED_ACTUATOR_SLOTS_BY_LOCATION[location];
  if (actuatorSlots) {
    return fixedIndexedContent(actuatorSlots, slotIndex);
  }

  return null;
}

/**
 * Calculate engine slot requirements based on type and rating
 */
export function getEngineSlots(
  engineType: string,
  _rating: number,
): { ct: number; sideTorso: number } {
  const type = engineType.toLowerCase();

  // Standard, Light ICE, and Compact engines fit entirely in CT
  if (
    type.includes('standard') ||
    type.includes('ice') ||
    type.includes('compact')
  ) {
    return { ct: 6, sideTorso: 0 };
  }

  // XL engines use 3 CT + 3 each side torso
  if (type.includes('xl')) {
    return { ct: 6, sideTorso: 3 };
  }

  // Light engines use 6 CT + 2 each side torso
  if (type.includes('light')) {
    return { ct: 6, sideTorso: 2 };
  }

  // XXL engines use 6 CT + 6 each side torso
  if (type.includes('xxl')) {
    return { ct: 6, sideTorso: 6 };
  }

  // Default to standard
  return { ct: 6, sideTorso: 0 };
}

/**
 * Calculate gyro slot requirements based on type
 */
export function getGyroSlots(gyroType: string): number {
  const type = gyroType.toLowerCase();

  if (type.includes('compact')) return 2;
  if (type.includes('heavy')) return 2;
  if (type.includes('xl')) return 6;

  // Standard gyro = 4 slots
  return 4;
}

/**
 * Format engine name for display (e.g., "Fusion Engine", "XL Engine")
 */
export function formatEngineName(engineType: string): string {
  const type = engineType.toLowerCase();

  if (type.includes('xl')) return 'XL Engine';
  if (type.includes('xxl')) return 'XXL Engine';
  if (type.includes('light')) return 'Light Engine';
  if (type.includes('compact')) return 'Compact Engine';
  if (type.includes('ice')) return 'ICE';
  if (type.includes('fuel cell')) return 'Fuel Cell';
  if (type.includes('fission')) return 'Fission Engine';

  // Default: Fusion Engine
  return 'Fusion Engine';
}
