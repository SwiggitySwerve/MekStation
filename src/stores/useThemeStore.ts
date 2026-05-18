import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { ThemePersistedSchema } from '@/stores/utils/persistedStoreSchemas';
import { createZodPersistMerge } from '@/stores/utils/zodPersistMerge';

export type ThemeMode = 'light' | 'dark';

export interface IThemeState {
  readonly theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  applyTheme: () => void;
}

export const useThemeStore = create<IThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',

      toggleTheme: () => {
        set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' }));
        get().applyTheme();
      },

      setTheme: (theme: ThemeMode) => {
        set({ theme });
        get().applyTheme();
      },

      applyTheme: () => {
        const { theme } = get();
        if (typeof document !== 'undefined') {
          if (theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },
    }),
    {
      name: 'theme-preference',
      // Validate the rehydrated `localStorage` payload against a Zod schema;
      // a corrupt payload is discarded and the store keeps its default state.
      merge: createZodPersistMerge<IThemeState>(
        ThemePersistedSchema,
        'theme-preference',
      ),
      onRehydrateStorage: () => (state) => {
        state?.applyTheme();
      },
    },
  ),
);

export function useThemeSelector<T>(selector: (state: IThemeState) => T): T {
  return useThemeStore(selector);
}
