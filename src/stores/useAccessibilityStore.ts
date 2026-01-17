/**
 * Accessibility Store
 *
 * Manages accessibility settings: high contrast mode and reduce motion preference.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Accessibility store state
 */
export interface AccessibilityState {
  // Accessibility settings (persisted)
  highContrast: boolean;
  reduceMotion: boolean;

  // Actions
  setHighContrast: (enabled: boolean) => void;
  setReduceMotion: (enabled: boolean) => void;

  // Reset
  resetToDefaults: () => void;
}

/** Keys that are action functions, not state */
type ActionKeys = 'setHighContrast' | 'setReduceMotion' | 'resetToDefaults';

const DEFAULT_ACCESSIBILITY: Omit<AccessibilityState, ActionKeys> = {
  highContrast: false,
  reduceMotion: false,
};

/**
 * Accessibility store with localStorage persistence
 */
export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set) => ({
      ...DEFAULT_ACCESSIBILITY,

      setHighContrast: (enabled) => set({ highContrast: enabled }),
      setReduceMotion: (enabled) => set({ reduceMotion: enabled }),

      resetToDefaults: () => set({
        ...DEFAULT_ACCESSIBILITY,
      }),
    }),
    {
      name: 'mekstation-accessibility',
    }
  )
);
