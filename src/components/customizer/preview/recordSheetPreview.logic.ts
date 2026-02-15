import type {
  IArmorAllocation as IEditableArmorAllocation,
  IEditableMech,
} from '@/services/construction/MechBuilderService';
import type { IUnitConfig } from '@/services/printing/recordsheet/types';
import type { IArmorAllocation } from '@/types/construction/ArmorAllocation';
import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { calculationService } from '@/services/construction/CalculationService';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import { logger } from '@/utils/logger';

type CriticalSlotCell = {
  content: string;
  isSystem?: boolean;
  equipmentId?: string;
} | null;

export type PreviewCriticalSlots = Record<string, CriticalSlotCell[]>;

interface PreviewBattleValueAndCostInput {
  readonly name: string;
  readonly chassis: string;
  readonly model: string;
  readonly tonnage: number;
  readonly techBase: string;
  readonly engineType: string;
  readonly engineRating: number;
  readonly walkMP: number;
  readonly internalStructureType: string;
  readonly gyroType: string;
  readonly cockpitType: string;
  readonly armorType: string;
  readonly armorAllocation: IArmorAllocation;
  readonly heatSinkType: string;
  readonly heatSinkCount: number;
  readonly equipment: readonly IMountedEquipmentInstance[];
}

interface BuildPreviewUnitConfigInput {
  readonly name: string;
  readonly chassis: string;
  readonly model: string;
  readonly tonnage: number;
  readonly techBase: string;
  readonly rulesLevel: string;
  readonly year: number;
  readonly configuration: string;
  readonly engineType: string;
  readonly engineRating: number;
  readonly gyroType: string;
  readonly internalStructureType: string;
  readonly armorType: string;
  readonly armorAllocation: IArmorAllocation;
  readonly heatSinkType: string;
  readonly heatSinkCount: number;
  readonly walkMP: number;
  readonly runMP: number;
  readonly jumpMP: number;
  readonly equipment: IUnitConfig['equipment'];
  readonly criticalSlots: PreviewCriticalSlots;
  readonly enhancement: string | null;
  readonly battleValue: number;
  readonly cost: number;
}

function resolveUnitIdentity(
  name: string,
  chassis: string,
  model: string,
): { chassis: string; model: string } {
  return {
    chassis: chassis || name.split(' ')[0] || 'Unknown',
    model: model || name.split(' ').slice(1).join(' ') || 'Custom',
  };
}

function buildArmorAllocationForCalculation(
  armorAllocation: IArmorAllocation,
): IEditableArmorAllocation {
  return {
    head: armorAllocation[MechLocation.HEAD],
    centerTorso: armorAllocation[MechLocation.CENTER_TORSO],
    centerTorsoRear: armorAllocation.centerTorsoRear,
    leftTorso: armorAllocation[MechLocation.LEFT_TORSO],
    leftTorsoRear: armorAllocation.leftTorsoRear,
    rightTorso: armorAllocation[MechLocation.RIGHT_TORSO],
    rightTorsoRear: armorAllocation.rightTorsoRear,
    leftArm: armorAllocation[MechLocation.LEFT_ARM],
    rightArm: armorAllocation[MechLocation.RIGHT_ARM],
    leftLeg: armorAllocation[MechLocation.LEFT_LEG],
    rightLeg: armorAllocation[MechLocation.RIGHT_LEG],
    frontLeftLeg: armorAllocation[MechLocation.FRONT_LEFT_LEG] ?? 0,
    frontRightLeg: armorAllocation[MechLocation.FRONT_RIGHT_LEG] ?? 0,
    rearLeftLeg: armorAllocation[MechLocation.REAR_LEFT_LEG] ?? 0,
    rearRightLeg: armorAllocation[MechLocation.REAR_RIGHT_LEG] ?? 0,
    centerLeg: armorAllocation[MechLocation.CENTER_LEG] ?? 0,
  };
}

function buildArmorAllocationForRecordSheet(
  armorAllocation: IArmorAllocation,
): IUnitConfig['armor']['allocation'] {
  return {
    head: armorAllocation[MechLocation.HEAD],
    centerTorso: armorAllocation[MechLocation.CENTER_TORSO],
    centerTorsoRear: armorAllocation.centerTorsoRear,
    leftTorso: armorAllocation[MechLocation.LEFT_TORSO],
    leftTorsoRear: armorAllocation.leftTorsoRear,
    rightTorso: armorAllocation[MechLocation.RIGHT_TORSO],
    rightTorsoRear: armorAllocation.rightTorsoRear,
    leftArm: armorAllocation[MechLocation.LEFT_ARM],
    rightArm: armorAllocation[MechLocation.RIGHT_ARM],
    leftLeg: armorAllocation[MechLocation.LEFT_LEG],
    rightLeg: armorAllocation[MechLocation.RIGHT_LEG],
    frontLeftLeg: armorAllocation[MechLocation.FRONT_LEFT_LEG] ?? 0,
    frontRightLeg: armorAllocation[MechLocation.FRONT_RIGHT_LEG] ?? 0,
    rearLeftLeg: armorAllocation[MechLocation.REAR_LEFT_LEG] ?? 0,
    rearRightLeg: armorAllocation[MechLocation.REAR_RIGHT_LEG] ?? 0,
    centerLeg: armorAllocation[MechLocation.CENTER_LEG] ?? 0,
  };
}

