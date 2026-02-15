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
import {
  useAppearanceStore,
  type AccentColor,
  type FontSize,
  type AnimationLevel,
  type UITheme,
  type AppearanceSettings,
} from './useAppearanceStore';
import {
  createAppearanceActions,
  createDraftAppearanceActions,
  createCustomizerActions,
  createOtherSettingsActions,
} from './useAppSettingsStore.actions';
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
      ...createAppearanceActions(set),
      ...createDraftAppearanceActions(set),
      ...createCustomizerActions(set),
      ...createOtherSettingsActions(set),
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
