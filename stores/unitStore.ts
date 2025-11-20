import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { ConfigurationSlice, createConfigurationSlice } from './slices/configurationSlice';
import { EquipmentSlice, createEquipmentSlice } from './slices/equipmentSlice';
import { ValidationSlice, createValidationSlice } from './slices/validationSlice';
import { CompleteUnitState, UnitConfiguration } from '../utils/criticalSlots/UnitCriticalManagerTypes';
import { UnitCriticalManager } from '../utils/criticalSlots/UnitCriticalManager';
import { createComponentConfiguration } from '../types/componentConfiguration';

// Storage keys matching MultiUnitProvider
const TABS_METADATA_KEY = 'battletech-tabs-metadata';
const COMPLETE_STATE_PREFIX = 'battletech-complete-state-';

interface TabState {
  id: string;
  name: string;
  state: CompleteUnitState;
  isModified: boolean;
  modified: Date;
}

interface TabsMetadata {
  activeTabId: string | null;
  nextTabNumber: number;
  tabOrder: string[];
  tabNames: Record<string, string>;
}

interface EnhancedTabData {
  completeState?: CompleteUnitState;
  config?: UnitConfiguration;
  modified: string;
  version: string;
}

export interface UnitStoreState {
  tabs: Record<string, TabState>;
  activeTabId: string | null;
  nextTabNumber: number;
  tabOrder: string[];
}

export interface UnitStoreActions {
  createTab: (name?: string, config?: UnitConfiguration) => string;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  renameTab: (tabId: string, newName: string) => void;
  duplicateTab: (tabId: string) => string;
  updateTabState: (tabId: string, newState: CompleteUnitState) => void;
  initializeStore: () => void;
  saveTabsMetadata: () => void;
  saveTabState: (tabId: string) => void;
}

export type UnitStore = UnitStoreState & UnitStoreActions & ConfigurationSlice & EquipmentSlice & ValidationSlice;

