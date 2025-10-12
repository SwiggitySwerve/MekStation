/**
 * Tests for WeightRulesValidator
 * 
 * Validates weight limit enforcement, weight distribution analysis, and BattleTech weight compliance.
 */

import { WeightRulesValidator } from '../../../services/validation/WeightRulesValidator'
import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManager'

// Helper function to create test unit configuration
function createTestConfig(overrides: Partial<UnitConfiguration> = {}): UnitConfiguration {
  return {
    tonnage: 50,
    engineRating: 200,
    engineType: 'Standard',
    structureType: 'Standard',
    armorType: 'Standard',
    gyroType: 'Standard',
    heatSinkType: 'Single',
    armorAllocation: {
      head: 9,
      centerTorso: 16,
      leftTorso: 12,
      rightTorso: 12,
      leftArm: 8,
      rightArm: 8,
      leftLeg: 10,
      rightLeg: 10
    },
    techBase: 'Inner Sphere',
    ...overrides
  } as UnitConfiguration
}

// Helper function to create test equipment
function createTestEquipment(items: Array<{ tonnage?: number, type?: string, name?: string }> = []): any[] {
  return items.map((item, index) => ({
    id: `item-${index}`,
    equipmentData: {
      tonnage: item.tonnage || 1,
      type: item || 'weapon',
      name: item.name || `Test Item ${index}`,
      heat: 0,
      criticals: 1
    }
  }))
}

