import { useUnitStore } from '../stores/unitStore';
import { UnitCriticalManager } from '../utils/criticalSlots/UnitCriticalManager';
import { useMemo } from 'react';

export function useUnitStoreIntegration() {
  const store = useUnitStore();
  const { activeTabId, tabs } = store;
  
  const currentTab = activeTabId ? tabs[activeTabId] : null;
  
  // Create a temporary manager to derive data from the serialized state
  const unitManager = useMemo(() => {
      if (!currentTab) return null;
      const manager = new UnitCriticalManager(currentTab.state.configuration);
      manager.deserializeCompleteState(currentTab.state);
      return manager;
  }, [currentTab?.state]); // Recreate when state changes
  
  return {
    // Data
    unit: unitManager,
    engineType: currentTab?.state.configuration.engineType || 'Standard',
    gyroType: currentTab?.state.configuration.gyroType || { type: 'Standard', techBase: 'Inner Sphere' },
    unallocatedEquipment: unitManager?.getUnallocatedEquipment() || [],
    validation: unitManager?.validate() || null,
    summary: unitManager?.getSummary() || null,
    isConfigLoaded: !!currentTab,
    selectedEquipmentId: store.selectedEquipmentId,
    unitVersion: currentTab?.modified.getTime() || 0, // Use modification time as version
    
    // Actions from slices
    changeEngine: store.changeEngine,
    changeGyro: store.changeGyro,
    changeStructure: store.changeStructure,
    changeArmor: store.changeArmor,
    changeHeatSink: store.changeHeatSink,
    changeJumpJet: store.changeJumpJet,
    updateConfiguration: store.updateConfiguration,
    addTestEquipment: store.addTestEquipment,
    addEquipmentToUnit: store.addEquipmentToUnit,
    removeEquipment: store.removeEquipment,
    resetUnit: store.resetUnit,
    selectEquipment: store.selectEquipment,
    assignSelectedEquipment: store.assignSelectedEquipment,
    validateTab: store.validateTab,
    
    // Tab management from main store
    tabs: store.tabs,
    activeTabId: store.activeTabId,
    tabOrder: store.tabOrder,
    createTab: store.createTab,
    closeTab: store.closeTab,
    setActiveTab: store.setActiveTab,
    renameTab: store.renameTab,
    duplicateTab: store.duplicateTab,
    
    // Debug
    getDebugInfo: () => ({
        storeState: store,
        currentTab: currentTab,
        unitManagerConfig: unitManager?.getConfiguration()
    })
  };
}

