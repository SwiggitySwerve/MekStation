/**
 * App Settings Store (Compatibility Layer)
 *
 * This module re-exports from focused stores for backward compatibility.
 * New code should import directly from the focused stores:
 * - useAppearanceStore: accent color, font size, animation, compact mode, UI theme
 * - useCustomizerSettingsStore: armor diagram mode and variant
 * - useAccessibilityStore: high contrast, reduce motion
 * - useUIBehaviorStore: sidebar, confirm on close, tooltips
 *
 * @deprecated Import from focused stores instead for new code
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Re-export types from focused stores
export type {
  UITheme,
  AccentColor,
  FontSize,
  AnimationLevel,
  AppearanceSettings,
} from './useAppearanceStore';

export type {
  ArmorDiagramMode,
  ArmorDiagramVariant,
  CustomizerSettings,
} from './useCustomizerSettingsStore';

// Re-export CSS mappings
export { ACCENT_COLOR_CSS, FONT_SIZE_CSS } from './useAppearanceStore';

// Re-export focused stores for direct access
export { useAppearanceStore } from './useAppearanceStore';
export { useCustomizerSettingsStore } from './useCustomizerSettingsStore';
export { useAccessibilityStore } from './useAccessibilityStore';
export { useUIBehaviorStore } from './useUIBehaviorStore';

import { useAccessibilityStore } from './useAccessibilityStore';
// Import focused stores for combined store
import {
  useAppearanceStore,
  type AccentColor,
  type FontSize,
  type AnimationLevel,
  type UITheme,
  type AppearanceSettings,
} from './useAppearanceStore';
import {
  useCustomizerSettingsStore,
  type ArmorDiagramMode,
  type ArmorDiagramVariant,
  type CustomizerSettings,
} from './useCustomizerSettingsStore';
import { useUIBehaviorStore } from './useUIBehaviorStore';

/**
 * App settings state (combined interface for backward compatibility)
 */
export interface AppSettingsState {
  // Appearance (persisted)
  accentColor: AccentColor;
  fontSize: FontSize;
  animationLevel: AnimationLevel;
  compactMode: boolean;
  uiTheme: UITheme;

  // Draft appearance for live preview (not persisted)
  draftAppearance: AppearanceSettings | null;
  hasUnsavedUITheme: boolean;
  hasUnsavedOtherAppearance: boolean;

  // Customizer preferences
  armorDiagramMode: ArmorDiagramMode;
  armorDiagramVariant: ArmorDiagramVariant;
  showArmorDiagramSelector: boolean; // UAT feature flag

  // Draft customizer for live preview (not persisted)
  draftCustomizer: CustomizerSettings | null;
  hasUnsavedCustomizer: boolean;

  // UI behavior
  sidebarDefaultCollapsed: boolean;
  confirmOnClose: boolean;
  showTooltips: boolean;

  // Accessibility
  highContrast: boolean;
  reduceMotion: boolean;

  // Actions for persisted settings (immediate save)
  setAccentColor: (color: AccentColor) => void;
  setFontSize: (size: FontSize) => void;
  setAnimationLevel: (level: AnimationLevel) => void;
  setCompactMode: (compact: boolean) => void;
  setUITheme: (theme: UITheme) => void;

  // Draft actions for live preview (requires explicit save)
  setDraftAccentColor: (color: AccentColor) => void;
  setDraftFontSize: (size: FontSize) => void;
  setDraftAnimationLevel: (level: AnimationLevel) => void;
  setDraftCompactMode: (compact: boolean) => void;
  setDraftUITheme: (theme: UITheme) => void;
  saveUITheme: () => void;
  saveOtherAppearance: () => void;
  revertAppearance: () => void;
  initDraftAppearance: () => void;

  // Getters for effective (draft or saved) appearance
  getEffectiveAccentColor: () => AccentColor;
  getEffectiveUITheme: () => UITheme;
  getEffectiveFontSize: () => FontSize;

  // Draft customizer actions for live preview (requires explicit save)
  setDraftArmorDiagramMode: (mode: ArmorDiagramMode) => void;
  setDraftArmorDiagramVariant: (variant: ArmorDiagramVariant) => void;
  saveCustomizer: () => void;
  revertCustomizer: () => void;
  initDraftCustomizer: () => void;

  // Getters for effective (draft or saved) customizer
  getEffectiveArmorDiagramMode: () => ArmorDiagramMode;
  getEffectiveArmorDiagramVariant: () => ArmorDiagramVariant;

