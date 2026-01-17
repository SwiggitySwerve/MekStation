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
  | 'premium-material'
  | 'megamek';

/**
 * Global UI theme variants
 */
export type UITheme = 'default' | 'neon' | 'tactical' | 'minimal';

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
 * Customizer settings that support live preview with save/revert
 */
export interface CustomizerSettings {
  armorDiagramMode: ArmorDiagramMode;
  armorDiagramVariant: ArmorDiagramVariant;
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

  // Printing/PDF settings
  usePoissonPipDistribution: boolean; // Use Poisson sampling for armor/structure pips

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
  setUsePoissonPipDistribution: (enabled: boolean) => void;
  resetToDefaults: () => void;
}

/** Keys that are action functions, not state */
type ActionKeys =
  | 'setAccentColor' | 'setFontSize' | 'setAnimationLevel' | 'setCompactMode' | 'setUITheme'
  | 'setDraftAccentColor' | 'setDraftFontSize' | 'setDraftAnimationLevel' | 'setDraftCompactMode' | 'setDraftUITheme'
  | 'saveUITheme' | 'saveOtherAppearance' | 'revertAppearance' | 'initDraftAppearance'
  | 'getEffectiveAccentColor' | 'getEffectiveUITheme' | 'getEffectiveFontSize'
  | 'setDraftArmorDiagramMode' | 'setDraftArmorDiagramVariant'
  | 'saveCustomizer' | 'revertCustomizer' | 'initDraftCustomizer'
  | 'getEffectiveArmorDiagramMode' | 'getEffectiveArmorDiagramVariant'
  | 'setArmorDiagramMode' | 'setArmorDiagramVariant' | 'setShowArmorDiagramSelector' | 'setSidebarDefaultCollapsed'
  | 'setConfirmOnClose' | 'setShowTooltips' | 'setHighContrast' | 'setReduceMotion' | 'setUsePoissonPipDistribution' | 'resetToDefaults';

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

  // Printing/PDF settings
  usePoissonPipDistribution: false, // Default to legacy algorithm for stability
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
      // UITheme changes independently of ArmorDiagramVariant
      setUITheme: (theme) => set({ uiTheme: theme }),

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
        hasUnsavedOtherAppearance: true,
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
        hasUnsavedOtherAppearance: true,
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
        hasUnsavedOtherAppearance: true,
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
        hasUnsavedOtherAppearance: true,
      })),

      // Draft UITheme - tracked separately from other appearance settings
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
        hasUnsavedUITheme: true,
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
        hasUnsavedUITheme: false,
        hasUnsavedOtherAppearance: false,
      })),

      // Save UI Theme only (separate from other appearance settings)
      saveUITheme: () => set((state) => {
        if (!state.draftAppearance) return state;
        return {
          uiTheme: state.draftAppearance.uiTheme,
          hasUnsavedUITheme: false,
        };
      }),

      // Save other appearance settings (accent, font, animation, compact) - NOT theme
      saveOtherAppearance: () => set((state) => {
        if (!state.draftAppearance) return state;
        return {
          accentColor: state.draftAppearance.accentColor,
          fontSize: state.draftAppearance.fontSize,
          animationLevel: state.draftAppearance.animationLevel,
          compactMode: state.draftAppearance.compactMode,
          hasUnsavedOtherAppearance: false,
        };
      }),

      // Revert draft to saved state (call when leaving settings without save)
      // ArmorDiagramVariant is independent and not affected by appearance revert
      revertAppearance: () => set({
        draftAppearance: null,
        hasUnsavedUITheme: false,
        hasUnsavedOtherAppearance: false,
      }),

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

      // Draft customizer setters for live preview (not persisted until save)
      setDraftArmorDiagramMode: (mode) => set((state) => ({
        draftCustomizer: {
          armorDiagramMode: mode,
          armorDiagramVariant: state.draftCustomizer?.armorDiagramVariant ?? state.armorDiagramVariant,
        },
        hasUnsavedCustomizer: true,
      })),

      setDraftArmorDiagramVariant: (variant) => set((state) => ({
        draftCustomizer: {
          armorDiagramMode: state.draftCustomizer?.armorDiagramMode ?? state.armorDiagramMode,
          armorDiagramVariant: variant,
        },
        hasUnsavedCustomizer: true,
      })),

      // Initialize draft customizer with current saved values (call when entering customizer settings)
      initDraftCustomizer: () => set((state) => ({
        draftCustomizer: {
          armorDiagramMode: state.armorDiagramMode,
          armorDiagramVariant: state.armorDiagramVariant,
        },
        hasUnsavedCustomizer: false,
      })),

      // Save draft customizer to persisted state
      saveCustomizer: () => set((state) => {
        if (!state.draftCustomizer) return state;
        return {
          armorDiagramMode: state.draftCustomizer.armorDiagramMode,
          armorDiagramVariant: state.draftCustomizer.armorDiagramVariant,
          hasUnsavedCustomizer: false,
        };
      }),

      // Revert draft customizer to saved state (call when leaving customizer without save)
      revertCustomizer: () => set({
        draftCustomizer: null,
        hasUnsavedCustomizer: false,
      }),

      // Getters for effective customizer (draft if exists, otherwise saved)
      getEffectiveArmorDiagramMode: () => {
        const state = get();
        return state.draftCustomizer?.armorDiagramMode ?? state.armorDiagramMode;
      },

      getEffectiveArmorDiagramVariant: () => {
        const state = get();
        return state.draftCustomizer?.armorDiagramVariant ?? state.armorDiagramVariant;
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
      setUsePoissonPipDistribution: (enabled) => set({ usePoissonPipDistribution: enabled }),

      resetToDefaults: () => set({
        ...DEFAULT_SETTINGS,
        draftAppearance: null,
        hasUnsavedUITheme: false,
        hasUnsavedOtherAppearance: false,
        draftCustomizer: null,
        hasUnsavedCustomizer: false,
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
        usePoissonPipDistribution: state.usePoissonPipDistribution,
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
