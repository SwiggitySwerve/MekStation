/**
 * Slot Operations Utility
 *
 * Provides algorithms for managing critical slot assignments:
 * - Fill: Distribute unhittable slots evenly across locations
 * - Compact: Move equipment to lowest available slot indices
 * - Sort: Reorder equipment by size (largest first)
 *
 * @spec openspec/specs/critical-slots-display/spec.md
 */

import { IMountedEquipmentInstance } from '@/stores/unitState';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import {
  MechLocation,
  LOCATION_SLOT_COUNTS,
} from '@/types/construction/CriticalSlotAllocation';
import {
  EngineType,
  getEngineDefinition,
} from '@/types/construction/EngineType';
import { GyroType, getGyroDefinition } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';

// =============================================================================
// Types
// =============================================================================

/**
 * Slot assignment for a single equipment instance
 */
export interface SlotAssignment {
  readonly instanceId: string;
  readonly location: MechLocation;
  readonly slots: readonly number[];
}

/**
 * Result of a slot operation
 */
export interface SlotOperationResult {
  readonly assignments: readonly SlotAssignment[];
  readonly unassigned: readonly string[]; // Instance IDs that couldn't be assigned
}

// =============================================================================
// Location Priority Constants
// =============================================================================

/**
 * Paired locations for even distribution (fill algorithm)
 * Order: Side Torsos, Arms, Legs, then CT, then Head
 */
const FILL_LOCATION_PAIRS: readonly (readonly [MechLocation, MechLocation])[] =
  [
    [MechLocation.LEFT_TORSO, MechLocation.RIGHT_TORSO],
    [MechLocation.LEFT_ARM, MechLocation.RIGHT_ARM],
    [MechLocation.LEFT_LEG, MechLocation.RIGHT_LEG],
  ];

const FILL_SINGLE_LOCATIONS: readonly MechLocation[] = [
  MechLocation.CENTER_TORSO,
  MechLocation.HEAD,
];

// =============================================================================
// Fixed Slot Helpers
// =============================================================================

/**
 * Get slot indices occupied by fixed system components (actuators, engine, gyro)
 * These slots cannot be used for equipment.
 */
export function getFixedSlotIndices(
  location: MechLocation,
  engineType: EngineType,
  gyroType: GyroType,
): Set<number> {
  const fixed = new Set<number>();

  switch (location) {
    case MechLocation.HEAD:
      // Life Support (0), Sensors (1), Cockpit (2), Sensors (4), Life Support (5)
      // Only slot 3 is assignable
      fixed.add(0);
      fixed.add(1);
      fixed.add(2);
      fixed.add(4);
      fixed.add(5);
      break;

    case MechLocation.CENTER_TORSO: {
      const engineDef = getEngineDefinition(engineType);
      const gyroDef = getGyroDefinition(gyroType);
      const engineSlots = engineDef?.ctSlots ?? 6;
      const gyroSlots = gyroDef?.criticalSlots ?? 4;
      // Engine takes first 3, then gyro, then remaining engine
      for (let i = 0; i < Math.min(3, engineSlots); i++) {
        fixed.add(i);
      }
      for (let i = 0; i < gyroSlots; i++) {
        fixed.add(3 + i);
      }
      for (let i = 3; i < engineSlots; i++) {
        fixed.add(3 + gyroSlots + (i - 3));
      }
      break;
    }

    case MechLocation.LEFT_ARM:
    case MechLocation.RIGHT_ARM:
      // Actuators: Shoulder (0), Upper Arm (1), Lower Arm (2), Hand (3)
      fixed.add(0);
      fixed.add(1);
      fixed.add(2);
      fixed.add(3);
      break;

    case MechLocation.LEFT_LEG:
    case MechLocation.RIGHT_LEG:
      // Actuators: Hip (0), Upper Leg (1), Lower Leg (2), Foot (3)
      fixed.add(0);
      fixed.add(1);
      fixed.add(2);
      fixed.add(3);
      break;

    case MechLocation.LEFT_TORSO:
    case MechLocation.RIGHT_TORSO: {
      // XL/Light/XXL engines require side torso slots
      const engineDef = getEngineDefinition(engineType);
      const sideTorsoSlots = engineDef?.sideTorsoSlots ?? 0;
      for (let i = 0; i < sideTorsoSlots; i++) {
        fixed.add(i);
      }
      break;
    }
  }

  return fixed;
}

/**
 * Get available (empty) slot indices for a location
 */
export function getAvailableSlotIndices(
  location: MechLocation,
  engineType: EngineType,
  gyroType: GyroType,
  equipment: readonly IMountedEquipmentInstance[],
): number[] {
  const totalSlots = LOCATION_SLOT_COUNTS[location] || 0;
  const fixedSlots = getFixedSlotIndices(location, engineType, gyroType);

  // Get slots already used by equipment in this location
  const usedSlots = new Set<number>();
  for (const eq of equipment) {
    if (eq.location === location && eq.slots) {
      for (const slot of eq.slots) {
        usedSlots.add(slot);
      }
    }
  }

  // Return slots that are neither fixed nor used
  const available: number[] = [];
  for (let i = 0; i < totalSlots; i++) {
    if (!fixedSlots.has(i) && !usedSlots.has(i)) {
      available.push(i);
    }
  }

  return available;
}

