import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import {
  TechBaseMode,
  TechBaseComponent,
  IComponentTechBases,
  createDefaultComponentTechBases,
} from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';

import { createNewTab, duplicateTabData } from './useMultiUnitStore.helpers';
import {
  IComponentSelections,
  UnitTemplate,
  MultiUnitState,
  UnitTab,
} from './useMultiUnitStore.types';

type SetFn = (
  partial:
    | Partial<MultiUnitState>
    | ((state: MultiUnitState) => Partial<MultiUnitState>),
) => void;
type GetFn = () => MultiUnitState;

type TabActions = {
  createTab: (template: UnitTemplate, customName?: string) => string;
  duplicateTab: (tabId: string) => string | null;
  closeTab: (tabId: string) => void;
  selectTab: (tabId: string) => void;
  renameTab: (tabId: string, name: string) => void;
  markModified: (tabId: string, modified?: boolean) => void;
  openNewTabModal: () => void;
  closeNewTabModal: () => void;
  getActiveTab: () => UnitTab | null;
};

type TechBaseActions = {
  updateTechBaseMode: (tabId: string, mode: TechBaseMode) => void;
  updateComponentTechBase: (tabId: string, component: TechBaseComponent, techBase: TechBase) => void;
  setAllComponentTechBases: (tabId: string, techBases: IComponentTechBases) => void;
};

type ComponentSelectionActions = {
  updateEngineType: (tabId: string, engineType: EngineType) => void;
  updateEngineRating: (tabId: string, rating: number) => void;
  updateGyroType: (tabId: string, gyroType: GyroType) => void;
  updateStructureType: (tabId: string, structureType: InternalStructureType) => void;
  updateCockpitType: (tabId: string, cockpitType: CockpitType) => void;
  updateHeatSinkType: (tabId: string, heatSinkType: HeatSinkType) => void;
  updateHeatSinkCount: (tabId: string, count: number) => void;
  updateArmorType: (tabId: string, armorType: ArmorTypeEnum) => void;
  updateComponentSelections: (tabId: string, selections: Partial<IComponentSelections>) => void;
};

export function createTabActions(set: SetFn, get: GetFn): TabActions {
  return {
    createTab: (template: UnitTemplate, customName?: string): string => {
      const newTab = createNewTab(template, customName);

      set((state) => ({
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id,
        isNewTabModalOpen: false,
      }));

      return newTab.id;
    },

    duplicateTab: (tabId: string): string | null => {
      const state = get();
      const sourceTab = state.tabs.find((t) => t.id === tabId);
      if (!sourceTab) return null;

      const newTab = duplicateTabData(sourceTab);

      set((state) => ({
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id,
      }));

      return newTab.id;
    },

    closeTab: (tabId: string): void => {
      set((state) => {
        const tabIndex = state.tabs.findIndex((t) => t.id === tabId);
        if (tabIndex === -1) return state;

        if (state.tabs.length === 1) return state;

        const newTabs = state.tabs.filter((t) => t.id !== tabId);

        let newActiveId = state.activeTabId;
        if (state.activeTabId === tabId) {
          const newIndex = Math.min(tabIndex, newTabs.length - 1);
          newActiveId = newTabs[newIndex]?.id || null;
        }

        return {
          tabs: newTabs,
          activeTabId: newActiveId,
        };
      });
    },

    selectTab: (tabId: string): void => {
      set({ activeTabId: tabId });
    },

    renameTab: (tabId: string, name: string): void => {
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === tabId ? { ...tab, name, lastModifiedAt: Date.now() } : tab,
        ),
      }));
    },

    markModified: (tabId: string, modified = true): void => {
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === tabId
            ? { ...tab, isModified: modified, lastModifiedAt: Date.now() }
            : tab,
        ),
      }));
    },

    openNewTabModal: (): void => set({ isNewTabModalOpen: true }),

    closeNewTabModal: (): void => set({ isNewTabModalOpen: false }),

    getActiveTab: () => {
      const state = get();
      return state.tabs.find((t) => t.id === state.activeTabId) || null;
    },
  };
}

