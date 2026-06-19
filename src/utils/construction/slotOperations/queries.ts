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
import { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

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

type FixedSlotCollector = (
  fixed: Set<number>,
  engineType: EngineType,
  gyroType: GyroType,
) => void;

const FIXED_SLOT_COLLECTORS: Partial<Record<MechLocation, FixedSlotCollector>> =
  {
    [MechLocation.HEAD]: collectHeadFixedSlots,
    [MechLocation.CENTER_TORSO]: collectCenterTorsoFixedSlots,
    [MechLocation.LEFT_ARM]: collectArmFixedSlots,
    [MechLocation.RIGHT_ARM]: collectArmFixedSlots,
    [MechLocation.LEFT_LEG]: collectLegFixedSlots,
    [MechLocation.RIGHT_LEG]: collectLegFixedSlots,
    [MechLocation.LEFT_TORSO]: collectSideTorsoFixedSlots,
    [MechLocation.RIGHT_TORSO]: collectSideTorsoFixedSlots,
  };

function addSlots(fixed: Set<number>, slots: readonly number[]): void {
  for (const slot of slots) {
    fixed.add(slot);
  }
}

function collectHeadFixedSlots(fixed: Set<number>): void {
  addSlots(fixed, [0, 1, 2, 4, 5]);
}

function collectCenterTorsoFixedSlots(
  fixed: Set<number>,
  engineType: EngineType,
  gyroType: GyroType,
): void {
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
}

function collectArmFixedSlots(fixed: Set<number>): void {
  addSlots(fixed, [0, 1, 2, 3]);
}

function collectLegFixedSlots(fixed: Set<number>): void {
  addSlots(fixed, [0, 1, 2, 3]);
}

function collectSideTorsoFixedSlots(
  fixed: Set<number>,
  engineType: EngineType,
): void {
  const engineDef = getEngineDefinition(engineType);
  const sideTorsoSlots = engineDef?.sideTorsoSlots ?? 0;
  for (let i = 0; i < sideTorsoSlots; i++) {
    fixed.add(i);
  }
}

export function getFixedSlotIndices(
  location: MechLocation,
  engineType: EngineType,
  gyroType: GyroType,
): Set<number> {
  const fixed = new Set<number>();
  FIXED_SLOT_COLLECTORS[location]?.(fixed, engineType, gyroType);
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
