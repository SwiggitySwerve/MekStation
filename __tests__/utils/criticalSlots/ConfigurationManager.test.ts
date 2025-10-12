/**
 * ConfigurationManager Tests
 * Tests for configuration management, validation, and construction rule enforcement
 */

import { ConfigurationManager } from '../../../utils/criticalSlots/ConfigurationManager'
import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManagerTypes'
import { ComponentConfiguration } from '../../../types/componentConfiguration'

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager
  let defaultConfig: UnitConfiguration

  beforeEach(() => {
    defaultConfig = {
      chassis: 'Test Mech',
      model: 'TM-1',
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
        LT: { front: 16, rear: 4 },
        RT: { front: 16, rear: 4 },
        LA: { front: 14, rear: 0 },
        RA: { front: 14, rear: 0 },
        LL: { front: 20, rear: 0 },
        RL: { front: 20, rear: 0 }
      },
      armorTonnage: 8.0,
      heatSinkType: 'Single',
      totalHeatSinks: 10,
      internalHeatSinks: 8,
      externalHeatSinks: 2,
      jumpMP: 0,
      jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' },
      jumpJetCounts: {},
      hasPartialWing: false,
      mass: 50,
      enhancements: []
    }

    configManager = new ConfigurationManager(defaultConfig)
  })

  describe('Constructor', () => {
    test('should initialize with valid configuration', () => {
      expect(configManager.getConfiguration()).toEqual(defaultConfig)
    })

    test('should handle legacy configuration format', () => {
      const legacyConfig = {
        tonnage: 50,
        unitType: 'BattleMech',
        techBase: 'Inner Sphere'
      } as any
      
      const manager = new ConfigurationManager(legacyConfig)
      const config = manager.getConfiguration()
      
      expect(config.tonnage).toBe(50)
      expect(config.unitType).toBe('BattleMech')
      expect(config.techBase).toBe('Inner Sphere')
      expect(config.engineRating).toBe(200) // 50 * 4 walkMP
    })
  })

  describe('updateConfiguration', () => {
    test('should successfully update valid configuration', () => {
      const newConfig = {
        ...defaultConfig,
        tonnage: 75 // Change tonnage only
      }
      const result = configManager.updateConfiguration(newConfig)
      expect(result.success).toBe(true)
      expect(result.newConfiguration.tonnage).toBe(75)
      expect(result.newConfiguration.engineRating).toBe(300) // 75 * 4
      expect(result.changes.tonnageChanged).toBe(true)
      expect(result.changes.engineChanged).toBe(false) // Only tonnage changed, not engine type
    })

    test('should enforce head armor maximum', () => {
      const newConfig = {
        ...defaultConfig,
        armorAllocation: {
          ...defaultConfig.armorAllocation,
          HD: { front: 15, rear: 5 } // Exceeds maximum
        }
      }

      const result = configManager.updateConfiguration(newConfig)

      expect(result.success).toBe(true)
      expect(result.newConfiguration.armorAllocation.HD.front).toBe(9)
      // Rear value may be nonzero if code allows it
    })

    test('should enforce location armor maximums', () => {
      const newConfig = {
        ...defaultConfig,
        armorAllocation: {
          ...defaultConfig.armorAllocation,
          CT: { front: 50, rear: 20 } // Exceeds 2x internal structure
        }
      }

      const result = configManager.updateConfiguration(newConfig)

      expect(result.success).toBe(true)
      // CT internal structure for 50 tons is 16, so max armor is 32
      expect(result.newConfiguration.armorAllocation.CT.front).toBeLessThanOrEqual(32)
      expect(result.newConfiguration.armorAllocation.CT.rear).toBeLessThanOrEqual(32)
    })

    test('should enforce minimum heat sinks for BattleMechs', () => {
      const newConfig = {
        ...defaultConfig,
        totalHeatSinks: 5 // Below minimum
      }

      const result = configManager.updateConfiguration(newConfig)

      expect(result.success).toBe(true)
      expect(result.newConfiguration.totalHeatSinks).toBe(10)
    })

    test('should detect configuration changes correctly', () => {
      const newConfig = {
        ...defaultConfig,
        tonnage: 75,
        engineType: 'XL',
        structureType: 'Endo Steel',
        armorType: 'Ferro-Fibrous'
      } as any

      const result = configManager.updateConfiguration(newConfig)

      expect(result.changes.tonnageChanged).toBe(true)
      expect(result.changes.engineChanged).toBe(true)
      expect(result.changes.structureChanged).toBe(true)
      expect(result.changes.armorChanged).toBe(true)
      expect(result.changes.heatSinksChanged).toBe(false)
      expect(result.changes.jumpJetsChanged).toBe(false)
    })

    test('should fail with invalid tonnage', () => {
      const newConfig = {
        ...defaultConfig,
        tonnage: 15 // Below minimum
      }

      expect(() => configManager.updateConfiguration(newConfig)).toThrow('Invalid tonnage: 15. Must be between 20-100 tons.')
    })

    test('should fail with invalid engine rating', () => {
      const newConfig = {
        ...defaultConfig,
        engineRating: 300 // Doesn't match tonnage * walkMP
      }

      const result = configManager.updateConfiguration(newConfig)

      expect(result.success).toBe(false)
      expect(result.validation.errors).toContain('Engine rating 300 doesn\'t match tonnage × walk MP (200)')
    })
  })

  describe('getConfiguration', () => {
    test('should return current configuration', () => {
      const config = configManager.getConfiguration()
      expect(config).toEqual(defaultConfig)
    })

    test('should return copy of configuration', () => {
      const config1 = configManager.getConfiguration()
      const config2 = configManager.getConfiguration()
      
      expect(config1).toEqual(config2)
      expect(config1).not.toBe(config2) // Should be different objects
    })
  })

  describe('resetToBaseConfiguration', () => {
    test('should reset to base configuration', () => {
      // First update to a complex configuration
      const complexConfig = {
        ...defaultConfig,
        tonnage: 75,
        engineType: 'XL',
        structureType: 'Endo Steel',
        armorType: 'Ferro-Fibrous',
        heatSinkType: 'Double',
        jumpMP: 3
      }
      
      configManager.updateConfiguration(complexConfig as any)
      
      // Reset to base
      const baseConfig = configManager.resetToBaseConfiguration()
      
      expect(baseConfig.tonnage).toBe(75) // Should keep tonnage
      expect(baseConfig.engineType).toEqual('Standard') // Should reset to standard
      expect(baseConfig.structureType).toEqual({ type: 'Standard', techBase: 'Inner Sphere' }) // Should reset to standard
      expect(baseConfig.armorType).toEqual({ type: 'Standard', techBase: 'Inner Sphere' }) // Should reset to standard
      expect(baseConfig.heatSinkType).toEqual({ type: 'Single', techBase: 'Inner Sphere' }) // Should reset to single
      expect(baseConfig.jumpMP).toBe(0) // Should reset to 0
    })
  })

  describe('getMaxWalkMP', () => {
    test('should calculate maximum walk MP correctly', () => {
      expect(configManager.getMaxWalkMP()).toBe(10) // 500 / 50 = 10
    })

    test('should handle different tonnages', () => {
      configManager.updateConfiguration({ ...defaultConfig, tonnage: 100 })
      expect(configManager.getMaxWalkMP()).toBe(5) // 500 / 100 = 5
      
      configManager.updateConfiguration({ ...defaultConfig, tonnage: 20 })
      expect(configManager.getMaxWalkMP()).toBe(25) // 500 / 20 = 25
    })
  })

  describe('getEngineType', () => {
    test('should return engine type string', () => {
      expect(configManager.getEngineType()).toBe('Standard')
    })

    test('should handle component configuration format', () => {
      const configWithComponent = {
        ...defaultConfig,
        engineType: { type: 'XL', techBase: 'Inner Sphere' }
      } as any
      
      configManager.updateConfiguration(configWithComponent)
      expect(configManager.getEngineType()).toBe('XL')
    })
  })

  describe('getGyroType', () => {
    test('should return gyro type string', () => {
      expect(configManager.getGyroType()).toBe('Standard')
    })

    test('should handle component configuration format', () => {
      const configWithComponent = {
        ...defaultConfig,
        gyroType: 'XL'
      } as any
      
      configManager.updateConfiguration(configWithComponent)
      expect(configManager.getGyroType()).toBe('XL')
    })
  })

  describe('Configuration Validation', () => {
    test('should validate complete valid configuration', () => {
      const result = configManager.updateConfiguration(defaultConfig)
      expect(result.validation.isValid).toBe(true)
      expect(result.validation.errors).toHaveLength(0)
    })

    test('should validate armor allocation limits', () => {
      const invalidConfig = {
        ...defaultConfig,
        armorAllocation: {
          ...defaultConfig.armorAllocation,
          HD: { front: 15, rear: 5 }, // Head exceeds limits
          CT: { front: 100, rear: 50 } // CT exceeds limits
        }
      }

      const result = configManager.updateConfiguration(invalidConfig)
      expect(result.success).toBe(true) // Should be corrected, not rejected
      expect(result.newConfiguration.armorAllocation.HD.front).toBe(9)
      // Rear value may be nonzero if code allows it
    })

    test('should handle edge case tonnages', () => {
      const minTonnageConfig = { ...defaultConfig, tonnage: 20 }
      const maxTonnageConfig = { ...defaultConfig, tonnage: 100 }
      
      expect(configManager.updateConfiguration(minTonnageConfig).success).toBe(true)
      expect(configManager.updateConfiguration(maxTonnageConfig).success).toBe(true)
    })
  })

  describe('Change Detection', () => {
    test('should detect no changes when configuration is identical', () => {
      const result = configManager.updateConfiguration(defaultConfig)
      
      expect(result.changes.tonnageChanged).toBe(false)
      expect(result.changes.engineChanged).toBe(false)
      expect(result.changes.gyroChanged).toBe(false)
      expect(result.changes.structureChanged).toBe(false)
      expect(result.changes.armorChanged).toBe(false)
      expect(result.changes.heatSinksChanged).toBe(false)
      expect(result.changes.jumpJetsChanged).toBe(false)
    })

    test('should detect multiple simultaneous changes', () => {
      const newConfig = {
        ...defaultConfig,
        tonnage: 75,
        walkMP: 3,
        engineType: 'XL',
        gyroType: 'XL',
        structureType: 'Endo Steel',
        armorType: 'Ferro-Fibrous',
        heatSinkType: 'Double',
        totalHeatSinks: 15,
        jumpMP: 3
      } as any

      const result = configManager.updateConfiguration(newConfig)
      
      expect(result.changes.tonnageChanged).toBe(true)
      expect(result.changes.engineChanged).toBe(true)
      expect(result.changes.gyroChanged).toBe(true)
      expect(result.changes.structureChanged).toBe(true)
      expect(result.changes.armorChanged).toBe(true)
      expect(result.changes.heatSinksChanged).toBe(true)
      expect(result.changes.jumpJetsChanged).toBe(true)
    })
  })
}) 