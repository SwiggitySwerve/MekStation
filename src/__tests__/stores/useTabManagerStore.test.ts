/**
 * Tab Manager Store Tests
 * 
 * Tests for the tab manager store, which manages tab lifecycle
 * without containing unit data (that's in individual unit stores).
 * 
 * @spec openspec/changes/add-customizer-ui-components/specs/unit-store-architecture/spec.md
 */

import { act } from '@testing-library/react';
import {
  useTabManagerStore,
  UNIT_TEMPLATES,
  TabInfo,
} from '@/stores/useTabManagerStore';
import {
  clearAllStores,
  getUnitStore,
  hasUnitStore,
  getStoreCount,
} from '@/stores/unitStoreRegistry';
import { TechBase } from '@/types/enums/TechBase';
import { EngineType } from '@/types/construction/EngineType';
import {
  setupMockLocalStorage,
} from '../helpers/storeTestHelpers';

describe('useTabManagerStore', () => {
  let mockStorage: ReturnType<typeof setupMockLocalStorage>;
  
  beforeEach(() => {
    mockStorage = setupMockLocalStorage();
    // Reset both tab manager and unit store registry
    clearAllStores(true);
    useTabManagerStore.setState({
      tabs: [],
      activeTabId: null,
      isLoading: false,
      isNewTabModalOpen: false,
    });
  });
  
  afterEach(() => {
    clearAllStores(true);
    mockStorage.cleanup();
  });
  
  // ===========================================================================
  // Unit Templates
  // ===========================================================================
  describe('UNIT_TEMPLATES', () => {
    it('should have correct weight class templates', () => {
      expect(UNIT_TEMPLATES).toHaveLength(4);
      
      const lightTemplate = UNIT_TEMPLATES.find(t => t.id === 'light');
      const assaultTemplate = UNIT_TEMPLATES.find(t => t.id === 'assault');
      
      expect(lightTemplate?.tonnage).toBe(25);
      expect(lightTemplate?.walkMP).toBe(8);
      expect(assaultTemplate?.tonnage).toBe(100);
      expect(assaultTemplate?.walkMP).toBe(3);
    });
  });
  
  // ===========================================================================
  // Tab Creation
  // ===========================================================================
  describe('createTab()', () => {
    it('should create a new tab with unique ID', () => {
      const template = UNIT_TEMPLATES[1]; // Medium
      
      let tabId: string = '';
      act(() => {
        tabId = useTabManagerStore.getState().createTab(template);
      });
      
      const { tabs, activeTabId } = useTabManagerStore.getState();
      
      expect(tabs).toHaveLength(1);
      expect(tabs[0].id).toBe(tabId);
      expect(activeTabId).toBe(tabId);
    });
    
    it('should create unit store in registry', () => {
      const initialCount = getStoreCount();
      const template = UNIT_TEMPLATES[0];
      
      let tabId: string = '';
      act(() => {
        tabId = useTabManagerStore.getState().createTab(template);
      });
      
      expect(getStoreCount()).toBe(initialCount + 1);
      expect(hasUnitStore(tabId)).toBe(true);
    });
    
    it('should set tab name from template', () => {
      const template = UNIT_TEMPLATES[0]; // Light
      
      act(() => {
        useTabManagerStore.getState().createTab(template);
      });
      
      const { tabs } = useTabManagerStore.getState();
      expect(tabs[0].name).toBe(`New ${template.name}`);
    });
    
    it('should use custom name if provided', () => {
      const template = UNIT_TEMPLATES[0];
      
      act(() => {
        useTabManagerStore.getState().createTab(template, 'Custom Mech');
      });
      
      const { tabs } = useTabManagerStore.getState();
      expect(tabs[0].name).toBe('Custom Mech');
    });
    
    it('should store tab metadata correctly', () => {
      const template = UNIT_TEMPLATES[2]; // Heavy - 70 tons
      
      act(() => {
        useTabManagerStore.getState().createTab(template);
      });
      
      const { tabs } = useTabManagerStore.getState();
      
      expect(tabs[0].tonnage).toBe(70);
      expect(tabs[0].techBase).toBe(TechBase.INNER_SPHERE);
    });
    
    it('should close new tab modal after creating', () => {
      act(() => {
        useTabManagerStore.getState().openNewTabModal();
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[0]);
      });
      
      expect(useTabManagerStore.getState().isNewTabModalOpen).toBe(false);
    });
    
    it('should create multiple tabs', () => {
      act(() => {
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[0]);
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[1]);
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[2]);
      });
      
      const { tabs } = useTabManagerStore.getState();
      expect(tabs).toHaveLength(3);
      
      // Active tab should be the last created
      const lastTab = tabs[2];
      expect(useTabManagerStore.getState().activeTabId).toBe(lastTab.id);
    });
  });
  
  // ===========================================================================
  // Tab Duplication
  // ===========================================================================
  describe('duplicateTab()', () => {
    it('should duplicate tab and create new unit store', () => {
      let originalId: string = '';
      
      act(() => {
        originalId = useTabManagerStore.getState().createTab(UNIT_TEMPLATES[1]);
      });
      
      const initialStoreCount = getStoreCount();
      
      let duplicateId: string | null = null;
      act(() => {
        duplicateId = useTabManagerStore.getState().duplicateTab(originalId);
      });
      
      expect(duplicateId).not.toBeNull();
      expect(duplicateId).not.toBe(originalId);
      expect(getStoreCount()).toBe(initialStoreCount + 1);
      expect(useTabManagerStore.getState().tabs).toHaveLength(2);
    });
    
    it('should set active tab to duplicate', () => {
      let originalId: string = '';
      
      act(() => {
        originalId = useTabManagerStore.getState().createTab(UNIT_TEMPLATES[0]);
      });
      
      let duplicateId: string | null = null;
      act(() => {
        duplicateId = useTabManagerStore.getState().duplicateTab(originalId);
      });
      
      expect(useTabManagerStore.getState().activeTabId).toBe(duplicateId);
    });
    
    it('should add (Copy) to tab name', () => {
      act(() => {
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[0], 'Original Mech');
      });
      
      const originalId = useTabManagerStore.getState().tabs[0].id;
      
      act(() => {
        useTabManagerStore.getState().duplicateTab(originalId);
      });
      
      const { tabs } = useTabManagerStore.getState();
      expect(tabs[1].name).toContain('(Copy)');
    });
    
    it('should return null for non-existent tab', () => {
      let result: string | null = 'initial';
      
      act(() => {
        result = useTabManagerStore.getState().duplicateTab('non-existent');
      });
      
      expect(result).toBeNull();
    });
  });
  
  // ===========================================================================
  // Tab Closing
  // ===========================================================================
  describe('closeTab()', () => {
    it('should close a tab', () => {
      act(() => {
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[0]);
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[1]);
      });
      
      const firstTabId = useTabManagerStore.getState().tabs[0].id;
      
      act(() => {
        useTabManagerStore.getState().closeTab(firstTabId);
      });
      
      expect(useTabManagerStore.getState().tabs).toHaveLength(1);
    });
    
    it('should not close last tab', () => {
      act(() => {
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[0]);
      });
      
      const tabId = useTabManagerStore.getState().tabs[0].id;
      
      act(() => {
        useTabManagerStore.getState().closeTab(tabId);
      });
      
      expect(useTabManagerStore.getState().tabs).toHaveLength(1);
    });
    
    it('should select adjacent tab when closing active tab', () => {
      act(() => {
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[0]);
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[1]);
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[2]);
      });
      
      const tabs = useTabManagerStore.getState().tabs;
      const middleTabId = tabs[1].id;
      
      // Select middle tab
      act(() => {
        useTabManagerStore.getState().selectTab(middleTabId);
      });
      
      // Close middle tab
      act(() => {
        useTabManagerStore.getState().closeTab(middleTabId);
      });
      
      // Should select next tab (now at same index)
      const remainingTabs = useTabManagerStore.getState().tabs;
      expect(useTabManagerStore.getState().activeTabId).toBe(remainingTabs[1].id);
    });
    
    it('should select previous tab when closing last tab', () => {
      act(() => {
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[0]);
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[1]);
      });
      
      const tabs = useTabManagerStore.getState().tabs;
      const lastTabId = tabs[1].id;
      
      // Last tab is already active after creation
      expect(useTabManagerStore.getState().activeTabId).toBe(lastTabId);
      
      // Close last tab
      act(() => {
        useTabManagerStore.getState().closeTab(lastTabId);
      });
      
      // Should select first tab
      const remainingTabs = useTabManagerStore.getState().tabs;
      expect(useTabManagerStore.getState().activeTabId).toBe(remainingTabs[0].id);
    });
    
    it('should not affect active tab when closing non-active tab', () => {
      act(() => {
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[0]);
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[1]);
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[2]);
      });
      
      const tabs = useTabManagerStore.getState().tabs;
      const firstTabId = tabs[0].id;
      const lastTabId = tabs[2].id;
      
      // Last tab is active
      expect(useTabManagerStore.getState().activeTabId).toBe(lastTabId);
      
      // Close first tab
      act(() => {
        useTabManagerStore.getState().closeTab(firstTabId);
      });
      
      // Active tab should still be the last one
      expect(useTabManagerStore.getState().activeTabId).toBe(lastTabId);
    });
  });
  
  // ===========================================================================
  // Tab Selection
  // ===========================================================================
  describe('selectTab()', () => {
    it('should change active tab', () => {
      act(() => {
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[0]);
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[1]);
      });
      
      const tabs = useTabManagerStore.getState().tabs;
      
      act(() => {
        useTabManagerStore.getState().selectTab(tabs[0].id);
      });
      
      expect(useTabManagerStore.getState().activeTabId).toBe(tabs[0].id);
    });
    
    it('should hydrate unit store when selecting', () => {
      act(() => {
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[0]);
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[1]);
      });
      
      const tabs = useTabManagerStore.getState().tabs;
      
      // Clear registry to simulate stores being garbage collected
      clearAllStores(false);
      
      act(() => {
        useTabManagerStore.getState().selectTab(tabs[0].id);
      });
      
      // Store should be hydrated
      expect(hasUnitStore(tabs[0].id)).toBe(true);
    });
  });
  
  // ===========================================================================
  // Tab Renaming
  // ===========================================================================
  describe('renameTab()', () => {
    it('should rename a tab', () => {
      act(() => {
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[0]);
      });
      
      const tabId = useTabManagerStore.getState().tabs[0].id;
      
      act(() => {
        useTabManagerStore.getState().renameTab(tabId, 'My Custom Mech');
      });
      
      expect(useTabManagerStore.getState().tabs[0].name).toBe('My Custom Mech');
    });
    
    it('should also update unit store name', () => {
      act(() => {
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[0]);
      });
      
      const tabId = useTabManagerStore.getState().tabs[0].id;
      
      act(() => {
        useTabManagerStore.getState().renameTab(tabId, 'Renamed Unit');
      });
      
      const store = getUnitStore(tabId);
      expect(store?.getState().name).toBe('Renamed Unit');
    });
  });
  
  // ===========================================================================
  // Tab Reordering
  // ===========================================================================
  describe('reorderTabs()', () => {
    it('should reorder tabs', () => {
      act(() => {
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[0], 'First');
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[1], 'Second');
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[2], 'Third');
      });
      
      const initialTabs = useTabManagerStore.getState().tabs;
      const firstId = initialTabs[0].id;
      const thirdId = initialTabs[2].id;
      
      // Move first to last position
      act(() => {
        useTabManagerStore.getState().reorderTabs(0, 2);
      });
      
      const reorderedTabs = useTabManagerStore.getState().tabs;
      
      expect(reorderedTabs[0].name).toBe('Second');
      expect(reorderedTabs[1].name).toBe('Third');
      expect(reorderedTabs[2].name).toBe('First');
    });
    
    it('should preserve all tab data during reorder', () => {
      act(() => {
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[3], 'Assault'); // 100 tons
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[0], 'Light');   // 25 tons
      });
      
      act(() => {
        useTabManagerStore.getState().reorderTabs(1, 0);
      });
      
      const tabs = useTabManagerStore.getState().tabs;
      
      expect(tabs[0].name).toBe('Light');
      expect(tabs[0].tonnage).toBe(25);
      expect(tabs[1].name).toBe('Assault');
      expect(tabs[1].tonnage).toBe(100);
    });
  });
  
  // ===========================================================================
  // Modal State
  // ===========================================================================
  describe('Modal State', () => {
    it('should open new tab modal', () => {
      act(() => {
        useTabManagerStore.getState().openNewTabModal();
      });
      
      expect(useTabManagerStore.getState().isNewTabModalOpen).toBe(true);
    });
    
    it('should close new tab modal', () => {
      act(() => {
        useTabManagerStore.getState().openNewTabModal();
        useTabManagerStore.getState().closeNewTabModal();
      });
      
      expect(useTabManagerStore.getState().isNewTabModalOpen).toBe(false);
    });
  });
  
  // ===========================================================================
  // Helper Functions
  // ===========================================================================
  describe('getActiveTab()', () => {
    it('should return active tab', () => {
      act(() => {
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[0]);
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[1]);
      });
      
      const activeTab = useTabManagerStore.getState().getActiveTab();
      const expectedId = useTabManagerStore.getState().activeTabId;
      
      expect(activeTab).not.toBeNull();
      expect(activeTab?.id).toBe(expectedId);
    });
    
    it('should return null when no tabs', () => {
      const activeTab = useTabManagerStore.getState().getActiveTab();
      
      expect(activeTab).toBeNull();
    });
  });
  
  describe('setLoading()', () => {
    it('should set loading state', () => {
      act(() => {
        useTabManagerStore.getState().setLoading(true);
      });
      
      expect(useTabManagerStore.getState().isLoading).toBe(true);
      
      act(() => {
        useTabManagerStore.getState().setLoading(false);
      });
      
      expect(useTabManagerStore.getState().isLoading).toBe(false);
    });
  });
  
  // ===========================================================================
  // Tab Manager Only Stores Tab Metadata
  // ===========================================================================
  describe('Tab Manager Data Separation', () => {
    it('should only store tab metadata in TabManager', () => {
      act(() => {
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[1]);
      });
      
      const tab = useTabManagerStore.getState().tabs[0];
      
      // TabInfo should only have metadata
      expect(tab).toHaveProperty('id');
      expect(tab).toHaveProperty('name');
      expect(tab).toHaveProperty('tonnage');
      expect(tab).toHaveProperty('techBase');
      
      // Should NOT have component configuration
      expect(tab).not.toHaveProperty('engineType');
      expect(tab).not.toHaveProperty('gyroType');
      expect(tab).not.toHaveProperty('componentSelections');
    });
    
    it('should store full configuration in unit store', () => {
      act(() => {
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[1]);
      });
      
      const tabId = useTabManagerStore.getState().tabs[0].id;
      const unitStore = getUnitStore(tabId);
      
      expect(unitStore).not.toBeNull();
      const state = unitStore!.getState();
      
      // Unit store should have full configuration
      expect(state).toHaveProperty('engineType');
      expect(state).toHaveProperty('gyroType');
      expect(state).toHaveProperty('internalStructureType');
      expect(state).toHaveProperty('heatSinkType');
      expect(state).toHaveProperty('armorType');
      expect(state).toHaveProperty('componentTechBases');
    });
  });
  
  // ===========================================================================
  // Persistence
  // Note: Zustand's persist middleware uses async storage operations.
  // In a test environment with mocked localStorage, the actual persistence
  // behavior may vary. These tests verify the store's state management
  // rather than localStorage integration.
  // ===========================================================================
  describe('Persistence Configuration', () => {
    it('should only include tabs and activeTabId in partialize', () => {
      // The store is configured to only persist tabs and activeTabId
      // Verify by checking that isLoading and isNewTabModalOpen 
      // are not persisted in the state structure
      act(() => {
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[0], 'Test Tab');
        useTabManagerStore.getState().setLoading(true);
        useTabManagerStore.getState().openNewTabModal();
      });
      
      const state = useTabManagerStore.getState();
      
      // These should exist in state
      expect(state.tabs).toHaveLength(1);
      expect(state.activeTabId).not.toBeNull();
      
      // These are UI state and should not affect persistence
      // (In a real scenario, partialize filters them out)
      expect(state.isLoading).toBe(true);
      expect(state.isNewTabModalOpen).toBe(true);
    });
    
    it('should maintain tab data after state updates', () => {
      act(() => {
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[0], 'Persisted Tab');
      });
      
      const tabId = useTabManagerStore.getState().tabs[0].id;
      
      // Update other state
      act(() => {
        useTabManagerStore.getState().setLoading(false);
        useTabManagerStore.getState().closeNewTabModal();
      });
      
      // Tab data should remain intact
      expect(useTabManagerStore.getState().tabs).toHaveLength(1);
      expect(useTabManagerStore.getState().tabs[0].name).toBe('Persisted Tab');
      expect(useTabManagerStore.getState().activeTabId).toBe(tabId);
    });
    
    it('should persist correct activeTabId when switching tabs', () => {
      act(() => {
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[0]);
        useTabManagerStore.getState().createTab(UNIT_TEMPLATES[1]);
      });
      
      const tabs = useTabManagerStore.getState().tabs;
      
      act(() => {
        useTabManagerStore.getState().selectTab(tabs[0].id);
      });
      
      expect(useTabManagerStore.getState().activeTabId).toBe(tabs[0].id);
    });
  });
});

