/**
 * App Settings Store
 *
 * Global app preferences stored in localStorage.
 * Includes appearance, UI preferences, and feature settings.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Armor diagram design variants
 */
export type ArmorDiagramVariant =
  | 'clean-tech'
  | 'neon-operator'
  | 'tactical-hud'
  | 'premium-material';

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
 * App settings state
 */
export interface AppSettingsState {
  // Appearance
  accentColor: AccentColor;
  fontSize: FontSize;
  animationLevel: AnimationLevel;
  compactMode: boolean;

  // Customizer preferences
  armorDiagramVariant: ArmorDiagramVariant;
  showArmorDiagramSelector: boolean; // UAT feature flag

  // UI behavior
  sidebarDefaultCollapsed: boolean;
  confirmOnClose: boolean;
  showTooltips: boolean;

  // Accessibility
  highContrast: boolean;
  reduceMotion: boolean;

  // Actions
  setAccentColor: (color: AccentColor) => void;
  setFontSize: (size: FontSize) => void;
  setAnimationLevel: (level: AnimationLevel) => void;
  setCompactMode: (compact: boolean) => void;
  setArmorDiagramVariant: (variant: ArmorDiagramVariant) => void;
  setShowArmorDiagramSelector: (show: boolean) => void;
  setSidebarDefaultCollapsed: (collapsed: boolean) => void;
  setConfirmOnClose: (confirm: boolean) => void;
  setShowTooltips: (show: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setReduceMotion: (enabled: boolean) => void;
  resetToDefaults: () => void;
}

const DEFAULT_SETTINGS: Omit<AppSettingsState, 'setAccentColor' | 'setFontSize' | 'setAnimationLevel' | 'setCompactMode' | 'setArmorDiagramVariant' | 'setShowArmorDiagramSelector' | 'setSidebarDefaultCollapsed' | 'setConfirmOnClose' | 'setShowTooltips' | 'setHighContrast' | 'setReduceMotion' | 'resetToDefaults'> = {
  // Appearance
  accentColor: 'amber',
  fontSize: 'medium',
  animationLevel: 'full',
  compactMode: false,

  // Customizer preferences
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
    (set) => ({
      ...DEFAULT_SETTINGS,

      setAccentColor: (color) => set({ accentColor: color }),
      setFontSize: (size) => set({ fontSize: size }),
      setAnimationLevel: (level) => set({ animationLevel: level }),
      setCompactMode: (compact) => set({ compactMode: compact }),
      setArmorDiagramVariant: (variant) => set({ armorDiagramVariant: variant }),
      setShowArmorDiagramSelector: (show) => set({ showArmorDiagramSelector: show }),
      setSidebarDefaultCollapsed: (collapsed) => set({ sidebarDefaultCollapsed: collapsed }),
      setConfirmOnClose: (confirm) => set({ confirmOnClose: confirm }),
      setShowTooltips: (show) => set({ showTooltips: show }),
      setHighContrast: (enabled) => set({ highContrast: enabled }),
      setReduceMotion: (enabled) => set({ reduceMotion: enabled }),

      resetToDefaults: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'mekstation-app-settings',
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
