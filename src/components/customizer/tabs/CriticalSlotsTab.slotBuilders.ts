import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { MechLocation, LOCATION_SLOT_COUNTS } from '@/types/construction';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import {
  getFixedSlotNames,
  type ArmActuatorConfig,
} from '@/utils/construction/slotOperations/topology';

import type { SlotContent } from '../critical-slots';

export function buildLocationSlots(
  location: MechLocation,
  engineType: EngineType,
  gyroType: GyroType,
  equipment: readonly IMountedEquipmentInstance[],
  armActuators?: ArmActuatorConfig,
): SlotContent[] {
  const fixed = getFixedSlotNames(location, engineType, gyroType, armActuators);
  const filled = new Map<number, SlotContent>();
  for (const item of equipment) {
    if (item.location !== location) continue;
    item.slots?.forEach((index, offset) =>
      filled.set(index, {
        index,
        type: 'equipment',
        name: item.name,
        equipmentId: item.instanceId,
        isFirstSlot: offset === 0,
        isLastSlot: offset === item.slots!.length - 1,
        totalSlots: item.criticalSlots,
        isRemovable: item.isRemovable,
        isOmniPodMounted: item.isOmniPodMounted,
      }),
    );
  }
  return Array.from(
    { length: LOCATION_SLOT_COUNTS[location] || 6 },
    (_, index) => {
      const name = fixed.get(index);
      return name
        ? { index, type: 'system', name }
        : (filled.get(index) ?? { index, type: 'empty' });
    },
  );
}
