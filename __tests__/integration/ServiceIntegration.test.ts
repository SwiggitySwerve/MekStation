/**
 * Service Integration Test Suite
 * 
 * Tests coordination and communication between all services.
 * Validates data flow integrity, state synchronization, and service orchestration.
 * 
 * Phase 5: Validation & Testing - Days 23-24
 */

import { MultiUnitStateService, TabUnit } from '../../services/MultiUnitStateService'
import { UnitSynchronizationService } from '../../services/UnitSynchronizationService'
import { UnitComparisonService } from '../../services/UnitComparisonService'
import { MultiTabDebouncedSaveManager } from '../../utils/DebouncedSaveManager'
import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManager'

// Mock localStorage for integration tests
const createMockLocalStorage = () => {
  let store: Record<string, string> = {}
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
    get store() { return { ...store } }
  }
}

// Mock UnitStateManager and UnitCriticalManager
jest.mock('../../utils/criticalSlots/UnitStateManager', () => ({
  UnitStateManager: jest.fn().mockImplementation((config) => {
    let currentConfig = { ...config }
    
    return {
      getCurrentUnit: jest.fn().mockReturnValue({
        getConfiguration: jest.fn().mockImplementation(() => currentConfig),
        updateConfiguration: jest.fn().mockImplementation((newConfig) => {
          currentConfig = { ...currentConfig, ...newConfig }
        }),
        getUnallocatedEquipment: jest.fn().mockReturnValue([]),
        allocateEquipmentFromPool: jest.fn().mockReturnValue(true),
        subscribe: jest.fn().mockReturnValue(jest.fn()),
        serializeCompleteState: jest.fn().mockReturnValue({
          configuration: currentConfig,
          criticalSlotAllocations: {},
          unallocatedEquipment: [],
          timestamp: Date.now(),
          version: '2.0.0'
        }),
        deserializeCompleteState: jest.fn().mockReturnValue(true)
      }),
      getUnitSummary: jest.fn().mockImplementation(() => ({
        validation: { isValid: true },
        summary: { tonnage: currentConfig.tonnage || 50 }
      })),
      addUnallocatedEquipment: jest.fn(),
      removeEquipment: jest.fn().mockReturnValue(true),
      handleEngineChange: jest.fn(),
      handleGyroChange: jest.fn(),
      resetUnit: jest.fn()
    }
  })
}))