export function createTechBaseActions(set: SetFn): TechBaseActions {
  return {
    updateTechBaseMode: (tabId: string, mode: TechBaseMode): void => {
      set((state) => ({
        tabs: state.tabs.map((tab) => {
          if (tab.id !== tabId) return tab;

          const newTechBase =
            mode === 'clan' ? TechBase.CLAN : TechBase.INNER_SPHERE;
          const newComponentTechBases =
            mode === 'mixed'
              ? tab.componentTechBases
              : createDefaultComponentTechBases(newTechBase);

          return {
            ...tab,
            techBaseMode: mode,
            componentTechBases: newComponentTechBases,
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
      }));
    },

    updateComponentTechBase: (
      tabId: string,
      component: TechBaseComponent,
      techBase: TechBase,
    ): void => {
      set((state) => ({
        tabs: state.tabs.map((tab) => {
          if (tab.id !== tabId) return tab;
          return {
            ...tab,
            componentTechBases: {
              ...tab.componentTechBases,
              [component]: techBase,
            },
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
      }));
    },

    setAllComponentTechBases: (
      tabId: string,
      techBases: IComponentTechBases,
    ): void => {
      set((state) => ({
        tabs: state.tabs.map((tab) => {
          if (tab.id !== tabId) return tab;
          return {
            ...tab,
            componentTechBases: techBases,
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
      }));
    },
  };
}

export function createComponentSelectionActions(set: SetFn): ComponentSelectionActions {
  return {
    updateEngineType: (tabId: string, engineType: EngineType): void => {
      set((state) => ({
        tabs: state.tabs.map((tab) => {
          if (tab.id !== tabId) return tab;
          return {
            ...tab,
            componentSelections: {
              ...tab.componentSelections,
              engineType,
            },
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
      }));
    },

    updateEngineRating: (tabId: string, rating: number): void => {
      set((state) => ({
        tabs: state.tabs.map((tab) => {
          if (tab.id !== tabId) return tab;
          return {
            ...tab,
            componentSelections: {
              ...tab.componentSelections,
              engineRating: rating,
            },
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
      }));
    },

    updateGyroType: (tabId: string, gyroType: GyroType): void => {
      set((state) => ({
        tabs: state.tabs.map((tab) => {
          if (tab.id !== tabId) return tab;
          return {
            ...tab,
            componentSelections: {
              ...tab.componentSelections,
              gyroType,
            },
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
      }));
    },

    updateStructureType: (
      tabId: string,
      structureType: InternalStructureType,
    ): void => {
      set((state) => ({
        tabs: state.tabs.map((tab) => {
          if (tab.id !== tabId) return tab;
          return {
            ...tab,
            componentSelections: {
              ...tab.componentSelections,
              internalStructureType: structureType,
            },
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
      }));
    },

    updateCockpitType: (tabId: string, cockpitType: CockpitType): void => {
      set((state) => ({
        tabs: state.tabs.map((tab) => {
          if (tab.id !== tabId) return tab;
          return {
            ...tab,
            componentSelections: {
              ...tab.componentSelections,
              cockpitType,
            },
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
      }));
    },

    updateHeatSinkType: (tabId: string, heatSinkType: HeatSinkType): void => {
      set((state) => ({
        tabs: state.tabs.map((tab) => {
          if (tab.id !== tabId) return tab;
          return {
            ...tab,
            componentSelections: {
              ...tab.componentSelections,
              heatSinkType,
            },
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
      }));
    },

    updateHeatSinkCount: (tabId: string, count: number): void => {
      set((state) => ({
        tabs: state.tabs.map((tab) => {
          if (tab.id !== tabId) return tab;
          return {
            ...tab,
            componentSelections: {
              ...tab.componentSelections,
              heatSinkCount: count,
            },
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
      }));
    },

    updateArmorType: (tabId: string, armorType: ArmorTypeEnum): void => {
      set((state) => ({
        tabs: state.tabs.map((tab) => {
          if (tab.id !== tabId) return tab;
          return {
            ...tab,
            componentSelections: {
              ...tab.componentSelections,
              armorType,
            },
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
      }));
    },

    updateComponentSelections: (
      tabId: string,
      selections: Partial<IComponentSelections>,
    ): void => {
      set((state) => ({
        tabs: state.tabs.map((tab) => {
          if (tab.id !== tabId) return tab;
          return {
            ...tab,
            componentSelections: {
              ...tab.componentSelections,
              ...selections,
            },
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
      }));
    },
  };
}