function buildEquipmentSlots(
  equipment: readonly IMountedEquipmentInstance[],
): IEditableMech['equipment'] {
  return equipment.map((eq) => ({
    equipmentId: eq.equipmentId,
    location: eq.location ?? '',
    slotIndex: eq.slots?.[0] ?? 0,
  }));
}

export function getMovementProfile(
  engineRating: number,
  tonnage: number,
): { walkMP: number; runMP: number } {
  const walkMP = engineRating > 0 ? Math.floor(engineRating / tonnage) : 0;
  return {
    walkMP,
    runMP: Math.ceil(walkMP * 1.5),
  };
}

export function calculatePreviewBattleValueAndCost({
  name,
  chassis,
  model,
  tonnage,
  techBase,
  engineType,
  engineRating,
  walkMP,
  internalStructureType,
  gyroType,
  cockpitType,
  armorType,
  armorAllocation,
  heatSinkType,
  heatSinkCount,
  equipment,
}: PreviewBattleValueAndCostInput): { battleValue: number; cost: number } {
  try {
    const identity = resolveUnitIdentity(name, chassis, model);
    const editableMech: IEditableMech = {
      id: 'preview',
      chassis: identity.chassis,
      variant: identity.model,
      tonnage,
      techBase: techBase as TechBase,
      engineType,
      engineRating,
      walkMP,
      structureType: internalStructureType,
      gyroType,
      cockpitType,
      armorType,
      armorAllocation: buildArmorAllocationForCalculation(armorAllocation),
      heatSinkType,
      heatSinkCount,
      equipment: buildEquipmentSlots(equipment),
      isDirty: false,
    };

    return {
      battleValue: calculationService.calculateBattleValue(editableMech),
      cost: calculationService.calculateCost(editableMech),
    };
  } catch (error) {
    logger.warn('Failed to calculate BV/cost:', error);
    return { battleValue: 0, cost: 0 };
  }
}

export function buildRecordSheetEquipment(
  equipment: readonly IMountedEquipmentInstance[],
): IUnitConfig['equipment'] {
  return equipment.map((eq) => ({
    id: eq.instanceId,
    name: eq.name,
    location: (eq.location || MechLocation.CENTER_TORSO) as string,
    heat: eq.heat || 0,
    damage: '-',
    ranges: undefined,
    isWeapon: eq.category.toLowerCase().includes('weapon'),
    isAmmo: eq.category === EquipmentCategory.AMMUNITION,
    ammoCount: undefined,
    slots: eq.slots ? [...eq.slots] : undefined,
  }));
}

export function buildCriticalSlotsFromEquipment(
  equipment: readonly IMountedEquipmentInstance[],
): PreviewCriticalSlots {
  const result: PreviewCriticalSlots = {};
  const locations = [
    MechLocation.HEAD,
    MechLocation.CENTER_TORSO,
    MechLocation.LEFT_TORSO,
    MechLocation.RIGHT_TORSO,
    MechLocation.LEFT_ARM,
    MechLocation.RIGHT_ARM,
    MechLocation.LEFT_LEG,
    MechLocation.RIGHT_LEG,
  ];

  locations.forEach((location) => {
    const slotCount =
      location === MechLocation.HEAD ||
      location === MechLocation.LEFT_LEG ||
      location === MechLocation.RIGHT_LEG
        ? 6
        : 12;
    result[location] = new Array<CriticalSlotCell>(slotCount).fill(null);
  });

  equipment.forEach((eq) => {
    const location = eq.location;
    if (location && eq.slots && eq.slots.length > 0) {
      eq.slots.forEach((slotIndex) => {
        if (result[location] && slotIndex < result[location].length) {
          result[location][slotIndex] = {
            content: eq.name,
            isSystem: false,
            equipmentId: eq.instanceId,
          };
        }
      });
    }
  });

  return result;
}

export function buildPreviewUnitConfig({
  name,
  chassis,
  model,
  tonnage,
  techBase,
  rulesLevel,
  year,
  configuration,
  engineType,
  engineRating,
  gyroType,
  internalStructureType,
  armorType,
  armorAllocation,
  heatSinkType,
  heatSinkCount,
  walkMP,
  runMP,
  jumpMP,
  equipment,
  criticalSlots,
  enhancement,
  battleValue,
  cost,
}: BuildPreviewUnitConfigInput): IUnitConfig {
  const identity = resolveUnitIdentity(name, chassis, model);

  return {
    id: 'preview',
    name,
    chassis: identity.chassis,
    model: identity.model,
    tonnage,
    techBase,
    rulesLevel,
    era: `Year ${year}`,
    configuration,
    engine: {
      type: engineType,
      rating: engineRating,
    },
    gyro: {
      type: gyroType,
    },
    structure: {
      type: internalStructureType,
    },
    armor: {
      type: armorType,
      allocation: buildArmorAllocationForRecordSheet(armorAllocation),
    },
    heatSinks: {
      type: heatSinkType,
      count: heatSinkCount,
    },
    movement: {
      walkMP,
      runMP,
      jumpMP,
    },
    equipment,
    criticalSlots,
    enhancements: enhancement ? [enhancement] : [],
    battleValue,
    cost,
  };
}
