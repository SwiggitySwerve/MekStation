import type { IEditableMechProjectionInput } from '@/services/construction/editableMechProjection';
import type { IEditableMech } from '@/services/construction/MechBuilderService';
import type { IUnitConfig } from '@/services/printing/recordsheet/types';
import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';
import type { IMechCrewSeat } from '@/types/pilot/MechCrewSeats';

import {
  buildEditableArmorAllocation,
  buildEditableMechProjectionInput,
  projectEditableMech,
} from '@/services/construction/editableMechProjection';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import {
  getLocationsForConfig,
  getLocationSlotCount,
} from '@/types/construction/mechConfigHelpers';
import { EquipmentCategory } from '@/types/equipment';
import { buildMechCrew } from '@/types/pilot/MechCrewSeats';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';
import {
  getFixedSlotNames,
  type ArmActuatorConfig,
} from '@/utils/construction/slotOperations/topology';

import {
  buildRecordSheetNameParts,
  buildRecordSheetUnitIdentity,
  type RecordSheetUnitIdentityInput,
} from '../preview/recordSheetUnitIdentity';

/**
 * What the record sheet reads from the unit: the BV projection input (every field, as the one owner
 * `buildEditableMechProjectionInput` picks it, so the sheet cannot drop one the status bar passes)
 * plus the fields only the sheet needs. Engine and gyro are narrowed to their enums for the
 * critical-slot table. Build one with `usePreviewUnitState` (or pass any `UnitState`).
 */
export interface PreviewUnitState extends IEditableMechProjectionInput {
  readonly rulesLevel: RecordSheetUnitIdentityInput['rulesLevel'];
  readonly year: RecordSheetUnitIdentityInput['year'];
  readonly role?: string;
  readonly engineType: EngineType;
  readonly gyroType: GyroType;
  readonly enhancement: string | null | undefined;
  readonly armActuators?: ArmActuatorConfig;
  readonly crewSeats?: readonly IMechCrewSeat[];
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
  return projectEditableMech(buildEditableMechProjectionInput(state), walkMP);
}

export function buildCriticalSlotsFromEquipment(
  equipment: readonly IMountedEquipmentInstance[],
  configuration: MechConfiguration,
  engineType: EngineType,
  gyroType: GyroType,
  armActuators?: ArmActuatorConfig,
  cockpitType?: string,
): Record<string, CriticalSlot[]> {
  const result: Record<string, CriticalSlot[]> = {};

  getLocationsForConfig(configuration).forEach((location) => {
    const slots = new Array<CriticalSlot>(
      getLocationSlotCount(location, configuration),
    ).fill(null);
    getFixedSlotNames(
      location,
      engineType,
      gyroType,
      armActuators,
      cockpitType,
    ).forEach((name, index) => {
      slots[index] = { content: name, isSystem: true };
    });
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
  const crew = buildMechCrew(
    state.configuration,
    state.tonnage,
    state.crewSeats,
  );
  return {
    ...buildRecordSheetUnitIdentity({ ...state, id: 'preview' }),
    ...(crew ? { crew } : {}),
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
      jumpMP: state.jumpMP ?? 0,
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
      state.cockpitType,
    ),
    enhancements: state.enhancement ? [state.enhancement] : [],
    battleValue,
    cost,
  };
}
