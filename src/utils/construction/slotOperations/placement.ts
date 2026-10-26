import { LOCATION_SLOT_COUNTS, MechLocation } from '@/types/construction';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import {
  MechConfiguration,
  getLocationsForConfig,
} from '@/types/construction/MechConfigurationSystem';
import { isValidLocationForEquipment } from '@/types/equipment/EquipmentPlacement';
import { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';
import {
  ICriticalSlotIssue,
  UnitValidationSeverity,
} from '@/types/validation/UnitValidationInterfaces';

import type { ArmActuatorConfig } from './topology';

import { getFixedSlotIndices } from './queries';

export function hasAssignedCriticalSlots(
  item: IMountedEquipmentInstance,
): boolean {
  if (!item.location) return false;
  if (item.criticalSlots === 0) return true;
  const slots = item.slots ?? [];
  return (
    slots.length === item.criticalSlots &&
    new Set(slots).size === slots.length &&
    slots.every(
      (index) =>
        Number.isInteger(index) &&
        index >= 0 &&
        index < (LOCATION_SLOT_COUNTS[item.location as MechLocation] ?? 0),
    )
  );
}

/**
 * How much of the mounted equipment's slot demand is actually placed in
 * critical slots. Items without a complete slot assignment (see
 * `hasAssignedCriticalSlots`) count as pending: they reserve capacity in the
 * slot budget but do not occupy a slot on the unit yet.
 */
export interface ISlotPlacementSummary {
  /** Slots held by equipment that has a complete slot assignment. */
  readonly placedSlots: number;
  /** Slots the unplaced equipment will need once placed. */
  readonly pendingSlots: number;
  /** Number of mounted items still waiting for a slot assignment. */
  readonly unplacedItems: number;
}

export function getSlotPlacementSummary(
  equipment: readonly IMountedEquipmentInstance[],
): ISlotPlacementSummary {
  let placedSlots = 0;
  let pendingSlots = 0;
  let unplacedItems = 0;
  for (const item of equipment) {
    if (hasAssignedCriticalSlots(item)) {
      placedSlots += item.criticalSlots;
    } else {
      pendingSlots += item.criticalSlots;
      unplacedItems += 1;
    }
  }
  return { placedSlots, pendingSlots, unplacedItems };
}

export function getEquipmentSlotIssues(
  equipment: readonly IMountedEquipmentInstance[],
  configuration: MechConfiguration,
  engineType: EngineType,
  gyroType: GyroType,
  armActuators?: ArmActuatorConfig,
): ICriticalSlotIssue[] {
  const issues: ICriticalSlotIssue[] = [];
  const locations = getLocationsForConfig(configuration);
  const occupants = new Map<string, IMountedEquipmentInstance>();
  const add = (item: IMountedEquipmentInstance, message: string): void => {
    if (
      !issues.some(
        (issue) =>
          issue.instanceId === item.instanceId && issue.message === message,
      )
    )
      issues.push({
        instanceId: item.instanceId,
        location: item.location,
        message,
        severity: UnitValidationSeverity.ERROR,
      });
  };
  for (const item of equipment) {
    if (!item.location) {
      add(item, `${item.name} needs a location.`);
      continue;
    }
    const location = item.location as MechLocation;
    if (!locations.includes(location)) {
      add(
        item,
        `${item.name} is assigned to ${location}, which is not part of this configuration.`,
      );
      continue;
    }
    if (!isValidLocationForEquipment(item.equipmentId, location))
      add(item, `${item.name} cannot be placed in ${location}.`);
    if (!hasAssignedCriticalSlots(item))
      add(
        item,
        `${item.name} in ${location} needs ${item.criticalSlots} distinct critical slots.`,
      );
    const fixed = getFixedSlotIndices(
      location,
      engineType,
      gyroType,
      armActuators,
    );
    const slots = item.slots ?? [];
    for (const index of slots) {
      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= LOCATION_SLOT_COUNTS[location]
      )
        add(item, `${item.name} has an invalid slot in ${location}.`);
      if (fixed.has(index))
        add(
          item,
          `${item.name} overlaps a fixed system in ${location}, slot ${index + 1}.`,
        );
      const key = `${location}:${index}`;
      const other = occupants.get(key);
      if (other && other.instanceId !== item.instanceId) {
        const message = `${item.name} and ${other.name} overlap in ${location}, slot ${index + 1}.`;
        add(item, message);
        add(other, message);
      } else occupants.set(key, item);
    }
    const sorted = [...slots].sort((a, b) => a - b);
    if (sorted.some((index, i) => i > 0 && index !== sorted[i - 1] + 1))
      add(item, `${item.name} needs contiguous slots in ${location}.`);
  }
  return issues;
}
