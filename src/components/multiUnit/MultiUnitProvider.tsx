/**
 * Multi-Unit Provider - Legacy Wrapper for Zustand Store
 * Replaces the context-based state with the new Zustand store while maintaining
 * backward compatibility for existing components.
 */

import React, { useEffect, useState } from 'react';
import { useUnitStore } from '../../stores/unitStore';
import { useUnitStoreIntegration } from '../../hooks/useUnitStoreIntegration';
import { UnitCriticalManager } from '../../utils/criticalSlots/UnitCriticalManager';
import { UnitStateManager } from '../../utils/criticalSlots/UnitStateManager';
import { UnitConfiguration, UnitValidationResult } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { EngineType, GyroType, StructureType, ArmorType, HeatSinkType } from '../../types/systemComponents';
import { EquipmentAllocation } from '../../utils/criticalSlots/CriticalSlot';
import { ComponentConfiguration } from '../../types/componentConfiguration';
import { SaveManagerBrowserHandlers, MultiTabDebouncedSaveManager } from '../../utils/DebouncedSaveManager';

// Tab unit interface - kept for compatibility
export interface TabUnit {
  id: string;
  name: string;
  // Optional to allow for background tabs to not carry heavy manager
  unitManager: UnitCriticalManager; 
  stateManager: UnitStateManager; // Deprecated but kept for interface compat
  created: Date;
  modified: Date;
  isModified: boolean;
}

// Context value interface
export interface MultiUnitContextValue {
  // State
  tabs: TabUnit[];
  activeTab: TabUnit | null;
  activeTabId: string | null;
  
  // Tab management
  createTab: (name?: string, config?: UnitConfiguration) => string;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  renameTab: (tabId: string, newName: string) => void;
  duplicateTab: (tabId: string) => string;
  
  // Active tab unit operations (proxy to current tab's unit)
  unit: UnitCriticalManager | null;
  engineType: EngineType | null;
  gyroType: GyroType | null;
  unallocatedEquipment: EquipmentAllocation[];
  validation: UnitValidationResult | null;
  summary: Record<string, unknown>;
  isConfigLoaded: boolean;
  selectedEquipmentId: string | null;
  unitVersion: number;
  
  // Active tab action functions
  changeEngine: (engineType: EngineType) => void;
  changeGyro: (gyroType: GyroType) => void;
  changeStructure: (structureType: StructureType) => void;
  changeArmor: (armorType: ArmorType) => void;
  changeHeatSink: (heatSinkType: HeatSinkType) => void;
  changeJumpJet: (jumpJetType: string) => void;
  updateConfiguration: (config: UnitConfiguration) => void;
  addTestEquipment: (equipment: EquipmentAllocation, location: string, startSlot?: number) => boolean;
  addEquipmentToUnit: (equipment: EquipmentAllocation) => void;
  removeEquipment: (equipmentGroupId: string) => boolean;
  resetUnit: (config?: UnitConfiguration) => void;
  selectEquipment: (equipmentGroupId: string | null) => void;
  assignSelectedEquipment: (location: string, slotIndex: number) => boolean;
  getDebugInfo: () => Record<string, unknown>;
}

/**
 * Helper to create a dummy state manager for interface compatibility
 */
const createDummyStateManager = (config: UnitConfiguration): UnitStateManager => {
    // Return a minimal proxy if needed, or a fresh instance
    // Since consumers likely don't use stateManager directly (they use unitManager), 
    // we can just create a lightweight one
    return new UnitStateManager(config);
};

interface MultiUnitProviderProps {
  children: React.ReactNode;
}

