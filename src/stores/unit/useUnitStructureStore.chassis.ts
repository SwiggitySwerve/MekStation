/**
 * Unit Structure Store - Chassis Actions
 *
 * Actions for chassis configuration:
 * tonnage, configuration, isOmni, mode switching (LAM/QuadVee)
 */

import type {
  LAMMode,
  QuadVeeMode,
} from '@/types/construction/MechConfigurationSystem';

import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';

import type { UnitStore } from '../unitState';

import { applyTonnageChange } from './useUnitStructureStore.helpers';

type SetFn = (
  partial: Partial<UnitStore> | ((state: UnitStore) => Partial<UnitStore>),
) => void;

export interface ChassisActions {
  setTonnage: (tonnage: number) => void;
  setConfiguration: (configuration: MechConfiguration) => void;
  setIsOmni: (isOmni: boolean) => void;
  setLAMMode: (mode: LAMMode) => void;
  setQuadVeeMode: (mode: QuadVeeMode) => void;
}

export function createChassisActions(set: SetFn): ChassisActions {
  return {
    setTonnage: (tonnage) =>
      set((state) => {
        const { equipment, engineRating } = applyTonnageChange(
          state.equipment,
          state.tonnage,
          tonnage,
          state.engineRating,
          state.engineType,
          state.enhancement,
          state.techBase,
          state.jumpMP,
          state.jumpJetType,
        );

        return {
          tonnage,
          engineRating,
          equipment,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setConfiguration: (configuration) =>
      set({
        configuration,
        isModified: true,
        lastModifiedAt: Date.now(),
      }),

    setIsOmni: (isOmni) =>
      set({
        isOmni,
        isModified: true,
        lastModifiedAt: Date.now(),
      }),

    setLAMMode: (lamMode) =>
      set((state) => {
        if (state.configuration !== MechConfiguration.LAM) {
          return state;
        }
        return {
          lamMode,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setQuadVeeMode: (quadVeeMode) =>
      set((state) => {
        if (state.configuration !== MechConfiguration.QUADVEE) {
          return state;
        }
        return {
          quadVeeMode,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),
  };
}
