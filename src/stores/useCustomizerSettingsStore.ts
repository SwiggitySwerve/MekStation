/**
 * Customizer Settings Store
 *
 * Manages customizer-specific settings: armor diagram mode and variant.
 * Supports live preview with draft state.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Armor diagram display mode
 */
export type ArmorDiagramMode = 'schematic' | 'silhouette';

/**
 * Armor diagram design variants
 */
export type ArmorDiagramVariant =
  | 'clean-tech'
  | 'neon-operator'
  | 'tactical-hud'
  | 'premium-material'
  | 'megamek';

/**
 * Customizer settings that support live preview with save/revert
 */
export interface CustomizerSettings {
  armorDiagramMode: ArmorDiagramMode;
  armorDiagramVariant: ArmorDiagramVariant;
}

/**
 * Customizer settings store state
 */
export interface CustomizerSettingsState {
  // Customizer preferences (persisted)
  armorDiagramMode: ArmorDiagramMode;
  armorDiagramVariant: ArmorDiagramVariant;
  showArmorDiagramSelector: boolean; // UAT feature flag

  // Draft customizer for live preview (not persisted)
  draftCustomizer: CustomizerSettings | null;
  hasUnsavedCustomizer: boolean;

  // Direct setters (immediately persisted)
  setArmorDiagramMode: (mode: ArmorDiagramMode) => void;
  setArmorDiagramVariant: (variant: ArmorDiagramVariant) => void;
  setShowArmorDiagramSelector: (show: boolean) => void;

  // Draft customizer actions for live preview (requires explicit save)
  setDraftArmorDiagramMode: (mode: ArmorDiagramMode) => void;
  setDraftArmorDiagramVariant: (variant: ArmorDiagramVariant) => void;
  saveCustomizer: () => void;
  revertCustomizer: () => void;
  initDraftCustomizer: () => void;

  // Getters for effective (draft or saved) customizer
  getEffectiveArmorDiagramMode: () => ArmorDiagramMode;
  getEffectiveArmorDiagramVariant: () => ArmorDiagramVariant;

  // Reset
  resetToDefaults: () => void;
}

/** Keys that are action functions, not state */
type ActionKeys =
  | 'setArmorDiagramMode'
  | 'setArmorDiagramVariant'
  | 'setShowArmorDiagramSelector'
  | 'setDraftArmorDiagramMode'
  | 'setDraftArmorDiagramVariant'
  | 'saveCustomizer'
  | 'revertCustomizer'
  | 'initDraftCustomizer'
  | 'getEffectiveArmorDiagramMode'
  | 'getEffectiveArmorDiagramVariant'
  | 'resetToDefaults';

const DEFAULT_CUSTOMIZER_SETTINGS: Omit<CustomizerSettingsState, ActionKeys> = {
  armorDiagramMode: 'silhouette',
  armorDiagramVariant: 'clean-tech',
  showArmorDiagramSelector: true, // Enable UAT selector by default
  draftCustomizer: null,
  hasUnsavedCustomizer: false,
};

/**
 * Customizer settings store with localStorage persistence
 */
export const useCustomizerSettingsStore = create<CustomizerSettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_CUSTOMIZER_SETTINGS,

      // Direct setters (immediately persisted)
      setArmorDiagramMode: (mode) => set({ armorDiagramMode: mode }),
      setArmorDiagramVariant: (variant) =>
        set({ armorDiagramVariant: variant }),
      setShowArmorDiagramSelector: (show) =>
        set({ showArmorDiagramSelector: show }),

      // Draft customizer setters for live preview (not persisted until save)
      setDraftArmorDiagramMode: (mode) =>
        set((state) => ({
          draftCustomizer: {
            armorDiagramMode: mode,
            armorDiagramVariant:
              state.draftCustomizer?.armorDiagramVariant ??
              state.armorDiagramVariant,
          },
          hasUnsavedCustomizer: true,
        })),

      setDraftArmorDiagramVariant: (variant) =>
        set((state) => ({
          draftCustomizer: {
            armorDiagramMode:
              state.draftCustomizer?.armorDiagramMode ?? state.armorDiagramMode,
            armorDiagramVariant: variant,
          },
          hasUnsavedCustomizer: true,
        })),

      // Initialize draft customizer with current saved values (call when entering customizer settings)
      initDraftCustomizer: () =>
        set((state) => ({
          draftCustomizer: {
            armorDiagramMode: state.armorDiagramMode,
            armorDiagramVariant: state.armorDiagramVariant,
          },
          hasUnsavedCustomizer: false,
        })),

      // Save draft customizer to persisted state
      saveCustomizer: () =>
        set((state) => {
          if (!state.draftCustomizer) return state;
          return {
            armorDiagramMode: state.draftCustomizer.armorDiagramMode,
            armorDiagramVariant: state.draftCustomizer.armorDiagramVariant,
            hasUnsavedCustomizer: false,
          };
        }),

      // Revert draft customizer to saved state (call when leaving customizer without save)
      revertCustomizer: () =>
        set({
          draftCustomizer: null,
          hasUnsavedCustomizer: false,
        }),

      // Getters for effective customizer (draft if exists, otherwise saved)
      getEffectiveArmorDiagramMode: () => {
        const state = get();
        return (
          state.draftCustomizer?.armorDiagramMode ?? state.armorDiagramMode
        );
      },

      getEffectiveArmorDiagramVariant: () => {
        const state = get();
        return (
          state.draftCustomizer?.armorDiagramVariant ??
          state.armorDiagramVariant
        );
      },

      resetToDefaults: () =>
        set({
          ...DEFAULT_CUSTOMIZER_SETTINGS,
        }),
    }),
    {
      name: 'mekstation-customizer-settings',
      // Don't persist draft state
      partialize: (state) => ({
        armorDiagramMode: state.armorDiagramMode,
        armorDiagramVariant: state.armorDiagramVariant,
        showArmorDiagramSelector: state.showArmorDiagramSelector,
      }),
    },
  ),
);
