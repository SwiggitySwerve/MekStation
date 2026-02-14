/**
 * Unit Armor Store Slice
 *
 * Armor allocation actions for the unit store.
 * Manages armor tonnage, per-location allocation, auto-allocation, and maximize/clear.
 *
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import type { IArmorAllocation } from '@/types/construction/ArmorAllocation';

import { createEmptyArmorAllocation } from '@/types/construction/ArmorAllocation';
import { getArmorDefinition } from '@/types/construction/ArmorType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import {
  calculateArmorPoints,
  getMaxArmorForLocation,
  getMaxTotalArmor,
  calculateOptimalArmorAllocation,
} from '@/utils/construction/armorCalculations';
import { ceilToHalfTon } from '@/utils/physical/weightUtils';

import type { UnitStore } from '../unitState';

// =============================================================================
// Types
// =============================================================================

/** Armor-related actions extracted from UnitStore */
export interface UnitArmorActions {
  setArmorTonnage: (tonnage: number) => void;
  setLocationArmor: (
    location: MechLocation,
    front: number,
    rear?: number,
  ) => void;
  autoAllocateArmor: () => void;
  maximizeArmor: () => void;
  clearAllArmor: () => void;
}

// =============================================================================
// Slice Factory
// =============================================================================

type SetFn = (
  partial: Partial<UnitStore> | ((state: UnitStore) => Partial<UnitStore>),
) => void;
type GetFn = () => UnitStore;

/**
 * Create armor allocation actions for the unit store.
 */
export function createArmorSlice(set: SetFn, _get: GetFn): UnitArmorActions {
  return {
    setArmorTonnage: (tonnage) =>
      set({
        armorTonnage: Math.max(0, tonnage),
        isModified: true,
        lastModifiedAt: Date.now(),
      }),

    setLocationArmor: (location, front, rear) =>
      set((state) => {
        const newAllocation = { ...state.armorAllocation };
        const maxArmor = getMaxArmorForLocation(state.tonnage, location);

        // Clamp front armor to valid range
        const clampedFront = Math.max(0, Math.min(front, maxArmor));
        newAllocation[location] = clampedFront;

        // Handle rear armor for torso locations
        if (rear !== undefined) {
          // Front + rear cannot exceed location max
          const maxRear = maxArmor - clampedFront;
          const clampedRear = Math.max(0, Math.min(rear, maxRear));

          switch (location) {
            case MechLocation.CENTER_TORSO:
              newAllocation.centerTorsoRear = clampedRear;
              break;
            case MechLocation.LEFT_TORSO:
              newAllocation.leftTorsoRear = clampedRear;
              break;
            case MechLocation.RIGHT_TORSO:
              newAllocation.rightTorsoRear = clampedRear;
              break;
          }
        }

        return {
          armorAllocation: newAllocation,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    autoAllocateArmor: () =>
      set((state) => {
        const availablePoints = calculateArmorPoints(
          state.armorTonnage,
          state.armorType,
        );
        const allocation = calculateOptimalArmorAllocation(
          availablePoints,
          state.tonnage,
          state.configuration,
        );

        const newAllocation: IArmorAllocation = {
          ...createEmptyArmorAllocation(),
          [MechLocation.HEAD]: allocation.head,
          [MechLocation.CENTER_TORSO]: allocation.centerTorsoFront,
          centerTorsoRear: allocation.centerTorsoRear,
          [MechLocation.LEFT_TORSO]: allocation.leftTorsoFront,
          leftTorsoRear: allocation.leftTorsoRear,
          [MechLocation.RIGHT_TORSO]: allocation.rightTorsoFront,
          rightTorsoRear: allocation.rightTorsoRear,
          [MechLocation.LEFT_ARM]: allocation.leftArm,
          [MechLocation.RIGHT_ARM]: allocation.rightArm,
          [MechLocation.LEFT_LEG]: allocation.leftLeg,
          [MechLocation.RIGHT_LEG]: allocation.rightLeg,
          [MechLocation.CENTER_LEG]: allocation.centerLeg,
          [MechLocation.FRONT_LEFT_LEG]: allocation.frontLeftLeg,
          [MechLocation.FRONT_RIGHT_LEG]: allocation.frontRightLeg,
          [MechLocation.REAR_LEFT_LEG]: allocation.rearLeftLeg,
          [MechLocation.REAR_RIGHT_LEG]: allocation.rearRightLeg,
        };

        return {
          armorAllocation: newAllocation,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    maximizeArmor: () =>
      set((state) => {
        const maxTotalArmor = getMaxTotalArmor(
          state.tonnage,
          state.configuration,
        );
        const armorDef = getArmorDefinition(state.armorType);
        const pointsPerTon = armorDef?.pointsPerTon ?? 16;
        const tonnageNeeded = ceilToHalfTon(maxTotalArmor / pointsPerTon);

        return {
          armorTonnage: tonnageNeeded,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    clearAllArmor: () =>
      set({
        armorAllocation: createEmptyArmorAllocation(),
        isModified: true,
        lastModifiedAt: Date.now(),
      }),
  };
}
