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
import { MechConfiguration, UnitType } from '@/types/unit/BattleMechInterfaces';
import { JumpJetType } from '@/utils/construction/movementCalculations';

// =============================================================================
// Component Selections Interface
// =============================================================================

/**
 * All component selections for a unit
 */
export interface IComponentSelections {
  // Engine
  engineType: EngineType;
  engineRating: number;

  // Gyro
  gyroType: GyroType;

  // Structure
  internalStructureType: InternalStructureType;

  // Cockpit
  cockpitType: CockpitType;

  // Heat Sinks
  heatSinkType: HeatSinkType;
  heatSinkCount: number;

  // Armor
  armorType: ArmorTypeEnum;

  // Jump Jets
  jumpMP?: number;
  jumpJetType?: JumpJetType;
}

/**
 * Create default component selections for a unit
 */
export function createDefaultComponentSelections(
  tonnage: number,
  walkMP: number = 4,
  _techBase: TechBase = TechBase.INNER_SPHERE,
): IComponentSelections {
  const engineRating = tonnage * walkMP;

  return {
    engineType: EngineType.STANDARD,
    engineRating,
    gyroType: GyroType.STANDARD,
    internalStructureType: InternalStructureType.STANDARD,
    cockpitType: CockpitType.STANDARD,
    heatSinkType: HeatSinkType.SINGLE,
    heatSinkCount: 10,
    armorType: ArmorTypeEnum.STANDARD,
  };
}

// =============================================================================
// Unit Tab Interface
// =============================================================================

/**
 * Unit tab state
 *
 * Contains all configuration state for a single unit, persisted across
 * customizer tab navigation and browser sessions.
 */
export interface UnitTab {
  /** Unique tab identifier */
  readonly id: string;
  /** Display name (user-editable) */
  name: string;
  /** Unit type */
  readonly unitType: UnitType;
  /** Tonnage */
  readonly tonnage: number;
  /** Tech base (base value for the unit) */
  readonly techBase: TechBase;
  /** Mech configuration */
  readonly configuration: MechConfiguration;
  /** Has unsaved changes */
  isModified: boolean;
  /** Creation timestamp */
  readonly createdAt: number;
  /** Last modified timestamp */
  lastModifiedAt: number;

  // ==========================================================================
  // Tech Base Configuration (persisted across tab navigation)
  // ==========================================================================

  /** Tech base mode: inner_sphere, clan, or mixed */
  techBaseMode: TechBaseMode;
  /** Per-component tech base settings (used when techBaseMode is 'mixed') */
  componentTechBases: IComponentTechBases;

  // ==========================================================================
  // Component Selections (persisted across tab navigation)
  // ==========================================================================

  /** All component type selections */
  componentSelections: IComponentSelections;
}

/**
 * Unit template for creating new tabs
 */
export interface UnitTemplate {
  readonly id: string;
  readonly name: string;
  readonly tonnage: number;
  readonly techBase: TechBase;
  readonly walkMP: number;
  readonly jumpMP: number;
}

/**
 * Default unit templates
 */
export const UNIT_TEMPLATES: readonly UnitTemplate[] = [
  {
    id: 'light',
    name: 'Light Mech',
    tonnage: 25,
    techBase: TechBase.INNER_SPHERE,
    walkMP: 8,
    jumpMP: 0,
  },
  {
    id: 'medium',
    name: 'Medium Mech',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
    walkMP: 5,
    jumpMP: 0,
  },
  {
    id: 'heavy',
    name: 'Heavy Mech',
    tonnage: 70,
    techBase: TechBase.INNER_SPHERE,
    walkMP: 4,
    jumpMP: 0,
  },
  {
    id: 'assault',
    name: 'Assault Mech',
    tonnage: 100,
    techBase: TechBase.INNER_SPHERE,
    walkMP: 3,
    jumpMP: 0,
  },
];

// =============================================================================
// Store State Interface
// =============================================================================

/**
 * Multi-unit store state
 */
export interface MultiUnitState {
  // Tab state
  tabs: UnitTab[];
  activeTabId: string | null;

  // UI state
  isLoading: boolean;
  isNewTabModalOpen: boolean;

  // Tab management actions
  createTab: (template: UnitTemplate, name?: string) => string;
  duplicateTab: (tabId: string) => string | null;
  closeTab: (tabId: string) => void;
  selectTab: (tabId: string) => void;
  renameTab: (tabId: string, name: string) => void;
  markModified: (tabId: string, modified?: boolean) => void;
  openNewTabModal: () => void;
  closeNewTabModal: () => void;
  getActiveTab: () => UnitTab | null;

  // Tech base configuration actions
  updateTechBaseMode: (tabId: string, mode: TechBaseMode) => void;
  updateComponentTechBase: (
    tabId: string,
    component: TechBaseComponent,
    techBase: TechBase,
  ) => void;
  setAllComponentTechBases: (
    tabId: string,
    techBases: IComponentTechBases,
  ) => void;

