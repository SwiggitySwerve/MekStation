import type { IEditableMech } from '@/services/construction/MechBuilderService';
import type { IUnitConfig } from '@/services/printing/recordsheet/types';
import type { IArmorAllocation } from '@/types/construction/ArmorAllocation';
import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import {
  buildEditableArmorAllocation,
  projectEditableMech,
} from '@/services/construction/editableMechProjection';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import {
  getLocationsForConfig,
  getLocationSlotCount,
} from '@/types/construction/mechConfigHelpers';
import { EquipmentCategory } from '@/types/equipment';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';
import {
  getFixedSlotNames,
  type ArmActuatorConfig,
} from '@/utils/construction/slotOperations/topology';

import {
  buildRecordSheetNameParts,
  buildRecordSheetUnitIdentity,
  type RecordSheetUnitIdentityWithTonnageInput,
} from '../preview/recordSheetUnitIdentity';

export interface PreviewUnitState extends Omit<
  RecordSheetUnitIdentityWithTonnageInput,
  'id'
> {
  role?: string;
  configuration: MechConfiguration;
  engineType: EngineType;
  engineRating: number;
  gyroType: GyroType;
  internalStructureType: string;
  cockpitType: string;
  armorType: string;
  armorAllocation: IArmorAllocation;
  heatSinkType: string;
  heatSinkCount: number;
  enhancement: string | null | undefined;
  jumpMP: number;
  equipment: readonly IMountedEquipmentInstance[];
  armActuators?: ArmActuatorConfig;
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

export { buildEditableArmorAllocation };

export function buildEditableMech(
  state: PreviewUnitState,
  walkMP: number,
): IEditableMech {
  return projectEditableMech(state, walkMP);
}

export function buildCriticalSlotsFromEquipment(
  equipment: readonly IMountedEquipmentInstance[],
  configuration: MechConfiguration,
  engineType: EngineType,
  gyroType: GyroType,
  armActuators?: ArmActuatorConfig,
): Record<string, CriticalSlot[]> {
  const result: Record<string, CriticalSlot[]> = {};

  getLocationsForConfig(configuration).forEach((location) => {
    const slots = new Array<CriticalSlot>(
      getLocationSlotCount(location, configuration),
    ).fill(null);
    getFixedSlotNames(location, engineType, gyroType, armActuators).forEach(
      (name, index) => {
        slots[index] = { content: name, isSystem: true };
      },
    );
    result[location] = slots;
  });

  equipment.forEach((eq) => {
    if (!eq.location || !eq.slots?.length || !result[eq.location]) {
      return;
    }

    eq.slots.forEach((slotIndex) => {
      if (slotIndex >= result[eq.location as string].length) {
        return;
      }

      if (!result[eq.location as string][slotIndex]?.isSystem) {
        result[eq.location as string][slotIndex] = {
          content: eq.name,
          isSystem: false,
          equipmentId: eq.instanceId,
        };
      }
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
    role: state.role,
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
      location: eq.location || 'Unassigned',
      heat: eq.heat || 0,
      damage: '-',
      ranges: undefined,
      isWeapon: eq.category.toLowerCase().includes('weapon'),
      isAmmo: eq.category === EquipmentCategory.AMMUNITION,
      ammoCount: undefined,
      slots: eq.slots ? [...eq.slots] : undefined,
    })),
    criticalSlots: buildCriticalSlotsFromEquipment(
      state.equipment,
      state.configuration,
      state.engineType,
      state.gyroType,
      state.armActuators,
    ),
    enhancements: state.enhancement ? [state.enhancement] : [],
    battleValue,
    cost,
  };
}
