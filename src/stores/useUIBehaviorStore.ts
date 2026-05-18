/**
 * UI Behavior Store
 *
 * Manages UI behavior settings: sidebar state, confirm on close, and tooltips.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { UIBehaviorPersistedSchema } from '@/stores/utils/persistedStoreSchemas';
import { createZodPersistMerge } from '@/stores/utils/zodPersistMerge';

/**
 * UI behavior store state
 */
export interface UIBehaviorState {
  // UI behavior settings (persisted)
  sidebarDefaultCollapsed: boolean;
  confirmOnClose: boolean;
  showTooltips: boolean;

  // Actions
  setSidebarDefaultCollapsed: (collapsed: boolean) => void;
  setConfirmOnClose: (confirm: boolean) => void;
  setShowTooltips: (show: boolean) => void;

  // Reset
  resetToDefaults: () => void;
}

/** Keys that are action functions, not state */
type ActionKeys =
  | 'setSidebarDefaultCollapsed'
  | 'setConfirmOnClose'
  | 'setShowTooltips'
  | 'resetToDefaults';

const DEFAULT_UI_BEHAVIOR: Omit<UIBehaviorState, ActionKeys> = {
  sidebarDefaultCollapsed: false,
  confirmOnClose: true,
  showTooltips: true,
};

/**
 * UI behavior store with localStorage persistence
 */
export const useUIBehaviorStore = create<UIBehaviorState>()(
  persist(
    (set) => ({
      ...DEFAULT_UI_BEHAVIOR,

      setSidebarDefaultCollapsed: (collapsed) =>
        set({ sidebarDefaultCollapsed: collapsed }),
      setConfirmOnClose: (confirm) => set({ confirmOnClose: confirm }),
      setShowTooltips: (show) => set({ showTooltips: show }),

      resetToDefaults: () =>
        set({
          ...DEFAULT_UI_BEHAVIOR,
        }),
    }),
    {
      name: 'mekstation-ui-behavior',
      // Validate the rehydrated `localStorage` payload against a Zod schema;
      // a corrupt payload is discarded and the store keeps its default state.
      merge: createZodPersistMerge<UIBehaviorState>(
        UIBehaviorPersistedSchema,
        'mekstation-ui-behavior',
      ),
    },
  ),
);
