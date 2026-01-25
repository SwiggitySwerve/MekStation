/**
 * Client-Safe Storage Utility
 *
 * SSR-safe localStorage wrapper for Zustand persist middleware.
 * Safely handles server-side rendering where window/localStorage are unavailable.
 *
 * @example
 * ```typescript
 * import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
 * import { persist, createJSONStorage } from 'zustand/middleware';
 *
 * const store = create(
 *   persist(
 *     (set, get) => ({ ... }),
 *     {
 *       name: 'my-store',
 *       storage: createJSONStorage(() => clientSafeStorage),
 *     }
 *   )
 * );
 * ```
 */

import type { StateStorage } from 'zustand/middleware';

/**
 * Storage wrapper that safely handles SSR (no localStorage on server).
 *
 * Returns null/no-op when running on server (typeof window === 'undefined'),
 * preventing hydration errors and SSR crashes.
 */
export const clientSafeStorage: StateStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(name);
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(name, value);
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(name);
  },
};

// =============================================================================
// Simple SSR-Safe Helpers
// =============================================================================

/**
 * Safely get item from localStorage (returns null during SSR).
 * Use this for one-off reads outside of Zustand persist middleware.
 */
export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

/**
 * Safely set item in localStorage (no-op during SSR).
 * Use this for one-off writes outside of Zustand persist middleware.
 */
export function safeSetItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, value);
}

/**
 * Safely remove item from localStorage (no-op during SSR).
 * Use this for one-off deletions outside of Zustand persist middleware.
 */
export function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}
