/**
 * Unit Equipment Store Slice
 *
 * Equipment add/remove/mount actions for the unit store.
 * Handles targeting computer recalculation on weapon changes.
 */

import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import {
  equipmentCalculatorService,
  VARIABLE_EQUIPMENT,
} from '@/services/equipment/EquipmentCalculatorService';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { IEquipmentItem } from '@/types/equipment';
import { createMountedEquipment } from '@/types/equipment/MountedEquipment';
import { calculateDirectFireWeaponTonnage } from '@/types/equipment/weapons/utilities';
import {
  calculateTargetingComputerWeight,
  calculateTargetingComputerSlots,
} from '@/utils/equipment/equipmentListUtils';
import { logger } from '@/utils/logger';
import { generateUnitId } from '@/utils/uuid';

import type { UnitStore } from '../unitState';

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

// =============================================================================
// Slice Factory
// =============================================================================

type SetFn = (
  partial: Partial<UnitStore> | ((state: UnitStore) => Partial<UnitStore>),
) => void;
type GetFn = () => UnitStore;

export function createEquipmentSlice(
  set: SetFn,
  get: GetFn,
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
            const result = equipmentCalculatorService.calculateProperties(
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
      set((state) => ({
        equipment: state.equipment.map((e) =>
          e.instanceId === instanceId ? { ...e, location, slots } : e,
        ),
        isModified: true,
        lastModifiedAt: Date.now(),
      })),

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
      set((state) => ({
        equipment: state.equipment.map((e) =>
          e.instanceId === instanceId
            ? { ...e, location: undefined, slots: undefined }
            : e,
        ),
        isModified: true,
        lastModifiedAt: Date.now(),
      })),

    setEquipmentRearMounted: (instanceId: string, isRearMounted: boolean) =>
      set((state) => ({
        equipment: state.equipment.map((e) =>
          e.instanceId === instanceId ? { ...e, isRearMounted } : e,
        ),
        isModified: true,
        lastModifiedAt: Date.now(),
      })),

    linkAmmo: (weaponInstanceId: string, ammoInstanceId: string | undefined) =>
      set((state) => ({
        equipment: state.equipment.map((e) =>
          e.instanceId === weaponInstanceId
            ? { ...e, linkedAmmoId: ammoInstanceId }
            : e,
        ),
        isModified: true,
        lastModifiedAt: Date.now(),
      })),

    clearAllEquipment: () =>
      set((state) => ({
        equipment: state.equipment.filter((e) => !e.isRemovable),
        isModified: true,
        lastModifiedAt: Date.now(),
      })),
  };
}
