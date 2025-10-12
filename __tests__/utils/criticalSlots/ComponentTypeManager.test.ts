/**
 * ComponentTypeManager Tests
 * Tests for component type extraction, validation, and utility functions
 */

import { ComponentTypeManager } from '../../../utils/criticalSlots/ComponentTypeManager'
import { ComponentConfiguration, TechBase } from '../../../types/componentConfiguration'

describe('ComponentTypeManager', () => {
  describe('extractComponentType', () => {
    test('should extract type from ComponentConfiguration', () => {
      const component: ComponentConfiguration = {
        type: 'XL',
        techBase: 'Inner Sphere'
      }
      
      const result = ComponentTypeManager.extractComponentType(component)
      expect(result).toBe('XL')
    })

    test('should return string as-is for legacy compatibility', () => {
      const result = ComponentTypeManager.extractComponentType('Standard')
      expect(result).toBe('Standard')
    })

    test('should handle complex component types', () => {
      const component: ComponentConfiguration = {
        type: 'Endo Steel (Clan)',
        techBase: 'Clan'
      }
      
      const result = ComponentTypeManager.extractComponentType(component)
      expect(result).toBe('Endo Steel (Clan)')
    })
  })

  describe('extractTechBase', () => {
    test('should extract tech base from ComponentConfiguration', () => {
      const component: ComponentConfiguration = {
        type: 'XL',
        techBase: 'Clan'
      }
      
      const result = ComponentTypeManager.extractTechBase(component)
      expect(result).toBe('Clan')
    })

    test('should infer Clan tech base from string', () => {
      const result = ComponentTypeManager.extractTechBase('Clan XL Engine')
      expect(result).toBe('Clan')
    })

    test('should use fallback for Inner Sphere string', () => {
      const result = ComponentTypeManager.extractTechBase('Standard Engine')
      expect(result).toBe('Inner Sphere')
    })

    test('should use custom fallback', () => {
      const result = ComponentTypeManager.extractTechBase('Standard Engine', 'Clan')
      expect(result).toBe('Clan')
    })
  })

  describe('getStructureTypeString', () => {
    test('should extract structure type from string', () => {
      const result = ComponentTypeManager.getStructureTypeString('Endo Steel')
      expect(result).toBe('Endo Steel')
    })

    test('should handle legacy string format', () => {
      const result = ComponentTypeManager.getStructureTypeString('Standard')
      expect(result).toBe('Standard')
    })
  })

  describe('getArmorTypeString', () => {
    test('should extract armor type from string', () => {
      const result = ComponentTypeManager.getArmorTypeString('Ferro-Fibrous')
      expect(result).toBe('Ferro-Fibrous')
    })

    test('should handle legacy string format', () => {
      const result = ComponentTypeManager.getArmorTypeString('Standard')
      expect(result).toBe('Standard')
    })
  })

  describe('getHeatSinkTypeString', () => {
    test('should extract heat sink type from string', () => {
      const result = ComponentTypeManager.getHeatSinkTypeString('Double')
      expect(result).toBe('Double')
    })

    test('should handle legacy string format', () => {
      const result = ComponentTypeManager.getHeatSinkTypeString('Single')
      expect(result).toBe('Single')
    })
  })

  describe('getJumpJetTypeString', () => {
    test('should extract jump jet type from string', () => {
      const result = ComponentTypeManager.getJumpJetTypeString('Improved Jump Jet')
      expect(result).toBe('Improved Jump Jet')
    })

    test('should handle legacy string format', () => {
      const result = ComponentTypeManager.getJumpJetTypeString('Standard Jump Jet')
      expect(result).toBe('Standard Jump Jet')
    })
  })

  describe('getGyroTypeString', () => {
    test('should extract gyro type from string', () => {
      const result = ComponentTypeManager.getGyroTypeString('XL')
      expect(result).toBe('XL')
    })

    test('should handle legacy string format', () => {
      const result = ComponentTypeManager.getGyroTypeString('Standard')
      expect(result).toBe('Standard')
    })
  })

  describe('getEngineTypeString', () => {
    test('should extract engine type from string', () => {
      const result = ComponentTypeManager.getEngineTypeString('XL')
      expect(result).toBe('XL')
    })

    test('should handle legacy string format', () => {
      const result = ComponentTypeManager.getEngineTypeString('Standard')
      expect(result).toBe('Standard')
    })
  })

  describe('validateComponentType', () => {
    test('should validate valid component type', () => {
      const allowedTypes = ['Standard', 'XL', 'Light']
      const result = ComponentTypeManager.validateComponentType('XL', allowedTypes, 'engine')
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    test('should reject invalid component type', () => {
      const allowedTypes = ['Standard', 'XL', 'Light']
      const result = ComponentTypeManager.validateComponentType('Invalid', allowedTypes, 'engine')
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Invalid engine type: Invalid')
      expect(result.error).toContain('Allowed types: Standard, XL, Light')
    })
  })

  describe('createFromString', () => {
    test('should create ComponentConfiguration from valid type', () => {
      const result = ComponentTypeManager.createFromString('engine', 'XL')
      
      expect(result).not.toBeNull()
      if (result) {
        expect(result).toBe('XL')
        expect(result.techBase).toBe('Inner Sphere')
      }
    })

    test('should return null for invalid type', () => {
      const result = ComponentTypeManager.createFromString('engine', 'InvalidType')
      
      expect(result).toBeNull()
    })
  })

  describe('migrateLegacyComponent', () => {
    test('should migrate legacy string to ComponentConfiguration', () => {
      const result = ComponentTypeManager.migrateLegacyComponent('engine', 'XL', 'Inner Sphere')
      
      expect(result).toBe('XL')
      expect(result.techBase).toBe('Inner Sphere')
    })

    test('should use fallback tech base when exact match not found', () => {
      const result = ComponentTypeManager.migrateLegacyComponent('engine', 'UnknownType', 'Clan')
      
      expect(result).toBe('UnknownType')
      expect(result.techBase).toBe('Clan')
    })
  })

  describe('getAvailableTypes', () => {
    test('should get available types for category and tech base', () => {
      const result = ComponentTypeManager.getAvailableTypes('engine', 'Inner Sphere')
      
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result).toContain('Standard')
      expect(result).toContain('XL')
    })

    test('should get different types for different tech bases', () => {
      const innerSphereTypes = ComponentTypeManager.getAvailableTypes('engine', 'Inner Sphere')
      const clanTypes = ComponentTypeManager.getAvailableTypes('engine', 'Clan')
      
      expect(innerSphereTypes).not.toEqual(clanTypes)
    })
  })

  describe('isClanComponent', () => {
    test('should identify Clan component', () => {
      const component: ComponentConfiguration = {
        type: 'XL',
        techBase: 'Clan'
      }
      
      const result = ComponentTypeManager.isClanComponent(component)
      expect(result).toBe(true)
    })

    test('should identify Inner Sphere component', () => {
      const component: ComponentConfiguration = {
        type: 'XL',
        techBase: 'Inner Sphere'
      }
      
      const result = ComponentTypeManager.isClanComponent(component)
      expect(result).toBe(false)
    })

    test('should infer Clan from string', () => {
      const result = ComponentTypeManager.isClanComponent('Clan XL Engine')
      expect(result).toBe(true)
    })
  })

  describe('isInnerSphereComponent', () => {
    test('should identify Inner Sphere component', () => {
      const component: ComponentConfiguration = {
        type: 'XL',
        techBase: 'Inner Sphere'
      }
      
      const result = ComponentTypeManager.isInnerSphereComponent(component)
      expect(result).toBe(true)
    })

    test('should identify Clan component', () => {
      const component: ComponentConfiguration = {
        type: 'XL',
        techBase: 'Clan'
      }
      
      const result = ComponentTypeManager.isInnerSphereComponent(component)
      expect(result).toBe(false)
    })

    test('should infer Inner Sphere from string', () => {
      const result = ComponentTypeManager.isInnerSphereComponent('Standard Engine')
      expect(result).toBe(true)
    })
  })

  describe('getDisplayName', () => {
    test('should return type for Inner Sphere component', () => {
      const component: ComponentConfiguration = {
        type: 'XL',
        techBase: 'Inner Sphere'
      }
      
      const result = ComponentTypeManager.getDisplayName(component)
      expect(result).toBe('XL')
    })

    test('should append Clan for Clan component', () => {
      const component: ComponentConfiguration = {
        type: 'XL',
        techBase: 'Clan'
      }
      
      const result = ComponentTypeManager.getDisplayName(component)
      expect(result).toBe('XL (Clan)')
    })

    test('should not append Clan if already in type name', () => {
      const component: ComponentConfiguration = {
        type: 'Endo Steel (Clan)',
        techBase: 'Clan'
      }
      
      const result = ComponentTypeManager.getDisplayName(component)
      expect(result).toBe('Endo Steel (Clan)')
    })
  })

  describe('areComponentsEqual', () => {
    test('should identify equal components', () => {
      const component1: ComponentConfiguration = {
        type: 'XL',
        techBase: 'Inner Sphere'
      }
      
      const component2: ComponentConfiguration = {
        type: 'XL',
        techBase: 'Inner Sphere'
      }
      
      const result = ComponentTypeManager.areComponentsEqual(component1, component2)
      expect(result).toBe(true)
    })

    test('should identify different components', () => {
      const component1: ComponentConfiguration = {
        type: 'XL',
        techBase: 'Inner Sphere'
      }
      
      const component2: ComponentConfiguration = {
        type: 'Standard',
        techBase: 'Inner Sphere'
      }
      
      const result = ComponentTypeManager.areComponentsEqual(component1, component2)
      expect(result).toBe(false)
    })

    test('should identify components with different tech bases', () => {
      const component1: ComponentConfiguration = {
        type: 'XL',
        techBase: 'Inner Sphere'
      }
      
      const component2: ComponentConfiguration = {
        type: 'XL',
        techBase: 'Clan'
      }
      
      const result = ComponentTypeManager.areComponentsEqual(component1, component2)
      expect(result).toBe(false)
    })

    test('should handle mixed string and ComponentConfiguration', () => {
      const component: ComponentConfiguration = {
        type: 'XL',
        techBase: 'Inner Sphere'
      }
      
      const result1 = ComponentTypeManager.areComponentsEqual(component, 'XL')
      const result2 = ComponentTypeManager.areComponentsEqual('XL', component)
      
      expect(result1).toBe(true)
      expect(result2).toBe(true)
    })
  })
}) 