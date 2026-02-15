import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { MechLocation, LOCATION_SLOT_COUNTS } from '@/types/construction';
import {
  EngineType,
  getEngineDefinition,
} from '@/types/construction/EngineType';
import { GyroType, getGyroDefinition } from '@/types/construction/GyroType';

import type { SlotContent } from '../critical-slots';

interface FixedComponent {
  readonly name: string;
  readonly slots: number;
}

const ARM_ACTUATORS: readonly FixedComponent[] = [
  { name: 'Shoulder', slots: 1 },
  { name: 'Upper Arm', slots: 1 },
  { name: 'Lower Arm', slots: 1 },
  { name: 'Hand', slots: 1 },
];

const LEG_ACTUATORS: readonly FixedComponent[] = [
  { name: 'Hip', slots: 1 },
  { name: 'Upper Leg', slots: 1 },
  { name: 'Lower Leg', slots: 1 },
  { name: 'Foot', slots: 1 },
];

type EquipmentSlotPosition = 'first' | 'middle' | 'last' | 'only';

interface FilledSlotData {
  readonly equipment: IMountedEquipmentInstance;
  readonly position: EquipmentSlotPosition;
}

function getEngineSlots(engineType: EngineType): number {
  const def = getEngineDefinition(engineType);
  return def?.ctSlots ?? 6;
}

function getGyroSlots(gyroType: GyroType): number {
  const def = getGyroDefinition(gyroType);
  return def?.criticalSlots ?? 4;
}

function getEngineSideTorsoSlots(engineType: EngineType): number {
  const def = getEngineDefinition(engineType);
  return def?.sideTorsoSlots ?? 0;
}

function createEquipmentSlot(index: number, data: FilledSlotData): SlotContent {
  const { equipment, position } = data;
  return {
    index,
    type: 'equipment',
    name: equipment.name,
    equipmentId: equipment.instanceId,
    isFirstSlot: position === 'first' || position === 'only',
    isLastSlot: position === 'last' || position === 'only',
    totalSlots: equipment.criticalSlots,
    isRemovable: equipment.isRemovable,
    isOmniPodMounted: equipment.isOmniPodMounted,
  };
}

export function buildLocationSlots(
  location: MechLocation,
  engineType: EngineType,
  gyroType: GyroType,
  equipment: readonly IMountedEquipmentInstance[],
): SlotContent[] {
  const slotCount = LOCATION_SLOT_COUNTS[location] || 6;
  const slots: SlotContent[] = [];

  const locationEquipment = equipment.filter((e) => e.location === location);
  const filledSlots = new Map<number, FilledSlotData>();

  for (const eq of locationEquipment) {
    if (eq.slots && eq.slots.length > 0) {
      for (let i = 0; i < eq.slots.length; i++) {
        const slotIdx = eq.slots[i];
        let position: EquipmentSlotPosition = 'only';
        if (eq.slots.length > 1) {
          if (i === 0) position = 'first';
          else if (i === eq.slots.length - 1) position = 'last';
          else position = 'middle';
        }
        filledSlots.set(slotIdx, { equipment: eq, position });
      }
    }
  }

  switch (location) {
    case MechLocation.HEAD:
      slots.push({ index: 0, type: 'system', name: 'Life Support' });
      slots.push({ index: 1, type: 'system', name: 'Sensors' });
      slots.push({ index: 2, type: 'system', name: 'Standard Cockpit' });
      slots.push(
        filledSlots.has(3)
          ? createEquipmentSlot(3, filledSlots.get(3)!)
          : { index: 3, type: 'empty' },
      );
      slots.push({ index: 4, type: 'system', name: 'Sensors' });
      slots.push({ index: 5, type: 'system', name: 'Life Support' });
      break;

    case MechLocation.CENTER_TORSO: {
      const engineSlots = getEngineSlots(engineType);
      for (let i = 0; i < Math.min(3, engineSlots); i++) {
        slots.push({ index: i, type: 'system', name: 'Engine' });
      }
      const gyroSlots = getGyroSlots(gyroType);
      for (let i = 0; i < gyroSlots; i++) {
        slots.push({ index: 3 + i, type: 'system', name: 'Standard Gyro' });
      }
      for (let i = 3; i < engineSlots; i++) {
        slots.push({
          index: 3 + gyroSlots + (i - 3),
          type: 'system',
          name: 'Engine',
        });
      }
      const ctUsed = engineSlots + gyroSlots;
      for (let i = ctUsed; i < slotCount; i++) {
        if (filledSlots.has(i)) {
          slots.push(createEquipmentSlot(i, filledSlots.get(i)!));
        } else {
          slots.push({ index: i, type: 'empty' });
        }
      }
      break;
    }

    case MechLocation.LEFT_TORSO:
    case MechLocation.RIGHT_TORSO: {
      const sideTorsoSlots = getEngineSideTorsoSlots(engineType);
      for (let i = 0; i < sideTorsoSlots; i++) {
        slots.push({ index: i, type: 'system', name: 'Engine' });
      }

      for (let i = sideTorsoSlots; i < slotCount; i++) {
        if (filledSlots.has(i)) {
          slots.push(createEquipmentSlot(i, filledSlots.get(i)!));
        } else {
          slots.push({ index: i, type: 'empty' });
        }
      }
      break;
    }

    case MechLocation.LEFT_ARM:
    case MechLocation.RIGHT_ARM:
      for (let i = 0; i < ARM_ACTUATORS.length; i++) {
        slots.push({ index: i, type: 'system', name: ARM_ACTUATORS[i].name });
      }
      for (let i = ARM_ACTUATORS.length; i < slotCount; i++) {
        if (filledSlots.has(i)) {
          slots.push(createEquipmentSlot(i, filledSlots.get(i)!));
        } else {
          slots.push({ index: i, type: 'empty' });
        }
      }
      break;

    case MechLocation.LEFT_LEG:
    case MechLocation.RIGHT_LEG:
      for (let i = 0; i < LEG_ACTUATORS.length; i++) {
        slots.push({ index: i, type: 'system', name: LEG_ACTUATORS[i].name });
      }
      for (let i = LEG_ACTUATORS.length; i < slotCount; i++) {
        if (filledSlots.has(i)) {
          slots.push(createEquipmentSlot(i, filledSlots.get(i)!));
        } else {
          slots.push({ index: i, type: 'empty' });
        }
      }
      break;

    default:
      for (let i = 0; i < slotCount; i++) {
        slots.push({ index: i, type: 'empty' });
      }
  }

  return slots;
}
