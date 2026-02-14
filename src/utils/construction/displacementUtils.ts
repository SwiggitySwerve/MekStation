/**
 * Displacement Utilities
 *
 * Detects equipment that must be unallocated when system configuration
 * changes require slots currently occupied by equipment.
 *
 * @spec openspec/specs/critical-slot-allocation/spec.md
 */

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import {
  EngineType,
  getEngineDefinition,
} from '@/types/construction/EngineType';
import { GyroType, getGyroDefinition } from '@/types/construction/GyroType';
import { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of displacement detection
 */
export interface DisplacementResult {
  /** Equipment instance IDs that need to be unallocated */
  readonly displacedEquipmentIds: readonly string[];
  /** Locations where displacement occurred */
  readonly affectedLocations: readonly MechLocation[];
}

// =============================================================================
// Slot Calculation Helpers
// =============================================================================

/**
 * Get the slot indices that will be occupied by system components for a given configuration.
 * This includes engine CT slots, gyro slots, and engine side torso slots.
 */
function getSystemSlotIndices(
  location: MechLocation,
  engineType: EngineType,
  gyroType: GyroType,
): Set<number> {
  const slots = new Set<number>();

  switch (location) {
    case MechLocation.CENTER_TORSO: {
      const engineDef = getEngineDefinition(engineType);
      const gyroDef = getGyroDefinition(gyroType);
      const engineCTSlots = engineDef?.ctSlots ?? 6;
      const gyroSlots = gyroDef?.criticalSlots ?? 4;

      // Engine takes first 3, then gyro, then remaining engine
      for (let i = 0; i < Math.min(3, engineCTSlots); i++) {
        slots.add(i);
      }
      for (let i = 0; i < gyroSlots; i++) {
        slots.add(3 + i);
      }
      for (let i = 3; i < engineCTSlots; i++) {
        slots.add(3 + gyroSlots + (i - 3));
      }
      break;
    }

    case MechLocation.LEFT_TORSO:
    case MechLocation.RIGHT_TORSO: {
      const engineDef = getEngineDefinition(engineType);
      const sideTorsoSlots = engineDef?.sideTorsoSlots ?? 0;
      for (let i = 0; i < sideTorsoSlots; i++) {
        slots.add(i);
      }
      break;
    }

    // Other locations don't have variable system slots based on config
    default:
      break;
  }

  return slots;
}

/**
 * Get the newly required slot indices when changing from one configuration to another.
 * Returns slots that are required by the NEW config but were NOT required by the OLD config.
 */
function getNewlyRequiredSlots(
  location: MechLocation,
  oldEngineType: EngineType,
  newEngineType: EngineType,
  oldGyroType: GyroType,
  newGyroType: GyroType,
): Set<number> {
  const oldSlots = getSystemSlotIndices(location, oldEngineType, oldGyroType);
  const newSlots = getSystemSlotIndices(location, newEngineType, newGyroType);

  // Find slots in new config that weren't in old config
  const newlyRequired = new Set<number>();
  newSlots.forEach((slot) => {
    if (!oldSlots.has(slot)) {
      newlyRequired.add(slot);
    }
  });

  return newlyRequired;
}

// =============================================================================
// Displacement Detection
// =============================================================================

/**
 * Find equipment that will be displaced when changing engine and/or gyro types.
 *
 * Equipment is displaced if it occupies slots that the new configuration requires
 * for system components (engine, gyro) that weren't required by the old configuration.
 *
 * @param equipment - Current equipment list
 * @param oldEngineType - Current engine type
 * @param newEngineType - New engine type to switch to
 * @param oldGyroType - Current gyro type
 * @param newGyroType - New gyro type to switch to
 * @returns Displacement result with affected equipment IDs and locations
 */
export function getDisplacedEquipment(
  equipment: readonly IMountedEquipmentInstance[],
  oldEngineType: EngineType,
  newEngineType: EngineType,
  oldGyroType: GyroType,
  newGyroType: GyroType,
): DisplacementResult {
  const displacedIds = new Set<string>();
  const affectedLocations = new Set<MechLocation>();

  // Check each location that can have variable system slots
  const locationsToCheck: MechLocation[] = [
    MechLocation.CENTER_TORSO,
    MechLocation.LEFT_TORSO,
    MechLocation.RIGHT_TORSO,
  ];

  for (const location of locationsToCheck) {
    const newlyRequired = getNewlyRequiredSlots(
      location,
      oldEngineType,
      newEngineType,
      oldGyroType,
      newGyroType,
    );

    if (newlyRequired.size === 0) {
      continue;
    }

    // Find equipment in this location that occupies newly required slots
    for (const eq of equipment) {
      if (eq.location !== location || !eq.slots) {
        continue;
      }

      // Check if any of the equipment's slots overlap with newly required slots
      for (const slot of eq.slots) {
        if (newlyRequired.has(slot)) {
          displacedIds.add(eq.instanceId);
          affectedLocations.add(location);
          break; // No need to check other slots of this equipment
        }
      }
    }
  }

  return {
    displacedEquipmentIds: Array.from(displacedIds),
    affectedLocations: Array.from(affectedLocations),
  };
}

/**
 * Find equipment displaced specifically by an engine type change.
 *
 * @param equipment - Current equipment list
 * @param oldEngineType - Current engine type
 * @param newEngineType - New engine type to switch to
 * @param gyroType - Current gyro type (unchanged)
 * @returns Displacement result
 */
export function getEquipmentDisplacedByEngineChange(
  equipment: readonly IMountedEquipmentInstance[],
  oldEngineType: EngineType,
  newEngineType: EngineType,
  gyroType: GyroType,
): DisplacementResult {
  return getDisplacedEquipment(
    equipment,
    oldEngineType,
    newEngineType,
    gyroType,
    gyroType,
  );
}

/**
 * Find equipment displaced specifically by a gyro type change.
 *
 * @param equipment - Current equipment list
 * @param engineType - Current engine type (unchanged)
 * @param oldGyroType - Current gyro type
 * @param newGyroType - New gyro type to switch to
 * @returns Displacement result
 */
export function getEquipmentDisplacedByGyroChange(
  equipment: readonly IMountedEquipmentInstance[],
  engineType: EngineType,
  oldGyroType: GyroType,
  newGyroType: GyroType,
): DisplacementResult {
  return getDisplacedEquipment(
    equipment,
    engineType,
    engineType,
    oldGyroType,
    newGyroType,
  );
}

/**
 * Apply displacement to equipment list - unallocate displaced equipment.
 *
 * @param equipment - Current equipment list
 * @param displacedIds - IDs of equipment to unallocate
 * @returns New equipment list with displaced items unallocated
 */
export function applyDisplacement(
  equipment: readonly IMountedEquipmentInstance[],
  displacedIds: readonly string[],
): IMountedEquipmentInstance[] {
  if (displacedIds.length === 0) {
    return equipment as IMountedEquipmentInstance[];
  }

  const displacedSet = new Set(displacedIds);

  return equipment.map((eq) =>
    displacedSet.has(eq.instanceId)
      ? { ...eq, location: undefined, slots: undefined }
      : eq,
  );
}
