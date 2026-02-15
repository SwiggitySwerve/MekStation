/**
 * Multi-Unit Tab Store
 *
 * Manages multiple unit tabs with:
 * - Tab creation, selection, closing
 * - Component selections persistence
 * - Unsaved changes tracking
 * - localStorage persistence
 *
 * @spec openspec/specs/multi-unit-tabs/spec.md
 * @spec openspec/specs/component-configuration/spec.md
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import {
  TechBaseMode,
  createDefaultComponentTechBases,
} from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';

import {
  createTabActions,
  createTechBaseActions,
  createComponentSelectionActions,
} from './useMultiUnitStore.actions';
import { createDefaultComponentSelections } from './useMultiUnitStore.helpers';
import {
  MultiUnitState,
  UnitTab,
  UNIT_TEMPLATES,
  IComponentSelections,
  UnitTemplate,
} from './useMultiUnitStore.types';

export type { MultiUnitState, UnitTab, UnitTemplate, IComponentSelections };
export { UNIT_TEMPLATES, createDefaultComponentSelections };

export const useMultiUnitStore = create<MultiUnitState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,
      isLoading: true,
      isNewTabModalOpen: false,

      ...createTabActions(set, get),
      ...createTechBaseActions(set),
      ...createComponentSelectionActions(set),

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'megamek-multi-unit-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
      // Migrate existing tabs that don't have new fields
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<MultiUnitState>;

        // Migrate tabs to include all configuration fields
        const migratedTabs = (persistedState.tabs || []).map((tab) => {
          const needsTechBaseMigration =
            !tab.techBaseMode || !tab.componentTechBases;
          const needsComponentMigration = !tab.componentSelections;

          if (!needsTechBaseMigration && !needsComponentMigration) {
            return tab;
          }

          const initialMode: TechBaseMode =
            tab.techBase === TechBase.CLAN
              ? TechBaseMode.CLAN
              : TechBaseMode.INNER_SPHERE;

          return {
            ...tab,
            // Tech base configuration
            techBaseMode: tab.techBaseMode || initialMode,
            componentTechBases:
              tab.componentTechBases ||
              createDefaultComponentTechBases(tab.techBase),
            // Component selections
            componentSelections:
              tab.componentSelections ||
              createDefaultComponentSelections(
                tab.tonnage,
                4, // Default walk MP
                tab.techBase,
              ),
          };
        });

        return {
          ...current,
          tabs: migratedTabs,
          activeTabId: persistedState.activeTabId ?? current.activeTabId,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setLoading(false);
        }
      },
    },
  ),
);
