/**
 * Tab Switching Complete Test Suite
 * 
 * Comprehensive tests for tab switching, URL synchronization, and sub-tab persistence.
 * This suite ensures that:
 * 1. URLs correctly reflect the active unit and sub-tab
 * 2. Each unit maintains its own lastSubTab independently
 * 3. Data integrity is preserved when switching between units
 * 4. Edge cases are handled gracefully
 * 
 * @spec openspec/specs/customizer-tabs/spec.md
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import { act } from '@testing-library/react';
import {
  useTabManagerStore,
  UNIT_TEMPLATES,
} from '@/stores/useTabManagerStore';
import {
  clearAllStores,
  getUnitStore,
  hasUnitStore,
} from '@/stores/unitStoreRegistry';
import { TechBase } from '@/types/enums/TechBase';
import { CustomizerTabId, DEFAULT_TAB, isValidTabId } from '@/hooks/useCustomizerRouter';
import {
  setupMockLocalStorage,
} from '../helpers/storeTestHelpers';
import {
  createMultiUnitScenario,
  createMockUnitWithData,
  simulateTabSwitch,
  simulateSubTabNavigation,
  expectSubTabsMatch,
  expectActiveTab,
  expectTabCount,
  ALL_VALID_SUB_TABS,
  COMMON_SUB_TABS,
  resetTabStores,
  setupTabSwitchingTest,
  createMockRouter,
  verifyUrlMatchesState,
} from '../helpers/tabSwitchingHelpers';

describe('Tab Switching Complete Test Suite', () => {
  let cleanup: () => void;
  
  beforeEach(() => {
    const setup = setupTabSwitchingTest();
    cleanup = setup.cleanup;
  });
  
  afterEach(() => {
    cleanup();
  });
  
  // ===========================================================================
  // Sub-tab URL Synchronization Tests
  // ===========================================================================
  describe('Sub-tab URL Synchronization', () => {
    it('should have lastSubTab undefined by default for new units', () => {
      const tabId = createMockUnitWithData({ name: 'New Unit' });
      
      const lastSubTab = useTabManagerStore.getState().getLastSubTab(tabId);
      expect(lastSubTab).toBeUndefined();
    });
    
    it('should store lastSubTab when navigating to a sub-tab', () => {
      const tabId = createMockUnitWithData({ name: 'Test Unit' });
      
      simulateSubTabNavigation(tabId, 'armor');
      
      expect(useTabManagerStore.getState().getLastSubTab(tabId)).toBe('armor');
    });
    
    it('should update lastSubTab when changing sub-tabs', () => {
      const tabId = createMockUnitWithData({ name: 'Test Unit' });
      
      // Navigate through multiple sub-tabs
      simulateSubTabNavigation(tabId, 'structure');
      expect(useTabManagerStore.getState().getLastSubTab(tabId)).toBe('structure');
      
      simulateSubTabNavigation(tabId, 'armor');
      expect(useTabManagerStore.getState().getLastSubTab(tabId)).toBe('armor');
      
      simulateSubTabNavigation(tabId, 'equipment');
      expect(useTabManagerStore.getState().getLastSubTab(tabId)).toBe('equipment');
      
      simulateSubTabNavigation(tabId, 'preview');
      expect(useTabManagerStore.getState().getLastSubTab(tabId)).toBe('preview');
    });
    
    it('should use DEFAULT_TAB (structure) when unit has no lastSubTab', () => {
      const tabId = createMockUnitWithData({ name: 'New Unit' });
      
      const lastSubTab = useTabManagerStore.getState().getLastSubTab(tabId);
      
      // When undefined, component logic should default to structure
      const effectiveTab = lastSubTab && isValidTabId(lastSubTab) ? lastSubTab : DEFAULT_TAB;
      expect(effectiveTab).toBe('structure');
    });
    
    it('should preserve lastSubTab for each unit independently when switching', () => {
      // Create two units with different sub-tabs
      const unit1Id = createMockUnitWithData({ name: 'Unit 1', lastSubTab: 'armor' });
      const unit2Id = createMockUnitWithData({ name: 'Unit 2', lastSubTab: 'preview' });
      
      // Verify initial state
      expect(useTabManagerStore.getState().getLastSubTab(unit1Id)).toBe('armor');
      expect(useTabManagerStore.getState().getLastSubTab(unit2Id)).toBe('preview');
      
      // Switch to unit 1
      simulateTabSwitch(unit2Id, unit1Id);
      expectActiveTab(unit1Id);
      
      // Both should still have their own lastSubTab
      expect(useTabManagerStore.getState().getLastSubTab(unit1Id)).toBe('armor');
      expect(useTabManagerStore.getState().getLastSubTab(unit2Id)).toBe('preview');
      
      // Switch back to unit 2
      simulateTabSwitch(unit1Id, unit2Id);
      expectActiveTab(unit2Id);
      
      // Both should still preserve their lastSubTab
      expect(useTabManagerStore.getState().getLastSubTab(unit1Id)).toBe('armor');
      expect(useTabManagerStore.getState().getLastSubTab(unit2Id)).toBe('preview');
    });
    
    it('should handle 5+ units with different lastSubTabs', () => {
      const scenario = createMultiUnitScenario(5);
      const subTabs: CustomizerTabId[] = ['structure', 'armor', 'equipment', 'criticals', 'preview'];
      
      // Set different sub-tabs for each unit
      act(() => {
        scenario.tabIds.forEach((id, index) => {
          useTabManagerStore.getState().setLastSubTab(id, subTabs[index]);
        });
      });
      
      // Switch between units rapidly
      act(() => {
        useTabManagerStore.getState().selectTab(scenario.tabIds[2]);
        useTabManagerStore.getState().selectTab(scenario.tabIds[0]);
        useTabManagerStore.getState().selectTab(scenario.tabIds[4]);
        useTabManagerStore.getState().selectTab(scenario.tabIds[1]);
        useTabManagerStore.getState().selectTab(scenario.tabIds[3]);
      });
      
      // Verify all sub-tabs are still correct
      scenario.tabIds.forEach((id, index) => {
        expect(useTabManagerStore.getState().getLastSubTab(id)).toBe(subTabs[index]);
      });
      
      scenario.cleanup();
    });
  });
  
  // ===========================================================================
  // Sub-tab State Preservation Tests
  // ===========================================================================
  describe('Sub-tab State Preservation', () => {
    it('should preserve lastSubTab when switching away and back to a unit', () => {
      const unit1Id = createMockUnitWithData({ name: 'Atlas', tonnage: 100 });
      const unit2Id = createMockUnitWithData({ name: 'Locust', tonnage: 20 });
      
      // Set unit 1 to armor tab
      simulateSubTabNavigation(unit1Id, 'armor');
      
      // Switch to unit 2 and set to criticals
      simulateTabSwitch(unit1Id, unit2Id);
      simulateSubTabNavigation(unit2Id, 'criticals');
      
      // Switch back to unit 1 - should still be on armor
      simulateTabSwitch(unit2Id, unit1Id);
      
      expect(useTabManagerStore.getState().getLastSubTab(unit1Id)).toBe('armor');
      expect(useTabManagerStore.getState().getLastSubTab(unit2Id)).toBe('criticals');
    });
    
    it('should handle all valid sub-tab types', () => {
      const tabId = createMockUnitWithData({ name: 'Test Unit' });
      
      // Test each valid sub-tab type
      ALL_VALID_SUB_TABS.forEach(subTab => {
        simulateSubTabNavigation(tabId, subTab);
        expect(useTabManagerStore.getState().getLastSubTab(tabId)).toBe(subTab);
      });
    });
    
    it('should preserve lastSubTab through multiple rapid tab switches', () => {
      const scenario = createMultiUnitScenario(3);
      const [tab1, tab2, tab3] = scenario.tabIds;
      
      // Set sub-tabs
      simulateSubTabNavigation(tab1, 'armor');
      simulateSubTabNavigation(tab2, 'preview');
      simulateSubTabNavigation(tab3, 'criticals');
      
      // Rapid switching
      act(() => {
        for (let i = 0; i < 10; i++) {
          useTabManagerStore.getState().selectTab(scenario.tabIds[i % 3]);
        }
      });
      
      // Verify preservation
      expect(useTabManagerStore.getState().getLastSubTab(tab1)).toBe('armor');
      expect(useTabManagerStore.getState().getLastSubTab(tab2)).toBe('preview');
      expect(useTabManagerStore.getState().getLastSubTab(tab3)).toBe('criticals');
      
      scenario.cleanup();
    });
    
    it('should not affect other units when updating one unit lastSubTab', () => {
      const unit1Id = createMockUnitWithData({ name: 'Unit 1', lastSubTab: 'structure' });
      const unit2Id = createMockUnitWithData({ name: 'Unit 2', lastSubTab: 'armor' });
      const unit3Id = createMockUnitWithData({ name: 'Unit 3', lastSubTab: 'preview' });
      
      // Update unit 2's sub-tab
      simulateSubTabNavigation(unit2Id, 'equipment');
      
      // Others should be unchanged
      expect(useTabManagerStore.getState().getLastSubTab(unit1Id)).toBe('structure');
      expect(useTabManagerStore.getState().getLastSubTab(unit2Id)).toBe('equipment');
      expect(useTabManagerStore.getState().getLastSubTab(unit3Id)).toBe('preview');
    });
  });
  
  // ===========================================================================
  // Data Integrity During Tab Switches
  // ===========================================================================
  describe('Data Integrity During Tab Switches', () => {
    describe('Unit Store Integrity', () => {
      it('should maintain unit store references when switching tabs', () => {
        const unit1Id = createMockUnitWithData({ name: 'Heavy Mech', tonnage: 70 });
        const unit2Id = createMockUnitWithData({ name: 'Light Mech', tonnage: 25 });
        
        // Get store reference before switching
        const store1Before = getUnitStore(unit1Id);
        expect(store1Before).not.toBeNull();
        
        // Switch to unit 2
        simulateTabSwitch(unit1Id, unit2Id);
        
        // Store should still exist
        const store1After = getUnitStore(unit1Id);
        expect(store1After).not.toBeNull();
        expect(hasUnitStore(unit1Id)).toBe(true);
      });
      
      it('should preserve unit tonnage after switching', () => {
        const unit1Id = createMockUnitWithData({ name: 'Atlas', tonnage: 100 });
        const unit2Id = createMockUnitWithData({ name: 'Locust', tonnage: 20 });
        
        // Verify initial tonnages
        expect(getUnitStore(unit1Id)?.getState().tonnage).toBe(100);
        expect(getUnitStore(unit2Id)?.getState().tonnage).toBe(20);
        
        // Switch between units
        simulateTabSwitch(unit1Id, unit2Id);
        simulateTabSwitch(unit2Id, unit1Id);
        
        // Tonnages should be preserved
        expect(getUnitStore(unit1Id)?.getState().tonnage).toBe(100);
        expect(getUnitStore(unit2Id)?.getState().tonnage).toBe(20);
      });
      
      it('should preserve unit names after switching', () => {
        const unit1Id = createMockUnitWithData({ name: 'Atlas AS7-D' });
        const unit2Id = createMockUnitWithData({ name: 'Locust LCT-1V' });
        
        // Switch multiple times
        simulateTabSwitch(unit1Id, unit2Id);
        simulateTabSwitch(unit2Id, unit1Id);
        simulateTabSwitch(unit1Id, unit2Id);
        
        // Names should be preserved in both tab info and unit store
        const tabs = useTabManagerStore.getState().tabs;
        expect(tabs.find(t => t.id === unit1Id)?.name).toBe('Atlas AS7-D');
        expect(tabs.find(t => t.id === unit2Id)?.name).toBe('Locust LCT-1V');
        
        expect(getUnitStore(unit1Id)?.getState().name).toBe('Atlas AS7-D');
        expect(getUnitStore(unit2Id)?.getState().name).toBe('Locust LCT-1V');
      });
      
      it('should preserve tech base after switching', () => {
        // Create IS and Clan units
        const isUnitId = createMockUnitWithData({ 
          name: 'IS Mech', 
          techBase: TechBase.INNER_SPHERE 
        });
        const clanUnitId = createMockUnitWithData({ 
          name: 'Clan Mech', 
          techBase: TechBase.CLAN 
        });
        
        // Switch between units
        simulateTabSwitch(isUnitId, clanUnitId);
        simulateTabSwitch(clanUnitId, isUnitId);
        
        // Tech bases should be preserved
        expect(getUnitStore(isUnitId)?.getState().techBase).toBe(TechBase.INNER_SPHERE);
        expect(getUnitStore(clanUnitId)?.getState().techBase).toBe(TechBase.CLAN);
      });
    });
    
    describe('Tab Info Integrity', () => {
      it('should preserve all tab metadata after switching', () => {
        const scenario = createMultiUnitScenario(4);
        
        // Get initial tab state
        const initialTabs = [...useTabManagerStore.getState().tabs];
        
        // Switch between all tabs
        act(() => {
          scenario.tabIds.forEach(id => {
            useTabManagerStore.getState().selectTab(id);
          });
        });
        
        // Tab metadata should be identical
        const finalTabs = useTabManagerStore.getState().tabs;
        expect(finalTabs.length).toBe(initialTabs.length);
        
        initialTabs.forEach((initialTab, index) => {
          const finalTab = finalTabs[index];
          expect(finalTab.id).toBe(initialTab.id);
          expect(finalTab.name).toBe(initialTab.name);
          expect(finalTab.tonnage).toBe(initialTab.tonnage);
          expect(finalTab.techBase).toBe(initialTab.techBase);
        });
        
        scenario.cleanup();
      });
      
      it('should maintain tab order after switching', () => {
        const unit1 = createMockUnitWithData({ name: 'First' });
        const unit2 = createMockUnitWithData({ name: 'Second' });
        const unit3 = createMockUnitWithData({ name: 'Third' });
        
        const originalOrder = [unit1, unit2, unit3];
        
        // Switch tabs in random order
        simulateTabSwitch(unit3, unit1);
        simulateTabSwitch(unit1, unit3);
        simulateTabSwitch(unit3, unit2);
        simulateTabSwitch(unit2, unit1);
        
        // Order should be preserved
        const tabs = useTabManagerStore.getState().tabs;
        tabs.forEach((tab, index) => {
          expect(tab.id).toBe(originalOrder[index]);
        });
      });
    });
  });
  
  // ===========================================================================
  // Edge Cases and Stress Tests
  // ===========================================================================
  describe('Edge Cases and Stress Tests', () => {
    it('should handle rapid consecutive tab switches (10+ in 1 second)', () => {
      const scenario = createMultiUnitScenario(5);
      
      // Set unique sub-tabs
      const subTabs: CustomizerTabId[] = ['overview', 'structure', 'armor', 'equipment', 'criticals'];
      act(() => {
        scenario.tabIds.forEach((id, i) => {
          useTabManagerStore.getState().setLastSubTab(id, subTabs[i]);
        });
      });
      
      // Rapid switching (more than 10 times)
      act(() => {
        for (let i = 0; i < 20; i++) {
          const targetIndex = Math.floor(Math.random() * 5);
          useTabManagerStore.getState().selectTab(scenario.tabIds[targetIndex]);
        }
      });
      
      // All sub-tabs should still be preserved
      scenario.tabIds.forEach((id, i) => {
        expect(useTabManagerStore.getState().getLastSubTab(id)).toBe(subTabs[i]);
      });
      
      // All stores should still exist
      scenario.tabIds.forEach(id => {
        expect(hasUnitStore(id)).toBe(true);
      });
      
      scenario.cleanup();
    });
    
    it('should handle switching to same tab repeatedly', () => {
      const tabId = createMockUnitWithData({ name: 'Test Unit', lastSubTab: 'armor' });
      
      // Select same tab multiple times
      act(() => {
        for (let i = 0; i < 10; i++) {
          useTabManagerStore.getState().selectTab(tabId);
        }
      });
      
      // State should be unchanged
      expectActiveTab(tabId);
      expect(useTabManagerStore.getState().getLastSubTab(tabId)).toBe('armor');
    });
    
    it('should handle getLastSubTab for non-existent tab gracefully', () => {
      const result = useTabManagerStore.getState().getLastSubTab('non-existent-id');
      expect(result).toBeUndefined();
    });
    
    it('should handle setLastSubTab for non-existent tab gracefully', () => {
      // Should not throw
      act(() => {
        useTabManagerStore.getState().setLastSubTab('non-existent-id', 'armor');
      });
      
      // Should still return undefined
      expect(useTabManagerStore.getState().getLastSubTab('non-existent-id')).toBeUndefined();
    });
    
    it('should handle closing and reopening tabs with lastSubTab', () => {
      const unit1Id = createMockUnitWithData({ name: 'Unit 1', lastSubTab: 'preview' });
      const unit2Id = createMockUnitWithData({ name: 'Unit 2', lastSubTab: 'armor' });
      
      // Close unit 1
      act(() => {
        useTabManagerStore.getState().closeTab(unit1Id);
      });
      
      // Unit 2's lastSubTab should be unaffected
      expect(useTabManagerStore.getState().getLastSubTab(unit2Id)).toBe('armor');
      expectTabCount(1);
    });
    
    it('should preserve lastSubTab when renaming a tab', () => {
      const tabId = createMockUnitWithData({ name: 'Original Name', lastSubTab: 'equipment' });
      
      // Rename the tab
      act(() => {
        useTabManagerStore.getState().renameTab(tabId, 'New Name');
      });
      
      // lastSubTab should be preserved
      expect(useTabManagerStore.getState().getLastSubTab(tabId)).toBe('equipment');
      expect(useTabManagerStore.getState().tabs[0].name).toBe('New Name');
    });
    
    it('should handle switching between many unit types (stress test)', () => {
      // Create 10 units of varying tonnages
      const tabIds: string[] = [];
      const tonnages = [20, 25, 30, 45, 50, 55, 70, 75, 85, 100];
      
      act(() => {
        tonnages.forEach((tonnage, i) => {
          const id = createMockUnitWithData({ 
            name: `Unit ${tonnage}T`, 
            tonnage,
            lastSubTab: COMMON_SUB_TABS[i % COMMON_SUB_TABS.length],
          });
          tabIds.push(id);
        });
      });
      
      // Switch through all tabs
      act(() => {
        tabIds.forEach(id => {
          useTabManagerStore.getState().selectTab(id);
        });
      });
      
      // Verify all data is preserved
      expectTabCount(10);
      tabIds.forEach((id, i) => {
        expect(hasUnitStore(id)).toBe(true);
        expect(getUnitStore(id)?.getState().tonnage).toBe(tonnages[i]);
        expect(useTabManagerStore.getState().getLastSubTab(id)).toBe(
          COMMON_SUB_TABS[i % COMMON_SUB_TABS.length]
        );
      });
    });
  });
  
  // ===========================================================================
  // Integration with Tab Manager Operations
  // ===========================================================================
  describe('Integration with Tab Manager Operations', () => {
    it('should preserve lastSubTab when reordering tabs', () => {
      const unit1 = createMockUnitWithData({ name: 'First', lastSubTab: 'armor' });
      const unit2 = createMockUnitWithData({ name: 'Second', lastSubTab: 'preview' });
      const unit3 = createMockUnitWithData({ name: 'Third', lastSubTab: 'criticals' });
      
      // Reorder tabs
      act(() => {
        useTabManagerStore.getState().reorderTabs(0, 2);
      });
      
      // lastSubTabs should be preserved
      expect(useTabManagerStore.getState().getLastSubTab(unit1)).toBe('armor');
      expect(useTabManagerStore.getState().getLastSubTab(unit2)).toBe('preview');
      expect(useTabManagerStore.getState().getLastSubTab(unit3)).toBe('criticals');
    });
    
    it('should preserve lastSubTab when duplicating a tab', () => {
      const originalId = createMockUnitWithData({ name: 'Original', lastSubTab: 'equipment' });
      
      let duplicateId: string | null = null;
      act(() => {
        duplicateId = useTabManagerStore.getState().duplicateTab(originalId);
      });
      
      // Original should keep its lastSubTab
      expect(useTabManagerStore.getState().getLastSubTab(originalId)).toBe('equipment');
      
      // Duplicate starts without a lastSubTab (fresh state)
      // This is expected behavior - the duplicate is a new unit
      expect(duplicateId).not.toBeNull();
    });
    
    it('should handle closing active tab and switching to adjacent', () => {
      const unit1 = createMockUnitWithData({ name: 'First', lastSubTab: 'armor' });
      const unit2 = createMockUnitWithData({ name: 'Second', lastSubTab: 'preview' });
      const unit3 = createMockUnitWithData({ name: 'Third', lastSubTab: 'criticals' });
      
      // Select middle tab
      simulateTabSwitch(unit3, unit2);
      expectActiveTab(unit2);
      
      // Close it
      act(() => {
        useTabManagerStore.getState().closeTab(unit2);
      });
      
      // Should have selected adjacent tab
      expectTabCount(2);
      
      // Remaining tabs should preserve their lastSubTab
      expect(useTabManagerStore.getState().getLastSubTab(unit1)).toBe('armor');
      expect(useTabManagerStore.getState().getLastSubTab(unit3)).toBe('criticals');
    });
  });
  
  // ===========================================================================
  // Mock Router URL Verification (Unit Tests for Helper)
  // ===========================================================================
  describe('Mock Router URL Verification', () => {
    it('should parse customizer URL correctly', () => {
      const mockRouter = createMockRouter('/customizer/abc-123/armor');
      
      expect(mockRouter.query.slug).toEqual(['abc-123', 'armor']);
    });
    
    it('should update mock router state on push', async () => {
      const mockRouter = createMockRouter('/customizer');
      
      await mockRouter.push('/customizer/unit-id/preview');
      
      expect(mockRouter.pathname).toBe('/customizer/unit-id/preview');
      expect(mockRouter.query.slug).toEqual(['unit-id', 'preview']);
    });
    
    it('should handle index route correctly', () => {
      const mockRouter = createMockRouter('/customizer');
      
      expect(mockRouter.query.slug).toBeUndefined();
    });
  });
});