export function MultiUnitProvider({ children }: MultiUnitProviderProps) {
  const store = useUnitStore();
  const [isClient, setIsClient] = useState(false);
  const [saveManager] = useState(() => new MultiTabDebouncedSaveManager(1000));
  
  // Initialize on mount
  useEffect(() => {
    setIsClient(true);
    store.initializeStore();
  }, []);
  
  // Initialize browser event handlers for save flushing
  // Note: store saves synchronously to localStorage, but this handles the "unsaved changes" warning
  // we might want to hook into store.subscribe to notify saveManager
  useEffect(() => {
    if (isClient) {
      const browserHandlers = SaveManagerBrowserHandlers.getInstance();
      browserHandlers.attachSaveManager(saveManager);
      
      // Subscribe to store changes to mark unsaved work in saveManager
      const unsub = useUnitStore.subscribe(
        (state) => state.tabs,
        (tabs) => {
            // Check if any tab is modified
            const anyModified = Object.values(tabs).some(t => t.isModified);
            if (anyModified) {
                // Signal modification to save manager (which handles beforeunload)
                // Using scheduleSaveForTab as a proxy for queueing unsaved state
                saveManager.scheduleSaveForTab('global', (data) => console.log('Global save checkpoint', data), () => ({ modified: true })); 
            }
        }
      );

      return () => {
        browserHandlers.detachSaveManager();
        unsub();
      };
    }
  }, [isClient, saveManager]);

  // We don't need to render a Context Provider because we are using Zustand global state.
  // However, if there are children components that we want to ensure are rendered only after init:
  if (!isClient) {
      return (
        <div className="h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-slate-400">Loading...</div>
        </div>
      );
  }

  return <>{children}</>;
}

// Custom hook for consuming the store with the legacy interface
export function useMultiUnit(): MultiUnitContextValue {
  const integration = useUnitStoreIntegration();
  
  // Map store tabs to legacy TabUnit interface
  const tabs: TabUnit[] = integration.tabOrder.map(tabId => {
      const tabState = integration.tabs[tabId];
      
      // For active tab, we can use the hydrated unit manager from integration
      // For inactive tabs, we lazily create one if accessed, or just provide the state
      // To be safe for now, we create a fresh one from state for background tabs if needed
      // or use the active one if it matches
      let unitManager: UnitCriticalManager;
      
      if (tabId === integration.activeTabId && integration.unit) {
          unitManager = integration.unit;
      } else {
          // Create a lightweight manager for background tabs to satisfy interface
          // This is synchronous and should be fast enough for listing
          unitManager = new UnitCriticalManager(tabState.state.configuration);
          // We don't fully deserialize background tabs to save performance unless they are accessed
          // But for interface compatibility we might need to if methods are called
          // For NewTabModal which calls getConfiguration(), the constructor config is enough
      }
      
      return {
          id: tabState.id,
          name: tabState.name,
          unitManager: unitManager,
          stateManager: createDummyStateManager(tabState.state.configuration),
          created: tabState.modified, // We don't track creation date in simple state yet, use modified
          modified: tabState.modified,
          isModified: tabState.isModified
      };
  });
  
  const activeTab = integration.activeTabId 
      ? tabs.find(t => t.id === integration.activeTabId) || null 
      : null;

  return {
      ...integration,
      tabs,
      activeTab,
      // Explicitly typecast potentially conflicting types
      gyroType: integration.gyroType as GyroType,
      // Map functions that might have different signatures if necessary
      createTab: (name, config) => integration.createTab(name, config),
  };
}

