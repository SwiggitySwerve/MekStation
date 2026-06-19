/**
 * Unit Equipment Store Slice
 *
 * Equipment add/remove/mount actions for the unit store.
 * Handles targeting computer recalculation on weapon changes.
 */

import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import {
  getEquipmentCalculatorService,
  VARIABLE_EQUIPMENT,
} from '@/services/equipment/EquipmentCalculatorService';
import {
  clearMountedEquipment,
  linkMountedAmmo,
  updateMountedEquipment,
} from '@/stores/equipmentStoreActions';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { IEquipmentItem } from '@/types/equipment';
import { createMountedEquipment } from '@/types/equipment/MountedEquipment';
import {
  calculateTargetingComputerWeight,
  calculateTargetingComputerSlots,
} from '@/utils/equipment/equipmentListUtils';
import { calculateDirectFireWeaponTonnage } from '@/utils/equipment/weapons/utilities';
import { logger } from '@/utils/logger';
import { generateUnitId } from '@/utils/uuid';

import type { UnitStore } from '../unitState';
import type { UnitSliceGetFn, UnitSliceSetFn } from './unitSliceTypes';

// =============================================================================
// Constants
// =============================================================================

const TARGETING_COMPUTER_IDS = [
  'targeting-computer',
  'clan-targeting-computer',
];

// =============================================================================
// Helpers
// =============================================================================

/**
 * Recalculate targeting computer weight/slots based on current equipment.
 * Called when weapons are added or removed.
 */
function recalculateTargetingComputers(
  equipment: IMountedEquipmentInstance[],
): IMountedEquipmentInstance[] {
  const weaponIds = equipment.map((e) => e.equipmentId);
  const directFireTonnage = calculateDirectFireWeaponTonnage(weaponIds);

  return equipment.map((item) => {
    if (TARGETING_COMPUTER_IDS.includes(item.equipmentId)) {
      const weight = calculateTargetingComputerWeight(
        directFireTonnage,
        item.techBase,
      );
      const slots = calculateTargetingComputerSlots(
        directFireTonnage,
        item.techBase,
      );
      return {
        ...item,
        weight,
        criticalSlots: slots,
      };
    }
    return item;
  });
}

// =============================================================================
// Types
// =============================================================================

export interface UnitEquipmentActions {
  addEquipment: (item: IEquipmentItem) => string;
  removeEquipment: (instanceId: string) => void;
  updateEquipmentLocation: (
    instanceId: string,
    location: MechLocation,
    slots: readonly number[],
  ) => void;
  bulkUpdateEquipmentLocations: (
    updates: ReadonlyArray<{
      instanceId: string;
      location: MechLocation;
      slots: readonly number[];
    }>,
  ) => void;
  clearEquipmentLocation: (instanceId: string) => void;
  setEquipmentRearMounted: (instanceId: string, isRearMounted: boolean) => void;
  linkAmmo: (
    weaponInstanceId: string,
    ammoInstanceId: string | undefined,
  ) => void;
  clearAllEquipment: () => void;
}

export function createEquipmentSlice(
  set: UnitSliceSetFn,
  get: UnitSliceGetFn,
): UnitEquipmentActions {
  return {
    addEquipment: (item: IEquipmentItem) => {
      const instanceId = generateUnitId();
      let mountedEquipment = createMountedEquipment(item, instanceId);

      // Handle variable equipment (targeting computers, physical weapons, etc.)
      if (item.variableEquipmentId) {
        const state = get();

        if (
          item.variableEquipmentId ===
            VARIABLE_EQUIPMENT.TARGETING_COMPUTER_IS ||
          item.variableEquipmentId ===
            VARIABLE_EQUIPMENT.TARGETING_COMPUTER_CLAN
        ) {
          const weaponIds = state.equipment.map((e) => e.equipmentId);
          const directFireTonnage = calculateDirectFireWeaponTonnage(weaponIds);

          const weight = calculateTargetingComputerWeight(
            directFireTonnage,
            item.techBase,
          );
          const slots = calculateTargetingComputerSlots(
            directFireTonnage,
            item.techBase,
          );

          mountedEquipment = {
            ...mountedEquipment,
            weight,
            criticalSlots: slots,
          };
        } else {
          try {
            const result = getEquipmentCalculatorService().calculateProperties(
              item.variableEquipmentId,
              { tonnage: state.tonnage },
            );
            mountedEquipment = {
              ...mountedEquipment,
              weight: result.weight,
              criticalSlots: result.criticalSlots,
            };
          } catch {
            logger.warn(
              `Variable equipment calculation failed for ${item.variableEquipmentId}`,
            );
          }
        }
      }

      set((state) => {
        const newEquipment = [...state.equipment, mountedEquipment];
        const updatedEquipment = recalculateTargetingComputers(newEquipment);
        return {
          equipment: updatedEquipment,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      });

      return instanceId;
    },

    removeEquipment: (instanceId: string) =>
      set((state) => {
        const filteredEquipment = state.equipment.filter(
          (e) => e.instanceId !== instanceId,
        );
        const updatedEquipment =
          recalculateTargetingComputers(filteredEquipment);
        return {
          equipment: updatedEquipment,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    updateEquipmentLocation: (
      instanceId: string,
      location: MechLocation,
      slots: readonly number[],
    ) =>
      set((state) =>
        updateMountedEquipment(
          state,
          instanceId,
          (e) => e.instanceId,
          (e) => ({ ...e, location, slots }),
        ),
      ),

    bulkUpdateEquipmentLocations: (
      updates: ReadonlyArray<{
        instanceId: string;
        location: MechLocation;
        slots: readonly number[];
      }>,
    ) =>
      set((state) => {
        const updateMap = new Map(updates.map((u) => [u.instanceId, u]));
        return {
          equipment: state.equipment.map((e) => {
            const update = updateMap.get(e.instanceId);
            return update
              ? { ...e, location: update.location, slots: update.slots }
              : e;
          }),
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    clearEquipmentLocation: (instanceId: string) =>
      set((state) =>
        updateMountedEquipment(
          state,
          instanceId,
          (e) => e.instanceId,
          (e) => ({ ...e, location: undefined, slots: undefined }),
        ),
      ),

    setEquipmentRearMounted: (instanceId: string, isRearMounted: boolean) =>
      set((state) =>
        updateMountedEquipment(
          state,
          instanceId,
          (e) => e.instanceId,
          (e) => ({ ...e, isRearMounted }),
        ),
      ),

    linkAmmo: (weaponInstanceId: string, ammoInstanceId: string | undefined) =>
      set((state) =>
        linkMountedAmmo(
          state,
          weaponInstanceId,
          ammoInstanceId,
          (e) => e.instanceId,
        ),
      ),

    clearAllEquipment: () =>
      set((state) =>
        clearMountedEquipment(state.equipment.filter((e) => !e.isRemovable)),
      ),
  };
}
