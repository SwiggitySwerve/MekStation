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
import { persist, createJSONStorage } from 'zustand/middleware';

import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { isValidUUID, generateUUID } from '@/utils/uuid';

import {
  createAndRegisterUnit,
  getUnitStore,
  duplicateUnit,
  hydrateOrCreateUnit,
} from './unitStoreRegistry';

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
  /** Unit type (defaults to BATTLEMECH for backwards compatibility) */
  readonly unitType: UnitType;
  /** Last active sub-tab for this unit (structure, armor, etc.) */
  lastSubTab?: string;
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
  {
    id: 'light',
    name: 'Light Mech',
    tonnage: 25,
    techBase: TechBase.INNER_SPHERE,
    walkMP: 8,
  },
  {
    id: 'medium',
    name: 'Medium Mech',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
    walkMP: 5,
  },
  {
    id: 'heavy',
    name: 'Heavy Mech',
    tonnage: 70,
    techBase: TechBase.INNER_SPHERE,
    walkMP: 4,
  },
  {
    id: 'assault',
    name: 'Assault Mech',
    tonnage: 100,
    techBase: TechBase.INNER_SPHERE,
    walkMP: 3,
  },
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

  /** Add a tab directly (for loaded units with pre-existing store) */
  addTab: (
    tabInfo: Omit<TabInfo, 'tonnage' | 'techBase' | 'unitType'> & {
      tonnage?: number;
      techBase?: TechBase;
      unitType?: UnitType;
    },
  ) => void;

  /** Update the last active sub-tab for a unit */
  setLastSubTab: (tabId: string, subTab: string) => void;

  /** Get the last active sub-tab for a unit */
  getLastSubTab: (tabId: string) => string | undefined;

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
// Tab ID Validation
// =============================================================================

/**
 * Result of tab sanitization
 */
interface SanitizeResult {
  tabs: TabInfo[];
  activeTabId: string | null;
  repaired: number;
}

/**
 * Sanitize tabs on hydration to ensure all tabs have valid UUIDs.
 *
 * This handles edge cases where:
 * - Cached data has tabs with missing IDs
 * - Cached data has tabs with invalid (non-UUID) IDs
 * - Migration from older data formats
 *
 * @param tabs - Array of tabs from localStorage
 * @param activeTabId - Current active tab ID
 * @returns Sanitized tabs and potentially updated activeTabId
 */
function sanitizeTabsOnHydration(
  tabs: TabInfo[] | undefined,
  activeTabId: string | null,
): SanitizeResult {
  if (!tabs || !Array.isArray(tabs)) {
    return { tabs: [], activeTabId: null, repaired: 0 };
  }

  let repaired = 0;
  const idMap = new Map<string, string>(); // oldId -> newId for active tab tracking

  const sanitizedTabs = tabs.map((tab): TabInfo => {
    // Check if ID is missing or invalid
    if (!tab.id || !isValidUUID(tab.id)) {
      const oldId = tab.id || '(missing)';
      const newId = generateUUID();
      idMap.set(oldId, newId);
      repaired++;

      console.warn(
        `[TabManager] Repaired invalid tab ID: "${oldId}" -> "${newId}" for tab "${tab.name}"`,
      );

      return {
        ...tab,
        id: newId,
        unitType: tab.unitType ?? UnitType.BATTLEMECH,
      };
    }

    // Ensure unitType is present (backwards compatibility)
    return {
      ...tab,
      unitType: tab.unitType ?? UnitType.BATTLEMECH,
    };
  });

  // Update activeTabId if it was repaired
  let newActiveTabId = activeTabId;

  // Check if activeTabId needs to be updated
  // Note: empty string is treated as a value that needs repair
  if (activeTabId !== null && idMap.has(activeTabId)) {
    // The activeTabId was in a tab that got repaired
    newActiveTabId = idMap.get(activeTabId) ?? null;
  } else if (
    activeTabId !== null &&
    (activeTabId === '' || !isValidUUID(activeTabId))
  ) {
    // Active tab ID is invalid but wasn't in the tabs - reset to first tab
    newActiveTabId = sanitizedTabs[0]?.id ?? null;
    console.warn(
      `[TabManager] Active tab ID "${activeTabId || '(empty)'}" is invalid, resetting to "${newActiveTabId}"`,
    );
  }

  if (repaired > 0) {
    console.warn(`[TabManager] Repaired ${repaired} tab(s) with invalid IDs`);
  }

  return {
    tabs: sanitizedTabs,
    activeTabId: newActiveTabId,
    repaired,
  };
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
        const name = customName ?? 'Mek';

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
          unitType: UnitType.BATTLEMECH,
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
        const originalTab = get().tabs.find((t) => t.id === tabId);
        const tabInfo: TabInfo = {
          id: unitState.id,
          name: unitState.name,
          tonnage: unitState.tonnage,
          techBase: unitState.techBase,
          unitType: originalTab?.unitType ?? UnitType.BATTLEMECH,
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
            tab.id === tabId ? { ...tab, name } : tab,
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

      addTab: (tabInfo) => {
        // Get unit store to fill in missing info
        const unitStore = getUnitStore(tabInfo.id);
        const unitState = unitStore?.getState();

        const fullTabInfo: TabInfo = {
          id: tabInfo.id,
          name: tabInfo.name,
          tonnage: tabInfo.tonnage ?? unitState?.tonnage ?? 50,
          techBase:
            tabInfo.techBase ?? unitState?.techBase ?? TechBase.INNER_SPHERE,
          unitType: tabInfo.unitType ?? UnitType.BATTLEMECH,
        };

        set((state) => ({
          tabs: [...state.tabs, fullTabInfo],
          activeTabId: tabInfo.id,
        }));
      },

      setLastSubTab: (tabId, subTab) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId ? { ...tab, lastSubTab: subTab } : tab,
          ),
        }));
      },

      getLastSubTab: (tabId) => {
        const state = get();
        const tab = state.tabs.find((t) => t.id === tabId);
        return tab?.lastSubTab;
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
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('[TabManager] Error during rehydration:', error);
        }

        if (state) {
          // Sanitize tabs to ensure all have valid UUIDs
          const {
            tabs: sanitizedTabs,
            activeTabId: sanitizedActiveId,
            repaired,
          } = sanitizeTabsOnHydration(state.tabs, state.activeTabId);

          // If tabs were repaired, update the store state
          if (repaired > 0) {
            // Use internal setState to update without triggering persistence loop
            useTabManagerStore.setState({
              tabs: sanitizedTabs,
              activeTabId: sanitizedActiveId,
            });
          }

          // Use sanitized values for hydration
          const tabsToUse = repaired > 0 ? sanitizedTabs : state.tabs;
          const activeIdToUse =
            repaired > 0 ? sanitizedActiveId : state.activeTabId;

          // Hydrate the active unit store if there is one
          if (tabsToUse && Array.isArray(tabsToUse)) {
            const activeTab = tabsToUse.find((t) => t.id === activeIdToUse);
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
    },
  ),
);