// Return type for useUnit hook
export interface UseUnitReturn {
  unit: UnitCriticalManager;
  engineType: EngineType;
  gyroType: GyroType;
  unallocatedEquipment: EquipmentAllocation[];
  validation: UnitValidationResult | null;
  summary: Record<string, unknown>;
  isConfigLoaded: boolean;
  selectedEquipmentId: string | null;
  unitVersion: number;
  changeEngine: (engineType: EngineType) => void;
  changeGyro: (gyroType: GyroType) => void;
  changeStructure: (structureType: StructureType) => void;
  changeArmor: (armorType: ArmorType) => void;
  changeHeatSink: (heatSinkType: HeatSinkType) => void;
  changeJumpJet: (jumpJetType: string) => void;
  updateConfiguration: (config: UnitConfiguration) => void;
  addTestEquipment: (equipment: EquipmentAllocation, location: string, startSlot?: number) => boolean;
  addEquipmentToUnit: (equipment: EquipmentAllocation) => void;
  removeEquipment: (equipmentGroupId: string) => boolean;
  resetUnit: (config?: UnitConfiguration) => void;
  selectEquipment: (equipmentGroupId: string | null) => void;
  assignSelectedEquipment: (location: string, slotIndex: number) => boolean;
  getDebugInfo: () => Record<string, unknown>;
}

// Legacy compatibility hook - proxies to active tab's unit
export function useUnit(): UseUnitReturn {
  const multiUnit = useMultiUnit();
  
  if (!multiUnit.unit) {
    // Return a safe fallback or throw? Legacy threw error.
    // But during init it might be null.
    // For now, we follow the legacy pattern but maybe safer
    if (typeof window === 'undefined') {
         // SSR safety - return a minimal valid structure
         const emptyConfig: UnitConfiguration = {
           tonnage: 100,
           engineRating: 300,
           walkMP: 3,
           runMP: 5,
           jumpMP: 0,
           techBase: 'Inner Sphere',
           engineType: 'Standard',
           gyroType: { type: 'Standard', techBase: 'Inner Sphere' },
           structureType: { type: 'Standard', techBase: 'Inner Sphere' },
           armorType: { type: 'Standard', techBase: 'Inner Sphere' },
           heatSinkType: { type: 'Single', techBase: 'Inner Sphere' }
         };
         const dummyUnit = new UnitCriticalManager(emptyConfig);
         return {
           unit: dummyUnit,
           engineType: 'Standard',
           gyroType: { type: 'Standard', techBase: 'Inner Sphere' },
           unallocatedEquipment: [],
           validation: null,
           summary: {},
           isConfigLoaded: false,
           selectedEquipmentId: null,
           unitVersion: 0,
           changeEngine: () => {},
           changeGyro: () => {},
           changeStructure: () => {},
           changeArmor: () => {},
           changeHeatSink: () => {},
           changeJumpJet: () => {},
           updateConfiguration: () => {},
           addTestEquipment: () => false,
           addEquipmentToUnit: () => {},
           removeEquipment: () => false,
           resetUnit: () => {},
           selectEquipment: () => {},
           assignSelectedEquipment: () => false,
           getDebugInfo: () => ({})
         };
    }
    throw new Error('No active unit available');
  }
  
  return {
    unit: multiUnit.unit,
    engineType: multiUnit.engineType!,
    gyroType: multiUnit.gyroType!,
    unallocatedEquipment: multiUnit.unallocatedEquipment,
    validation: multiUnit.validation,
    summary: multiUnit.summary,
    isConfigLoaded: multiUnit.isConfigLoaded,
    selectedEquipmentId: multiUnit.selectedEquipmentId,
    unitVersion: multiUnit.unitVersion,
    changeEngine: multiUnit.changeEngine,
    changeGyro: multiUnit.changeGyro,
    changeStructure: multiUnit.changeStructure,
    changeArmor: multiUnit.changeArmor,
    changeHeatSink: multiUnit.changeHeatSink,
    changeJumpJet: multiUnit.changeJumpJet,
    updateConfiguration: multiUnit.updateConfiguration,
    addTestEquipment: multiUnit.addTestEquipment,
    addEquipmentToUnit: multiUnit.addEquipmentToUnit,
    removeEquipment: multiUnit.removeEquipment,
    resetUnit: multiUnit.resetUnit,
    selectEquipment: multiUnit.selectEquipment,
    assignSelectedEquipment: multiUnit.assignSelectedEquipment,
    getDebugInfo: multiUnit.getDebugInfo
  };
}