describe('WeightRulesValidator', () => {
  describe('validateWeightLimits', () => {
    it('should validate a properly balanced unit', () => {
      const config = createTestConfig({ tonnage: 50 })
      const equipment = createTestEquipment([
        { tonnage: 5, type: 'weapon' },
        { tonnage: 3, type: 'weapon' },
        { tonnage: 2, type: 'ammunition' }
      ])

      const result = WeightRulesValidator.validateWeightLimits(config, equipment)

      expect(result.isValid).toBe(true)
      expect(result.violations).toHaveLength(0)
      expect(result.totalWeight).toBeGreaterThan(0)
      expect(result.totalWeight).toBeLessThanOrEqual(result.maxWeight)
    })

    it('should detect overweight units', () => {
      const config = createTestConfig({ tonnage: 25 }) // Small tonnage
      const equipment = createTestEquipment([
        { tonnage: 15, type: 'weapon' },
        { tonnage: 10, type: 'weapon' },
        { tonnage: 5, type: 'ammunition' }
      ])

      const result = WeightRulesValidator.validateWeightLimits(config, equipment)

      expect(result.isValid).toBe(false)
      expect(result.overweight).toBeGreaterThan(0)
      expect(result.violations.some(v => v === 'overweight')).toBe(true)
      expect(result.recommendations.length).toBeGreaterThan(0)
    })

    it('should provide recommendations for overweight units', () => {
      const config = createTestConfig({ tonnage: 20 })
      const equipment = createTestEquipment([{ tonnage: 25 }])

      const result = WeightRulesValidator.validateWeightLimits(config, equipment)

      expect(result.recommendations).toContain('Remove equipment or use lighter alternatives')
      expect(result.recommendations).toContain('Consider upgrading to XL Engine or Endo Steel structure')
    })

    it('should handle underweight units appropriately', () => {
      const config = createTestConfig({ 
        tonnage: 100,
        engineRating: 100 // Very small engine for weight
      })
      const equipment = createTestEquipment([{ tonnage: 1 }])

      const result = WeightRulesValidator.validateWeightLimits(config, equipment, { 
        allowUnderweight: false 
      })

      expect(result.underweight).toBeGreaterThan(0)
      expect(result.recommendations.some(r => r.includes('utilize available tonnage'))).toBe(true)
    })

    it('should validate weight distribution', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([
        { tonnage: 5, type: 'weapon' },
        { tonnage: 2, type: 'ammunition' }
      ])

      const result = WeightRulesValidator.validateWeightLimits(config, equipment, {
        validateDistribution: true
      })

      expect(result.distribution).toBeDefined()
      expect(result.distribution.structure).toBeGreaterThan(0)
      expect(result.distribution.armor).toBeGreaterThan(0)
      expect(result.distribution.engine).toBeGreaterThan(0)
    })

    it('should respect weight tolerance settings', () => {
      const config = createTestConfig({ tonnage: 50 })
      const equipment = createTestEquipment([{ tonnage: 35 }]) // Close to limit but not too much

      const resultStrict = WeightRulesValidator.validateWeightLimits(config, equipment, {
        weightTolerance: 0.01
      })
      
      const resultLenient = WeightRulesValidator.validateWeightLimits(config, equipment, {
        weightTolerance: 10
      })

      // With strict tolerance, should flag as overweight
      expect(resultStrict.violations.length).toBeGreaterThan(0)
      // With lenient tolerance, should pass
      expect(resultLenient.violations.filter(v => v === 'overweight').length).toBe(0)
    })
  })

  describe('calculateTotalWeight', () => {
    it('should calculate basic component weights', () => {
      const config = createTestConfig({
        tonnage: 50,
        engineRating: 200,
        engineType: 'Standard'
      })
      const equipment: any[] = []

      const totalWeight = WeightRulesValidator.calculateTotalWeight(config, equipment)

      expect(totalWeight).toBeGreaterThan(0)
      // Should include structure, engine, gyro, cockpit, armor
      expect(totalWeight).toBeGreaterThan(10) // Minimum expected weight
    })

    it('should include equipment weight', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([
        { tonnage: 5, type: 'weapon' },
        { tonnage: 3, type: 'ammunition' }
      ])

      const totalWeight = WeightRulesValidator.calculateTotalWeight(config, equipment)
      const baseWeight = WeightRulesValidator.calculateTotalWeight(config, [])

      expect(totalWeight).toBe(baseWeight + 8) // 5 + 3 tons of equipment
    })

    it('should handle XL Engine weight reduction', () => {
      const standardConfig = createTestConfig({ engineType: 'Standard' })
      const xlConfig = createTestConfig({ engineType: 'XL' })

      const standardWeight = WeightRulesValidator.calculateTotalWeight(standardConfig, [])
      const xlWeight = WeightRulesValidator.calculateTotalWeight(xlConfig, [])

      expect(xlWeight).toBeLessThan(standardWeight)
    })

    it('should handle Endo Steel structure weight reduction', () => {
      const standardConfig = createTestConfig({ structureType: 'Standard' })
      const endoConfig = createTestConfig({ structureType: 'Endo Steel' })

      const standardWeight = WeightRulesValidator.calculateTotalWeight(standardConfig, [])
      const endoWeight = WeightRulesValidator.calculateTotalWeight(endoConfig, [])

      expect(endoWeight).toBeLessThan(standardWeight)
    })

    it('should calculate heat sink weight correctly', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([
        { tonnage: 1, type: 'heat_sink', name: 'Heat Sink' },
        { tonnage: 1, type: 'heat_sink', name: 'Heat Sink' }
      ])

      const totalWeight = WeightRulesValidator.calculateTotalWeight(config, equipment)
      const baseWeight = WeightRulesValidator.calculateTotalWeight(config, [])

      expect(totalWeight).toBe(baseWeight + 4) // 2 tons equipment + 2 tons heat sink weight
    })
  })

  describe('calculateWeightDistribution', () => {
    it('should provide detailed weight breakdown', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([
        { tonnage: 5, type: 'weapon' },
        { tonnage: 2, type: 'ammunition' }
      ])

      const distribution = WeightRulesValidator.calculateWeightDistribution(config, equipment)

      expect(distribution.structure).toBeGreaterThan(0)
      expect(distribution.armor).toBeGreaterThan(0)
      expect(distribution.engine).toBeGreaterThan(0)
      expect(distribution.equipment).toBe(5)
      expect(distribution.ammunition).toBe(2)
      expect(distribution.systems).toBeGreaterThan(0)
    })

    it('should separate equipment and ammunition', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([
        { tonnage: 10, type: 'weapon' },
        { tonnage: 5, type: 'ammunition' },
        { tonnage: 3, type: 'equipment' }
      ])

      const distribution = WeightRulesValidator.calculateWeightDistribution(config, equipment)

      expect(distribution.equipment).toBe(13) // weapons + equipment
      expect(distribution.ammunition).toBe(5)
    })

    it('should include systems weight', () => {
      const config = createTestConfig({
        engineRating: 300,
        gyroType: 'Heavy Duty'
      })

      const distribution = WeightRulesValidator.calculateWeightDistribution(config, [])

      // Systems should include gyro + cockpit + heat sinks
      expect(distribution.systems).toBeGreaterThan(3) // At least cockpit weight
    })
  })

  describe('generateWeightOptimizations', () => {
    it('should suggest optimizations for overweight units', () => {
      const config = createTestConfig({ tonnage: 30 })
      const equipment = createTestEquipment([{ tonnage: 25 }]) // Causes overweight

      const suggestions = WeightRulesValidator.generateWeightOptimizations(config, equipment)

      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions[0]).toContain('Reduce weight')
    })

    it('should suggest Endo Steel for standard structure', () => {
      const config = createTestConfig({ 
        tonnage: 30,
        structureType: 'Standard'
      })
      const equipment = createTestEquipment([{ tonnage: 25 }])

      const suggestions = WeightRulesValidator.generateWeightOptimizations(config, equipment)

      expect(suggestions.some(s => s.includes('Endo Steel'))).toBe(true)
    })

    it('should suggest XL Engine for standard engines', () => {
      const config = createTestConfig({ 
        tonnage: 30,
        engineType: 'Standard'
      })
      const equipment = createTestEquipment([{ tonnage: 25 }])

      const suggestions = WeightRulesValidator.generateWeightOptimizations(config, equipment)

      expect(suggestions.some(s => s.includes('XL Engine'))).toBe(true)
    })

    it('should not suggest optimizations for balanced units', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([{ tonnage: 5 }])

      const suggestions = WeightRulesValidator.generateWeightOptimizations(config, equipment)

      expect(suggestions).toHaveLength(0)
    })
  })

  describe('calculateWeightEfficiency', () => {
    it('should give perfect score for optimal utilization', () => {
      const config = createTestConfig({ tonnage: 50 })
      // Create equipment that gets us to ~95% utilization
      const equipment = createTestEquipment([{ tonnage: 25 }])

      const efficiency = WeightRulesValidator.calculateWeightEfficiency(config, equipment)

      expect(efficiency).toBeGreaterThan(80) // Should be high efficiency
    })

    it('should penalize overweight units', () => {
      const config = createTestConfig({ tonnage: 25 })
      const equipment = createTestEquipment([{ tonnage: 30 }]) // Way overweight

      const efficiency = WeightRulesValidator.calculateWeightEfficiency(config, equipment)

      expect(efficiency).toBeLessThan(50) // Should be heavily penalized
    })

    it('should penalize severe underutilization', () => {
      const config = createTestConfig({ tonnage: 100 })
      const equipment = createTestEquipment([{ tonnage: 1 }]) // Very underweight

      const efficiency = WeightRulesValidator.calculateWeightEfficiency(config, equipment)

      expect(efficiency).toBeLessThan(80) // Should be moderately penalized
    })
  })

  describe('component weight calculations', () => {
    it('should calculate structure weight with modifiers', () => {
      const standardWeight = WeightRulesValidator['calculateStructureWeight'](50, 'Standard')
      const endoWeight = WeightRulesValidator['calculateStructureWeight'](50, 'Endo Steel')
      const reinforcedWeight = WeightRulesValidator['calculateStructureWeight'](50, 'Reinforced')

      expect(endoWeight).toBe(standardWeight * 0.5)
      expect(reinforcedWeight).toBe(standardWeight * 2)
    })

    it('should calculate engine weight with type modifiers', () => {
      const standardWeight = WeightRulesValidator['calculateEngineWeight'](200, 'Standard')
      const xlWeight = WeightRulesValidator['calculateEngineWeight'](200, 'XL')
      const lightWeight = WeightRulesValidator['calculateEngineWeight'](200, 'Light')

      expect(xlWeight).toBe(standardWeight * 0.5)
      expect(lightWeight).toBe(standardWeight * 0.75)
    })

    it('should calculate gyro weight with type modifiers', () => {
      const standardWeight = WeightRulesValidator['calculateGyroWeight'](200, 'Standard')
      const compactWeight = WeightRulesValidator['calculateGyroWeight'](200, 'Compact')
      const xlWeight = WeightRulesValidator['calculateGyroWeight'](200, 'XL')

      expect(compactWeight).toBe(standardWeight * 1.5)
      expect(xlWeight).toBe(standardWeight * 0.5)
    })

    it('should calculate armor weight with type modifiers', () => {
      const standardWeight = WeightRulesValidator['calculateArmorWeight'](32, 'Standard')
      const ferroWeight = WeightRulesValidator['calculateArmorWeight'](32, 'Ferro-Fibrous')
      const hardenedWeight = WeightRulesValidator['calculateArmorWeight'](32, 'Hardened')

      expect(ferroWeight).toBeLessThan(standardWeight)
      expect(hardenedWeight).toBe(standardWeight * 2)
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle zero engine rating', () => {
      const config = createTestConfig({ engineRating: 0 })
      
      const weight = WeightRulesValidator.calculateTotalWeight(config, [])
      
      expect(weight).toBeGreaterThan(0) // Should still have other components
    })

    it('should handle missing armor allocation', () => {
      const config = createTestConfig({ armorAllocation: undefined })
      
      const weight = WeightRulesValidator.calculateTotalWeight(config, [])
      
      expect(weight).toBeGreaterThan(0) // Should not crash
    })

    it('should handle empty equipment list', () => {
      const config = createTestConfig()
      
      const result = WeightRulesValidator.validateWeightLimits(config, [])
      
      expect(result.isValid).toBe(true)
      expect(result.totalWeight).toBeGreaterThan(0)
    })

    it('should handle undefined component types', () => {
      const config = createTestConfig({
        structureType: undefined as any,
        armorType: undefined as any,
        gyroType: undefined as any,
        heatSinkType: undefined as any
      })
      
      const weight = WeightRulesValidator.calculateTotalWeight(config, [])
      
      expect(weight).toBeGreaterThan(0) // Should use defaults
    })

    it('should handle very large equipment loads', () => {
      const config = createTestConfig({ tonnage: 100 })
      const equipment = Array(50).fill(null).map((_, i) => ({
        id: `item-${i}`,
        equipmentData: { tonnage: 2, type: 'weapon' }
      }))

      const result = WeightRulesValidator.validateWeightLimits(config, equipment)

      expect(result.violations.some(v => v === 'overweight')).toBe(true)
      expect(result.totalWeight).toBeGreaterThan(100)
    })
  })

  describe('getValidationRules', () => {
    it('should return comprehensive validation rules', () => {
      const rules = WeightRulesValidator.getValidationRules()

      expect(rules.length).toBeGreaterThan(0)
      expect(rules.every(rule => rule.name && rule.description && rule.severity && rule.category)).toBe(true)
      expect(rules.some(rule => rule.name === 'Weight Limit')).toBe(true)
      expect(rules.some(rule => rule.category === 'weight')).toBe(true)
    })
  })
})
