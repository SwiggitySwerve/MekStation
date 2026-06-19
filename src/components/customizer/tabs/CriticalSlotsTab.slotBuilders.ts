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

function getEquipmentSlotPosition(
  slotIndex: number,
  totalSlots: number,
): EquipmentSlotPosition {
  if (totalSlots === 1) return 'only';
  if (slotIndex === 0) return 'first';
  if (slotIndex === totalSlots - 1) return 'last';
  return 'middle';
}

function collectFilledSlots(
  equipment: readonly IMountedEquipmentInstance[],
  location: MechLocation,
): Map<number, FilledSlotData> {
  const filledSlots = new Map<number, FilledSlotData>();
  const locationEquipment = equipment.filter(
    (item) => item.location === location,
  );

  for (const item of locationEquipment) {
    const slotIds = item.slots;
    if (!slotIds?.length) continue;

    slotIds.forEach((slotIdx, index) => {
      filledSlots.set(slotIdx, {
        equipment: item,
        position: getEquipmentSlotPosition(index, slotIds.length),
      });
    });
  }

  return filledSlots;
}

function slotForIndex(
  index: number,
  filledSlots: ReadonlyMap<number, FilledSlotData>,
): SlotContent {
  const filledSlot = filledSlots.get(index);
  return filledSlot
    ? createEquipmentSlot(index, filledSlot)
    : { index, type: 'empty' };
}

function appendFillableSlots(
  slots: SlotContent[],
  startIndex: number,
  slotCount: number,
  filledSlots: ReadonlyMap<number, FilledSlotData>,
): void {
  for (let index = startIndex; index < slotCount; index++) {
    slots.push(slotForIndex(index, filledSlots));
  }
}

function appendFixedComponents(
  slots: SlotContent[],
  components: readonly FixedComponent[],
): void {
  components.forEach((component, index) => {
    slots.push({ index, type: 'system', name: component.name });
  });
}

function buildHeadSlots(
  filledSlots: ReadonlyMap<number, FilledSlotData>,
): SlotContent[] {
  return [
    { index: 0, type: 'system', name: 'Life Support' },
    { index: 1, type: 'system', name: 'Sensors' },
    { index: 2, type: 'system', name: 'Standard Cockpit' },
    slotForIndex(3, filledSlots),
    { index: 4, type: 'system', name: 'Sensors' },
    { index: 5, type: 'system', name: 'Life Support' },
  ];
}

function buildCenterTorsoSlots(
  slotCount: number,
  engineType: EngineType,
  gyroType: GyroType,
  filledSlots: ReadonlyMap<number, FilledSlotData>,
): SlotContent[] {
  const slots: SlotContent[] = [];
  const engineSlots = getEngineSlots(engineType);
  const gyroSlots = getGyroSlots(gyroType);

  for (let index = 0; index < Math.min(3, engineSlots); index++) {
    slots.push({ index, type: 'system', name: 'Engine' });
  }
  for (let index = 0; index < gyroSlots; index++) {
    slots.push({ index: 3 + index, type: 'system', name: 'Standard Gyro' });
  }
  for (let index = 3; index < engineSlots; index++) {
    slots.push({
      index: 3 + gyroSlots + (index - 3),
      type: 'system',
      name: 'Engine',
    });
  }

  appendFillableSlots(slots, engineSlots + gyroSlots, slotCount, filledSlots);
  return slots;
}

function buildSideTorsoSlots(
  slotCount: number,
  engineType: EngineType,
  filledSlots: ReadonlyMap<number, FilledSlotData>,
): SlotContent[] {
  const slots: SlotContent[] = [];
  const sideTorsoSlots = getEngineSideTorsoSlots(engineType);

  for (let index = 0; index < sideTorsoSlots; index++) {
    slots.push({ index, type: 'system', name: 'Engine' });
  }

  appendFillableSlots(slots, sideTorsoSlots, slotCount, filledSlots);
  return slots;
}

function buildActuatorSlots(
  slotCount: number,
  components: readonly FixedComponent[],
  filledSlots: ReadonlyMap<number, FilledSlotData>,
): SlotContent[] {
  const slots: SlotContent[] = [];
  appendFixedComponents(slots, components);
  appendFillableSlots(slots, components.length, slotCount, filledSlots);
  return slots;
}

function buildEmptySlots(slotCount: number): SlotContent[] {
  return Array.from({ length: slotCount }, (_, index) => ({
    index,
    type: 'empty' as const,
  }));
}

interface LocationSlotBuilderArgs {
  readonly slotCount: number;
  readonly engineType: EngineType;
  readonly gyroType: GyroType;
  readonly filledSlots: ReadonlyMap<number, FilledSlotData>;
}

type LocationSlotBuilder = (args: LocationSlotBuilderArgs) => SlotContent[];

const LOCATION_SLOT_BUILDERS: Partial<
  Record<MechLocation, LocationSlotBuilder>
> = {
  [MechLocation.HEAD]: ({ filledSlots }) => buildHeadSlots(filledSlots),
  [MechLocation.CENTER_TORSO]: ({
    slotCount,
    engineType,
    gyroType,
    filledSlots,
  }) => buildCenterTorsoSlots(slotCount, engineType, gyroType, filledSlots),
  [MechLocation.LEFT_TORSO]: ({ slotCount, engineType, filledSlots }) =>
    buildSideTorsoSlots(slotCount, engineType, filledSlots),
  [MechLocation.RIGHT_TORSO]: ({ slotCount, engineType, filledSlots }) =>
    buildSideTorsoSlots(slotCount, engineType, filledSlots),
  [MechLocation.LEFT_ARM]: ({ slotCount, filledSlots }) =>
    buildActuatorSlots(slotCount, ARM_ACTUATORS, filledSlots),
  [MechLocation.RIGHT_ARM]: ({ slotCount, filledSlots }) =>
    buildActuatorSlots(slotCount, ARM_ACTUATORS, filledSlots),
  [MechLocation.LEFT_LEG]: ({ slotCount, filledSlots }) =>
    buildActuatorSlots(slotCount, LEG_ACTUATORS, filledSlots),
  [MechLocation.RIGHT_LEG]: ({ slotCount, filledSlots }) =>
    buildActuatorSlots(slotCount, LEG_ACTUATORS, filledSlots),
};

export function buildLocationSlots(
  location: MechLocation,
  engineType: EngineType,
  gyroType: GyroType,
  equipment: readonly IMountedEquipmentInstance[],
): SlotContent[] {
  const slotCount = LOCATION_SLOT_COUNTS[location] || 6;
  const filledSlots = collectFilledSlots(equipment, location);
  const builder = LOCATION_SLOT_BUILDERS[location];

  return builder
    ? builder({ slotCount, engineType, gyroType, filledSlots })
    : buildEmptySlots(slotCount);
}
