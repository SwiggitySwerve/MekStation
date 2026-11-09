import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { MechLocation } from '@/types/construction';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import { isValidLocationForEquipment } from '@/types/equipment/EquipmentPlacement';
import { canChangeEquipmentMount } from '@/utils/construction/equipmentMutationPolicy';

import type { SlotAssignment } from './types';

import { findEquipmentSlotAssignment } from './splitAllocation';

export interface IEquipmentPlacementOption {
  readonly location: MechLocation;
  readonly start?: number;
  readonly availableSlots: number;
  readonly canFit: boolean;
  readonly reason?: string;
  readonly assignment?: SlotAssignment;
}

/** Shared by Critical Slots and the catalog's placement preview/confirmation. */
export function getEquipmentPlacementOption(
  equipment: IMountedEquipmentInstance,
  location: MechLocation,
  freeSlots: readonly number[],
  isOmni: boolean,
  readOnly: boolean,
  freeByLocation: ReadonlyMap<MechLocation, readonly number[]> = new Map([
    [location, freeSlots],
  ]),
  configuration?: MechConfiguration,
): IEquipmentPlacementOption {
  const assignment = findEquipmentSlotAssignment(
    equipment,
    location,
    freeByLocation,
    configuration,
  );
  const start = assignment?.slots[0];
  const reason = readOnly
    ? 'Read-only unit'
    : !canChangeEquipmentMount(isOmni, equipment)
      ? 'Fixed OmniMech equipment'
      : !isValidLocationForEquipment(equipment.equipmentId, location)
        ? 'Restricted location'
        : !assignment
          ? 'No contiguous space'
          : undefined;
  return {
    location,
    start,
    availableSlots: freeSlots.length,
    canFit: !reason,
    reason,
    assignment: reason ? undefined : assignment,
  };
}