  // Other actions
  setArmorDiagramMode: (mode: ArmorDiagramMode) => void;
  setArmorDiagramVariant: (variant: ArmorDiagramVariant) => void;
  setShowArmorDiagramSelector: (show: boolean) => void;
  setSidebarDefaultCollapsed: (collapsed: boolean) => void;
  setConfirmOnClose: (confirm: boolean) => void;
  setShowTooltips: (show: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setReduceMotion: (enabled: boolean) => void;
  resetToDefaults: () => void;
}

/** Keys that are action functions, not state */
type ActionKeys =
  | 'setAccentColor'
  | 'setFontSize'
  | 'setAnimationLevel'
  | 'setCompactMode'
  | 'setUITheme'
  | 'setDraftAccentColor'
  | 'setDraftFontSize'
  | 'setDraftAnimationLevel'
  | 'setDraftCompactMode'
  | 'setDraftUITheme'
  | 'saveUITheme'
  | 'saveOtherAppearance'
  | 'revertAppearance'
  | 'initDraftAppearance'
  | 'getEffectiveAccentColor'
  | 'getEffectiveUITheme'
  | 'getEffectiveFontSize'
  | 'setDraftArmorDiagramMode'
  | 'setDraftArmorDiagramVariant'
  | 'saveCustomizer'
  | 'revertCustomizer'
  | 'initDraftCustomizer'
  | 'getEffectiveArmorDiagramMode'
  | 'getEffectiveArmorDiagramVariant'
  | 'setArmorDiagramMode'
  | 'setArmorDiagramVariant'
  | 'setShowArmorDiagramSelector'
  | 'setSidebarDefaultCollapsed'
  | 'setConfirmOnClose'
  | 'setShowTooltips'
  | 'setHighContrast'
  | 'setReduceMotion'
  | 'resetToDefaults';

const DEFAULT_SETTINGS: Omit<AppSettingsState, ActionKeys> = {
  // Appearance
  accentColor: 'amber',
  fontSize: 'medium',
  animationLevel: 'full',
  compactMode: false,
  uiTheme: 'default',

  // Draft state (not persisted)
  draftAppearance: null,
  hasUnsavedUITheme: false,
  hasUnsavedOtherAppearance: false,

  // Customizer preferences
  armorDiagramMode: 'silhouette',
  armorDiagramVariant: 'clean-tech',
  showArmorDiagramSelector: true, // Enable UAT selector by default

  // Draft customizer state (not persisted)
  draftCustomizer: null,
  hasUnsavedCustomizer: false,

  // UI behavior
  sidebarDefaultCollapsed: false,
  confirmOnClose: true,
  showTooltips: true,

  // Accessibility
  highContrast: false,
  reduceMotion: false,
};

/**
 * Combined app settings store for backward compatibility.
 *
 * This store delegates to focused stores internally while maintaining
 * the same external API. For new code, prefer using the focused stores directly.
 *
 * @deprecated Use focused stores (useAppearanceStore, useCustomizerSettingsStore, etc.) for new code
 */
export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set, _get) => ({
      ...DEFAULT_SETTINGS,

      // Direct setters (immediately persisted) - used for non-appearance settings
      setAccentColor: (color) => {
        useAppearanceStore.getState().setAccentColor(color);
        set({ accentColor: color });
      },
      setFontSize: (size) => {
        useAppearanceStore.getState().setFontSize(size);
        set({ fontSize: size });
      },
      setAnimationLevel: (level) => {
        useAppearanceStore.getState().setAnimationLevel(level);
        set({ animationLevel: level });
      },
      setCompactMode: (compact) => {
        useAppearanceStore.getState().setCompactMode(compact);
        set({ compactMode: compact });
      },
      // UITheme changes independently of ArmorDiagramVariant
      setUITheme: (theme) => {
        useAppearanceStore.getState().setUITheme(theme);
        set({ uiTheme: theme });
      },

      // Draft setters for live preview (not persisted until save)
      setDraftAccentColor: (color) => {
        useAppearanceStore.getState().setDraftAccentColor(color);
        set((state) => ({
          draftAppearance: {
            ...(state.draftAppearance ?? {
              accentColor: state.accentColor,
              fontSize: state.fontSize,
              animationLevel: state.animationLevel,
              compactMode: state.compactMode,
              uiTheme: state.uiTheme,
            }),
            accentColor: color,
          },
          hasUnsavedOtherAppearance: true,
        }));
      },

      setDraftFontSize: (size) => {
        useAppearanceStore.getState().setDraftFontSize(size);
        set((state) => ({
          draftAppearance: {
            ...(state.draftAppearance ?? {
              accentColor: state.accentColor,
              fontSize: state.fontSize,
              animationLevel: state.animationLevel,
              compactMode: state.compactMode,
              uiTheme: state.uiTheme,
            }),
            fontSize: size,
          },
          hasUnsavedOtherAppearance: true,
        }));
      },

      setDraftAnimationLevel: (level) => {
        useAppearanceStore.getState().setDraftAnimationLevel(level);
        set((state) => ({
          draftAppearance: {
            ...(state.draftAppearance ?? {
              accentColor: state.accentColor,
              fontSize: state.fontSize,
              animationLevel: state.animationLevel,
              compactMode: state.compactMode,
              uiTheme: state.uiTheme,
            }),
            animationLevel: level,
          },
          hasUnsavedOtherAppearance: true,
        }));
      },

      setDraftCompactMode: (compact) => {
        useAppearanceStore.getState().setDraftCompactMode(compact);
        set((state) => ({
          draftAppearance: {
            ...(state.draftAppearance ?? {
              accentColor: state.accentColor,
              fontSize: state.fontSize,
              animationLevel: state.animationLevel,
              compactMode: state.compactMode,
              uiTheme: state.uiTheme,
            }),
            compactMode: compact,
          },
          hasUnsavedOtherAppearance: true,
        }));
      },

      // Draft UITheme - tracked separately from other appearance settings
      setDraftUITheme: (theme) => {
        useAppearanceStore.getState().setDraftUITheme(theme);
        set((state) => ({
          draftAppearance: {
            ...(state.draftAppearance ?? {
              accentColor: state.accentColor,
              fontSize: state.fontSize,
              animationLevel: state.animationLevel,
              compactMode: state.compactMode,
              uiTheme: state.uiTheme,
            }),
            uiTheme: theme,
          },
          hasUnsavedUITheme: true,
        }));
      },

      // Initialize draft with current saved values (call when entering settings)
      initDraftAppearance: () => {
        useAppearanceStore.getState().initDraftAppearance();
        set((state) => ({
          draftAppearance: {
            accentColor: state.accentColor,
            fontSize: state.fontSize,
            animationLevel: state.animationLevel,
            compactMode: state.compactMode,
            uiTheme: state.uiTheme,
          },
          hasUnsavedUITheme: false,
          hasUnsavedOtherAppearance: false,
        }));
      },

      // Save UI Theme only (separate from other appearance settings)
      saveUITheme: () => {
        useAppearanceStore.getState().saveUITheme();
        set((state) => {
          if (!state.draftAppearance) return state;
          return {
            uiTheme: state.draftAppearance.uiTheme,
            hasUnsavedUITheme: false,
          };
        });
      },

      // Save other appearance settings (accent, font, animation, compact) - NOT theme
      saveOtherAppearance: () => {
        useAppearanceStore.getState().saveOtherAppearance();
        set((state) => {
          if (!state.draftAppearance) return state;
          return {
            accentColor: state.draftAppearance.accentColor,
            fontSize: state.draftAppearance.fontSize,
            animationLevel: state.draftAppearance.animationLevel,
            compactMode: state.draftAppearance.compactMode,
            hasUnsavedOtherAppearance: false,
          };
        });
      },

      // Revert draft to saved state (call when leaving settings without save)
      // ArmorDiagramVariant is independent and not affected by appearance revert
      revertAppearance: () => {
        useAppearanceStore.getState().revertAppearance();
        set({
          draftAppearance: null,
          hasUnsavedUITheme: false,
          hasUnsavedOtherAppearance: false,
        });
      },

      // Getters for effective appearance (draft if exists, otherwise saved)
      getEffectiveAccentColor: () => {
        return useAppearanceStore.getState().getEffectiveAccentColor();
      },

      getEffectiveUITheme: () => {
        return useAppearanceStore.getState().getEffectiveUITheme();
      },

      getEffectiveFontSize: () => {
        return useAppearanceStore.getState().getEffectiveFontSize();
      },

      // Draft customizer setters for live preview (not persisted until save)
      setDraftArmorDiagramMode: (mode) => {
        useCustomizerSettingsStore.getState().setDraftArmorDiagramMode(mode);
        set((state) => ({
          draftCustomizer: {
            armorDiagramMode: mode,
            armorDiagramVariant:
              state.draftCustomizer?.armorDiagramVariant ??
              state.armorDiagramVariant,
          },
          hasUnsavedCustomizer: true,
        }));
      },

      setDraftArmorDiagramVariant: (variant) => {
        useCustomizerSettingsStore
          .getState()
          .setDraftArmorDiagramVariant(variant);
        set((state) => ({
          draftCustomizer: {
            armorDiagramMode:
              state.draftCustomizer?.armorDiagramMode ?? state.armorDiagramMode,
            armorDiagramVariant: variant,
          },
          hasUnsavedCustomizer: true,
        }));
      },

      // Initialize draft customizer with current saved values (call when entering customizer settings)
      initDraftCustomizer: () => {
        useCustomizerSettingsStore.getState().initDraftCustomizer();
        set((state) => ({
          draftCustomizer: {
            armorDiagramMode: state.armorDiagramMode,
            armorDiagramVariant: state.armorDiagramVariant,
          },
          hasUnsavedCustomizer: false,
        }));
      },

      // Save draft customizer to persisted state
      saveCustomizer: () => {
        useCustomizerSettingsStore.getState().saveCustomizer();
        set((state) => {
          if (!state.draftCustomizer) return state;
          return {
            armorDiagramMode: state.draftCustomizer.armorDiagramMode,
            armorDiagramVariant: state.draftCustomizer.armorDiagramVariant,
            hasUnsavedCustomizer: false,
          };
        });
      },

      // Revert draft customizer to saved state (call when leaving customizer without save)
      revertCustomizer: () => {
        useCustomizerSettingsStore.getState().revertCustomizer();
        set({
          draftCustomizer: null,
          hasUnsavedCustomizer: false,
        });
      },

      // Getters for effective customizer (draft if exists, otherwise saved)
      getEffectiveArmorDiagramMode: () => {
        return useCustomizerSettingsStore
          .getState()
          .getEffectiveArmorDiagramMode();
      },

      getEffectiveArmorDiagramVariant: () => {
        return useCustomizerSettingsStore
          .getState()
          .getEffectiveArmorDiagramVariant();
      },

      // Other settings (immediately persisted)
      setArmorDiagramMode: (mode) => {
        useCustomizerSettingsStore.getState().setArmorDiagramMode(mode);
        set({ armorDiagramMode: mode });
      },
      setArmorDiagramVariant: (variant) => {
        useCustomizerSettingsStore.getState().setArmorDiagramVariant(variant);
        set({ armorDiagramVariant: variant });
      },
      setShowArmorDiagramSelector: (show) => {
        useCustomizerSettingsStore.getState().setShowArmorDiagramSelector(show);
        set({ showArmorDiagramSelector: show });
      },
      setSidebarDefaultCollapsed: (collapsed) => {
        useUIBehaviorStore.getState().setSidebarDefaultCollapsed(collapsed);
        set({ sidebarDefaultCollapsed: collapsed });
      },
      setConfirmOnClose: (confirm) => {
        useUIBehaviorStore.getState().setConfirmOnClose(confirm);
        set({ confirmOnClose: confirm });
      },
      setShowTooltips: (show) => {
        useUIBehaviorStore.getState().setShowTooltips(show);
        set({ showTooltips: show });
      },
      setHighContrast: (enabled) => {
        useAccessibilityStore.getState().setHighContrast(enabled);
        set({ highContrast: enabled });
      },
      setReduceMotion: (enabled) => {
        useAccessibilityStore.getState().setReduceMotion(enabled);
        set({ reduceMotion: enabled });
      },

      resetToDefaults: () => {
        useAppearanceStore.getState().resetToDefaults();
        useCustomizerSettingsStore.getState().resetToDefaults();
        useAccessibilityStore.getState().resetToDefaults();
        useUIBehaviorStore.getState().resetToDefaults();
        set({
          ...DEFAULT_SETTINGS,
          draftAppearance: null,
          hasUnsavedUITheme: false,
          hasUnsavedOtherAppearance: false,
          draftCustomizer: null,
          hasUnsavedCustomizer: false,
        });
      },
    }),
    {
      name: 'mekstation-app-settings',
      // Don't persist draft state
      partialize: (state) => ({
        accentColor: state.accentColor,
        fontSize: state.fontSize,
        animationLevel: state.animationLevel,
        compactMode: state.compactMode,
        uiTheme: state.uiTheme,
        armorDiagramMode: state.armorDiagramMode,
        armorDiagramVariant: state.armorDiagramVariant,
        showArmorDiagramSelector: state.showArmorDiagramSelector,
        sidebarDefaultCollapsed: state.sidebarDefaultCollapsed,
        confirmOnClose: state.confirmOnClose,
        showTooltips: state.showTooltips,
        highContrast: state.highContrast,
        reduceMotion: state.reduceMotion,
      }),
    },
  ),
);
