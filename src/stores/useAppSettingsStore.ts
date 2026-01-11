/**
 * App Settings Store
 *
 * Global app preferences stored in localStorage.
 * Includes appearance, UI preferences, and feature settings.
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
  | 'premium-material';

/**
 * Global UI theme variants
 */
export type UITheme = 'default' | 'neon' | 'tactical' | 'minimal';

/**
 * Mapping from UITheme to matching ArmorDiagramVariant
 * This enables automatic synchronization of design styles across the app
 */
export const UI_THEME_TO_DIAGRAM_VARIANT: Record<UITheme, ArmorDiagramVariant> = {
  'default': 'clean-tech',
  'neon': 'neon-operator',
  'tactical': 'tactical-hud',
  'minimal': 'premium-material',
};

/**
 * Accent color options
 */
export type AccentColor =
  | 'amber'
  | 'cyan'
  | 'emerald'
  | 'rose'
  | 'violet'
  | 'blue';

/**
 * Font size options
 */
export type FontSize = 'small' | 'medium' | 'large';

/**
 * Animation preference
 */
export type AnimationLevel = 'full' | 'reduced' | 'none';

/**
 * Appearance settings that support live preview with save/revert
 */
export interface AppearanceSettings {
  accentColor: AccentColor;
  fontSize: FontSize;
  animationLevel: AnimationLevel;
  compactMode: boolean;
  uiTheme: UITheme;
}

/**
 * App settings state
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
  hasUnsavedAppearance: boolean;

  // Customizer preferences
  armorDiagramMode: ArmorDiagramMode;
  armorDiagramVariant: ArmorDiagramVariant;
  showArmorDiagramSelector: boolean; // UAT feature flag

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
  saveAppearance: () => void;
  revertAppearance: () => void;
  initDraftAppearance: () => void;

  // Getters for effective (draft or saved) appearance
  getEffectiveAccentColor: () => AccentColor;
  getEffectiveUITheme: () => UITheme;
  getEffectiveFontSize: () => FontSize;

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
  | 'setAccentColor' | 'setFontSize' | 'setAnimationLevel' | 'setCompactMode' | 'setUITheme'
  | 'setDraftAccentColor' | 'setDraftFontSize' | 'setDraftAnimationLevel' | 'setDraftCompactMode' | 'setDraftUITheme'
  | 'saveAppearance' | 'revertAppearance' | 'initDraftAppearance'
  | 'getEffectiveAccentColor' | 'getEffectiveUITheme' | 'getEffectiveFontSize'
  | 'setArmorDiagramMode' | 'setArmorDiagramVariant' | 'setShowArmorDiagramSelector' | 'setSidebarDefaultCollapsed'
  | 'setConfirmOnClose' | 'setShowTooltips' | 'setHighContrast' | 'setReduceMotion' | 'resetToDefaults';

const DEFAULT_SETTINGS: Omit<AppSettingsState, ActionKeys> = {
  // Appearance
  accentColor: 'amber',
  fontSize: 'medium',
  animationLevel: 'full',
  compactMode: false,
  uiTheme: 'default',

  // Draft state (not persisted)
  draftAppearance: null,
  hasUnsavedAppearance: false,

  // Customizer preferences
  armorDiagramMode: 'silhouette',
  armorDiagramVariant: 'clean-tech',
  showArmorDiagramSelector: true, // Enable UAT selector by default

  // UI behavior
  sidebarDefaultCollapsed: false,
  confirmOnClose: true,
  showTooltips: true,

  // Accessibility
  highContrast: false,
  reduceMotion: false,
};

/**
 * App settings store with localStorage persistence
 */
