import {
  MechLocation,
  LOCATION_SLOT_COUNTS,
} from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { getFixedSlotIndices } from './queries';
import { SlotAssignment, SlotOperationResult } from './types';

export function compactEquipmentSlots(
  equipment: readonly IMountedEquipmentInstance[],
  engineType: EngineType,
  gyroType: GyroType,
): SlotOperationResult {
  const assignments: SlotAssignment[] = [];

  for (const location of Object.values(MechLocation)) {
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

    const fixedSlots = getFixedSlotIndices(location, engineType, gyroType);
    const totalSlots = LOCATION_SLOT_COUNTS[location] || 0;

    let nextSlot = 0;
    while (nextSlot < totalSlots && fixedSlots.has(nextSlot)) {
      nextSlot++;
    }

    for (const eq of locationEquipment) {
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

export function sortEquipmentBySize(
  equipment: readonly IMountedEquipmentInstance[],
  engineType: EngineType,
  gyroType: GyroType,
): SlotOperationResult {
  const assignments: SlotAssignment[] = [];

  for (const location of Object.values(MechLocation)) {
    const locationEquipment = equipment.filter(
      (eq) => eq.location === location && eq.slots && eq.slots.length > 0,
    );

    if (locationEquipment.length === 0) continue;

    const sorted = [...locationEquipment].sort((a, b) => {
      if (b.criticalSlots !== a.criticalSlots) {
        return b.criticalSlots - a.criticalSlots;
      }
      return a.name.localeCompare(b.name);
    });

    const fixedSlots = getFixedSlotIndices(location, engineType, gyroType);
    const totalSlots = LOCATION_SLOT_COUNTS[location] || 0;

    let nextSlot = 0;
    while (nextSlot < totalSlots && fixedSlots.has(nextSlot)) {
      nextSlot++;
    }

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
