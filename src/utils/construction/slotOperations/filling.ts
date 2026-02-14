import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { getAvailableSlotIndices, isUnhittableEquipment } from './queries';
import { SlotAssignment, SlotOperationResult } from './types';

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

export function getUnallocatedUnhittables(
  equipment: readonly IMountedEquipmentInstance[],
): IMountedEquipmentInstance[] {
  return equipment.filter(
    (eq) => eq.location === undefined && isUnhittableEquipment(eq),
  );
}

export function fillUnhittableSlots(
  equipment: readonly IMountedEquipmentInstance[],
  engineType: EngineType,
  gyroType: GyroType,
): SlotOperationResult {
  const assignments: SlotAssignment[] = [];
  const unassigned: string[] = [];

  const unhittables = getUnallocatedUnhittables(equipment);
  if (unhittables.length === 0) {
    return { assignments, unassigned };
  }

  const availableByLocation = new Map<MechLocation, number[]>();
  for (const loc of Object.values(MechLocation)) {
    availableByLocation.set(
      loc,
      getAvailableSlotIndices(loc, engineType, gyroType, equipment),
    );
  }

  const assignToLocation = (
    eq: IMountedEquipmentInstance,
    location: MechLocation,
  ): boolean => {
    const available = availableByLocation.get(location) || [];
    if (available.length === 0) return false;

    const slot = available.shift()!;
    assignments.push({
      instanceId: eq.instanceId,
      location,
      slots: [slot],
    });
    return true;
  };

  let unhittableIndex = 0;

  for (const [leftLoc, rightLoc] of FILL_LOCATION_PAIRS) {
    let useLeft = true;

    while (unhittableIndex < unhittables.length) {
      const eq = unhittables[unhittableIndex];
      const leftAvailable = (availableByLocation.get(leftLoc) || []).length;
      const rightAvailable = (availableByLocation.get(rightLoc) || []).length;

      if (leftAvailable === 0 && rightAvailable === 0) {
        break;
      }

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
        useLeft = !useLeft;
      } else {
        break;
      }
    }
  }

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

  while (unhittableIndex < unhittables.length) {
    unassigned.push(unhittables[unhittableIndex].instanceId);
    unhittableIndex++;
  }

  return { assignments, unassigned };
}