  // Component selection actions
  updateEngineType: (tabId: string, engineType: EngineType) => void;
  updateEngineRating: (tabId: string, rating: number) => void;
  updateGyroType: (tabId: string, gyroType: GyroType) => void;
  updateStructureType: (
    tabId: string,
    structureType: InternalStructureType,
  ) => void;
  updateCockpitType: (tabId: string, cockpitType: CockpitType) => void;
  updateHeatSinkType: (tabId: string, heatSinkType: HeatSinkType) => void;
  updateHeatSinkCount: (tabId: string, count: number) => void;
  updateArmorType: (tabId: string, armorType: ArmorTypeEnum) => void;
  updateComponentSelections: (
    tabId: string,
    selections: Partial<IComponentSelections>,
  ) => void;

  // Persistence helpers
  setLoading: (loading: boolean) => void;
}

// =============================================================================
// Store Implementation
// =============================================================================

/**
 * Generate unique tab ID
 */
function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Multi-unit tab store with localStorage persistence
 */
export const useMultiUnitStore = create<MultiUnitState>()(
  persist(
    (set, get) => ({
      // Initial state
      tabs: [],
      activeTabId: null,
      isLoading: true,
      isNewTabModalOpen: false,

      // =======================================================================
      // Tab Management Actions
      // =======================================================================

      createTab: (template, customName) => {
        const id = generateTabId();
        const now = Date.now();
        const name = customName || 'Mek';

        // Determine initial tech base mode based on template
        const initialMode: TechBaseMode =
          template.techBase === TechBase.CLAN
            ? TechBaseMode.CLAN
            : TechBaseMode.INNER_SPHERE;

        const newTab: UnitTab = {
          id,
          name,
          unitType: UnitType.BATTLEMECH,
          tonnage: template.tonnage,
          techBase: template.techBase,
          configuration: MechConfiguration.BIPED,
          isModified: true,
          createdAt: now,
          lastModifiedAt: now,
          // Tech base configuration
          techBaseMode: initialMode,
          componentTechBases: createDefaultComponentTechBases(
            template.techBase,
          ),
          // Component selections
          componentSelections: createDefaultComponentSelections(
            template.tonnage,
            template.walkMP,
            template.techBase,
          ),
        };

        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: id,
          isNewTabModalOpen: false,
        }));

        return id;
      },

      duplicateTab: (tabId) => {
        const state = get();
        const sourceTab = state.tabs.find((t) => t.id === tabId);
        if (!sourceTab) return null;

        const id = generateTabId();
        const now = Date.now();

        // Copy all configuration including tech base and component selections
        const newTab: UnitTab = {
          ...sourceTab,
          id,
          name: `${sourceTab.name} (Copy)`,
          isModified: true,
          createdAt: now,
          lastModifiedAt: now,
          // Deep copy objects to avoid shared references
          componentTechBases: { ...sourceTab.componentTechBases },
          componentSelections: { ...sourceTab.componentSelections },
        };

        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: id,
        }));

        return id;
      },

      closeTab: (tabId) => {
        set((state) => {
          const tabIndex = state.tabs.findIndex((t) => t.id === tabId);
          if (tabIndex === -1) return state;

          // Prevent closing last tab
          if (state.tabs.length === 1) return state;

          const newTabs = state.tabs.filter((t) => t.id !== tabId);

          // Select adjacent tab if closing active tab
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

      selectTab: (tabId) => {
        set({ activeTabId: tabId });
      },

      renameTab: (tabId, name) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId
              ? { ...tab, name, lastModifiedAt: Date.now() }
              : tab,
          ),
        }));
      },

      markModified: (tabId, modified = true) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId
              ? { ...tab, isModified: modified, lastModifiedAt: Date.now() }
              : tab,
          ),
        }));
      },

      openNewTabModal: () => set({ isNewTabModalOpen: true }),

      closeNewTabModal: () => set({ isNewTabModalOpen: false }),

      getActiveTab: () => {
        const state = get();
        return state.tabs.find((t) => t.id === state.activeTabId) || null;
      },

      // =======================================================================
      // Tech Base Configuration Actions
      // =======================================================================

      updateTechBaseMode: (tabId, mode) => {
        set((state) => ({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== tabId) return tab;

            // When switching to non-mixed mode, reset all components to match
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

      updateComponentTechBase: (tabId, component, techBase) => {
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

      setAllComponentTechBases: (tabId, techBases) => {
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

      // =======================================================================
      // Component Selection Actions
      // =======================================================================

      updateEngineType: (tabId, engineType) => {
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

      updateEngineRating: (tabId, rating) => {
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

      updateGyroType: (tabId, gyroType) => {
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

      updateStructureType: (tabId, structureType) => {
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

      updateCockpitType: (tabId, cockpitType) => {
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

      updateHeatSinkType: (tabId, heatSinkType) => {
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

      updateHeatSinkCount: (tabId, count) => {
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

      updateArmorType: (tabId, armorType) => {
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

      updateComponentSelections: (tabId, selections) => {
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

      // =======================================================================
      // Persistence Helpers
      // =======================================================================

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
