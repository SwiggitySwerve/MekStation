import { StateCreator } from 'zustand';
import { UnitStore } from '../unitStore';
import { UnitValidationResult } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { UnitCriticalManager } from '../../utils/criticalSlots/UnitCriticalManager';

export interface ValidationSlice {
  validateTab: (tabId: string) => UnitValidationResult | null;
}

export const createValidationSlice: StateCreator<
  UnitStore,
  [],
  [],
  ValidationSlice
> = (set, get) => ({
  validateTab: (tabId: string) => {
    const { tabs } = get();
    const tab = tabs[tabId];
    if (!tab) return null;
    
    // Hydrate to validate
    // Note: In a real high-performance scenario, we might cache this result in the tab state
    // and only update it when the state changes (which happens in updateTabState)
    const unitManager = new UnitCriticalManager(tab.state.configuration);
    unitManager.deserializeCompleteState(tab.state);
    
    return unitManager.validate();
  }
});

