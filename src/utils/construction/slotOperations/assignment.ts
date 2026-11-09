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

import { getSlotParts } from './parts';
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
  cockpitType?: string,
): SlotOperationResult {
  const totalSlots = getLocationSlotCount(location, configuration);
  const fixedSlots = getFixedSlotIndices(
    location,
    engineType,
    gyroType,
    armActuators,
    cockpitType,
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
  cockpitType?: string,
): SlotOperationResult {
  const assignments: SlotAssignment[] = [];
  const unassigned: string[] = [];

  for (const location of getLocationsForConfig(configuration)) {
    const locationEquipment = equipment
      .flatMap((item) =>
        getSlotParts(item)
          .filter((part) => part.location === location && part.slots.length > 0)
          .map((part) => ({
            ...item,
            ...part,
            criticalSlots:
              item.splitSlots || item.spreadSlots
                ? part.slots.length
                : item.criticalSlots,
          })),
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
      cockpitType,
    );
    assignments.push(...result.assignments);
    unassigned.push(...result.unassigned);
  }

  const byPart = new Map(
    assignments.map((part) => [`${part.instanceId}:${part.location}`, part]),
  );
  const mounted = new Map(equipment.map((item) => [item.instanceId, item]));
  // A failed secondary portion must not leave neighbors compacted into the
  // preserved primary portion. Keep the entire operation atomic in that case.
  if (
    unassigned.some(
      (id) => mounted.get(id)?.splitSlots || mounted.get(id)?.spreadSlots,
    )
  )
    return { assignments: [], unassigned: [...new Set(unassigned)] };
  const complete = assignments.flatMap((primary) => {
    const item = mounted.get(primary.instanceId);
    if (
      !item ||
      primary.location !== item.location ||
      unassigned.includes(item.instanceId)
    )
      return [];
    const movePart = (
      part: NonNullable<IMountedEquipmentInstance['splitSlots']>,
    ) => ({
      location: part.location,
      slots:
        byPart.get(`${item.instanceId}:${part.location}`)?.slots ?? part.slots,
    });
    return [
      {
        ...primary,
        ...(item.splitSlots ? { splitSlots: movePart(item.splitSlots) } : {}),
        ...(item.spreadSlots
          ? { spreadSlots: item.spreadSlots.map(movePart) }
          : {}),
      },
    ];
  });
  return { assignments: complete, unassigned: [...new Set(unassigned)] };
}

export function compactEquipmentSlots(
  equipment: readonly IMountedEquipmentInstance[],
  engineType: EngineType,
  gyroType: GyroType,
  configuration: MechConfiguration = MechConfiguration.BIPED,
  isOmni = false,
  armActuators?: ArmActuatorConfig,
  cockpitType?: string,
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
    cockpitType,
  );
}

export function sortEquipmentBySize(
  equipment: readonly IMountedEquipmentInstance[],
  engineType: EngineType,
  gyroType: GyroType,
  configuration: MechConfiguration = MechConfiguration.BIPED,
  isOmni = false,
  armActuators?: ArmActuatorConfig,
  cockpitType?: string,
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
    cockpitType,
  );
}
