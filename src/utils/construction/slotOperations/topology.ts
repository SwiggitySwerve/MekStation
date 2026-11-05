import { MechLocation } from '@/types/construction';
import { getCockpitSystemSlots } from '@/types/construction/CockpitType';
import {
  EngineType,
  getEngineDefinition,
} from '@/types/construction/EngineType';
import { GyroType, getGyroDefinition } from '@/types/construction/GyroType';
import { getEquipmentCritEntries } from '@/utils/construction/constructionRules/tonnage';

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
  cockpitType?: string,
): ReadonlyMap<number, string> {
  const slots = new Map<number, string>();
  const cockpit = getCockpitSystemSlots(cockpitType);
  const superheavy = gyroType === GyroType.SUPERHEAVY;
  const put = (index: number, name: string): void => {
    slots.set(index, name);
  };
  switch (location) {
    case MechLocation.HEAD:
      return cockpit.head;
    case MechLocation.CENTER_TORSO: {
      const engine = getEquipmentCritEntries(
        getEngineDefinition(engineType)?.ctSlots ?? 6,
        superheavy,
      );
      const gyro = getEquipmentCritEntries(
        getGyroDefinition(gyroType)?.criticalSlots ?? 4,
        superheavy,
      );
      for (let i = 0; i < Math.min(3, engine); i++) put(i, 'Engine');
      for (let i = 0; i < gyro; i++)
        put(3 + i, getGyroDefinition(gyroType)?.name ?? 'Gyro');
      for (let i = 3; i < engine; i++) put(gyro + i, 'Engine');
      // Mek.java:5810-5820: getFirstEmptyCrit after engine and gyro.
      for (const name of cockpit.centerTorso) {
        let index = 0;
        while (slots.has(index)) index++;
        put(index, name);
      }
      break;
    }
    case MechLocation.LEFT_TORSO:
    case MechLocation.RIGHT_TORSO:
      cockpit.sideTorso.forEach((name, index) => put(index, name));
      for (
        let i = 0;
        i <
        getEquipmentCritEntries(
          getEngineDefinition(engineType)?.sideTorsoSlots ?? 0,
          superheavy,
        );
        i++
      )
        put(cockpit.sideTorso.length + i, 'Engine');
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
