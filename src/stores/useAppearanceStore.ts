/**
 * Appearance Store
 *
 * Manages visual appearance settings: accent color, font size, animation level,
 * compact mode, and UI theme. Supports live preview with draft state.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
 * Appearance store state
 */
export interface AppearanceState {
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

  // Reset
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
  | 'resetToDefaults';

const DEFAULT_APPEARANCE: Omit<AppearanceState, ActionKeys> = {
  accentColor: 'amber',
  fontSize: 'medium',
  animationLevel: 'full',
  compactMode: false,
  uiTheme: 'default',
  draftAppearance: null,
  hasUnsavedUITheme: false,
  hasUnsavedOtherAppearance: false,
};

/**
 * Appearance store with localStorage persistence
 */
export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_APPEARANCE,

      // Direct setters (immediately persisted)
      setAccentColor: (color) => set({ accentColor: color }),
      setFontSize: (size) => set({ fontSize: size }),
      setAnimationLevel: (level) => set({ animationLevel: level }),
      setCompactMode: (compact) => set({ compactMode: compact }),
      setUITheme: (theme) => set({ uiTheme: theme }),

      // Draft setters for live preview (not persisted until save)
      setDraftAccentColor: (color) =>
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
        })),

      setDraftFontSize: (size) =>
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
        })),

      setDraftAnimationLevel: (level) =>
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
        })),

      setDraftCompactMode: (compact) =>
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
        })),

      // Draft UITheme - tracked separately from other appearance settings
      setDraftUITheme: (theme) =>
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
        })),

      // Initialize draft with current saved values (call when entering settings)
      initDraftAppearance: () =>
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
        })),

      // Save UI Theme only (separate from other appearance settings)
      saveUITheme: () =>
        set((state) => {
          if (!state.draftAppearance) return state;
          return {
            uiTheme: state.draftAppearance.uiTheme,
            hasUnsavedUITheme: false,
          };
        }),

      // Save other appearance settings (accent, font, animation, compact) - NOT theme
      saveOtherAppearance: () =>
        set((state) => {
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
      revertAppearance: () =>
        set({
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

      resetToDefaults: () =>
        set({
          ...DEFAULT_APPEARANCE,
        }),
    }),
    {
      name: 'mekstation-appearance',
      // Don't persist draft state
      partialize: (state) => ({
        accentColor: state.accentColor,
        fontSize: state.fontSize,
        animationLevel: state.animationLevel,
        compactMode: state.compactMode,
        uiTheme: state.uiTheme,
      }),
    },
  ),
);

/**
 * Accent color CSS variable mappings
 */
export const ACCENT_COLOR_CSS: Record<
  AccentColor,
  { primary: string; hover: string; muted: string }
> = {
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
