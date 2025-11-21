import { useUnitStore } from '../../../stores/unitStore';
import { act } from '@testing-library/react';
import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManagerTypes';

// Mock zustand/middleware
jest.mock('zustand/middleware', () => ({
  subscribeWithSelector: (fn: any) => fn,
}));

// Mock UnitCriticalManager to bypass complex logic during store tests
// This ensures we are testing the STORE'S handling of state updates, not the manager's logic
jest.mock('../../../utils/criticalSlots/UnitCriticalManager', () => {
    return {
        UnitCriticalManager: jest.fn().mockImplementation((config) => ({
            updateConfiguration: jest.fn((newConfig) => {
                // The manager would update its internal config
                // For mock, we assume the serialization will return this new config
                // But deserializeCompleteState below needs to handle it
            }),
            deserializeCompleteState: jest.fn(),
            serializeCompleteState: jest.fn(() => ({
                configuration: config, // Returns the config passed to constructor
                allocatedSections: {},
                unallocatedEquipment: []
            })),
            resetUnit: jest.fn(),
        }))
    };
});

describe('UnitStore', () => {
  beforeEach(() => {
    useUnitStore.setState({
      tabs: {},
      activeTabId: null,
      nextTabNumber: 1,
      tabOrder: []
    });
  });

  it('should start with empty state (before init)', () => {
    const state = useUnitStore.getState();
    expect(Object.keys(state.tabs)).toHaveLength(0);
    expect(state.activeTabId).toBeNull();
  });

  it('should create a new tab', () => {
    act(() => {
      useUnitStore.getState().createTab();
    });

    const state = useUnitStore.getState();
    expect(Object.keys(state.tabs)).toHaveLength(1);
    expect(state.activeTabId).not.toBeNull();
    const tabId = state.activeTabId!;
    expect(state.tabs[tabId].id).toBe(tabId);
  });

  it('should switch active tab', () => {
    let tab1Id: string;
    let tab2Id: string;

    act(() => {
      tab1Id = useUnitStore.getState().createTab();
      tab2Id = useUnitStore.getState().createTab();
      
      useUnitStore.getState().setActiveTab(tab1Id);
    });

    const state = useUnitStore.getState();
    expect(state.activeTabId).toBe(tab1Id!);
  });

  it('should close a tab', () => {
    useUnitStore.setState({
      tabs: {},
      activeTabId: null,
      nextTabNumber: 1,
      tabOrder: []
    });

    act(() => {
        useUnitStore.getState().createTab(); // Tab 1
        const id2 = useUnitStore.getState().createTab(); // Tab 2
        useUnitStore.getState().closeTab(id2);
    });

    const newState = useUnitStore.getState();
    expect(Object.keys(newState.tabs)).toHaveLength(1);
  });

  it('should update configuration of active tab', () => {
    // For this test to pass with the mocked manager, we need to ensure that when 
    // updateConfiguration is called on the store, it eventually updates the state 
    // with the new config. 
    // The store implementation:
    // 1. Gets current tab state
    // 2. Instantiates UnitCriticalManager(currentConfig)
    // 3. Calls unitManager.updateConfiguration(newConfig)
    // 4. Calls unitManager.serializeCompleteState() -> THIS IS WHAT IS SAVED
    // 
    // The issue is the mock logic above. 
    // serializeCompleteState in mock returns `config` passed to constructor.
    // But updateConfiguration changes the internal state of the manager, which constructor config doesn't reflect.
    // We need to make the mock stateful or adjust the test expectation.
    
    // Let's refine the mock to be stateful for this specific test file
    const { UnitCriticalManager } = require('../../../utils/criticalSlots/UnitCriticalManager');
    UnitCriticalManager.mockImplementation((initialConfig: UnitConfiguration) => {
        let currentConfig = initialConfig;
        return {
            updateConfiguration: (newConfig: UnitConfiguration) => {
                currentConfig = newConfig;
            },
            deserializeCompleteState: () => {},
            serializeCompleteState: () => ({
                configuration: currentConfig,
                allocatedSections: {},
                unallocatedEquipment: []
            }),
            resetUnit: () => {}
        };
    });

    let tabId: string;
    act(() => {
      tabId = useUnitStore.getState().createTab();
    });
    
    const newTonnage = 75;
    
    act(() => {
      const state = useUnitStore.getState();
      const currentConfig = state.tabs[tabId!].state.configuration;
      
      useUnitStore.getState().updateConfiguration({
          ...currentConfig,
          tonnage: newTonnage
      });
    });

    const state = useUnitStore.getState();
    expect(state.tabs[tabId!].state.configuration.tonnage).toBe(newTonnage);
  });
});
