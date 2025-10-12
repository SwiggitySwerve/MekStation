/**
 * Component Update Service Tests
 * 
 * Tests for the ComponentUpdateService to ensure:
 * 1. Individual component updates work correctly
 * 2. Other components are not affected when updating one component
 * 3. Validation works properly
 * 4. Change detection works correctly
 */

import { ComponentUpdateService, ComponentUpdateRequest } from '../../services/ComponentUpdateService'
import { ComponentConfiguration } from '../../types/componentConfiguration'
import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes'

describe('ComponentUpdateService', () => {
  // Test configuration with all components set
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

  describe('updateComponent', () => {
    it('should update structure type without affecting other components', () => {
      const request: ComponentUpdateRequest = {
        componentType: 'structure',
        newValue: { type: 'Endo Steel', techBase: 'Inner Sphere' },
        currentConfiguration: baseConfiguration
      }

      const result = ComponentUpdateService.updateComponent(request)

      expect(result.success).toBe(true)
      expect(result.newConfiguration.structureType).toEqual({ type: 'Endo Steel', techBase: 'Inner Sphere' })
      expect(result.newConfiguration.armorType).toEqual(baseConfiguration.armorType)
      expect(result.newConfiguration.engineType).toBe(baseConfiguration.engineType)
      expect(result.changes.structureChanged).toBe(true)
      expect(result.changes.armorChanged).toBe(false)
      expect(result.changes.engineChanged).toBe(false)
    })

    it('should update armor type without affecting other components', () => {
      const request: ComponentUpdateRequest = {
        componentType: 'armor',
        newValue: { type: 'Ferro-Fibrous', techBase: 'Inner Sphere' },
        currentConfiguration: baseConfiguration
      }

      const result = ComponentUpdateService.updateComponent(request)

      expect(result.success).toBe(true)
      expect(result.newConfiguration.armorType).toEqual({ type: 'Ferro-Fibrous', techBase: 'Inner Sphere' })
      expect(result.newConfiguration.structureType).toEqual(baseConfiguration.structureType)
      expect(result.newConfiguration.engineType).toBe(baseConfiguration.engineType)
      expect(result.changes.armorChanged).toBe(true)
      expect(result.changes.structureChanged).toBe(false)
      expect(result.changes.engineChanged).toBe(false)
    })

    it('should update engine type without affecting other components', () => {
      const request: ComponentUpdateRequest = {
        componentType: 'engine',
        newValue: 'XL',
        currentConfiguration: baseConfiguration
      }

      const result = ComponentUpdateService.updateComponent(request)

      expect(result.success).toBe(true)
      expect(result.newConfiguration.engineType).toBe('XL')
      expect(result.newConfiguration.structureType).toEqual(baseConfiguration.structureType)
      expect(result.newConfiguration.armorType).toEqual(baseConfiguration.armorType)
      expect(result.changes.engineChanged).toBe(true)
      expect(result.changes.structureChanged).toBe(false)
      expect(result.changes.armorChanged).toBe(false)
    })

    it('should update gyro type without affecting other components', () => {
      const request: ComponentUpdateRequest = {
        componentType: 'gyro',
        newValue: { type: 'Compact', techBase: 'Inner Sphere' },
        currentConfiguration: baseConfiguration
      }

      const result = ComponentUpdateService.updateComponent(request)

      expect(result.success).toBe(true)
      expect(result.newConfiguration.gyroType).toEqual({ type: 'Compact', techBase: 'Inner Sphere' })
      expect(result.newConfiguration.structureType).toEqual(baseConfiguration.structureType)
      expect(result.newConfiguration.armorType).toEqual(baseConfiguration.armorType)
      expect(result.changes.gyroChanged).toBe(true)
      expect(result.changes.structureChanged).toBe(false)
      expect(result.changes.armorChanged).toBe(false)
    })

    it('should update heat sink type without affecting other components', () => {
      const request: ComponentUpdateRequest = {
        componentType: 'heatSink',
        newValue: { type: 'Double', techBase: 'Inner Sphere' },
        currentConfiguration: baseConfiguration
      }

      const result = ComponentUpdateService.updateComponent(request)

      expect(result.success).toBe(true)
      expect(result.newConfiguration.heatSinkType).toEqual({ type: 'Double', techBase: 'Inner Sphere' })
      expect(result.newConfiguration.structureType).toEqual(baseConfiguration.structureType)
      expect(result.newConfiguration.armorType).toEqual(baseConfiguration.armorType)
      expect(result.changes.heatSinkChanged).toBe(true)
      expect(result.changes.structureChanged).toBe(false)
      expect(result.changes.armorChanged).toBe(false)
    })

    it('should update jump jet type without affecting other components', () => {
      const request: ComponentUpdateRequest = {
        componentType: 'jumpJet',
        newValue: { type: 'Improved Jump Jet', techBase: 'Inner Sphere' },
        currentConfiguration: baseConfiguration
      }

      const result = ComponentUpdateService.updateComponent(request)

      expect(result.success).toBe(true)
      expect(result.newConfiguration.jumpJetType).toEqual({ type: 'Improved Jump Jet', techBase: 'Inner Sphere' })
      expect(result.newConfiguration.structureType).toEqual(baseConfiguration.structureType)
      expect(result.newConfiguration.armorType).toEqual(baseConfiguration.armorType)
      expect(result.changes.jumpJetChanged).toBe(true)
      expect(result.changes.structureChanged).toBe(false)
      expect(result.changes.armorChanged).toBe(false)
    })

    it('should normalize string values to ComponentConfiguration', () => {
      const request: ComponentUpdateRequest = {
        componentType: 'structure',
        newValue: 'Endo Steel',
        currentConfiguration: baseConfiguration
      }

      const result = ComponentUpdateService.updateComponent(request)

      expect(result.success).toBe(true)
      expect(result.newConfiguration.structureType).toEqual({ type: 'Endo Steel', techBase: 'Inner Sphere' })
    })

    it('should return error for unknown component type', () => {
      const request: ComponentUpdateRequest = {
        componentType: 'unknown' as any,
        newValue: 'Test',
        currentConfiguration: baseConfiguration
      }

      const result = ComponentUpdateService.updateComponent(request)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Unknown component type: unknown')
      expect(result.newConfiguration).toEqual(baseConfiguration)
    })
  })

  describe('validation', () => {
    it('should validate tonnage range', () => {
      const invalidConfig = { ...baseConfiguration, tonnage: 15 }
      const request: ComponentUpdateRequest = {
        componentType: 'structure',
        newValue: { type: 'Endo Steel', techBase: 'Inner Sphere' },
        currentConfiguration: invalidConfig
      }

      const result = ComponentUpdateService.updateComponent(request)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Invalid tonnage: 15. Must be between 20-100 tons.')
    })

    it('should validate walk MP range', () => {
      const invalidConfig = { ...baseConfiguration, walkMP: 25 }
      const request: ComponentUpdateRequest = {
        componentType: 'structure',
        newValue: { type: 'Endo Steel', techBase: 'Inner Sphere' },
        currentConfiguration: invalidConfig
      }

      const result = ComponentUpdateService.updateComponent(request)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Invalid walk MP: 25. Must be between 1-20.')
    })

    it('should validate minimum heat sinks', () => {
      const invalidConfig = { ...baseConfiguration, totalHeatSinks: 5 }
      const request: ComponentUpdateRequest = {
        componentType: 'structure',
        newValue: { type: 'Endo Steel', techBase: 'Inner Sphere' },
        currentConfiguration: invalidConfig
      }

      const result = ComponentUpdateService.updateComponent(request)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Invalid heat sinks: 5. Must be at least 10.')
    })

    it('should provide warnings for Clan tech base conversions', () => {
      const clanConfig = { ...baseConfiguration, techBase: 'Clan' as const }
      const request: ComponentUpdateRequest = {
        componentType: 'structure',
        newValue: { type: 'Endo Steel', techBase: 'Clan' },
        currentConfiguration: clanConfig
      }

      const result = ComponentUpdateService.updateComponent(request)

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('Clan Endo Steel detected - will be converted to Endo Steel (Clan)')
    })
  })

  describe('change detection', () => {
    it('should detect when no changes occur', () => {
      const request: ComponentUpdateRequest = {
        componentType: 'structure',
        newValue: { type: 'Standard', techBase: 'Inner Sphere' },
        currentConfiguration: baseConfiguration
      }

      const result = ComponentUpdateService.updateComponent(request)

      expect(result.changes.structureChanged).toBe(false)
      expect(result.changes.armorChanged).toBe(false)
      expect(result.changes.engineChanged).toBe(false)
    })

    it('should detect changes in component type', () => {
      const request: ComponentUpdateRequest = {
        componentType: 'structure',
        newValue: { type: 'Endo Steel', techBase: 'Inner Sphere' },
        currentConfiguration: baseConfiguration
      }

      const result = ComponentUpdateService.updateComponent(request)

      expect(result.changes.structureChanged).toBe(true)
    })

    it('should detect changes in tech base', () => {
      const request: ComponentUpdateRequest = {
        componentType: 'structure',
        newValue: { type: 'Standard', techBase: 'Clan' },
        currentConfiguration: baseConfiguration
      }

      const result = ComponentUpdateService.updateComponent(request)

      expect(result.changes.structureChanged).toBe(true)
    })
  })
}) 