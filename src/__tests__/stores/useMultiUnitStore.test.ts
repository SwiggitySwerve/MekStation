/**
 * Multi-Unit Store Tests
 * 
 * Tests for the multi-unit tab store, including tab management
 * and component selection actions.
 * 
 * @spec openspec/specs/multi-unit-tabs/spec.md
 */

import { act } from '@testing-library/react';
import { 
  useMultiUnitStore, 
  UNIT_TEMPLATES,
  createDefaultComponentSelections,
} from '@/stores/useMultiUnitStore';
import { TechBase } from '@/types/enums/TechBase';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { CockpitType } from '@/types/construction/CockpitType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import {
  setupMockLocalStorage,
  expectAllComponentTechBases,
} from '../helpers/storeTestHelpers';

describe('useMultiUnitStore', () => {
  let mockStorage: ReturnType<typeof setupMockLocalStorage>;
  
  beforeEach(() => {
    mockStorage = setupMockLocalStorage();
    // Reset store state before each test
    useMultiUnitStore.setState({
      tabs: [],
      activeTabId: null,
      isLoading: false,
      isNewTabModalOpen: false,
    });
  });
  
  afterEach(() => {
    mockStorage.cleanup();
  });
  
  // ===========================================================================
  // Unit Templates
  // ===========================================================================
  describe('UNIT_TEMPLATES', () => {
    it('should have correct weight class templates', () => {
      expect(UNIT_TEMPLATES).toHaveLength(4);
      
      const lightTemplate = UNIT_TEMPLATES.find(t => t.id === 'light');
      const mediumTemplate = UNIT_TEMPLATES.find(t => t.id === 'medium');
      const heavyTemplate = UNIT_TEMPLATES.find(t => t.id === 'heavy');
      const assaultTemplate = UNIT_TEMPLATES.find(t => t.id === 'assault');
      
      expect(lightTemplate?.tonnage).toBe(25);
      expect(mediumTemplate?.tonnage).toBe(50);
      expect(heavyTemplate?.tonnage).toBe(70);
      expect(assaultTemplate?.tonnage).toBe(100);
    });
    
    it('should have appropriate walk MPs for each weight class', () => {
      const lightTemplate = UNIT_TEMPLATES.find(t => t.id === 'light');
      const assaultTemplate = UNIT_TEMPLATES.find(t => t.id === 'assault');
      
      // Light mechs should be faster
      expect(lightTemplate?.walkMP).toBeGreaterThan(assaultTemplate?.walkMP ?? 0);
    });
  });
  
  // ===========================================================================
  // createDefaultComponentSelections
  // ===========================================================================
  describe('createDefaultComponentSelections()', () => {
    it('should create default selections with correct engine rating', () => {
      const selections = createDefaultComponentSelections(50, 4);
      
      expect(selections.engineRating).toBe(200); // 50 * 4
    });
    
    it('should default to standard components', () => {
      const selections = createDefaultComponentSelections(50);
      
      expect(selections.engineType).toBe(EngineType.STANDARD);
      expect(selections.gyroType).toBe(GyroType.STANDARD);
      expect(selections.internalStructureType).toBe(InternalStructureType.STANDARD);
      expect(selections.cockpitType).toBe(CockpitType.STANDARD);
      expect(selections.heatSinkType).toBe(HeatSinkType.SINGLE);
      expect(selections.heatSinkCount).toBe(10);
      expect(selections.armorType).toBe(ArmorTypeEnum.STANDARD);
    });
    
    it('should use default walkMP of 4', () => {
      const selections = createDefaultComponentSelections(100);
      
      expect(selections.engineRating).toBe(400); // 100 * 4
    });
  });
  
  // ===========================================================================
  // Tab Creation
  // ===========================================================================
  describe('createTab()', () => {
    it('should create a new tab with unique ID', () => {
      const template = UNIT_TEMPLATES[1]; // Medium
      
      act(() => {
        useMultiUnitStore.getState().createTab(template);
      });
      
      const { tabs, activeTabId } = useMultiUnitStore.getState();
      
      expect(tabs).toHaveLength(1);
      expect(tabs[0].id).toMatch(/^tab-\d+-[a-z0-9]+$/);
      expect(activeTabId).toBe(tabs[0].id);
    });
    
    it('should set tab name from template', () => {
      const template = UNIT_TEMPLATES[0]; // Light
      
      act(() => {
        useMultiUnitStore.getState().createTab(template);
      });
      
      const { tabs } = useMultiUnitStore.getState();
      
      expect(tabs[0].name).toBe(`New ${template.name}`);
    });
    
    it('should use custom name if provided', () => {
      const template = UNIT_TEMPLATES[0];
      
      act(() => {
        useMultiUnitStore.getState().createTab(template, 'Custom Name');
      });
      
      const { tabs } = useMultiUnitStore.getState();
      
      expect(tabs[0].name).toBe('Custom Name');
    });
    
    it('should initialize tech base mode based on template', () => {
      const isTemplate = { ...UNIT_TEMPLATES[0], techBase: TechBase.INNER_SPHERE };
      const clanTemplate = { ...UNIT_TEMPLATES[0], techBase: TechBase.CLAN };
      
      act(() => {
        useMultiUnitStore.getState().createTab(isTemplate);
        useMultiUnitStore.getState().createTab(clanTemplate);
      });
      
      const { tabs } = useMultiUnitStore.getState();
      
      expect(tabs[0].techBaseMode).toBe(TechBaseMode.INNER_SPHERE);
      expect(tabs[1].techBaseMode).toBe(TechBaseMode.CLAN);
    });
    
    it('should initialize componentTechBases matching template tech base', () => {
      const isTemplate = { ...UNIT_TEMPLATES[0], techBase: TechBase.INNER_SPHERE };
      
      act(() => {
        useMultiUnitStore.getState().createTab(isTemplate);
      });
      
      const { tabs } = useMultiUnitStore.getState();
      
      expectAllComponentTechBases(tabs[0].componentTechBases, TechBase.INNER_SPHERE);
    });
    
    it('should close new tab modal after creating', () => {
      act(() => {
        useMultiUnitStore.getState().openNewTabModal();
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]);
      });
      
      expect(useMultiUnitStore.getState().isNewTabModalOpen).toBe(false);
    });
    
    it('should create multiple tabs', () => {
      act(() => {
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]);
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[1]);
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[2]);
      });
      
      const { tabs } = useMultiUnitStore.getState();
      
      expect(tabs).toHaveLength(3);
      // Active tab should be the last created
      expect(useMultiUnitStore.getState().activeTabId).toBe(tabs[2].id);
    });
  });
  
  // ===========================================================================
  // Tab Duplication
  // ===========================================================================
  describe('duplicateTab()', () => {
    it('should duplicate tab with all configuration', () => {
      act(() => {
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[1]);
        const tabId = useMultiUnitStore.getState().tabs[0].id;
        
        // Modify the original tab
        useMultiUnitStore.getState().updateEngineType(tabId, EngineType.XL_IS);
        useMultiUnitStore.getState().updateTechBaseMode(tabId, TechBaseMode.MIXED);
        
        // Duplicate
        useMultiUnitStore.getState().duplicateTab(tabId);
      });
      
      const { tabs, activeTabId } = useMultiUnitStore.getState();
      
      expect(tabs).toHaveLength(2);
      expect(tabs[1].name).toContain('(Copy)');
      expect(tabs[1].componentSelections.engineType).toBe(EngineType.XL_IS);
      expect(tabs[1].techBaseMode).toBe(TechBaseMode.MIXED);
      expect(activeTabId).toBe(tabs[1].id);
    });
    
    it('should create independent copy (not share references)', () => {
      act(() => {
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]);
        const originalId = useMultiUnitStore.getState().tabs[0].id;
        useMultiUnitStore.getState().duplicateTab(originalId);
      });
      
      const { tabs } = useMultiUnitStore.getState();
      const originalId = tabs[0].id;
      const copyId = tabs[1].id;
      
      // Modify copy
      act(() => {
        useMultiUnitStore.getState().updateGyroType(copyId, GyroType.XL);
      });
      
      // Original should be unchanged
      expect(useMultiUnitStore.getState().tabs[0].componentSelections.gyroType).toBe(GyroType.STANDARD);
      expect(useMultiUnitStore.getState().tabs[1].componentSelections.gyroType).toBe(GyroType.XL);
    });
    
    it('should return null for non-existent tab', () => {
      let result: string | null = 'initial';
      
      act(() => {
        result = useMultiUnitStore.getState().duplicateTab('non-existent');
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
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]);
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[1]);
      });
      
      const firstTabId = useMultiUnitStore.getState().tabs[0].id;
      
      act(() => {
        useMultiUnitStore.getState().closeTab(firstTabId);
      });
      
      expect(useMultiUnitStore.getState().tabs).toHaveLength(1);
    });
    
    it('should not close last tab', () => {
      act(() => {
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]);
      });
      
      const tabId = useMultiUnitStore.getState().tabs[0].id;
      
      act(() => {
        useMultiUnitStore.getState().closeTab(tabId);
      });
      
      // Should still have one tab
      expect(useMultiUnitStore.getState().tabs).toHaveLength(1);
    });
    
    it('should select adjacent tab when closing active tab', () => {
      act(() => {
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]);
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[1]);
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[2]);
      });
      
      const tabs = useMultiUnitStore.getState().tabs;
      const middleTabId = tabs[1].id;
      
      // Select middle tab then close it
      act(() => {
        useMultiUnitStore.getState().selectTab(middleTabId);
        useMultiUnitStore.getState().closeTab(middleTabId);
      });
      
      // Should select adjacent tab (now at same index)
      expect(useMultiUnitStore.getState().activeTabId).toBe(tabs[2].id);
    });
  });
  
  // ===========================================================================
  // Tab Selection
  // ===========================================================================
  describe('selectTab()', () => {
    it('should change active tab', () => {
      act(() => {
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]);
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[1]);
      });
      
      const tabs = useMultiUnitStore.getState().tabs;
      
      act(() => {
        useMultiUnitStore.getState().selectTab(tabs[0].id);
      });
      
      expect(useMultiUnitStore.getState().activeTabId).toBe(tabs[0].id);
    });
  });
  
  // ===========================================================================
  // Tab Renaming
  // ===========================================================================
  describe('renameTab()', () => {
    it('should rename a tab', () => {
      act(() => {
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]);
      });
      
      const tabId = useMultiUnitStore.getState().tabs[0].id;
      
      act(() => {
        useMultiUnitStore.getState().renameTab(tabId, 'My Custom Mech');
      });
      
      expect(useMultiUnitStore.getState().tabs[0].name).toBe('My Custom Mech');
    });
  });
  
  // ===========================================================================
  // Mark Modified
  // ===========================================================================
  describe('markModified()', () => {
    it('should mark tab as modified', () => {
      act(() => {
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]);
      });
      
      const tabId = useMultiUnitStore.getState().tabs[0].id;
      
      act(() => {
        useMultiUnitStore.getState().markModified(tabId, true);
      });
      
      expect(useMultiUnitStore.getState().tabs[0].isModified).toBe(true);
    });
    
    it('should mark tab as not modified', () => {
      act(() => {
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]);
      });
      
      const tabId = useMultiUnitStore.getState().tabs[0].id;
      
      act(() => {
        useMultiUnitStore.getState().markModified(tabId, false);
      });
      
      expect(useMultiUnitStore.getState().tabs[0].isModified).toBe(false);
    });
  });
  
  // ===========================================================================
  // Tech Base Mode Updates
  // ===========================================================================
  describe('updateTechBaseMode()', () => {
    it('should update tech base mode', () => {
      act(() => {
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]);
      });
      
      const tabId = useMultiUnitStore.getState().tabs[0].id;
      
      act(() => {
        useMultiUnitStore.getState().updateTechBaseMode(tabId, TechBaseMode.CLAN);
      });
      
      expect(useMultiUnitStore.getState().tabs[0].techBaseMode).toBe(TechBaseMode.CLAN);
    });
    
    it('should reset componentTechBases when switching to Clan', () => {
      act(() => {
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]); // IS by default
      });
      
      const tabId = useMultiUnitStore.getState().tabs[0].id;
      
      act(() => {
        useMultiUnitStore.getState().updateTechBaseMode(tabId, TechBaseMode.CLAN);
      });
      
      expectAllComponentTechBases(
        useMultiUnitStore.getState().tabs[0].componentTechBases,
        TechBase.CLAN
      );
    });
    
    it('should reset componentTechBases when switching to IS', () => {
      const clanTemplate = { ...UNIT_TEMPLATES[0], techBase: TechBase.CLAN };
      
      act(() => {
        useMultiUnitStore.getState().createTab(clanTemplate);
      });
      
      const tabId = useMultiUnitStore.getState().tabs[0].id;
      
      act(() => {
        useMultiUnitStore.getState().updateTechBaseMode(tabId, TechBaseMode.INNER_SPHERE);
      });
      
      expectAllComponentTechBases(
        useMultiUnitStore.getState().tabs[0].componentTechBases,
        TechBase.INNER_SPHERE
      );
    });
    
    it('should preserve componentTechBases when switching to mixed', () => {
      act(() => {
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]);
      });
      
      const tabId = useMultiUnitStore.getState().tabs[0].id;
      
      // Set a specific component to Clan
      act(() => {
        useMultiUnitStore.getState().updateComponentTechBase(tabId, 'engine', TechBase.CLAN);
      });
      
      // Switch to mixed
      act(() => {
        useMultiUnitStore.getState().updateTechBaseMode(tabId, TechBaseMode.MIXED);
      });
      
      // Engine should still be Clan
      expect(useMultiUnitStore.getState().tabs[0].componentTechBases.engine).toBe(TechBase.CLAN);
      // Others should be IS
      expect(useMultiUnitStore.getState().tabs[0].componentTechBases.chassis).toBe(TechBase.INNER_SPHERE);
    });
  });
  
  // ===========================================================================
  // Component Tech Base Updates
  // ===========================================================================
  describe('updateComponentTechBase()', () => {
    it('should update individual component tech base', () => {
      act(() => {
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]);
      });
      
      const tabId = useMultiUnitStore.getState().tabs[0].id;
      
      act(() => {
        useMultiUnitStore.getState().updateComponentTechBase(tabId, 'engine', TechBase.CLAN);
      });
      
      expect(useMultiUnitStore.getState().tabs[0].componentTechBases.engine).toBe(TechBase.CLAN);
    });
    
    it('should not affect other component tech bases', () => {
      act(() => {
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]);
      });
      
      const tabId = useMultiUnitStore.getState().tabs[0].id;
      
      act(() => {
        useMultiUnitStore.getState().updateComponentTechBase(tabId, 'heatsink', TechBase.CLAN);
      });
      
      const { componentTechBases } = useMultiUnitStore.getState().tabs[0];
      
      expect(componentTechBases.heatsink).toBe(TechBase.CLAN);
      expect(componentTechBases.engine).toBe(TechBase.INNER_SPHERE);
      expect(componentTechBases.armor).toBe(TechBase.INNER_SPHERE);
    });
  });
  
  // ===========================================================================
  // Component Selection Updates
  // ===========================================================================
  describe('Component Selection Updates', () => {
    describe('updateEngineType()', () => {
      it('should update engine type', () => {
        act(() => {
          useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[1]);
        });
        
        const tabId = useMultiUnitStore.getState().tabs[0].id;
        
        act(() => {
          useMultiUnitStore.getState().updateEngineType(tabId, EngineType.XL_IS);
        });
        
        expect(useMultiUnitStore.getState().tabs[0].componentSelections.engineType).toBe(EngineType.XL_IS);
      });
      
      it('should mark tab as modified', () => {
        act(() => {
          useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]);
        });
        
        const tabId = useMultiUnitStore.getState().tabs[0].id;
        
        act(() => {
          useMultiUnitStore.getState().markModified(tabId, false);
          useMultiUnitStore.getState().updateEngineType(tabId, EngineType.LIGHT);
        });
        
        expect(useMultiUnitStore.getState().tabs[0].isModified).toBe(true);
      });
    });
    
    describe('updateEngineRating()', () => {
      it('should update engine rating', () => {
        act(() => {
          useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[1]); // 50 tons
        });
        
        const tabId = useMultiUnitStore.getState().tabs[0].id;
        
        act(() => {
          useMultiUnitStore.getState().updateEngineRating(tabId, 300);
        });
        
        expect(useMultiUnitStore.getState().tabs[0].componentSelections.engineRating).toBe(300);
      });
    });
    
    describe('updateGyroType()', () => {
      it('should update gyro type', () => {
        act(() => {
          useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]);
        });
        
        const tabId = useMultiUnitStore.getState().tabs[0].id;
        
        act(() => {
          useMultiUnitStore.getState().updateGyroType(tabId, GyroType.COMPACT);
        });
        
        expect(useMultiUnitStore.getState().tabs[0].componentSelections.gyroType).toBe(GyroType.COMPACT);
      });
    });
    
    describe('updateStructureType()', () => {
      it('should update structure type', () => {
        act(() => {
          useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]);
        });
        
        const tabId = useMultiUnitStore.getState().tabs[0].id;
        
        act(() => {
          useMultiUnitStore.getState().updateStructureType(tabId, InternalStructureType.ENDO_STEEL_IS);
        });
        
        expect(useMultiUnitStore.getState().tabs[0].componentSelections.internalStructureType)
          .toBe(InternalStructureType.ENDO_STEEL_IS);
      });
    });
    
    describe('updateCockpitType()', () => {
      it('should update cockpit type', () => {
        act(() => {
          useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]);
        });
        
        const tabId = useMultiUnitStore.getState().tabs[0].id;
        
        act(() => {
          useMultiUnitStore.getState().updateCockpitType(tabId, CockpitType.SMALL);
        });
        
        expect(useMultiUnitStore.getState().tabs[0].componentSelections.cockpitType).toBe(CockpitType.SMALL);
      });
    });
    
    describe('updateHeatSinkType()', () => {
      it('should update heat sink type', () => {
        act(() => {
          useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]);
        });
        
        const tabId = useMultiUnitStore.getState().tabs[0].id;
        
        act(() => {
          useMultiUnitStore.getState().updateHeatSinkType(tabId, HeatSinkType.DOUBLE_IS);
        });
        
        expect(useMultiUnitStore.getState().tabs[0].componentSelections.heatSinkType)
          .toBe(HeatSinkType.DOUBLE_IS);
      });
    });
    
    describe('updateHeatSinkCount()', () => {
      it('should update heat sink count', () => {
        act(() => {
          useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]);
        });
        
        const tabId = useMultiUnitStore.getState().tabs[0].id;
        
        act(() => {
          useMultiUnitStore.getState().updateHeatSinkCount(tabId, 15);
        });
        
        expect(useMultiUnitStore.getState().tabs[0].componentSelections.heatSinkCount).toBe(15);
      });
    });
    
    describe('updateArmorType()', () => {
      it('should update armor type', () => {
        act(() => {
          useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]);
        });
        
        const tabId = useMultiUnitStore.getState().tabs[0].id;
        
        act(() => {
          useMultiUnitStore.getState().updateArmorType(tabId, ArmorTypeEnum.FERRO_FIBROUS_IS);
        });
        
        expect(useMultiUnitStore.getState().tabs[0].componentSelections.armorType)
          .toBe(ArmorTypeEnum.FERRO_FIBROUS_IS);
      });
    });
    
    describe('updateComponentSelections()', () => {
      it('should update multiple selections at once', () => {
        act(() => {
          useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[1]);
        });
        
        const tabId = useMultiUnitStore.getState().tabs[0].id;
        
        act(() => {
          useMultiUnitStore.getState().updateComponentSelections(tabId, {
            engineType: EngineType.XL_IS,
            gyroType: GyroType.XL,
            heatSinkType: HeatSinkType.DOUBLE_IS,
          });
        });
        
        const { componentSelections } = useMultiUnitStore.getState().tabs[0];
        
        expect(componentSelections.engineType).toBe(EngineType.XL_IS);
        expect(componentSelections.gyroType).toBe(GyroType.XL);
        expect(componentSelections.heatSinkType).toBe(HeatSinkType.DOUBLE_IS);
        // Others should remain unchanged
        expect(componentSelections.internalStructureType).toBe(InternalStructureType.STANDARD);
      });
    });
  });
  
  // ===========================================================================
  // Modal State
  // ===========================================================================
  describe('Modal State', () => {
    it('should open new tab modal', () => {
      act(() => {
        useMultiUnitStore.getState().openNewTabModal();
      });
      
      expect(useMultiUnitStore.getState().isNewTabModalOpen).toBe(true);
    });
    
    it('should close new tab modal', () => {
      act(() => {
        useMultiUnitStore.getState().openNewTabModal();
        useMultiUnitStore.getState().closeNewTabModal();
      });
      
      expect(useMultiUnitStore.getState().isNewTabModalOpen).toBe(false);
    });
  });
  
  // ===========================================================================
  // Helper Functions
  // ===========================================================================
  describe('getActiveTab()', () => {
    it('should return active tab', () => {
      act(() => {
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[0]);
        useMultiUnitStore.getState().createTab(UNIT_TEMPLATES[1]);
      });
      
      const activeTab = useMultiUnitStore.getState().getActiveTab();
      
      expect(activeTab).not.toBeNull();
      expect(activeTab?.id).toBe(useMultiUnitStore.getState().activeTabId);
    });
    
    it('should return null when no tabs', () => {
      const activeTab = useMultiUnitStore.getState().getActiveTab();
      
      expect(activeTab).toBeNull();
    });
  });
});

