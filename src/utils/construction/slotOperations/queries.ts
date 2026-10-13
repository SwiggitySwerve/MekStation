import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import {
  MechLocation,
  LOCATION_SLOT_COUNTS,
} from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { getFixedSlotNames, type ArmActuatorConfig } from './topology';

const SLOTTED_STRUCTURE_TYPES: readonly InternalStructureType[] = [
  InternalStructureType.ENDO_STEEL_IS,
  InternalStructureType.ENDO_STEEL_CLAN,
  InternalStructureType.ENDO_COMPOSITE,
];

const SLOTTED_ARMOR_TYPES: readonly ArmorTypeEnum[] = [
  ArmorTypeEnum.FERRO_FIBROUS_IS,
  ArmorTypeEnum.FERRO_FIBROUS_CLAN,
  ArmorTypeEnum.LIGHT_FERRO,
  ArmorTypeEnum.HEAVY_FERRO,
  ArmorTypeEnum.STEALTH,
  ArmorTypeEnum.REACTIVE,
  ArmorTypeEnum.REFLECTIVE,
];

export function getFixedSlotIndices(
  location: MechLocation,
  engineType: EngineType,
  gyroType: GyroType,
  armActuators?: ArmActuatorConfig,
): Set<number> {
  return new Set(
    getFixedSlotNames(location, engineType, gyroType, armActuators).keys(),
  );
}

export function getAvailableSlotIndices(
  location: MechLocation,
  engineType: EngineType,
  gyroType: GyroType,
  equipment: readonly IMountedEquipmentInstance[],
  armActuators?: ArmActuatorConfig,
): number[] {
  const totalSlots = LOCATION_SLOT_COUNTS[location] || 0;
  const fixedSlots = getFixedSlotIndices(
    location,
    engineType,
    gyroType,
    armActuators,
  );

  const usedSlots = new Set<number>();
  for (const eq of equipment) {
    if (eq.location === location && eq.slots) {
      for (const slot of eq.slots) {
        usedSlots.add(slot);
      }
    }
  }

  const available: number[] = [];
  for (let i = 0; i < totalSlots; i++) {
    if (!fixedSlots.has(i) && !usedSlots.has(i)) {
      available.push(i);
    }
  }

  return available;
}

export function isUnhittableEquipment(
  equipment: IMountedEquipmentInstance,
): boolean {
  const name = equipment.name.toLowerCase();

  for (const structType of SLOTTED_STRUCTURE_TYPES) {
    if (
      name.includes(structType.toLowerCase()) ||
      equipment.equipmentId.includes('endo')
    ) {
      return true;
    }
  }

  for (const armorType of SLOTTED_ARMOR_TYPES) {
    if (
      name.includes(armorType.toLowerCase()) ||
      equipment.equipmentId.includes('ferro') ||
      equipment.equipmentId.includes('stealth') ||
      equipment.equipmentId.includes('reactive') ||
      equipment.equipmentId.includes('reflective')
    ) {
      return true;
    }
  }

  return false;
}
