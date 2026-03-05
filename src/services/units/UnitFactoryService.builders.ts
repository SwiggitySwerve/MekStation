import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import {
  IMountedEquipment,
  ICriticalSlotAssignment,
  ICriticalSlot,
} from '@/types/unit/BattleMechInterfaces';

import { parseMechLocation } from './EnumParserRegistry';

export function buildEquipmentList(
  equipment: readonly {
    id: string;
    location: string;
    slots?: number[];
    isRearMounted?: boolean;
    linkedAmmo?: string;
  }[],
): readonly IMountedEquipment[] {
  const registry = getEquipmentRegistry();

  return equipment.map((item, index) => ({
    id: `${item.id}-${index}`,
    equipmentId: item.id,
    name: registry.lookup(item.id).equipment?.name || item.id,
    location: parseMechLocation(item.location),
    slots: item.slots || [],
    isRearMounted: item.isRearMounted || false,
    isTurretMounted: false,
    linkedAmmoId: item.linkedAmmo,
  }));
}

function determineSlotContentType(
  item: string,
): 'equipment' | 'actuator' | 'system' | 'structure' | 'armor' {
  const lower = item.toLowerCase();
  if (
    lower.includes('actuator') ||
    lower.includes('shoulder') ||
    lower.includes('hip')
  ) {
    return 'actuator';
  }
  if (
    lower.includes('engine') ||
    lower.includes('gyro') ||
    lower.includes('cockpit') ||
    lower.includes('life support') ||
    lower.includes('sensors')
  ) {
    return 'system';
  }
  return 'equipment';
}

export function buildCriticalSlots(
  slots: Record<string, (string | null)[]>,
): readonly ICriticalSlotAssignment[] {
  const assignments: ICriticalSlotAssignment[] = [];

  for (const [locationStr, slotItems] of Object.entries(slots)) {
    const location = parseMechLocation(locationStr);
    const slotList: ICriticalSlot[] = slotItems.map((item, index) => ({
      index,
      content: item
        ? {
            type: determineSlotContentType(item),
            name: item,
            isHittable: !item.includes('Engine') && !item.includes('Gyro'),
          }
        : null,
      isFixed:
        item !== null &&
        (item.includes('Engine') ||
          item.includes('Gyro') ||
          item.includes('Cockpit') ||
          item.includes('Life Support') ||
          item.includes('Sensors') ||
          item.includes('Actuator') ||
          item.includes('Shoulder') ||
          item.includes('Hip')),
      isDestroyed: false,
    }));

    assignments.push({ location, slots: slotList });
  }

  return assignments;
}
