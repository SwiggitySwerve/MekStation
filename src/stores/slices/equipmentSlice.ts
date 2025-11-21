import { StateCreator } from 'zustand';
import { UnitStore } from '../unitStore';
import { EquipmentAllocation } from '../../utils/criticalSlots/CriticalSlot';
import { UnitCriticalManager } from '../../utils/criticalSlots/UnitCriticalManager';

export interface EquipmentSlice {
  selectedEquipmentId: string | null;
  selectEquipment: (id: string | null) => void;
  
  addTestEquipment: (equipment: any, location: string, startSlot?: number) => boolean;
  addEquipmentToUnit: (equipment: EquipmentAllocation) => void;
  removeEquipment: (equipmentGroupId: string) => boolean;
  assignSelectedEquipment: (location: string, slotIndex: number) => boolean;
}

export const createEquipmentSlice: StateCreator<
  UnitStore,
  [],
  [],
  EquipmentSlice
> = (set, get) => ({
  selectedEquipmentId: null,
  
  selectEquipment: (id: string | null) => set({ selectedEquipmentId: id }),

  addTestEquipment: (equipment: any, location: string, startSlot?: number) => {
    const { activeTabId, tabs, updateTabState } = get();
    if (!activeTabId || !tabs[activeTabId]) return false;

    const currentTab = tabs[activeTabId];
    const unitManager = new UnitCriticalManager(currentTab.state.configuration);
    unitManager.deserializeCompleteState(currentTab.state);

    // The logic from UnitStateManager.addTestEquipment
    const section = unitManager.getSection(location);
    if (!section) return false;

    let slotIndex = startSlot;
    if (slotIndex === undefined) {
      const availableSlots = section.findContiguousAvailableSlots(equipment.requiredSlots || 1);
      if (!availableSlots || availableSlots.length === 0) return false;
      slotIndex = availableSlots[0];
    }

    // Note: unitManager.getSection returns a reference, so modifying section modifies unitManager state
    // Need to generate a groupId if one doesn't exist, mimicking UnitStateManager logic
    const equipmentGroupId = equipment.id ? `${equipment.id}_test_${Date.now()}` : `test_equip_${Date.now()}`;
    
    const success = section.allocateEquipment(equipment, slotIndex, equipmentGroupId);
    
    if (success) {
      const newState = unitManager.serializeCompleteState();
      updateTabState(activeTabId, newState);
    }
    return success;
  },

  addEquipmentToUnit: (equipment: EquipmentAllocation) => {
    const { activeTabId, tabs, updateTabState } = get();
    if (!activeTabId || !tabs[activeTabId]) return;

    const currentTab = tabs[activeTabId];
    const unitManager = new UnitCriticalManager(currentTab.state.configuration);
    unitManager.deserializeCompleteState(currentTab.state);

    unitManager.addUnallocatedEquipment([equipment]);

    const newState = unitManager.serializeCompleteState();
    updateTabState(activeTabId, newState);
  },

  removeEquipment: (equipmentGroupId: string) => {
    const { activeTabId, tabs, updateTabState } = get();
    if (!activeTabId || !tabs[activeTabId]) return false;

    const currentTab = tabs[activeTabId];
    const unitManager = new UnitCriticalManager(currentTab.state.configuration);
    unitManager.deserializeCompleteState(currentTab.state);
    
    // Logic from UnitStateManager.removeEquipment
    const removedUnallocated = unitManager.removeUnallocatedEquipment(equipmentGroupId);
    if (removedUnallocated) {
      const newState = unitManager.serializeCompleteState();
      updateTabState(activeTabId, newState);
      return true;
    }

    const displaced = unitManager.displaceEquipment(equipmentGroupId);
    if (displaced) {
      const newState = unitManager.serializeCompleteState();
      updateTabState(activeTabId, newState);
      return true;
    }

    return false;
  },

  assignSelectedEquipment: (location: string, slotIndex: number) => {
    const { selectedEquipmentId, activeTabId, tabs, updateTabState, selectEquipment } = get();
    if (!selectedEquipmentId || !activeTabId || !tabs[activeTabId]) return false;

    const currentTab = tabs[activeTabId];
    const unitManager = new UnitCriticalManager(currentTab.state.configuration);
    unitManager.deserializeCompleteState(currentTab.state);

    const success = unitManager.allocateEquipmentFromPool(selectedEquipmentId, location, slotIndex);
    
    if (success) {
      const newState = unitManager.serializeCompleteState();
      updateTabState(activeTabId, newState);
      selectEquipment(null); // Clear selection on success
    }
    
    return success;
  }
});

