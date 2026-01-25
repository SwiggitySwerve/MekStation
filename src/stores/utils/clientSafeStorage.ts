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
