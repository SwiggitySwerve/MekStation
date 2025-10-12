/**
 * Comprehensive State Persistence Test
 * Tests that all unit configurations persist correctly across browser refreshes
 */

import { UnitCriticalManager, UnitConfiguration, CompleteUnitState } from '../../utils/criticalSlots/UnitCriticalManager'
import { UnitStateManager } from '../../utils/criticalSlots/UnitStateManager'

// Mock localStorage for testing
interface MockLocalStorage {
  store: Record<string, string>
  getItem: jest.MockedFunction<(key: string) => string | null>
  setItem: jest.MockedFunction<(key: string, value: string) => void>
  removeItem: jest.MockedFunction<(key: string) => void>
  clear: jest.MockedFunction<() => void>
}

const mockLocalStorage: MockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: jest.fn((key: string): string | null => mockLocalStorage.store[key] || null),
  setItem: jest.fn((key: string, value: string): void => {
    mockLocalStorage.store[key] = value
  }),
  removeItem: jest.fn((key: string): void => {
    delete mockLocalStorage.store[key]
  }),
  clear: jest.fn((): void => {
    mockLocalStorage.store = {}
  })
}

// Setup localStorage mock
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
})

describe('State Persistence Tests', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    jest.clearAllMocks()
  })

  /**
   * Test 1: Engine Configuration Persistence
   */
  describe('Engine Configuration Persistence', () => {
    test('Standard to XL Engine change persists across refresh', () => {
      console.log('🧪 Testing Engine Configuration Persistence')
      
      // Step 1: Create unit with Standard engine
      const initialConfig: UnitConfiguration = createTestConfiguration({
        engineType: 'Standard',
        gyroType: 'Standard',
        structureType: 'Standard',
        armorType: 'Standard',
        jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' },
        heatSinkType: 'Single'
      })
      
      const unitManager = new UnitCriticalManager(initialConfig)
      
      // Step 2: Change to XL Engine
      const updatedConfig = { ...initialConfig, engineType: 'XL' as const }
      unitManager.updateConfiguration(updatedConfig)
      
      // Step 3: Serialize complete state (simulate save)
      const serializedState = unitManager.serializeCompleteState()
      const tabId = 'test-tab-1'
      saveCompleteStateToMockStorage(tabId, serializedState)
      
      // Step 4: Simulate browser refresh - create new unit manager
      const restoredState = loadCompleteStateFromMockStorage(tabId)
      expect(restoredState).toBeTruthy()
      
      const newUnitManager = new UnitCriticalManager(restoredState!.configuration)
      const restoreSuccess = newUnitManager.deserializeCompleteState(restoredState!)
      
      // Step 5: Verify engine type persisted
      expect(restoreSuccess).toBe(true)
      expect(newUnitManager.getEngineType()).toBe('XL')
      expect(newUnitManager.getConfiguration().engineType).toBe('XL')
      
      console.log('✅ Engine configuration persistence test passed')
    })

    test('All engine types persist correctly', () => {
      const engineTypes = ['Standard', 'XL', 'Light', 'XXL', 'Compact', 'ICE', 'Fuel Cell'] as const
      
      engineTypes.forEach((engineType, index) => {
        const config = createTestConfiguration({
          engineType,
          gyroType: 'Standard',
          structureType: 'Standard',
          armorType: 'Standard',
          jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' },
          heatSinkType: 'Single'
        })
        const unitManager = new UnitCriticalManager(config)
        
        const serializedState = unitManager.serializeCompleteState()
        const tabId = `engine-test-${index}`
        saveCompleteStateToMockStorage(tabId, serializedState)
        
        const restoredState = loadCompleteStateFromMockStorage(tabId)
        const newUnitManager = new UnitCriticalManager(restoredState!.configuration)
        newUnitManager.deserializeCompleteState(restoredState!)
        
        expect(newUnitManager.getEngineType()).toBe(engineType)
      })
      
      console.log('✅ All engine types persistence test passed')
    })
  })

  /**
   * Test 2: Structure/Armor Persistence (Special Components)
   */
  describe('Structure and Armor Persistence', () => {
    test('Endo Steel structure persists with special components', () => {
      console.log('🧪 Testing Endo Steel Persistence')
      
      const config = createTestConfiguration({
        structureType: 'Endo Steel'
      })
      
      const unitManager = new UnitCriticalManager(config)
      
      // Verify Endo Steel components were created
      const unallocatedEquipment = unitManager.getUnallocatedEquipment()
      const endoSteelComponents = unallocatedEquipment.filter(eq => 
        eq.equipmentData.id === 'endo_steel'
      )
      
      expect(endoSteelComponents.length).toBe(14) // Endo Steel requires 14 slots
      
      // Serialize and restore
      const serializedState = unitManager.serializeCompleteState()
      saveCompleteStateToMockStorage('endo-test', serializedState)
      
      const restoredState = loadCompleteStateFromMockStorage('endo-test')
      const newUnitManager = new UnitCriticalManager(restoredState!.configuration)
      newUnitManager.deserializeCompleteState(restoredState!)
      
      // Verify structure type and components persisted
      expect(newUnitManager.getConfiguration().structureType).toBe('Endo Steel')
      
      const restoredUnallocated = newUnitManager.getUnallocatedEquipment()
      const restoredEndoSteel = restoredUnallocated.filter(eq => 
        eq.equipmentData.id === 'endo_steel'
      )
      
      expect(restoredEndoSteel.length).toBe(14)
      
      console.log('✅ Endo Steel persistence test passed')
    })

    test('Ferro-Fibrous armor persists with special components', () => {
      console.log('🧪 Testing Ferro-Fibrous Persistence')
      
      const config = createTestConfiguration({
        armorType: 'Ferro-Fibrous'
      })
      
      const unitManager = new UnitCriticalManager(config)
      
      // Verify Ferro-Fibrous components were created
      const unallocatedEquipment = unitManager.getUnallocatedEquipment()
      const ferroFibrousComponents = unallocatedEquipment.filter(eq => 
        eq.equipmentData.id === 'ferro_fibrous'
      )
      
      expect(ferroFibrousComponents.length).toBe(14) // Ferro-Fibrous requires 14 slots
      
      // Serialize and restore
      const serializedState = unitManager.serializeCompleteState()
      saveCompleteStateToMockStorage('ferro-test', serializedState)
      
      const restoredState = loadCompleteStateFromMockStorage('ferro-test')
      const newUnitManager = new UnitCriticalManager(restoredState!.configuration)
      newUnitManager.deserializeCompleteState(restoredState!)
      
      // Verify armor type and components persisted
      expect(newUnitManager.getConfiguration().armorType).toBe('Ferro-Fibrous')
      
      const restoredUnallocated = newUnitManager.getUnallocatedEquipment()
      const restoredFerroFibrous = restoredUnallocated.filter(eq => 
        eq.equipmentData.id === 'ferro_fibrous'
      )
      
      expect(restoredFerroFibrous.length).toBe(14)
      
      console.log('✅ Ferro-Fibrous persistence test passed')
    })
  })

  /**
   * Test 3: Enhancement Persistence
   */
  describe('Enhancement Persistence', () => {
    test('MASC enhancement persists correctly', () => {
      console.log('🧪 Testing MASC Enhancement Persistence')
      
      const config = createTestConfiguration({
        enhancements: [{ type: 'MASC', techBase: 'Inner Sphere' }],
        gyroType: 'Standard',
        structureType: 'Standard',
        armorType: 'Standard',
        jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' },
        heatSinkType: 'Single'
      })
      
      const unitManager = new UnitCriticalManager(config)
      
      // Serialize and restore
      const serializedState = unitManager.serializeCompleteState()
      saveCompleteStateToMockStorage('masc-test', serializedState)
      
      const restoredState = loadCompleteStateFromMockStorage('masc-test')
      const newUnitManager = new UnitCriticalManager(restoredState!.configuration)
      newUnitManager.deserializeCompleteState(restoredState!)
      
      expect(newUnitManager.getConfiguration().enhancements).toEqual([{ type: 'MASC', techBase: 'Inner Sphere' }])
      
      console.log('✅ MASC enhancement persistence test passed')
    })

    test('Triple Strength Myomer enhancement persists correctly', () => {
      const config = createTestConfiguration({
        enhancements: [{ type: 'Triple Strength Myomer', techBase: 'Inner Sphere' }],
        gyroType: 'Standard',
        structureType: 'Standard',
        armorType: 'Standard',
        jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' },
        heatSinkType: 'Single'
      })
      
      const unitManager = new UnitCriticalManager(config)
      
      const serializedState = unitManager.serializeCompleteState()
      saveCompleteStateToMockStorage('tsm-test', serializedState)
      
      const restoredState = loadCompleteStateFromMockStorage('tsm-test')
      const newUnitManager = new UnitCriticalManager(restoredState!.configuration)
      newUnitManager.deserializeCompleteState(restoredState!)
      
      expect(newUnitManager.getConfiguration().enhancements).toEqual([{ type: 'Triple Strength Myomer', techBase: 'Inner Sphere' }])
      
      console.log('✅ Triple Strength Myomer persistence test passed')
    })
  })

  /**
   * Test 4: Complete Configuration Persistence
   */
  describe('Complete Configuration Persistence', () => {
    test('Complex configuration with multiple special components persists', () => {
      console.log('🧪 Testing Complex Configuration Persistence')
      
      const config = createTestConfiguration({
        engineType: 'XL',
        gyroType: 'Compact',
        structureType: 'Endo Steel',
        armorType: 'Ferro-Fibrous',
        enhancements: [{ type: 'MASC', techBase: 'Inner Sphere' }],
        heatSinkType: 'Double',
        externalHeatSinks: 5,
        jumpMP: 3,
        jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' }
      })
      
      const unitManager = new UnitCriticalManager(config)
      
      // Verify all components were created
      const unallocatedEquipment = unitManager.getUnallocatedEquipment()
      
      // Should have Endo Steel (14) + Ferro-Fibrous (14) + Heat Sinks (5) + Jump Jets (3) = 36 components
      expect(unallocatedEquipment.length).toBeGreaterThanOrEqual(36)
      
      // Serialize and restore
      const serializedState = unitManager.serializeCompleteState()
      // Add concise summary log
      const summary = serializedState.unallocatedEquipment.reduce((acc, eq) => {
        const name = eq.equipmentData.name
        acc[name] = (acc[name] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      console.log('=== [TEST SUMMARY] Serialized unallocatedEquipment count:', serializedState.unallocatedEquipment.length)
      Object.entries(summary).forEach(([name, count]) => console.log(`  ${name}: ${count}`))
      
      // Force error if serialized count is less than expected to show summary in error output
      if (serializedState.unallocatedEquipment.length < 36) {
        const summaryText = Object.entries(summary).map(([name, count]) => `${name}: ${count}`).join(', ')
        throw new Error(`Serialized unallocatedEquipment count (${serializedState.unallocatedEquipment.length}) is less than expected (36). Summary: ${summaryText}`)
      }
      const tabId = `complex-special-components-test`
      saveCompleteStateToMockStorage(tabId, serializedState)
      
      const restoredState = loadCompleteStateFromMockStorage(tabId)
      const newUnitManager = new UnitCriticalManager(restoredState!.configuration)
      const restoreSuccess = newUnitManager.deserializeCompleteState(restoredState!)
      
      expect(restoreSuccess).toBe(true)
      
      // Verify all configuration values persisted
      const restoredConfig = newUnitManager.getConfiguration()
      expect(restoredConfig.engineType).toBe('XL')
      expect(restoredConfig.gyroType).toBe('Compact')
      expect(restoredConfig.structureType).toBe('Endo Steel')
      expect(restoredConfig.armorType).toBe('Ferro-Fibrous')
      expect(restoredConfig.enhancements).toEqual([{ type: 'MASC', techBase: 'Inner Sphere' }])
      expect(restoredConfig.heatSinkType).toBe('Double')
      expect(restoredConfig.externalHeatSinks).toBe(5)
      expect(restoredConfig.jumpMP).toBe(3)
      
      // Verify special components persisted
      const restoredUnallocated = newUnitManager.getUnallocatedEquipment()
      // Add debug log for restored unallocated equipment
      const restoredSummary = restoredUnallocated.reduce((acc, eq) => {
        const name = eq.equipmentData.name
        acc[name] = (acc[name] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      console.log('=== [TEST SUMMARY] Restored unallocatedEquipment count:', restoredUnallocated.length)
      Object.entries(restoredSummary).forEach(([name, count]) => console.log(`  ${name}: ${count}`))
      expect(restoredUnallocated.length).toBeGreaterThanOrEqual(36)
      
      console.log('✅ Complex configuration persistence test passed')
    })
  })

  /**
   * Test 5: State Corruption Recovery
   */
  describe('State Corruption Recovery', () => {
    test('Handles corrupted localStorage gracefully', () => {
      console.log('🧪 Testing State Corruption Recovery')
      
      // Save corrupted data
      mockLocalStorage.setItem('battletech-complete-state-corrupt-test', 'invalid-json')
      
      const restoredState = loadCompleteStateFromMockStorage('corrupt-test')
      expect(restoredState).toBeNull()
      
      console.log('✅ State corruption recovery test passed')
    })

    test('Handles missing state gracefully', () => {
      const restoredState = loadCompleteStateFromMockStorage('non-existent-tab')
      expect(restoredState).toBeNull()
      
      console.log('✅ Missing state recovery test passed')
    })
  })

  /**
   * Test 6: State Integrity Validation
   */
  describe('State Integrity Validation', () => {
    test('Serialized state contains all required fields', () => {
      console.log('🧪 Testing State Integrity')
      
      const config = createTestConfiguration()
      const unitManager = new UnitCriticalManager(config)
      
      const serializedState = unitManager.serializeCompleteState()
      
      // Verify all required fields are present
      expect(serializedState.version).toBeDefined()
      expect(serializedState.configuration).toBeDefined()
      expect(serializedState.criticalSlotAllocations).toBeDefined()
      expect(serializedState.unallocatedEquipment).toBeDefined()
      expect(serializedState.timestamp).toBeDefined()
      
      // Verify configuration has all critical fields
      expect(serializedState.configuration.engineType).toBeDefined()
      expect(serializedState.configuration.gyroType).toBeDefined()
      expect(serializedState.configuration.structureType).toBeDefined()
      expect(serializedState.configuration.armorType).toBeDefined()
      expect(serializedState.configuration.tonnage).toBeDefined()
      
      console.log('✅ State integrity validation test passed')
    })
  })
})

// Helper Functions

function createTestConfiguration(overrides: Partial<UnitConfiguration> = {}): UnitConfiguration {
  // Ensure all relevant fields are always objects with type/techBase
  let structureType = overrides.structureType
  if (typeof structureType === 'string') {
    structureType = { type: structureType, techBase: 'Inner Sphere' }
  }
  let armorType = overrides.armorType
  if (typeof armorType === 'string') {
    armorType = { type: armorType, techBase: 'Inner Sphere' }
  }
  let gyroType = overrides.gyroType
  if (typeof gyroType === 'string') {
    gyroType = { type: gyroType, techBase: 'Inner Sphere' }
  }
  let jumpJetType = overrides.jumpJetType
  if (typeof jumpJetType === 'string') {
    jumpJetType = { type: jumpJetType, techBase: 'Inner Sphere' }
  }
  let heatSinkType = overrides.heatSinkType
  if (typeof heatSinkType === 'string') {
    heatSinkType = { type: heatSinkType, techBase: 'Inner Sphere' }
  }
  const config = {
    chassis: 'Test Mech',
    model: 'TEST-1',
    tonnage: 50,
    unitType: 'BattleMech',
    techBase: 'Inner Sphere',
    walkMP: 4,
    engineRating: 200,
    runMP: 6,
    engineType: 'Standard',
    gyroType: 'Standard',
    structureType: 'Standard',
    armorType: 'Standard',
    armorAllocation: {
      HD: { front: 9, rear: 0 },
      CT: { front: 30, rear: 10 },
      LT: { front: 24, rear: 8 },
      RT: { front: 24, rear: 8 },
      LA: { front: 20, rear: 0 },
      RA: { front: 20, rear: 0 },
      LL: { front: 30, rear: 0 },
      RL: { front: 30, rear: 0 }
    },
    armorTonnage: 8.0,
    heatSinkType: 'Single',
    totalHeatSinks: 10,
    internalHeatSinks: 8,
    externalHeatSinks: 2,
    enhancements: [],
    jumpMP: 0,
    jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' },
    jumpJetCounts: {},
    hasPartialWing: false,
    mass: 50,
    ...overrides,
  }
  // After spread, ensure all are objects
  if (typeof config.structureType === 'string') config.structureType = { type: config.structureType, techBase: 'Inner Sphere' }
  if (typeof config.armorType === 'string') config.armorType = { type: config.armorType, techBase: 'Inner Sphere' }
  if (typeof config.gyroType === 'string') config.gyroType = { type: config.gyroType, techBase: 'Inner Sphere' }
  if (typeof config.jumpJetType === 'string') config.jumpJetType = { type: config.jumpJetType, techBase: 'Inner Sphere' }
  if (typeof config.heatSinkType === 'string') config.heatSinkType = { type: config.heatSinkType, techBase: 'Inner Sphere' }
  return config as UnitConfiguration
}

function saveCompleteStateToMockStorage(tabId: string, state: CompleteUnitState): void {
  const tabData = {
    completeState: state,
    config: state.configuration,
    modified: new Date().toISOString(),
    version: '2.0.0'
  }
  
  mockLocalStorage.setItem(`battletech-complete-state-${tabId}`, JSON.stringify(tabData))
}

function loadCompleteStateFromMockStorage(tabId: string): CompleteUnitState | null {
  try {
    const dataStr = mockLocalStorage.getItem(`battletech-complete-state-${tabId}`)
    if (!dataStr) return null
    
    const tabData = JSON.parse(dataStr)
    return tabData.completeState || null
  } catch (error) {
    return null
  }
}
