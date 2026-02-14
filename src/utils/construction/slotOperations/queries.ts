import { IMountedEquipmentInstance } from '@/stores/unitState';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import {
  MechLocation,
  LOCATION_SLOT_COUNTS,
} from '@/types/construction/CriticalSlotAllocation';
import {
  EngineType,
  getEngineDefinition,
} from '@/types/construction/EngineType';
import { GyroType, getGyroDefinition } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';

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
): Set<number> {
  const fixed = new Set<number>();

  switch (location) {
    case MechLocation.HEAD:
      fixed.add(0);
      fixed.add(1);
      fixed.add(2);
      fixed.add(4);
      fixed.add(5);
      break;

    case MechLocation.CENTER_TORSO: {
      const engineDef = getEngineDefinition(engineType);
      const gyroDef = getGyroDefinition(gyroType);
      const engineSlots = engineDef?.ctSlots ?? 6;
      const gyroSlots = gyroDef?.criticalSlots ?? 4;
      for (let i = 0; i < Math.min(3, engineSlots); i++) {
        fixed.add(i);
      }
      for (let i = 0; i < gyroSlots; i++) {
        fixed.add(3 + i);
      }
      for (let i = 3; i < engineSlots; i++) {
        fixed.add(3 + gyroSlots + (i - 3));
      }
      break;
    }

    case MechLocation.LEFT_ARM:
    case MechLocation.RIGHT_ARM:
      fixed.add(0);
      fixed.add(1);
      fixed.add(2);
      fixed.add(3);
      break;

    case MechLocation.LEFT_LEG:
    case MechLocation.RIGHT_LEG:
      fixed.add(0);
      fixed.add(1);
      fixed.add(2);
      fixed.add(3);
      break;

    case MechLocation.LEFT_TORSO:
    case MechLocation.RIGHT_TORSO: {
      const engineDef = getEngineDefinition(engineType);
      const sideTorsoSlots = engineDef?.sideTorsoSlots ?? 0;
      for (let i = 0; i < sideTorsoSlots; i++) {
        fixed.add(i);
      }
      break;
    }
  }

  return fixed;
}

export function getAvailableSlotIndices(
  location: MechLocation,
  engineType: EngineType,
  gyroType: GyroType,
  equipment: readonly IMountedEquipmentInstance[],
): number[] {
  const totalSlots = LOCATION_SLOT_COUNTS[location] || 0;
  const fixedSlots = getFixedSlotIndices(location, engineType, gyroType);

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