export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,

      // Direct setters (immediately persisted) - used for non-appearance settings
      setAccentColor: (color) => set({ accentColor: color }),
      setFontSize: (size) => set({ fontSize: size }),
      setAnimationLevel: (level) => set({ animationLevel: level }),
      setCompactMode: (compact) => set({ compactMode: compact }),
      // When UITheme changes, also sync the ArmorDiagramVariant to match
      setUITheme: (theme) => set({
        uiTheme: theme,
        armorDiagramVariant: UI_THEME_TO_DIAGRAM_VARIANT[theme],
      }),

      // Draft setters for live preview (not persisted until save)
      setDraftAccentColor: (color) => set((state) => ({
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
        hasUnsavedAppearance: true,
      })),

      setDraftFontSize: (size) => set((state) => ({
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
        hasUnsavedAppearance: true,
      })),

      setDraftAnimationLevel: (level) => set((state) => ({
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
        hasUnsavedAppearance: true,
      })),

      setDraftCompactMode: (compact) => set((state) => ({
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
        hasUnsavedAppearance: true,
      })),

      // When draft UITheme changes, also update the armorDiagramVariant for live preview
      setDraftUITheme: (theme) => set((state) => ({
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
        // Sync diagram variant for immediate preview
        armorDiagramVariant: UI_THEME_TO_DIAGRAM_VARIANT[theme],
        hasUnsavedAppearance: true,
      })),

      // Initialize draft with current saved values (call when entering settings)
      initDraftAppearance: () => set((state) => ({
        draftAppearance: {
          accentColor: state.accentColor,
          fontSize: state.fontSize,
          animationLevel: state.animationLevel,
          compactMode: state.compactMode,
          uiTheme: state.uiTheme,
        },
        hasUnsavedAppearance: false,
      })),

      // Save draft to persisted state
      saveAppearance: () => set((state) => {
        if (!state.draftAppearance) return state;
        return {
          accentColor: state.draftAppearance.accentColor,
          fontSize: state.draftAppearance.fontSize,
          animationLevel: state.draftAppearance.animationLevel,
          compactMode: state.draftAppearance.compactMode,
          uiTheme: state.draftAppearance.uiTheme,
          hasUnsavedAppearance: false,
        };
      }),

      // Revert draft to saved state (call when leaving settings without save)
      // Also restore armorDiagramVariant to match the saved uiTheme
      revertAppearance: () => set((state) => ({
        draftAppearance: null,
        hasUnsavedAppearance: false,
        // Restore diagram variant to match the saved (not draft) UI theme
        armorDiagramVariant: UI_THEME_TO_DIAGRAM_VARIANT[state.uiTheme],
      })),

      // Getters for effective appearance (draft if exists, otherwise saved)
      getEffectiveAccentColor: () => {
        const state = get();
        return state.draftAppearance?.accentColor ?? state.accentColor;
      },

      getEffectiveUITheme: () => {
        const state = get();
        return state.draftAppearance?.uiTheme ?? state.uiTheme;
      },

      getEffectiveFontSize: () => {
        const state = get();
        return state.draftAppearance?.fontSize ?? state.fontSize;
      },

      // Other settings (immediately persisted)
      setArmorDiagramMode: (mode) => set({ armorDiagramMode: mode }),
      setArmorDiagramVariant: (variant) => set({ armorDiagramVariant: variant }),
      setShowArmorDiagramSelector: (show) => set({ showArmorDiagramSelector: show }),
      setSidebarDefaultCollapsed: (collapsed) => set({ sidebarDefaultCollapsed: collapsed }),
      setConfirmOnClose: (confirm) => set({ confirmOnClose: confirm }),
      setShowTooltips: (show) => set({ showTooltips: show }),
      setHighContrast: (enabled) => set({ highContrast: enabled }),
      setReduceMotion: (enabled) => set({ reduceMotion: enabled }),

      resetToDefaults: () => set({
        ...DEFAULT_SETTINGS,
        draftAppearance: null,
        hasUnsavedAppearance: false,
      }),
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
    }
  )
);

/**
 * Accent color CSS variable mappings
 */
export const ACCENT_COLOR_CSS: Record<AccentColor, { primary: string; hover: string; muted: string }> = {
  amber: {
    primary: '#f59e0b',
    hover: '#d97706',
    muted: 'rgba(245, 158, 11, 0.15)',
  },
  cyan: {
    primary: '#06b6d4',
    hover: '#0891b2',
    muted: 'rgba(6, 182, 212, 0.15)',
  },
  emerald: {
    primary: '#10b981',
    hover: '#059669',
    muted: 'rgba(16, 185, 129, 0.15)',
  },
  rose: {
    primary: '#f43f5e',
    hover: '#e11d48',
    muted: 'rgba(244, 63, 94, 0.15)',
  },
  violet: {
    primary: '#8b5cf6',
    hover: '#7c3aed',
    muted: 'rgba(139, 92, 246, 0.15)',
  },
  blue: {
    primary: '#3b82f6',
    hover: '#2563eb',
    muted: 'rgba(59, 130, 246, 0.15)',
  },
};

/**
 * Font size CSS mappings
 */
export const FONT_SIZE_CSS: Record<FontSize, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
};
