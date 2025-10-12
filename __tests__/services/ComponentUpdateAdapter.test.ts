/**
 * Component Update Adapter Tests
 * 
 * Tests for the ComponentUpdateAdapter to ensure it properly:
 * 1. Translates UI calls to service requests
 * 2. Handles all component types correctly
 * 3. Provides proper logging and debugging information
 */

import { ComponentUpdateAdapter } from '../../services/ComponentUpdateAdapter'
import { ComponentConfiguration } from '../../types/componentConfiguration'
import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes'

// Mock the ComponentUpdateService
jest.mock('../../services/ComponentUpdateService', () => ({
  ComponentUpdateService: {
    updateComponent: jest.fn()
  }
}))

import { ComponentUpdateService } from '../../services/ComponentUpdateService'

describe('ComponentUpdateAdapter', () => {
  let adapter: ComponentUpdateAdapter
  let mockUpdateComponent: jest.MockedFunction<typeof ComponentUpdateService.updateComponent>
  
  // Test configuration
  const baseConfiguration: UnitConfiguration = {
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
      CT: { front: 20, rear: 6 },
      LT: { front: 16, rear: 5 },
      RT: { front: 16, rear: 5 },
      LA: { front: 16, rear: 0 },
      RA: { front: 16, rear: 0 },
      LL: { front: 20, rear: 0 },
      RL: { front: 20, rear: 0 }
    },
    armorTonnage: 8.0,
    externalHeatSinks: 2,
    heatSinkType: 'Single',
    totalHeatSinks: 10,
    internalHeatSinks: 8,
    jumpMP: 0,
    jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' },
    jumpJetCounts: {},
    hasPartialWing: false,
    enhancements: [],
    mass: 50
  }
  
  const mockResult = {
    success: true,
    newConfiguration: baseConfiguration,
    changes: {
      structureChanged: false,
      armorChanged: false,
      engineChanged: false,
      gyroChanged: false,
      heatSinkChanged: false,
      jumpJetChanged: false
    },
    errors: [],
    warnings: []
  }
  
  beforeEach(() => {
    adapter = new ComponentUpdateAdapter()
    mockUpdateComponent = ComponentUpdateService.updateComponent as jest.MockedFunction<typeof ComponentUpdateService.updateComponent>
    mockUpdateComponent.mockReturnValue(mockResult)
    
    // Spy on console.log to verify logging
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  
  afterEach(() => {
    jest.clearAllMocks()
  })
  
  describe('updateStructure', () => {
    it('should call service with correct structure request', () => {
      const newValue: ComponentConfiguration = { type: 'Endo Steel', techBase: 'Inner Sphere' }
      
      adapter.updateStructure(newValue, baseConfiguration)
      
      expect(mockUpdateComponent).toHaveBeenCalledWith({
        componentType: 'structure',
        newValue,
        currentConfiguration: baseConfiguration
      })
    })
    
    it('should handle string values for structure', () => {
      const newValue = 'Endo Steel'
      
      adapter.updateStructure(newValue, baseConfiguration)
      
      expect(mockUpdateComponent).toHaveBeenCalledWith({
        componentType: 'structure',
        newValue,
        currentConfiguration: baseConfiguration
      })
    })
    
    it('should log the update operation', () => {
      const newValue: ComponentConfiguration = { type: 'Endo Steel', techBase: 'Inner Sphere' }
      
      adapter.updateStructure(newValue, baseConfiguration)
      
      expect(console.log).toHaveBeenCalledWith(
        '[ComponentUpdateAdapter] Updating structure:',
        expect.objectContaining({
          newValue,
          currentStructure: baseConfiguration.structureType
        })
      )
    })
  })
  
  describe('updateArmor', () => {
    it('should call service with correct armor request', () => {
      const newValue: ComponentConfiguration = { type: 'Ferro-Fibrous', techBase: 'Inner Sphere' }
      
      adapter.updateArmor(newValue, baseConfiguration)
      
      expect(mockUpdateComponent).toHaveBeenCalledWith({
        componentType: 'armor',
        newValue,
        currentConfiguration: baseConfiguration
      })
    })
    
    it('should handle string values for armor', () => {
      const newValue = 'Ferro-Fibrous'
      
      adapter.updateArmor(newValue, baseConfiguration)
      
      expect(mockUpdateComponent).toHaveBeenCalledWith({
        componentType: 'armor',
        newValue,
        currentConfiguration: baseConfiguration
      })
    })
    
    it('should log the update operation', () => {
      const newValue: ComponentConfiguration = { type: 'Ferro-Fibrous', techBase: 'Inner Sphere' }
      
      adapter.updateArmor(newValue, baseConfiguration)
      
      expect(console.log).toHaveBeenCalledWith(
        '[ComponentUpdateAdapter] Updating armor:',
        expect.objectContaining({
          newValue,
          currentArmor: baseConfiguration.armorType
        })
      )
    })
  })
  
  describe('updateEngine', () => {
    it('should call service with correct engine request', () => {
      const newValue = 'XL'
      
      adapter.updateEngine(newValue, baseConfiguration)
      
      expect(mockUpdateComponent).toHaveBeenCalledWith({
        componentType: 'engine',
        newValue,
        currentConfiguration: baseConfiguration
      })
    })
    
    it('should log the update operation', () => {
      const newValue = 'XL'
      
      adapter.updateEngine(newValue, baseConfiguration)
      
      expect(console.log).toHaveBeenCalledWith(
        '[ComponentUpdateAdapter] Updating engine:',
        expect.objectContaining({
          newValue,
          currentEngine: baseConfiguration.engineType
        })
      )
    })
  })
  
  describe('updateGyro', () => {
    it('should call service with correct gyro request', () => {
      const newValue: ComponentConfiguration = { type: 'Compact', techBase: 'Inner Sphere' }
      
      adapter.updateGyro(newValue, baseConfiguration)
      
      expect(mockUpdateComponent).toHaveBeenCalledWith({
        componentType: 'gyro',
        newValue,
        currentConfiguration: baseConfiguration
      })
    })
    
    it('should log the update operation', () => {
      const newValue: ComponentConfiguration = { type: 'Compact', techBase: 'Inner Sphere' }
      
      adapter.updateGyro(newValue, baseConfiguration)
      
      expect(console.log).toHaveBeenCalledWith(
        '[ComponentUpdateAdapter] Updating gyro:',
        expect.objectContaining({
          newValue,
          currentGyro: baseConfiguration.gyroType
        })
      )
    })
  })
  
  describe('updateHeatSink', () => {
    it('should call service with correct heat sink request', () => {
      const newValue: ComponentConfiguration = { type: 'Double', techBase: 'Inner Sphere' }
      
      adapter.updateHeatSink(newValue, baseConfiguration)
      
      expect(mockUpdateComponent).toHaveBeenCalledWith({
        componentType: 'heatSink',
        newValue,
        currentConfiguration: baseConfiguration
      })
    })
    
    it('should log the update operation', () => {
      const newValue: ComponentConfiguration = { type: 'Double', techBase: 'Inner Sphere' }
      
      adapter.updateHeatSink(newValue, baseConfiguration)
      
      expect(console.log).toHaveBeenCalledWith(
        '[ComponentUpdateAdapter] Updating heat sink:',
        expect.objectContaining({
          newValue,
          currentHeatSink: baseConfiguration.heatSinkType
        })
      )
    })
  })
  
  describe('updateJumpJet', () => {
    it('should call service with correct jump jet request', () => {
      const newValue: ComponentConfiguration = { type: 'Improved Jump Jet', techBase: 'Inner Sphere' }
      
      adapter.updateJumpJet(newValue, baseConfiguration)
      
      expect(mockUpdateComponent).toHaveBeenCalledWith({
        componentType: 'jumpJet',
        newValue,
        currentConfiguration: baseConfiguration
      })
    })
    
    it('should log the update operation', () => {
      const newValue: ComponentConfiguration = { type: 'Improved Jump Jet', techBase: 'Inner Sphere' }
      
      adapter.updateJumpJet(newValue, baseConfiguration)
      
      expect(console.log).toHaveBeenCalledWith(
        '[ComponentUpdateAdapter] Updating jump jet:',
        expect.objectContaining({
          newValue,
          currentJumpJet: baseConfiguration.jumpJetType
        })
      )
    })
  })
  
  describe('return values', () => {
    it('should return the service result for structure update', () => {
      const newValue: ComponentConfiguration = { type: 'Endo Steel', techBase: 'Inner Sphere' }
      
      const result = adapter.updateStructure(newValue, baseConfiguration)
      
      expect(result).toBe(mockResult)
    })
    
    it('should return the service result for armor update', () => {
      const newValue: ComponentConfiguration = { type: 'Ferro-Fibrous', techBase: 'Inner Sphere' }
      
      const result = adapter.updateArmor(newValue, baseConfiguration)
      
      expect(result).toBe(mockResult)
    })
    
    it('should return the service result for engine update', () => {
      const newValue = 'XL'
      
      const result = adapter.updateEngine(newValue, baseConfiguration)
      
      expect(result).toBe(mockResult)
    })
  })
}) 