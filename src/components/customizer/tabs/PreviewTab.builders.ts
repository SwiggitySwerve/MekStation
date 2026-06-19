import type {
  IArmorAllocation as IEditableArmorAllocation,
  IEditableMech,
} from '@/services/construction/MechBuilderService';
import type { IUnitConfig } from '@/services/printing/recordsheet/types';

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';

import {
  BIPED_ARMOR_LOCATIONS,
  SIX_SLOT_ARMOR_LOCATIONS,
} from '../armor/shared/ArmorVariantRenderHelpers';
import {
  buildRecordSheetNameParts,
  buildRecordSheetUnitIdentity,
  type RecordSheetUnitIdentityWithTonnageInput,
} from '../preview/recordSheetUnitIdentity';

interface PreviewEquipment {
  equipmentId: string;
  instanceId: string;
  name: string;
  category: string;
  location?: string | null;
  slots?: readonly number[];
  heat?: number;
}

interface PreviewArmorAllocation {
  [MechLocation.HEAD]: number;
  [MechLocation.CENTER_TORSO]: number;
  centerTorsoRear: number;
  [MechLocation.LEFT_TORSO]: number;
  leftTorsoRear: number;
  [MechLocation.RIGHT_TORSO]: number;
  rightTorsoRear: number;
  [MechLocation.LEFT_ARM]: number;
  [MechLocation.RIGHT_ARM]: number;
  [MechLocation.LEFT_LEG]: number;
  [MechLocation.RIGHT_LEG]: number;
}

interface PreviewUnitState extends Omit<
  RecordSheetUnitIdentityWithTonnageInput,
  'id'
> {
  configuration: string;
  engineType: string;
  engineRating: number;
  gyroType: string;
  internalStructureType: string;
  cockpitType: string;
  armorType: string;
  armorAllocation: PreviewArmorAllocation;
  heatSinkType: string;
  heatSinkCount: number;
  enhancement: string | null | undefined;
  jumpMP: number;
  equipment: readonly PreviewEquipment[];
}

type CriticalSlot = {
  content: string;
  isSystem?: boolean;
  equipmentId?: string;
} | null;

export function buildPreviewMechNameParts(state: PreviewUnitState): {
  chassis: string;
  model: string;
} {
  return buildRecordSheetNameParts(state);
}

export function buildEditableArmorAllocation(
  armorAllocation: PreviewArmorAllocation,
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
  };
}

export function buildEditableMech(
  state: PreviewUnitState,
  walkMP: number,
): IEditableMech {
  const nameParts = buildPreviewMechNameParts(state);

  return {
    id: 'preview',
    chassis: nameParts.chassis,
    variant: nameParts.model,
    tonnage: state.tonnage,
    techBase: state.techBase as TechBase,
    engineType: state.engineType,
    engineRating: state.engineRating,
    walkMP,
    structureType: state.internalStructureType,
    gyroType: state.gyroType,
    cockpitType: state.cockpitType,
    armorType: state.armorType,
    armorAllocation: buildEditableArmorAllocation(state.armorAllocation),
    heatSinkType: state.heatSinkType,
    heatSinkCount: state.heatSinkCount,
    equipment: state.equipment.map((eq) => ({
      equipmentId: eq.equipmentId,
      location: eq.location ?? '',
      slotIndex: eq.slots?.[0] ?? 0,
    })),
    isDirty: false,
  };
}

export function buildCriticalSlotsFromEquipment(
  equipment: readonly PreviewEquipment[],
): Record<string, CriticalSlot[]> {
  const result: Record<string, CriticalSlot[]> = {};

  BIPED_ARMOR_LOCATIONS.forEach((loc) => {
    result[loc] = new Array<CriticalSlot>(
      SIX_SLOT_ARMOR_LOCATIONS.has(loc) ? 6 : 12,
    ).fill(null);
  });

  equipment.forEach((eq) => {
    if (!eq.location || !eq.slots?.length || !result[eq.location]) {
      return;
    }

    eq.slots.forEach((slotIndex) => {
      if (slotIndex >= result[eq.location as string].length) {
        return;
      }

      result[eq.location as string][slotIndex] = {
        content: eq.name,
        isSystem: false,
        equipmentId: eq.instanceId,
      };
    });
  });

  return result;
}

export function buildPreviewUnitConfig(
  state: PreviewUnitState,
  walkMP: number,
  runMP: number,
  battleValue: number,
  cost: number,
): IUnitConfig {
  return {
    ...buildRecordSheetUnitIdentity({ ...state, id: 'preview' }),
    configuration: state.configuration,
    engine: {
      type: state.engineType,
      rating: state.engineRating,
    },
    gyro: {
      type: state.gyroType,
    },
    structure: {
      type: state.internalStructureType,
    },
    armor: {
      type: state.armorType,
      allocation: buildEditableArmorAllocation(state.armorAllocation),
    },
    heatSinks: {
      type: state.heatSinkType,
      count: state.heatSinkCount,
    },
    movement: {
      walkMP,
      runMP,
      jumpMP: state.jumpMP,
    },
    equipment: state.equipment.map((eq) => ({
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
    })),
    criticalSlots: buildCriticalSlotsFromEquipment(state.equipment),
    enhancements: state.enhancement ? [state.enhancement] : [],
    battleValue,
    cost,
  };
}