// =============================================================================
// Unhittable Equipment Detection
// =============================================================================

/**
 * Structure types that require distributed critical slots
 */
const SLOTTED_STRUCTURE_TYPES: readonly InternalStructureType[] = [
  InternalStructureType.ENDO_STEEL_IS,
  InternalStructureType.ENDO_STEEL_CLAN,
  InternalStructureType.ENDO_COMPOSITE,
];

/**
 * Armor types that require distributed critical slots
 */
const SLOTTED_ARMOR_TYPES: readonly ArmorTypeEnum[] = [
  ArmorTypeEnum.FERRO_FIBROUS_IS,
  ArmorTypeEnum.FERRO_FIBROUS_CLAN,
  ArmorTypeEnum.LIGHT_FERRO,
  ArmorTypeEnum.HEAVY_FERRO,
  ArmorTypeEnum.STEALTH,
  ArmorTypeEnum.REACTIVE,
  ArmorTypeEnum.REFLECTIVE,
];

/**
 * Check if an equipment item is an "unhittable" slot (Endo Steel, Ferro-Fibrous, etc.)
 */
export function isUnhittableEquipment(
  equipment: IMountedEquipmentInstance,
): boolean {
  const name = equipment.name.toLowerCase();

  // Check for structure types
  for (const structType of SLOTTED_STRUCTURE_TYPES) {
    if (
      name.includes(structType.toLowerCase()) ||
      equipment.equipmentId.includes('endo')
    ) {
      return true;
    }
  }

  // Check for armor types
  for (const armorType of SLOTTED_ARMOR_TYPES) {
    if (
      name.includes(armorType.toLowerCase()) ||
      equipment.equipmentId.includes('ferro') ||
      equipment.equipmentId.includes('stealth') ||
      equipment.equipmentId.includes('reactive') ||
      equipment.equipmentId.includes('reflective')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Get all unallocated unhittable equipment
 */
export function getUnallocatedUnhittables(
  equipment: readonly IMountedEquipmentInstance[],
): IMountedEquipmentInstance[] {
  return equipment.filter(
    (eq) => eq.location === undefined && isUnhittableEquipment(eq),
  );
}

// =============================================================================
// Fill Algorithm
// =============================================================================

/**
 * Distribute unallocated unhittable slots evenly across locations.
 *
 * Distribution order:
 * 1. LT/RT alternating until both full
 * 2. LA/RA alternating until both full
 * 3. LL/RL alternating until both full
 * 4. CT
 * 5. Head (slot 3 only, last resort)
 *
 * Only fills unallocated unhittables - already-placed ones are skipped.
 */
export function fillUnhittableSlots(
  equipment: readonly IMountedEquipmentInstance[],
  engineType: EngineType,
  gyroType: GyroType,
): SlotOperationResult {
  const assignments: SlotAssignment[] = [];
  const unassigned: string[] = [];

  // Get unallocated unhittables
  const unhittables = getUnallocatedUnhittables(equipment);
  if (unhittables.length === 0) {
    return { assignments, unassigned };
  }

  // Build a working copy of available slots per location
  const availableByLocation = new Map<MechLocation, number[]>();
  for (const loc of Object.values(MechLocation)) {
    availableByLocation.set(
      loc,
      getAvailableSlotIndices(loc, engineType, gyroType, equipment),
    );
  }

  // Helper to assign one unhittable to a location
  const assignToLocation = (
    eq: IMountedEquipmentInstance,
    location: MechLocation,
  ): boolean => {
    const available = availableByLocation.get(location) || [];
    if (available.length === 0) return false;

    // Take the first available slot
    const slot = available.shift()!;
    assignments.push({
      instanceId: eq.instanceId,
      location,
      slots: [slot],
    });
    return true;
  };

  // Process unhittables one by one
  let unhittableIndex = 0;

  // Phase 1-3: Paired locations (alternate between left and right)
  for (const [leftLoc, rightLoc] of FILL_LOCATION_PAIRS) {
    let useLeft = true;

    while (unhittableIndex < unhittables.length) {
      const eq = unhittables[unhittableIndex];
      const leftAvailable = (availableByLocation.get(leftLoc) || []).length;
      const rightAvailable = (availableByLocation.get(rightLoc) || []).length;

      if (leftAvailable === 0 && rightAvailable === 0) {
        // Both locations full, move to next pair
        break;
      }

      // Try to alternate, but use whichever has space
      let assigned = false;
      if (useLeft && leftAvailable > 0) {
        assigned = assignToLocation(eq, leftLoc);
      } else if (!useLeft && rightAvailable > 0) {
        assigned = assignToLocation(eq, rightLoc);
      } else if (leftAvailable > 0) {
        assigned = assignToLocation(eq, leftLoc);
      } else if (rightAvailable > 0) {
        assigned = assignToLocation(eq, rightLoc);
      }

      if (assigned) {
        unhittableIndex++;
        useLeft = !useLeft; // Alternate for next iteration
      } else {
        break;
      }
    }
  }

  // Phase 4-5: Single locations (CT, then Head)
  for (const loc of FILL_SINGLE_LOCATIONS) {
    while (unhittableIndex < unhittables.length) {
      const eq = unhittables[unhittableIndex];
      if (assignToLocation(eq, loc)) {
        unhittableIndex++;
      } else {
        break;
      }
    }
  }

  // Any remaining are unassigned
  while (unhittableIndex < unhittables.length) {
    unassigned.push(unhittables[unhittableIndex].instanceId);
    unhittableIndex++;
  }

  return { assignments, unassigned };
}

// =============================================================================
// Compact Algorithm
// =============================================================================

/**
 * Compact equipment in each location to lowest available slot indices.
 * Preserves equipment order (first-placed equipment stays first).
 */
export function compactEquipmentSlots(
  equipment: readonly IMountedEquipmentInstance[],
  engineType: EngineType,
  gyroType: GyroType,
): SlotOperationResult {
  const assignments: SlotAssignment[] = [];

  // Process each location independently
  for (const location of Object.values(MechLocation)) {
    // Get equipment in this location, sorted by current slot index
    const locationEquipment = equipment
      .filter(
        (eq) => eq.location === location && eq.slots && eq.slots.length > 0,
      )
      .sort((a, b) => {
        const aMin = Math.min(...(a.slots || [Infinity]));
        const bMin = Math.min(...(b.slots || [Infinity]));
        return aMin - bMin;
      });

    if (locationEquipment.length === 0) continue;

    // Get fixed slots for this location
    const fixedSlots = getFixedSlotIndices(location, engineType, gyroType);
    const totalSlots = LOCATION_SLOT_COUNTS[location] || 0;

    // Find first available slot index (after fixed slots)
    let nextSlot = 0;
    while (nextSlot < totalSlots && fixedSlots.has(nextSlot)) {
      nextSlot++;
    }

    // Assign each equipment to consecutive slots starting at nextSlot
    for (const eq of locationEquipment) {
      const slotsNeeded = eq.criticalSlots;
      const newSlots: number[] = [];

      // Find contiguous slots, skipping fixed slots
      while (newSlots.length < slotsNeeded && nextSlot < totalSlots) {
        if (!fixedSlots.has(nextSlot)) {
          newSlots.push(nextSlot);
        }
        nextSlot++;
      }

      if (newSlots.length === slotsNeeded) {
        assignments.push({
          instanceId: eq.instanceId,
          location,
          slots: newSlots,
        });
      }
    }
  }

  return { assignments, unassigned: [] };
}

// =============================================================================
// Sort Algorithm
// =============================================================================

/**
 * Sort equipment in each location by size (largest first), then alphabetically.
 * Largest equipment goes to lower indices (top of the list).
 */
export function sortEquipmentBySize(
  equipment: readonly IMountedEquipmentInstance[],
  engineType: EngineType,
  gyroType: GyroType,
): SlotOperationResult {
  const assignments: SlotAssignment[] = [];

  // Process each location independently
  for (const location of Object.values(MechLocation)) {
    // Get equipment in this location
    const locationEquipment = equipment.filter(
      (eq) => eq.location === location && eq.slots && eq.slots.length > 0,
    );

    if (locationEquipment.length === 0) continue;

    // Sort by criticalSlots descending (largest first), then alphabetically by name
    const sorted = [...locationEquipment].sort((a, b) => {
      // Primary: by slot count descending (biggest first)
      if (b.criticalSlots !== a.criticalSlots) {
        return b.criticalSlots - a.criticalSlots;
      }
      // Secondary: alphabetically by name
      return a.name.localeCompare(b.name);
    });

    // Get fixed slots for this location
    const fixedSlots = getFixedSlotIndices(location, engineType, gyroType);
    const totalSlots = LOCATION_SLOT_COUNTS[location] || 0;

    // Find first available slot index
    let nextSlot = 0;
    while (nextSlot < totalSlots && fixedSlots.has(nextSlot)) {
      nextSlot++;
    }

    // Assign each equipment to consecutive slots
    for (const eq of sorted) {
      const slotsNeeded = eq.criticalSlots;
      const newSlots: number[] = [];

      while (newSlots.length < slotsNeeded && nextSlot < totalSlots) {
        if (!fixedSlots.has(nextSlot)) {
          newSlots.push(nextSlot);
        }
        nextSlot++;
      }

      if (newSlots.length === slotsNeeded) {
        assignments.push({
          instanceId: eq.instanceId,
          location,
          slots: newSlots,
        });
      }
    }
  }

  return { assignments, unassigned: [] };
}
