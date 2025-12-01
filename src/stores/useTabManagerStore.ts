/**
 * Tab Manager Store
 * 
 * Manages tab lifecycle without containing unit data.
 * - Tab IDs and ordering
 * - Active tab selection
 * - Tab open/close/reorder operations
 * 
 * Unit data is stored separately in individual unit stores.
 * 
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { TechBase } from '@/types/enums/TechBase';
import {
  createAndRegisterUnit,
  getUnitStore,
  deleteUnit,
  duplicateUnit,
  hydrateOrCreateUnit,
} from './unitStoreRegistry';

// =============================================================================
// Client-Safe Storage
// =============================================================================

/**
 * Storage wrapper that safely handles SSR (no localStorage on server)
 */
const clientSafeStorage: StateStorage = {
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
// Types
// =============================================================================

/**
 * Tab metadata (stored in TabManager, not in unit store)
 */
export interface TabInfo {
  /** Unit ID (matches unit store ID) */
  readonly id: string;
  /** Display name (cached from unit store for tab rendering) */
  name: string;
  /** Tonnage (cached for tab display) */
  readonly tonnage: number;
  /** Tech base (cached for tab display) */
  readonly techBase: TechBase;
}

/**
 * Template for creating new units
 */
export interface UnitTemplate {
  readonly id: string;
  readonly name: string;
  readonly tonnage: number;
  readonly techBase: TechBase;
  readonly walkMP: number;
}

/**
 * Default unit templates
 */
export const UNIT_TEMPLATES: readonly UnitTemplate[] = [
  { id: 'light', name: 'Light Mech', tonnage: 25, techBase: TechBase.INNER_SPHERE, walkMP: 8 },
  { id: 'medium', name: 'Medium Mech', tonnage: 50, techBase: TechBase.INNER_SPHERE, walkMP: 5 },
  { id: 'heavy', name: 'Heavy Mech', tonnage: 70, techBase: TechBase.INNER_SPHERE, walkMP: 4 },
  { id: 'assault', name: 'Assault Mech', tonnage: 100, techBase: TechBase.INNER_SPHERE, walkMP: 3 },
];

// =============================================================================
// Store Interface
// =============================================================================

/**
 * Tab Manager state
 */
export interface TabManagerState {
  // ==========================================================================
  // State
  // ==========================================================================
  
  /** Ordered list of tab info */
  tabs: TabInfo[];
  
  /** Currently active tab ID */
  activeTabId: string | null;
  
  /** Loading state (for hydration) */
  isLoading: boolean;
  
  /** New tab modal state */
  isNewTabModalOpen: boolean;
  
  // ==========================================================================
  // Tab Actions
  // ==========================================================================
  
  /** Create a new tab from template */
  createTab: (template: UnitTemplate, customName?: string) => string;
  
  /** Duplicate an existing tab */
  duplicateTab: (tabId: string) => string | null;
  
  /** Close a tab */
  closeTab: (tabId: string) => void;
  
  /** Select a tab */
  selectTab: (tabId: string) => void;
  
  /** Rename a tab */
  renameTab: (tabId: string, name: string) => void;
  
  /** Reorder tabs */
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  
  // ==========================================================================
  // Modal Actions
  // ==========================================================================
  
  openNewTabModal: () => void;
  closeNewTabModal: () => void;
  
  // ==========================================================================
  // Helpers
  // ==========================================================================
  
  getActiveTab: () => TabInfo | null;
  setLoading: (loading: boolean) => void;
}

// =============================================================================
// Store Implementation
// =============================================================================

/**
 * Tab manager store with localStorage persistence
 */
export const useTabManagerStore = create<TabManagerState>()(
  persist(
    (set, get) => ({
      // Initial state
      tabs: [],
      activeTabId: null,
      isLoading: true,
      isNewTabModalOpen: false,
      
      // =======================================================================
      // Tab Actions
      // =======================================================================
      
      createTab: (template, customName) => {
        const name = customName ?? `New ${template.name}`;
        
        // Create unit store in registry
        const store = createAndRegisterUnit({
          name,
          tonnage: template.tonnage,
          techBase: template.techBase,
          walkMP: template.walkMP,
        });
        
        const unitState = store.getState();
        const tabInfo: TabInfo = {
          id: unitState.id,
          name: unitState.name,
          tonnage: unitState.tonnage,
          techBase: unitState.techBase,
        };
        
        set((state) => ({
          tabs: [...state.tabs, tabInfo],
          activeTabId: unitState.id,
          isNewTabModalOpen: false,
        }));
        
        return unitState.id;
      },
      
      duplicateTab: (tabId) => {
        const store = duplicateUnit(tabId);
        if (!store) return null;
        
        const unitState = store.getState();
        const tabInfo: TabInfo = {
          id: unitState.id,
          name: unitState.name,
          tonnage: unitState.tonnage,
          techBase: unitState.techBase,
        };
        
        set((state) => ({
          tabs: [...state.tabs, tabInfo],
          activeTabId: unitState.id,
        }));
        
        return unitState.id;
      },
      
      closeTab: (tabId) => {
        set((state) => {
          const tabIndex = state.tabs.findIndex((t) => t.id === tabId);
          if (tabIndex === -1) return state;
          
          // Remove from registry (but keep localStorage for now)
          // deleteUnit(tabId); // Uncomment to also delete localStorage
          
          const newTabs = state.tabs.filter((t) => t.id !== tabId);
          
          // Select adjacent tab if closing active tab, or null if no tabs left
          let newActiveId = state.activeTabId;
          if (state.activeTabId === tabId) {
            if (newTabs.length === 0) {
              newActiveId = null;
            } else {
              const newIndex = Math.min(tabIndex, newTabs.length - 1);
              newActiveId = newTabs[newIndex]?.id ?? null;
            }
          }
          
          return {
            tabs: newTabs,
            activeTabId: newActiveId,
          };
        });
      },
      
      selectTab: (tabId) => {
        // Ensure the unit store is hydrated when selecting
        const state = get();
        const tab = state.tabs.find((t) => t.id === tabId);
        if (tab) {
          hydrateOrCreateUnit(tabId, {
            name: tab.name,
            tonnage: tab.tonnage,
            techBase: tab.techBase,
          });
        }
        
        set({ activeTabId: tabId });
      },
      
      renameTab: (tabId, name) => {
        // Update tab info
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId ? { ...tab, name } : tab
          ),
        }));
        
        // Also update unit store
        const store = getUnitStore(tabId);
        if (store) {
          store.getState().setName(name);
        }
      },
      
      reorderTabs: (fromIndex, toIndex) => {
        set((state) => {
          const newTabs = [...state.tabs];
          const [removed] = newTabs.splice(fromIndex, 1);
          newTabs.splice(toIndex, 0, removed);
          return { tabs: newTabs };
        });
      },
      
      // =======================================================================
      // Modal Actions
      // =======================================================================
      
      openNewTabModal: () => set({ isNewTabModalOpen: true }),
      closeNewTabModal: () => set({ isNewTabModalOpen: false }),
      
      // =======================================================================
      // Helpers
      // =======================================================================
      
      getActiveTab: () => {
        const state = get();
        // Defensive check for hydration race condition
        if (!state.tabs || !Array.isArray(state.tabs)) {
          return null;
        }
        return state.tabs.find((t) => t.id === state.activeTabId) ?? null;
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'megamek-tab-manager',
      storage: createJSONStorage(() => clientSafeStorage),
      skipHydration: true, // Manually hydrate after client mount
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Defensive check for tabs array during hydration
          if (state.tabs && Array.isArray(state.tabs)) {
            // Hydrate the active unit store if there is one
            const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
            if (activeTab) {
              hydrateOrCreateUnit(activeTab.id, {
                name: activeTab.name,
                tonnage: activeTab.tonnage,
                techBase: activeTab.techBase,
              });
            }
          }
          state.setLoading(false);
        }
      },
    }
  )
);

