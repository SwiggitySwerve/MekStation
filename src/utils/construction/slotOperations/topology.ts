import { MechLocation } from '@/types/construction';
import {
  EngineType,
  getEngineDefinition,
} from '@/types/construction/EngineType';
import { GyroType, getGyroDefinition } from '@/types/construction/GyroType';

export type ArmActuatorConfig = Readonly<
  Partial<
    Record<
      MechLocation.LEFT_ARM | MechLocation.RIGHT_ARM,
      { readonly lowerArm: boolean; readonly hand: boolean }
    >
  >
>;

/** Fixed occupancy shared by the critical grid, placement and validation. */
export function getFixedSlotNames(
  location: MechLocation,
  engineType: EngineType,
  gyroType: GyroType,
  armActuators?: ArmActuatorConfig,
): ReadonlyMap<number, string> {
  const slots = new Map<number, string>();
  const put = (index: number, name: string): void => {
    slots.set(index, name);
  };
  switch (location) {
    case MechLocation.HEAD:
      put(0, 'Life Support');
      put(1, 'Sensors');
      put(2, 'Standard Cockpit');
      put(4, 'Sensors');
      put(5, 'Life Support');
      break;
    case MechLocation.CENTER_TORSO: {
      const engine = getEngineDefinition(engineType)?.ctSlots ?? 6;
      const gyro = getGyroDefinition(gyroType)?.criticalSlots ?? 4;
      for (let i = 0; i < Math.min(3, engine); i++) put(i, 'Engine');
      for (let i = 0; i < gyro; i++)
        put(3 + i, getGyroDefinition(gyroType)?.name ?? 'Gyro');
      for (let i = 3; i < engine; i++) put(gyro + i, 'Engine');
      break;
    }
    case MechLocation.LEFT_TORSO:
    case MechLocation.RIGHT_TORSO:
      for (
        let i = 0;
        i < (getEngineDefinition(engineType)?.sideTorsoSlots ?? 0);
        i++
      )
        put(i, 'Engine');
      break;
    case MechLocation.LEFT_ARM:
    case MechLocation.RIGHT_ARM:
      put(0, 'Shoulder');
      put(1, 'Upper Arm');
      if (armActuators?.[location]?.lowerArm ?? true) put(2, 'Lower Arm');
      if (armActuators?.[location]?.hand ?? true) put(3, 'Hand');
      break;
    case MechLocation.LEFT_LEG:
    case MechLocation.RIGHT_LEG:
    case MechLocation.CENTER_LEG:
    case MechLocation.FRONT_LEFT_LEG:
    case MechLocation.FRONT_RIGHT_LEG:
    case MechLocation.REAR_LEFT_LEG:
    case MechLocation.REAR_RIGHT_LEG:
      ['Hip', 'Upper Leg', 'Lower Leg', 'Foot'].forEach((name, index) =>
        put(index, name),
      );
      break;
  }
  return slots;
}

export function findContiguousSlotStarts(
  emptySlots: readonly number[],
  slotsNeeded: number,
): number[] {
  if (!Number.isInteger(slotsNeeded) || slotsNeeded <= 0) return [];
  const free = new Set(emptySlots);
  return emptySlots.filter((start) =>
    Array.from({ length: slotsNeeded }, (_, offset) => start + offset).every(
      (index) => free.has(index),
    ),
  );
}
