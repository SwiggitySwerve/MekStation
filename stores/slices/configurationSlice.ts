import { StateCreator } from 'zustand';
import { UnitStore, UnitStoreState } from '../unitStore';
import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { UnitCriticalManager } from '../../utils/criticalSlots/UnitCriticalManager';
import { EngineType, GyroType, StructureType, ArmorType, HeatSinkType } from '../../types/components';
import { ComponentConfiguration } from '../../types/componentConfiguration';
import { componentUpdateAdapter } from '../../services/ComponentUpdateAdapter';

export interface ConfigurationSlice {
  updateConfiguration: (config: UnitConfiguration) => void;
  changeEngine: (engineType: EngineType) => void;
  changeGyro: (gyroType: GyroType) => void;
  changeStructure: (structureType: ComponentConfiguration | string) => void;
  changeArmor: (armorType: ComponentConfiguration | string) => void;
  changeHeatSink: (heatSinkType: ComponentConfiguration | string) => void;
  changeJumpJet: (jumpJetType: ComponentConfiguration | string) => void;
  resetUnit: (config?: UnitConfiguration) => void;
}

export const createConfigurationSlice: StateCreator<
  UnitStore,
  [],
  [],
  ConfigurationSlice
> = (set, get) => ({
  updateConfiguration: (config: UnitConfiguration) => {
    const { activeTabId, tabs, updateTabState } = get();
    if (!activeTabId || !tabs[activeTabId]) return;

    const currentTab = tabs[activeTabId];
    
    // Hydrate
    const unitManager = new UnitCriticalManager(currentTab.state.configuration);
    unitManager.deserializeCompleteState(currentTab.state);

    // Operate
    unitManager.updateConfiguration(config);

    // Serialize
    const newState = unitManager.serializeCompleteState();
    
    updateTabState(activeTabId, newState);
  },

  changeEngine: (engineType: EngineType) => {
    const { activeTabId, tabs, updateConfiguration } = get();
    if (!activeTabId || !tabs[activeTabId]) return;

    const currentConfig = tabs[activeTabId].state.configuration;
    // Create a new config object with the updated engine type
    // The UnitCriticalManager will handle the business logic of implications
    // but we need to pass a full configuration object
    const newConfig = {
        ...currentConfig,
        engineType
    };
    
    // Using the updateConfiguration action to handle the hydration/serialization cycle
    updateConfiguration(newConfig);
  },

  changeGyro: (gyroType: GyroType) => {
    const { activeTabId, tabs, updateConfiguration } = get();
    if (!activeTabId || !tabs[activeTabId]) return;

    const currentConfig = tabs[activeTabId].state.configuration;
    // Note: UnitCriticalManager expects component objects in some places and strings in others
    // The types suggest GyroType is likely a string or object depending on context
    // We'll assume the passed type matches what the config expects or needs conversion
    // For now, direct assignment if types align
    
    // If GyroType in config is different from the parameter, we might need adaptation
    // But based on MultiUnitProvider, it seems we can just pass it
    const newConfig = {
        ...currentConfig,
        gyroType
    };

    updateConfiguration(newConfig);
  },

  changeStructure: (structureType: ComponentConfiguration | string) => {
    const { activeTabId, tabs, updateConfiguration } = get();
    if (!activeTabId || !tabs[activeTabId]) return;

    const currentConfig = tabs[activeTabId].state.configuration;
    const result = componentUpdateAdapter.updateStructure(structureType, currentConfig);

    if (result.success) {
        updateConfiguration(result.newConfiguration);
    } else {
        console.error('Structure update failed:', result.errors);
        // Optionally set an error state in a UI slice
    }
  },

  changeArmor: (armorType: ComponentConfiguration | string) => {
    const { activeTabId, tabs, updateConfiguration } = get();
    if (!activeTabId || !tabs[activeTabId]) return;

    const currentConfig = tabs[activeTabId].state.configuration;
    const result = componentUpdateAdapter.updateArmor(armorType, currentConfig);

    if (result.success) {
        updateConfiguration(result.newConfiguration);
    } else {
        console.error('Armor update failed:', result.errors);
    }
  },

  changeHeatSink: (heatSinkType: ComponentConfiguration | string) => {
    const { activeTabId, tabs, updateConfiguration } = get();
    if (!activeTabId || !tabs[activeTabId]) return;

    const currentConfig = tabs[activeTabId].state.configuration;
    const result = componentUpdateAdapter.updateHeatSink(heatSinkType, currentConfig);

    if (result.success) {
        updateConfiguration(result.newConfiguration);
    } else {
        console.error('Heat sink update failed:', result.errors);
    }
  },

  changeJumpJet: (jumpJetType: ComponentConfiguration | string) => {
    const { activeTabId, tabs, updateConfiguration } = get();
    if (!activeTabId || !tabs[activeTabId]) return;

    const currentConfig = tabs[activeTabId].state.configuration;
    const result = componentUpdateAdapter.updateJumpJet(jumpJetType, currentConfig);

    if (result.success) {
        updateConfiguration(result.newConfiguration);
    } else {
        console.error('Jump jet update failed:', result.errors);
    }
  },

  resetUnit: (config?: UnitConfiguration) => {
      const { activeTabId, tabs, updateTabState } = get();
      if (!activeTabId || !tabs[activeTabId]) return;

      const currentTab = tabs[activeTabId];
      
      // Hydrate
      const unitManager = new UnitCriticalManager(currentTab.state.configuration);
      unitManager.deserializeCompleteState(currentTab.state);

      // Operate
      unitManager.resetUnit(config);

      // Serialize
      const newState = unitManager.serializeCompleteState();
      updateTabState(activeTabId, newState);
  }
});

