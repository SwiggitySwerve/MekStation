/**
 * Multi-Unit Tab Store
 * 
 * Manages multiple unit tabs with:
 * - Tab creation, selection, closing
 * - Unsaved changes tracking
 * - localStorage persistence
 * 
 * @spec openspec/changes/add-customizer-ui-components/specs/multi-unit-tabs/spec.md
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { TechBase } from '@/types/enums/TechBase';
import { MechConfiguration, UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  TechBaseMode,
  TechBaseComponent,
  IComponentTechBases,
  createDefaultComponentTechBases,
} from '@/types/construction/TechBaseConfiguration';

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
  // Unit Configuration State (persisted across tab navigation)
  // ==========================================================================
  
  /** Tech base mode: inner_sphere, clan, or mixed */
  techBaseMode: TechBaseMode;
  /** Per-component tech base settings (used when techBaseMode is 'mixed') */
  componentTechBases: IComponentTechBases;
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
  { id: 'light', name: 'Light Mech', tonnage: 25, techBase: TechBase.INNER_SPHERE, walkMP: 8, jumpMP: 0 },
  { id: 'medium', name: 'Medium Mech', tonnage: 50, techBase: TechBase.INNER_SPHERE, walkMP: 5, jumpMP: 0 },
  { id: 'heavy', name: 'Heavy Mech', tonnage: 70, techBase: TechBase.INNER_SPHERE, walkMP: 4, jumpMP: 0 },
  { id: 'assault', name: 'Assault Mech', tonnage: 100, techBase: TechBase.INNER_SPHERE, walkMP: 3, jumpMP: 0 },
];

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
  
  // Unit configuration actions (persist across tab navigation)
  updateTechBaseMode: (tabId: string, mode: TechBaseMode) => void;
  updateComponentTechBase: (tabId: string, component: TechBaseComponent, techBase: TechBase) => void;
  setAllComponentTechBases: (tabId: string, techBases: IComponentTechBases) => void;
  
  // Persistence helpers
  setLoading: (loading: boolean) => void;
}

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
      
      // Actions
      createTab: (template, customName) => {
        const id = generateTabId();
        const now = Date.now();
        const name = customName || `New ${template.name}`;
        
        // Determine initial tech base mode based on template
        const initialMode: TechBaseMode = template.techBase === TechBase.CLAN ? 'clan' : 'inner_sphere';
        
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
          // Initialize tech base configuration
          techBaseMode: initialMode,
          componentTechBases: createDefaultComponentTechBases(template.techBase),
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
        const sourceTab = state.tabs.find(t => t.id === tabId);
        if (!sourceTab) return null;
        
        const id = generateTabId();
        const now = Date.now();
        
        // Copy all configuration including tech base settings
        const newTab: UnitTab = {
          ...sourceTab,
          id,
          name: `${sourceTab.name} (Copy)`,
          isModified: true,
          createdAt: now,
          lastModifiedAt: now,
          // Deep copy component tech bases to avoid shared reference
          componentTechBases: { ...sourceTab.componentTechBases },
        };
        
        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: id,
        }));
        
        return id;
      },
      
      closeTab: (tabId) => {
        set((state) => {
          const tabIndex = state.tabs.findIndex(t => t.id === tabId);
          if (tabIndex === -1) return state;
          
          // Prevent closing last tab
          if (state.tabs.length === 1) return state;
          
          const newTabs = state.tabs.filter(t => t.id !== tabId);
          
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
          tabs: state.tabs.map(tab =>
            tab.id === tabId
              ? { ...tab, name, lastModifiedAt: Date.now() }
              : tab
          ),
        }));
      },
      
      markModified: (tabId, modified = true) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId
              ? { ...tab, isModified: modified, lastModifiedAt: Date.now() }
              : tab
          ),
        }));
      },
      
      openNewTabModal: () => set({ isNewTabModalOpen: true }),
      
      closeNewTabModal: () => set({ isNewTabModalOpen: false }),
      
      getActiveTab: () => {
        const state = get();
        return state.tabs.find(t => t.id === state.activeTabId) || null;
      },
      
      // Unit configuration actions
      updateTechBaseMode: (tabId, mode) => {
        set((state) => ({
          tabs: state.tabs.map(tab => {
            if (tab.id !== tabId) return tab;
            
            // When switching to non-mixed mode, reset all components to match
            const newComponentTechBases = mode === 'mixed'
              ? tab.componentTechBases
              : createDefaultComponentTechBases(mode === 'clan' ? TechBase.CLAN : TechBase.INNER_SPHERE);
            
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
          tabs: state.tabs.map(tab => {
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
          tabs: state.tabs.map(tab => {
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
      
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'megamek-multi-unit-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
      // Migrate existing tabs that don't have the new tech base configuration fields
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<MultiUnitState>;
        
        // Migrate tabs to include tech base configuration if missing
        const migratedTabs = (persistedState.tabs || []).map((tab) => {
          // Check if tab needs migration (missing new fields)
          if (!tab.techBaseMode || !tab.componentTechBases) {
            const initialMode: TechBaseMode = tab.techBase === TechBase.CLAN ? 'clan' : 'inner_sphere';
            return {
              ...tab,
              techBaseMode: tab.techBaseMode || initialMode,
              componentTechBases: tab.componentTechBases || createDefaultComponentTechBases(tab.techBase),
            };
          }
          return tab;
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
    }
  )
);