describe('Service Integration Tests', () => {
  let stateService: MultiUnitStateService
  let syncService: UnitSynchronizationService
  let comparisonService: UnitComparisonService
  let saveManager: MultiTabDebouncedSaveManager
  let mockLocalStorage: ReturnType<typeof createMockLocalStorage>

  beforeEach(() => {
    // Setup localStorage mock
    mockLocalStorage = createMockLocalStorage()
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })

    // Initialize services
    stateService = new MultiUnitStateService()
    saveManager = new MultiTabDebouncedSaveManager(1000)
    syncService = new UnitSynchronizationService(stateService, saveManager)
    comparisonService = new UnitComparisonService()

    // Mock save manager methods
    saveManager.scheduleSaveForTab = jest.fn()
    saveManager.saveTabImmediately = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('State Service + Sync Service Integration', () => {
    it('should coordinate tab creation with synchronization', async () => {
      // Initialize state service
      const initialState = await stateService.initializeTabs()
      
      // Create a new tab through state service
      const { newState, tabId } = stateService.createTab(initialState, 'Integration Test Mech')
      
      // Initialize sync for the new tab
      const newTab = newState.tabs.find(t => t.id === tabId)!
      syncService.initializeTabSync(newTab)
      
      // Verify tab is properly synchronized
      expect(newTab.unitManager.subscribe).toHaveBeenCalled()
      
      // Test configuration update through sync service
      const config: UnitConfiguration = { tonnage: 75 } as any
      syncService.updateConfiguration(newTab, config)
      
      expect(newTab.unitManager.updateConfiguration).toHaveBeenCalledWith(config)
      expect(newTab.isModified).toBe(true)
      expect(saveManager.saveTabImmediately).toHaveBeenCalled()
    })

    it('should handle tab closure with proper cleanup', async () => {
      const initialState = await stateService.initializeTabs()
      const { newState, tabId } = stateService.createTab(initialState, 'Test Mech')
      
      const tab = newState.tabs.find(t => t.id === tabId)!
      const unsubscribe = jest.fn()
      tab.unitManager.subscribe = jest.fn().mockReturnValue(unsubscribe)
      
      // Initialize sync
      syncService.initializeTabSync(tab)
      
      // Close tab and cleanup
      syncService.cleanupTabSync(tabId)
      const finalState = stateService.closeTab(newState, tabId)
      
      expect(unsubscribe).toHaveBeenCalled()
      expect(finalState.tabs.some(t => t.id === tabId)).toBe(false)
    })

    it('should synchronize multiple tabs correctly', async () => {
      const initialState = await stateService.initializeTabs()
      
      // Create multiple tabs
      const { newState: state1, tabId: tab1Id } = stateService.createTab(initialState, 'Mech 1')
      const { newState: state2, tabId: tab2Id } = stateService.createTab(state1, 'Mech 2')
      
      const tabs = state2.tabs
      
      // Initialize sync for all tabs
      syncService.synchronizeMultipleTabs(tabs)
      
      // Verify all tabs have observers
      tabs.forEach(tab => {
        expect(tab.unitManager.subscribe).toHaveBeenCalled()
      })
      
      // Test cross-tab synchronization
      const tab1 = tabs.find(t => t.id === tab1Id)!
      const tab2 = tabs.find(t => t.id === tab2Id)!
      
      syncService.addEquipmentToUnit(tab1, { name: 'AC/20', type: 'weapon' })
      syncService.addEquipmentToUnit(tab2, { name: 'PPC', type: 'weapon' })
      
      expect(tab1.isModified).toBe(true)
      expect(tab2.isModified).toBe(true)
    })
  })

  describe('State Service + Comparison Service Integration', () => {
    it('should analyze multiple units from state', async () => {
      const initialState = await stateService.initializeTabs()
      
      // Create tabs with different configurations
      const { newState: state1, tabId: lightTabId } = stateService.createTab(
        initialState, 
        'Light Mech', 
        { tonnage: 25, engineRating: 175 } as any
      )
      const { newState: state2, tabId: heavyTabId } = stateService.createTab(
        state1, 
        'Heavy Mech', 
        { tonnage: 75, engineRating: 300 } as any
      )
      
      // Run comparison analysis
      const comparison = comparisonService.compareUnits(state2.tabs)
      
      expect(comparison.tabs).toHaveLength(3) // Default + 2 new tabs
      expect(comparison.statistics[lightTabId].tonnage).toBe(25)
      expect(comparison.statistics[heavyTabId].tonnage).toBe(75)
      expect(comparison.analysis.bestOverall).toBeDefined()
    })

    it('should generate recommendations for units', async () => {
      const initialState = await stateService.initializeTabs()
      
      // Create a poorly configured unit
      const { newState, tabId } = stateService.createTab(
        initialState,
        'Weak Mech',
        {
          tonnage: 100,
          totalHeatSinks: 10,
          armorAllocation: {
            HD: { front: 3, rear: 0 },
            CT: { front: 5, rear: 1 },
            LT: { front: 3, rear: 1 },
            RT: { front: 3, rear: 1 },
            LA: { front: 3, rear: 0 },
            RA: { front: 3, rear: 0 },
            LL: { front: 3, rear: 0 },
            RL: { front: 3, rear: 0 }
          }
        } as any
      )
      
      const comparison = comparisonService.compareUnits(newState.tabs)
      
      // Should generate recommendations for poor armor and heat management
      const armorRec = comparison.recommendations.find(r => r === 'armor')
      expect(armorRec).toBeDefined()
      expect(armorRec?.severity).toBe('warning')
    })
  })

  describe('Sync Service + Comparison Service Integration', () => {
    it('should analyze synchronized units in real-time', async () => {
      const initialState = await stateService.initializeTabs()
      const { newState, tabId } = stateService.createTab(initialState, 'Test Mech')
      const tab = newState.tabs.find(t => t.id === tabId)!
      
      // Initialize sync
      syncService.initializeTabSync(tab)
      
      // Make configuration changes through sync
      syncService.updateConfiguration(tab, { tonnage: 100, engineRating: 400 } as any)
      
      // Run comparison analysis
      const comparison = comparisonService.compareUnits(newState.tabs)
      
      expect(comparison.statistics[tabId].tonnage).toBe(100)
      expect(comparison.statistics[tabId].battleValue).toBe(2000) // 100 * 20
    })

    it('should handle equipment changes with analysis', async () => {
      const initialState = await stateService.initializeTabs()
      const { newState, tabId } = stateService.createTab(initialState, 'Armed Mech')
      const tab = newState.tabs.find(t => t.id === tabId)!
      
      // Mock equipment for analysis
      tab.unitManager.getUnallocatedEquipment = jest.fn().mockReturnValue([
        { equipmentData: { name: 'AC/20', type: 'weapon' } },
        { equipmentData: { name: 'PPC', type: 'weapon' } },
        { equipmentData: { name: 'Medium Laser', type: 'weapon' } }
      ])
      
      syncService.initializeTabSync(tab)
      syncService.addEquipmentToUnit(tab, { name: 'Large Laser', type: 'weapon' })
      
      const comparison = comparisonService.compareUnits(newState.tabs)
      expect(comparison.statistics[tabId].weaponCount).toBeGreaterThan(0)
    })
  })

  describe('Full Service Stack Integration', () => {
    it('should handle complete unit lifecycle', async () => {
      // 1. Initialize state
      const initialState = await stateService.initializeTabs()
      
      // 2. Create new unit
      const { newState, tabId } = stateService.createTab(initialState, 'Lifecycle Test')
      const tab = newState.tabs.find(t => t.id === tabId)!
      
      // 3. Initialize synchronization
      syncService.initializeTabSync(tab)
      
      // 4. Configure unit
      const config: UnitConfiguration = {
        tonnage: 50,
        engineRating: 200,
        walkMP: 4,
        runMP: 6
      } as any
      syncService.updateConfiguration(tab, config)
      
      // 5. Add equipment
      syncService.addEquipmentToUnit(tab, { name: 'AC/10', type: 'weapon' })
      syncService.addEquipmentToUnit(tab, { name: 'Medium Laser', type: 'weapon' })
      
      // 6. Analyze unit
      const comparison = comparisonService.compareUnits(newState.tabs)
      
      // 7. Verify complete integration
      expect(tab.isModified).toBe(true)
      expect(comparison.statistics[tabId].tonnage).toBe(50)
      expect(comparison.statistics[tabId].mobility.walkMP).toBe(4)
      expect(saveManager.saveTabImmediately).toHaveBeenCalled()
      expect(saveManager.scheduleSaveForTab).toHaveBeenCalled()
    })

    it('should handle error scenarios gracefully', async () => {
      const initialState = await stateService.initializeTabs()
      const { newState, tabId } = stateService.createTab(initialState, 'Error Test')
      const tab = newState.tabs.find(t => t.id === tabId)!
      
      // Simulate errors in unit manager
      tab.unitManager.updateConfiguration = jest.fn().mockImplementation(() => {
        throw new Error('Configuration error')
      })
      
      syncService.initializeTabSync(tab)
      
      // Should handle errors gracefully
      expect(() => {
        syncService.updateConfiguration(tab, { tonnage: 50 } as any)
      }).not.toThrow()
      
      // Analysis should still work with fallback data
      const comparison = comparisonService.compareUnits(newState.tabs)
      expect(comparison.statistics[tabId]).toBeDefined()
    })

    it('should maintain data consistency across services', async () => {
      const initialState = await stateService.initializeTabs()
      
      // Create multiple tabs with known configurations
      const configs = [
        { name: 'Light Mech', tonnage: 20, engineRating: 160 },
        { name: 'Medium Mech', tonnage: 50, engineRating: 200 },
        { name: 'Heavy Mech', tonnage: 75, engineRating: 300 }
      ]
      
      let currentState = initialState
      const tabIds: string[] = []
      
      for (const config of configs) {
        const { newState, tabId } = stateService.createTab(
          currentState, 
          config.name, 
          config as any
        )
        currentState = newState
        tabIds.push(tabId)
        
        const tab = newState.tabs.find(t => t.id === tabId)!
        syncService.initializeTabSync(tab)
      }
      
      // Run comparison analysis
      const comparison = comparisonService.compareUnits(currentState.tabs)
      
      // Verify data consistency
      configs.forEach((config, index) => {
        const tabId = tabIds[index]
        const stats = comparison.statistics[tabId]
        
        expect(stats.tonnage).toBe(config.tonnage)
        expect(stats.battleValue).toBe(config.tonnage * 20) // Expected calculation
      })
      
      // Verify comparative analysis
      expect(comparison.analysis.bestOverall).toBe(tabIds[2]) // Heavy mech should be best
      expect(comparison.tabs).toHaveLength(configs.length + 1) // +1 for default tab
    })
  })

  describe('Event Flow Integration', () => {
    it('should propagate events through service stack', async () => {
      const eventLog: any[] = []
      
      // Subscribe to sync events
      const unsubscribe = syncService.subscribe((event) => {
        eventLog.push(event)
      })
      
      const initialState = await stateService.initializeTabs()
      const { newState, tabId } = stateService.createTab(initialState, 'Event Test')
      const tab = newState.tabs.find(t => t.id === tabId)!
      
      // Initialize sync (should generate events)
      syncService.initializeTabSync(tab)
      
      // Make changes (should generate more events)
      syncService.updateConfiguration(tab, { tonnage: 60 } as any)
      syncService.addEquipmentToUnit(tab, { name: 'Laser' })
      
      // Verify events were generated
      expect(eventLog.length).toBeGreaterThan(0)
      
      const initEvent = eventLog.find(e => e === 'tab_change' && e.data?.action === 'initialized')
      const configEvent = eventLog.find(e => e === 'configuration_change')
      const equipEvent = eventLog.find(e => e === 'equipment_change')
      
      expect(initEvent).toBeDefined()
      expect(configEvent).toBeDefined()
      expect(equipEvent).toBeDefined()
      
      unsubscribe()
    })
  })

  describe('Performance Integration', () => {
    it('should handle large numbers of units efficiently', async () => {
      const startTime = Date.now()
      
      let currentState = await stateService.initializeTabs()
      const tabIds: string[] = []
      
      // Create 10 units
      for (let i = 0; i < 10; i++) {
        const { newState, tabId } = stateService.createTab(
          currentState,
          `Mech ${i}`,
          { tonnage: 20 + (i * 8), engineRating: 120 + (i * 20) } as any
        )
        currentState = newState
        tabIds.push(tabId)
        
        const tab = newState.tabs.find(t => t.id === tabId)!
        syncService.initializeTabSync(tab)
      }
      
      // Run comparison analysis
      const comparison = comparisonService.compareUnits(currentState.tabs)
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete in reasonable time (< 1 second for 10 units)
      expect(duration).toBeLessThan(1000)
      expect(comparison.tabs).toHaveLength(11) // 10 + 1 default
      expect(Object.keys(comparison.statistics)).toHaveLength(11)
    })
  })
})
