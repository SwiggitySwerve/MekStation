import type { IArmorAllocation } from '@/types/construction/ArmorAllocation';
import type { LocationArmorData } from '@/types/construction/LocationArmorData';

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import {
  MechConfiguration,
  getLocationsForConfig,
  hasRearArmor,
} from '@/types/construction/MechConfigurationSystem';
import { getMaxArmorForLocation } from '@/utils/construction/armorCalculations';

function getRearValue(
  armorAllocation: IArmorAllocation,
  location: MechLocation,
): number | undefined {
  if (!hasRearArmor(location)) return undefined;
  switch (location) {
    case MechLocation.CENTER_TORSO:
      return armorAllocation.centerTorsoRear;
    case MechLocation.LEFT_TORSO:
      return armorAllocation.leftTorsoRear;
    case MechLocation.RIGHT_TORSO:
      return armorAllocation.rightTorsoRear;
    default:
      return undefined;
  }
}

export function buildArmorData(
  tonnage: number,
  configuration: MechConfiguration,
  armorAllocation: IArmorAllocation,
): LocationArmorData[] {
  const locations = getLocationsForConfig(configuration);

  return locations.map((location) => {
    const maxArmor = getMaxArmorForLocation(tonnage, location);
    const hasRear = hasRearArmor(location);
    const rear = getRearValue(armorAllocation, location);

    return {
      location,
      current: armorAllocation[location] ?? 0,
      maximum: maxArmor,
      ...(hasRear && rear !== undefined
        ? {
            rear,
            rearMaximum: maxArmor - (armorAllocation[location] ?? 0),
          }
        : {}),
    };
  });
}

export function calculatePointsDelta(
  unallocatedPoints: number,
  maxTotalArmor: number,
  allocatedPoints: number,
): number {
  return unallocatedPoints < 0
    ? unallocatedPoints
    : Math.min(unallocatedPoints, maxTotalArmor - allocatedPoints);
}
