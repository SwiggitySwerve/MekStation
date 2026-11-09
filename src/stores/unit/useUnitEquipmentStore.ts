/**
 * Unit Equipment Store Slice
 *
 * Equipment add/remove/mount actions for the unit store.
 * Handles targeting computer recalculation on weapon changes.
 */

import type {
  ICriticalSlotPart,
  IEquipmentSlotAllocation,
} from '@/types/equipment/MountedEquipment';
import type { SlotAssignment } from '@/utils/construction/slotOperations';

import {
  clearMountedEquipment,
  linkMountedAmmo,
  updateMountedEquipment,
} from '@/stores/equipmentStoreActions';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { IEquipmentItem } from '@/types/equipment';
import { createMountedEquipment } from '@/types/equipment/MountedEquipment';
import {
  canChangeEquipmentMount,
  hasFixedOmniMountConflict,
  isFixedOmniEquipment,
} from '@/utils/construction/equipmentMutationPolicy';
import { getSlotParts } from '@/utils/construction/slotOperations/parts';
import { logger } from '@/utils/logger';
import { generateUnitId } from '@/utils/uuid';

import type { UnitState } from '../unitState';
import type { UnitSliceGetFn, UnitSliceSetFn } from './unitSliceTypes';

import {
  previewCatalogEquipmentPlacement,
  type AddEquipmentAtLocationResult,
} from './catalogEquipmentPlacement';
import {
  createCalculatedEquipment,
  recalculateTargetingComputers,
} from './unitEquipmentAddition';

// =============================================================================
// Types
// =============================================================================

export interface UnitEquipmentActions {
  addEquipment: (item: IEquipmentItem) => string;
  addEquipmentAtLocation: (
    item: IEquipmentItem,
    location: MechLocation,
  ) => AddEquipmentAtLocationResult;
  removeEquipment: (instanceId: string) => void;
  updateEquipmentLocation: (
    instanceId: string,
    location: MechLocation,
    slots: readonly number[],
    splitSlots?: ICriticalSlotPart,
  ) => void;
  bulkUpdateEquipmentLocations: (updates: readonly SlotAssignment[]) => void;
  clearEquipmentLocation: (instanceId: string) => void;
  setEquipmentRearMounted: (instanceId: string, isRearMounted: boolean) => void;
  linkAmmo: (
    weaponInstanceId: string,
    ammoInstanceId: string | undefined,
  ) => void;
  clearAllEquipment: () => void;
}

function conflictsWithFixedMount(
  state: UnitState,
  allocation: IEquipmentSlotAllocation,
): boolean {
  if (!state.isOmni) return false;
  const occupied = state.equipment.flatMap((item) =>
    getSlotParts(item).map((part) => ({ ...item, ...part })),
  );
  return getSlotParts(allocation).some((part) =>
    hasFixedOmniMountConflict(
      state.isOmni,
      occupied,
      part.location,
      part.slots,
    ),
  );
}

export function createEquipmentSlice(
  set: UnitSliceSetFn,
  get: UnitSliceGetFn,
): UnitEquipmentActions {
  return {
    addEquipment: (item: IEquipmentItem) => {
      const instanceId = generateUnitId();
      let mountedEquipment = createMountedEquipment(item, instanceId);
      try {
        mountedEquipment = createCalculatedEquipment(item, instanceId, get());
      } catch {
        logger.warn(
          `Variable equipment calculation failed for ${item.variableEquipmentId}`,
        );
      }
      set((state) => ({
        equipment: recalculateTargetingComputers([
          ...state.equipment,
          mountedEquipment,
        ]),
        isModified: true,
        lastModifiedAt: Date.now(),
      }));
      return instanceId;
    },

    addEquipmentAtLocation: (item, location) => {
      const preview = previewCatalogEquipmentPlacement(item, get());
      const option = preview.locations.find(
        (candidate) => candidate.location === location,
      );
      if (!preview.equipment || !option?.canFit) {
        return {
          success: false,
          error:
            preview.error ??
            option?.reason ??
            'This location is unavailable for the current unit.',
        };
      }
      const instanceId = generateUnitId();
      const mountedEquipment = {
        ...preview.equipment,
        instanceId,
        location,
        slots: Array.from(
          { length: preview.equipment.criticalSlots },
          (_, index) => option.start! + index,
        ),
      };
      set((state) => ({
        equipment: recalculateTargetingComputers([
          ...state.equipment,
          mountedEquipment,
        ]),
        isModified: true,
        lastModifiedAt: Date.now(),
      }));
      return { success: true, instanceId };
    },

    removeEquipment: (instanceId: string) =>
      set((state) => {
        const item = state.equipment.find((e) => e.instanceId === instanceId);
        if (!item || isFixedOmniEquipment(state.isOmni, item)) return state;
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
      splitSlots?: ICriticalSlotPart,
    ) =>
      set((state) => {
        const item = state.equipment.find((e) => e.instanceId === instanceId);
        if (
          !item ||
          !canChangeEquipmentMount(state.isOmni, item) ||
          conflictsWithFixedMount(state, { location, slots, splitSlots })
        )
          return state;
        return updateMountedEquipment(
          state,
          instanceId,
          (e) => e.instanceId,
          (e) => ({
            ...e,
            location,
            slots,
            splitSlots,
            spreadSlots: undefined,
          }),
        );
      }),

    bulkUpdateEquipmentLocations: (updates: readonly SlotAssignment[]) =>
      set((state) => {
        const updateMap = new Map(updates.map((u) => [u.instanceId, u]));
        if (
          state.equipment.some((item) => {
            const update = updateMap.get(item.instanceId);
            return (
              update &&
              canChangeEquipmentMount(state.isOmni, item) &&
              conflictsWithFixedMount(state, update)
            );
          })
        )
          return state;
        let changed = false;
        const equipment = state.equipment.map((e) => {
          const update = updateMap.get(e.instanceId);
          if (!update || !canChangeEquipmentMount(state.isOmni, e)) return e;
          changed = true;
          return {
            ...e,
            location: update.location,
            slots: update.slots,
            splitSlots: update.splitSlots,
            spreadSlots: update.spreadSlots,
          };
        });
        if (!changed) return state;
        return {
          equipment,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    clearEquipmentLocation: (instanceId: string) =>
      set((state) => {
        const item = state.equipment.find((e) => e.instanceId === instanceId);
        if (!item || !canChangeEquipmentMount(state.isOmni, item)) return state;
        return updateMountedEquipment(
          state,
          instanceId,
          (e) => e.instanceId,
          (e) => ({
            ...e,
            location: undefined,
            slots: undefined,
            splitSlots: undefined,
            spreadSlots: undefined,
          }),
        );
      }),

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
      set((state) => {
        const equipment = state.equipment.filter(
          (e) => !e.isRemovable || isFixedOmniEquipment(state.isOmni, e),
        );
        return equipment.length === state.equipment.length
          ? state
          : clearMountedEquipment(equipment);
      }),
  };
}
