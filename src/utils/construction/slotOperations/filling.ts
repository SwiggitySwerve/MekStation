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

type AvailableSlotsByLocation = Map<MechLocation, number[]>;

export function getUnallocatedUnhittables(
  equipment: readonly IMountedEquipmentInstance[],
): IMountedEquipmentInstance[] {
  return equipment.filter(
    (eq) => eq.location === undefined && isUnhittableEquipment(eq),
  );
}

function createAvailableSlotsByLocation(
  equipment: readonly IMountedEquipmentInstance[],
  engineType: EngineType,
  gyroType: GyroType,
): AvailableSlotsByLocation {
  const availableByLocation: AvailableSlotsByLocation = new Map();
  for (const loc of Object.values(MechLocation)) {
    availableByLocation.set(
      loc,
      getAvailableSlotIndices(loc, engineType, gyroType, equipment),
    );
  }
  return availableByLocation;
}

function assignToLocation(
  eq: IMountedEquipmentInstance,
  location: MechLocation,
  availableByLocation: AvailableSlotsByLocation,
  assignments: SlotAssignment[],
): boolean {
  const available = availableByLocation.get(location) || [];
  if (available.length === 0) return false;

  const slot = available.shift()!;
  assignments.push({
    instanceId: eq.instanceId,
    location,
    slots: [slot],
  });
  return true;
}

function choosePairedLocation(
  availableByLocation: AvailableSlotsByLocation,
  leftLoc: MechLocation,
  rightLoc: MechLocation,
  useLeft: boolean,
): MechLocation | undefined {
  const preferred = useLeft ? [leftLoc, rightLoc] : [rightLoc, leftLoc];
  return preferred.find(
    (location) => (availableByLocation.get(location) || []).length > 0,
  );
}

function fillPairedLocations(
  unhittables: readonly IMountedEquipmentInstance[],
  startIndex: number,
  availableByLocation: AvailableSlotsByLocation,
  assignments: SlotAssignment[],
): number {
  let unhittableIndex = startIndex;

  for (const [leftLoc, rightLoc] of FILL_LOCATION_PAIRS) {
    let useLeft = true;

    while (unhittableIndex < unhittables.length) {
      const location = choosePairedLocation(
        availableByLocation,
        leftLoc,
        rightLoc,
        useLeft,
      );
      if (location === undefined) break;

      const assigned = assignToLocation(
        unhittables[unhittableIndex],
        location,
        availableByLocation,
        assignments,
      );
      if (!assigned) break;

      unhittableIndex++;
      useLeft = !useLeft;
    }
  }

  return unhittableIndex;
}

function fillSingleLocations(
  unhittables: readonly IMountedEquipmentInstance[],
  startIndex: number,
  availableByLocation: AvailableSlotsByLocation,
  assignments: SlotAssignment[],
): number {
  let unhittableIndex = startIndex;

  for (const loc of FILL_SINGLE_LOCATIONS) {
    while (
      unhittableIndex < unhittables.length &&
      assignToLocation(
        unhittables[unhittableIndex],
        loc,
        availableByLocation,
        assignments,
      )
    ) {
      unhittableIndex++;
    }
  }

  return unhittableIndex;
}

function collectUnassigned(
  unhittables: readonly IMountedEquipmentInstance[],
  startIndex: number,
): string[] {
  return unhittables.slice(startIndex).map((eq) => eq.instanceId);
}

export function fillUnhittableSlots(
  equipment: readonly IMountedEquipmentInstance[],
  engineType: EngineType,
  gyroType: GyroType,
): SlotOperationResult {
  const assignments: SlotAssignment[] = [];

  const unhittables = getUnallocatedUnhittables(equipment);
  if (unhittables.length === 0) {
    return { assignments, unassigned: [] };
  }

  const availableByLocation = createAvailableSlotsByLocation(
    equipment,
    engineType,
    gyroType,
  );
  const pairedIndex = fillPairedLocations(
    unhittables,
    0,
    availableByLocation,
    assignments,
  );
  const filledIndex = fillSingleLocations(
    unhittables,
    pairedIndex,
    availableByLocation,
    assignments,
  );
  const unassigned = collectUnassigned(unhittables, filledIndex);

  return { assignments, unassigned };
}
