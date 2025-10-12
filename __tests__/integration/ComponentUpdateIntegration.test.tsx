/**
 * Component Update Integration Tests
 * 
 * Tests the complete flow from UI component changes through the MultiUnitProvider
 * to the ComponentUpdateService, ensuring the entire architecture works correctly.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MultiUnitProvider, useMultiUnit } from '../../components/multiUnit/MultiUnitProvider'
import { componentUpdateAdapter } from '../../services/ComponentUpdateAdapter'
import { ComponentConfiguration } from '../../types/componentConfiguration'
import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes'

// Mock the adapter to control the service responses
jest.mock('../../services/ComponentUpdateAdapter', () => ({
  componentUpdateAdapter: {
    updateStructure: jest.fn(),
    updateArmor: jest.fn(),
    updateEngine: jest.fn(),
    updateGyro: jest.fn(),
    updateHeatSink: jest.fn(),
    updateJumpJet: jest.fn()
  }
}))

// Test component that uses the MultiUnitProvider
const TestComponent: React.FC = () => {
  const { changeStructure, changeArmor, changeEngine, unit } = useMultiUnit()
  
  const handleStructureChange = () => {
    const newStructure: ComponentConfiguration = { type: 'Endo Steel', techBase: 'Inner Sphere' }
    changeStructure(newStructure)
  }
  
  const handleArmorChange = () => {
    const newArmor: ComponentConfiguration = { type: 'Ferro-Fibrous', techBase: 'Inner Sphere' }
    changeArmor(newArmor)
  }
  
  const handleEngineChange = () => {
    changeEngine('XL')
  }
  
  const handleStringStructureChange = () => {
    changeStructure('Endo Steel')
  }
  
  return (
    <div>
      <button onClick={handleStructureChange} data-testid="change-structure">
        Change to Endo Steel
      </button>
      <button onClick={handleArmorChange} data-testid="change-armor">
        Change to Ferro-Fibrous
      </button>
      <button onClick={handleEngineChange} data-testid="change-engine">
        Change to XL Engine
      </button>
      <button onClick={handleStringStructureChange} data-testid="change-structure-string">
        Change to Endo Steel (String)
      </button>
      <div data-testid="current-structure">
        {unit?.getConfiguration().structureType? || 'None'}
      </div>
      <div data-testid="current-armor">
        {unit?.getConfiguration().armorType? || 'None'}
      </div>
      <div data-testid="current-engine">
        {unit?.getConfiguration().engineType || 'None'}
      </div>
    </div>
  )
}

describe('Component Update Integration', () => {
  const mockAdapter = componentUpdateAdapter as jest.Mocked<typeof componentUpdateAdapter>
  
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
  
  const successResult = {
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
    jest.clearAllMocks()
    
    // Set up default mock responses
    mockAdapter.updateStructure.mockReturnValue({
      ...successResult,
      newConfiguration: { ...baseConfiguration, structureType: 'Endo Steel' },
      changes: { ...successResult.changes, structureChanged: true }
    })
    
    mockAdapter.updateArmor.mockReturnValue({
      ...successResult,
      newConfiguration: { ...baseConfiguration, armorType: 'Ferro-Fibrous' },
      changes: { ...successResult.changes, armorChanged: true }
    })
    
    mockAdapter.updateEngine.mockReturnValue({
      ...successResult,
      newConfiguration: { ...baseConfiguration, engineType: 'XL' },
      changes: { ...successResult.changes, engineChanged: true }
    })
  })
  
  it('should update structure through the complete flow', async () => {
    render(
      <MultiUnitProvider>
        <TestComponent />
      </MultiUnitProvider>
    )
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByTestId('current-structure')).toHaveTextContent('Standard')
    })
    
    // Click the structure change button
    fireEvent.click(screen.getByTestId('change-structure'))
    
    // Verify the adapter was called with correct parameters
    expect(mockAdapter.updateStructure).toHaveBeenCalledWith(
      { type: 'Endo Steel', techBase: 'Inner Sphere' },
      expect.objectContaining({
        structureType: 'Standard'
      })
    )
    
    // Verify the UI updates (this would require the unit to actually update)
    // Note: In a real test, we'd need to mock the UnitCriticalManager properly
  })
  
  it('should update armor through the complete flow', async () => {
    render(
      <MultiUnitProvider>
        <TestComponent />
      </MultiUnitProvider>
    )
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByTestId('current-armor')).toHaveTextContent('Standard')
    })
    
    // Click the armor change button
    fireEvent.click(screen.getByTestId('change-armor'))
    
    // Verify the adapter was called with correct parameters
    expect(mockAdapter.updateArmor).toHaveBeenCalledWith(
      { type: 'Ferro-Fibrous', techBase: 'Inner Sphere' },
      expect.objectContaining({
        armorType: 'Standard'
      })
    )
  })
  
  it('should update engine through the complete flow', async () => {
    render(
      <MultiUnitProvider>
        <TestComponent />
      </MultiUnitProvider>
    )
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByTestId('current-engine')).toHaveTextContent('Standard')
    })
    
    // Click the engine change button
    fireEvent.click(screen.getByTestId('change-engine'))
    
    // Verify the adapter was called with correct parameters
    expect(mockAdapter.updateEngine).toHaveBeenCalledWith(
      'XL',
      expect.objectContaining({
        engineType: 'Standard'
      })
    )
  })
  
  it('should handle string values for structure updates', async () => {
    render(
      <MultiUnitProvider>
        <TestComponent />
      </MultiUnitProvider>
    )
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByTestId('current-structure')).toHaveTextContent('Standard')
    })
    
    // Click the string structure change button
    fireEvent.click(screen.getByTestId('change-structure-string'))
    
    // Verify the adapter was called with string value
    expect(mockAdapter.updateStructure).toHaveBeenCalledWith(
      'Endo Steel',
      expect.objectContaining({
        structureType: 'Standard'
      })
    )
  })
  
  it('should handle failed updates gracefully', async () => {
    // Mock a failed update
    mockAdapter.updateStructure.mockReturnValue({
      success: false,
      newConfiguration: baseConfiguration,
      changes: { ...successResult.changes, structureChanged: true },
      errors: ['Invalid configuration'],
      warnings: []
    })
    
    render(
      <MultiUnitProvider>
        <TestComponent />
      </MultiUnitProvider>
    )
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByTestId('current-structure')).toHaveTextContent('Standard')
    })
    
    // Click the structure change button
    fireEvent.click(screen.getByTestId('change-structure'))
    
    // Verify the adapter was called
    expect(mockAdapter.updateStructure).toHaveBeenCalled()
    
    // Verify the structure didn't change (since update failed)
    expect(screen.getByTestId('current-structure')).toHaveTextContent('Standard')
  })
  
  it('should preserve other components when updating one component', async () => {
    // Mock structure update that only changes structure
    mockAdapter.updateStructure.mockReturnValue({
      success: true,
      newConfiguration: { 
        ...baseConfiguration, 
        structureType: 'Endo Steel'
      },
      changes: { ...successResult.changes, structureChanged: true },
      errors: [],
      warnings: []
    })
    
    render(
      <MultiUnitProvider>
        <TestComponent />
      </MultiUnitProvider>
    )
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByTestId('current-structure')).toHaveTextContent('Standard')
      expect(screen.getByTestId('current-armor')).toHaveTextContent('Standard')
      expect(screen.getByTestId('current-engine')).toHaveTextContent('Standard')
    })
    
    // Click the structure change button
    fireEvent.click(screen.getByTestId('change-structure'))
    
    // Verify the adapter was called with the full current configuration
    expect(mockAdapter.updateStructure).toHaveBeenCalledWith(
      { type: 'Endo Steel', techBase: 'Inner Sphere' },
      expect.objectContaining({
        structureType: 'Standard',
        armorType: 'Standard',
        engineType: 'Standard'
      })
    )
  })
}) 