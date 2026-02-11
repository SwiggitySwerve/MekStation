/**
 * usePersistedState Hook
 *
 * A useState hook that persists to localStorage.
 * Useful for remembering UI state like sidebar collapse, theme preferences, etc.
 */

import { useState, useEffect, useCallback } from 'react';

import { logger } from '@/utils/logger';

/**
 * Hook that syncs state with localStorage
 *
 * @param key - The localStorage key
 * @param defaultValue - Default value if nothing in storage
 * @returns [value, setValue] tuple similar to useState
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize with default value (will be updated in useEffect)
  const [value, setValue] = useState<T>(defaultValue);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored));
      }
    } catch (e) {
      logger.warn(`Failed to read localStorage key "${key}":`, e);
    }
    setIsInitialized(true);
  }, [key]);

  // Persist to localStorage when value changes
  useEffect(() => {
    if (!isInitialized) return;
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      logger.warn(`Failed to write localStorage key "${key}":`, e);
    }
  }, [key, value, isInitialized]);

  // Wrapper to support functional updates
  const setPersistedValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved =
        typeof newValue === 'function'
          ? (newValue as (prev: T) => T)(prev)
          : newValue;
      return resolved;
    });
  }, []);

  return [value, setPersistedValue];
}

/**
 * Storage keys for MekStation UI preferences
 */
export const STORAGE_KEYS = {
  /** Main navigation sidebar collapsed state */
  SIDEBAR_COLLAPSED: 'mekstation:sidebar-collapsed',
  /** Equipment loadout tray expanded state (desktop) */
  LOADOUT_TRAY_EXPANDED: 'mekstation:loadout-tray-expanded',
  /** Equipment loadout bottom sheet expanded (mobile) */
  LOADOUT_SHEET_EXPANDED: 'mekstation:loadout-sheet-expanded',
} as const;
