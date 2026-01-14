/**
 * Critical Slot Utilities
 * 
 * Helper functions for critical slot allocation, engine slots, gyro slots, and fixed equipment.
 */

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';

/**
 * Get fixed slot content for a location and slot index
 */
export function getFixedSlotContent(
  location: MechLocation,
  slotIndex: number,
  engineSlots: { ct: number; sideTorso: number },
  gyroSlots: number
): string | null {
  // Head slots
  if (location === MechLocation.HEAD) {
    switch (slotIndex) {
      case 0: return 'Life Support';
      case 1: return 'Sensors';
      case 2: return 'Cockpit';
      case 3: return null; // Available slot
      case 4: return 'Sensors';
      case 5: return 'Life Support';
    }
  }

  // Center Torso - Engine and Gyro (MegaMekLab style interleaved layout)
  // Standard layout: Engine (3), Gyro (4), Engine (3) = 10 slots
  // Compact engine: Engine (3), Gyro (varies), Engine (remaining)
  if (location === MechLocation.CENTER_TORSO) {
    // First 3 slots: Engine (first half)
    if (slotIndex < 3) {
      return 'ENGINE_PLACEHOLDER';
    }
    // Next 4 slots (3-6): Gyro
    if (slotIndex < 3 + gyroSlots) {
      return 'Gyro';
    }
    // Next 3 slots: Engine (second half)
    if (slotIndex < 3 + gyroSlots + 3) {
      return 'ENGINE_PLACEHOLDER';
    }
  }

  // Side Torsos - Engine slots for XL/Light/XXL engines
  if ((location === MechLocation.LEFT_TORSO || location === MechLocation.RIGHT_TORSO)) {
    if (slotIndex < engineSlots.sideTorso) {
      return 'ENGINE_PLACEHOLDER';
    }
  }

  // Arms - Actuators
  if (location === MechLocation.LEFT_ARM || location === MechLocation.RIGHT_ARM) {
    switch (slotIndex) {
      case 0: return 'Shoulder';
      case 1: return 'Upper Arm Actuator';
      case 2: return 'Lower Arm Actuator';
      case 3: return 'Hand Actuator';
    }
  }

  // Biped/Tripod Legs - Actuators (6 slots)
  if (location === MechLocation.LEFT_LEG || location === MechLocation.RIGHT_LEG || location === MechLocation.CENTER_LEG) {
    switch (slotIndex) {
      case 0: return 'Hip';
      case 1: return 'Upper Leg Actuator';
      case 2: return 'Lower Leg Actuator';
      case 3: return 'Foot Actuator';
    }
  }

  // Quad Legs - Actuators (6 slots, same as biped legs: 4 actuators + 2 empty)
  if (
    location === MechLocation.FRONT_LEFT_LEG ||
    location === MechLocation.FRONT_RIGHT_LEG ||
    location === MechLocation.REAR_LEFT_LEG ||
    location === MechLocation.REAR_RIGHT_LEG
  ) {
    switch (slotIndex) {
      case 0: return 'Hip';
      case 1: return 'Upper Leg Actuator';
      case 2: return 'Lower Leg Actuator';
      case 3: return 'Foot Actuator';
      // Slots 4 and 5 are empty (Roll Again)
    }
  }

  return null;
}

/**
 * Calculate engine slot requirements based on type and rating
 */
export function getEngineSlots(engineType: string, _rating: number): { ct: number; sideTorso: number } {
  const type = engineType.toLowerCase();
  
  // Standard, Light ICE, and Compact engines fit entirely in CT
  if (type.includes('standard') || type.includes('ice') || type.includes('compact')) {
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