export const useUnitStore = create<UnitStore>()(
  subscribeWithSelector((set, get, api) => ({
    // Initial State
    tabs: {},
    activeTabId: null,
    nextTabNumber: 1,
    tabOrder: [],

    // Slices
    ...createConfigurationSlice(set, get, api),
    ...createEquipmentSlice(set, get, api),
    ...createValidationSlice(set, get, api),

    // Actions
    createTab: (name, config) => {
      const { nextTabNumber, tabOrder, tabs } = get();
      const tabId = `tab-${nextTabNumber}`;
      const tabName = name || `New Mech ${nextTabNumber}`;
      
      let initialState: CompleteUnitState;
      if (config) {
         const unitManager = new UnitCriticalManager(config);
         initialState = unitManager.serializeCompleteState();
      } else {
         const unitManager = new UnitCriticalManager({
             chassis: 'Standard',
             model: '50-ton BattleMech',
             tonnage: 50,
             unitType: 'BattleMech',
             techBase: 'Inner Sphere',
             walkMP: 4,
             engineRating: 200,
             runMP: 6,
             engineType: 'Standard',
             gyroType: createComponentConfiguration('gyro', 'Standard')!,
             structureType: createComponentConfiguration('structure', 'Standard')!,
             armorType: createComponentConfiguration('armor', 'Standard')!,
             armorAllocation: {
                HD: { front: 9, rear: 0 },
                CT: { front: 20, rear: 6 },
                LT: { front: 16, rear: 5 },
                RT: { front: 16, rear: 5 },
                LA: { front: 16, rear: 0 },
                RA: { front: 16, rear: 0 },
                LL: { front: 20, rear: 0 },
                RL: { front: 20, rear: 0 }
             },
             armorTonnage: 8.0,
             heatSinkType: createComponentConfiguration('heatSink', 'Single')!,
             totalHeatSinks: 10,
             internalHeatSinks: 8,
             externalHeatSinks: 2,
             jumpMP: 0,
             jumpJetType: createComponentConfiguration('jumpJet', 'Standard Jump Jet')!,
             jumpJetCounts: {},
             hasPartialWing: false,
             enhancements: [],
             mass: 50
         });
         initialState = unitManager.serializeCompleteState();
      }

      const newTab: TabState = {
        id: tabId,
        name: tabName,
        state: initialState,
        isModified: false,
        modified: new Date()
      };

      set(state => ({
        tabs: { ...state.tabs, [tabId]: newTab },
        tabOrder: [...state.tabOrder, tabId],
        activeTabId: tabId,
        nextTabNumber: state.nextTabNumber + 1
      }));

      get().saveTabsMetadata();
      get().saveTabState(tabId);

      return tabId;
    },

    closeTab: (tabId) => {
      set(state => {
        const { tabs, tabOrder, activeTabId } = state;
        if (tabOrder.length <= 1) {
            // Reset last tab to default instead of closing
            const unitManager = new UnitCriticalManager({
                chassis: 'Standard',
                model: '50-ton BattleMech',
                tonnage: 50,
                unitType: 'BattleMech',
                techBase: 'Inner Sphere',
                walkMP: 4,
                engineRating: 200,
                runMP: 6,
                engineType: 'Standard',
                gyroType: createComponentConfiguration('gyro', 'Standard')!,
                structureType: createComponentConfiguration('structure', 'Standard')!,
                armorType: createComponentConfiguration('armor', 'Standard')!,
                armorAllocation: {
                    HD: { front: 9, rear: 0 },
                    CT: { front: 20, rear: 6 },
                    LT: { front: 16, rear: 5 },
                    RT: { front: 16, rear: 5 },
                    LA: { front: 16, rear: 0 },
                    RA: { front: 16, rear: 0 },
                    LL: { front: 20, rear: 0 },
                    RL: { front: 20, rear: 0 }
                },
                armorTonnage: 8.0,
                heatSinkType: createComponentConfiguration('heatSink', 'Single')!,
                totalHeatSinks: 10,
                internalHeatSinks: 8,
                externalHeatSinks: 2,
                jumpMP: 0,
                jumpJetType: createComponentConfiguration('jumpJet', 'Standard Jump Jet')!,
                jumpJetCounts: {},
                hasPartialWing: false,
                enhancements: [],
                mass: 50
            });
            const resetState = unitManager.serializeCompleteState();
            
            const newTabs = { ...tabs };
            if (newTabs[tabId]) {
                newTabs[tabId] = {
                    ...newTabs[tabId],
                    name: 'New Mech',
                    state: resetState,
                    isModified: false,
                    modified: new Date()
                };
            }
            
            // Save the reset state
            localStorage.setItem(`${COMPLETE_STATE_PREFIX}${tabId}`, JSON.stringify({
                completeState: resetState,
                config: resetState.configuration,
                modified: new Date().toISOString(),
                version: '2.0.0'
            }));
            
            return { tabs: newTabs }; 
        }

        const newTabs = { ...tabs };
        delete newTabs[tabId];
        const newTabOrder = tabOrder.filter(id => id !== tabId);
        
        let newActiveId = activeTabId;
        if (activeTabId === tabId) {
            newActiveId = newTabOrder[0] || null;
        }

        localStorage.removeItem(`${COMPLETE_STATE_PREFIX}${tabId}`);
        
        return {
            tabs: newTabs,
            tabOrder: newTabOrder,
            activeTabId: newActiveId
        };
      });
      get().saveTabsMetadata();
    },

    setActiveTab: (tabId) => {
      set({ activeTabId: tabId });
      get().saveTabsMetadata();
    },

    renameTab: (tabId, newName) => {
      set(state => ({
        tabs: {
            ...state.tabs,
            [tabId]: { ...state.tabs[tabId], name: newName, modified: new Date() }
        }
      }));
      get().saveTabsMetadata();
    },

    duplicateTab: (tabId) => {
      const { tabs, createTab } = get();
      const sourceTab = tabs[tabId];
      if (!sourceTab) return '';
      
      return createTab(`${sourceTab.name} Copy`, sourceTab.state.configuration);
    },

    updateTabState: (tabId, newState) => {
      set(state => ({
        tabs: {
            ...state.tabs,
            [tabId]: { 
                ...state.tabs[tabId], 
                state: newState, 
                isModified: true, 
                modified: new Date() 
            }
        }
      }));
      get().saveTabState(tabId);
    },

    initializeStore: () => {
        if (typeof window === 'undefined') return;

        try {
            const metadataStr = localStorage.getItem(TABS_METADATA_KEY);
            if (metadataStr) {
                const metadata: TabsMetadata = JSON.parse(metadataStr);
                const tabs: Record<string, TabState> = {};
                
                metadata.tabOrder.forEach(tabId => {
                    const stateStr = localStorage.getItem(`${COMPLETE_STATE_PREFIX}${tabId}`);
                    if (stateStr) {
                        try {
                            const data: EnhancedTabData = JSON.parse(stateStr);
                            if (data.completeState) {
                                tabs[tabId] = {
                                    id: tabId,
                                    name: metadata.tabNames[tabId] || 'Mech',
                                    state: data.completeState,
                                    isModified: false,
                                    modified: new Date(data.modified)
                                };
                            }
                        } catch (e) {
                            console.error(`Failed to load tab ${tabId}`, e);
                        }
                    }
                });

                if (Object.keys(tabs).length > 0) {
                    set({
                        tabs,
                        tabOrder: metadata.tabOrder.filter(id => tabs[id]),
                        activeTabId: metadata.activeTabId,
                        nextTabNumber: metadata.nextTabNumber
                    });
                } else {
                    get().createTab();
                }
            } else {
                get().createTab();
            }
        } catch (e) {
            console.error('Failed to initialize store', e);
            get().createTab();
        }
    },

    saveTabsMetadata: () => {
        const { activeTabId, nextTabNumber, tabOrder, tabs } = get();
        const metadata: TabsMetadata = {
            activeTabId,
            nextTabNumber,
            tabOrder,
            tabNames: Object.fromEntries(tabOrder.map(id => [id, tabs[id]?.name || 'Unknown']))
        };
        localStorage.setItem(TABS_METADATA_KEY, JSON.stringify(metadata));
    },

    saveTabState: (tabId: string) => {
        const { tabs } = get();
        const tab = tabs[tabId];
        if (!tab) return;

        const data: EnhancedTabData = {
            completeState: tab.state,
            config: tab.state.configuration,
            modified: tab.modified.toISOString(),
            version: '2.0.0'
        };
        localStorage.setItem(`${COMPLETE_STATE_PREFIX}${tabId}`, JSON.stringify(data));
    }
  }))
);

