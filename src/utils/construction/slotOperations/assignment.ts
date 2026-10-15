import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import {
  getLocationsForConfig,
  getLocationSlotCount,
  MechConfiguration,
} from '@/types/construction/MechConfigurationSystem';
import { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';
import { isFixedOmniEquipment } from '@/utils/construction/equipmentMutationPolicy';

import { getFixedSlotIndices } from './queries';
import { findContiguousSlotStarts, type ArmActuatorConfig } from './topology';
import { SlotAssignment, SlotOperationResult } from './types';

type EquipmentComparator = (
  a: IMountedEquipmentInstance,
  b: IMountedEquipmentInstance,
) => number;

function createLocationAssignments(
  location: MechLocation,
  locationEquipment: readonly IMountedEquipmentInstance[],
  engineType: EngineType,
  gyroType: GyroType,
  configuration: MechConfiguration,
  isOmni: boolean,
  armActuators?: ArmActuatorConfig,
): SlotOperationResult {
  const totalSlots = getLocationSlotCount(location, configuration);
  const fixedSlots = getFixedSlotIndices(
    location,
    engineType,
    gyroType,
    armActuators,
  );
  for (const item of locationEquipment) {
    if (isFixedOmniEquipment(isOmni, item)) {
      for (const slot of item.slots ?? []) fixedSlots.add(slot);
    }
  }
  let emptySlots = Array.from(
    { length: totalSlots },
    (_, index) => index,
  ).filter((index) => !fixedSlots.has(index));
  const assignments: SlotAssignment[] = [];

  for (const item of locationEquipment) {
    if (isFixedOmniEquipment(isOmni, item)) continue;
    if (item.criticalSlots === 0) {
      assignments.push({ instanceId: item.instanceId, location, slots: [] });
      continue;
    }

    const start = findContiguousSlotStarts(emptySlots, item.criticalSlots)[0];
    if (start === undefined) {
      return {
        assignments: [],
        unassigned: locationEquipment
          .filter((item) => !isFixedOmniEquipment(isOmni, item))
          .map((candidate) => candidate.instanceId),
      };
    }

    const slots = Array.from(
      { length: item.criticalSlots },
      (_, offset) => start + offset,
    );
    const occupied = new Set(slots);
    emptySlots = emptySlots.filter((index) => !occupied.has(index));
    assignments.push({ instanceId: item.instanceId, location, slots });
  }

  return { assignments, unassigned: [] };
}

function organizeEquipment(
  equipment: readonly IMountedEquipmentInstance[],
  engineType: EngineType,
  gyroType: GyroType,
  configuration: MechConfiguration,
  comparator: EquipmentComparator,
  isOmni: boolean,
  armActuators?: ArmActuatorConfig,
): SlotOperationResult {
  const assignments: SlotAssignment[] = [];
  const unassigned: string[] = [];

  for (const location of getLocationsForConfig(configuration)) {
    const locationEquipment = equipment
      .filter(
        (item) =>
          item.location === location && item.slots && item.slots.length > 0,
      )
      .sort(comparator);
    if (locationEquipment.length === 0) continue;

    const result = createLocationAssignments(
      location,
      locationEquipment,
      engineType,
      gyroType,
      configuration,
      isOmni,
      armActuators,
    );
    assignments.push(...result.assignments);
    unassigned.push(...result.unassigned);
  }

  return { assignments, unassigned };
}

export function compactEquipmentSlots(
  equipment: readonly IMountedEquipmentInstance[],
  engineType: EngineType,
  gyroType: GyroType,
  configuration: MechConfiguration = MechConfiguration.BIPED,
  isOmni = false,
  armActuators?: ArmActuatorConfig,
): SlotOperationResult {
  return organizeEquipment(
    equipment,
    engineType,
    gyroType,
    configuration,
    (a, b) => {
      const aMin = Math.min(...(a.slots || [Infinity]));
      const bMin = Math.min(...(b.slots || [Infinity]));
      return aMin - bMin;
    },
    isOmni,
    armActuators,
  );
}

export function sortEquipmentBySize(
  equipment: readonly IMountedEquipmentInstance[],
  engineType: EngineType,
  gyroType: GyroType,
  configuration: MechConfiguration = MechConfiguration.BIPED,
  isOmni = false,
  armActuators?: ArmActuatorConfig,
): SlotOperationResult {
  return organizeEquipment(
    equipment,
    engineType,
    gyroType,
    configuration,
    (a, b) => {
      if (b.criticalSlots !== a.criticalSlots) {
        return b.criticalSlots - a.criticalSlots;
      }
      return a.name.localeCompare(b.name);
    },
    isOmni,
    armActuators,
  );
}
