/**
 * Tests for HeatRulesValidator
 * 
 * Validates heat management, thermal balance, and BattleTech heat sink compliance.
 */

import { HeatRulesValidator } from '../../../services/validation/HeatRulesValidator'
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
function createTestEquipment(items: Array<{ heat?: number, type?: string, name?: string, tonnage?: number }> = []): any[] {
  return items.map((item, index) => ({
    id: `item-${index}`,
    equipmentData: {
      heat: item.heat || 0,
      type: item || 'weapon',
      name: item.name || `Test Item ${index}`,
      tonnage: item.tonnage || 1,
      criticals: 1
    }
  }))
}

describe('HeatRulesValidator', () => {
  describe('validateHeatManagement', () => {
    it('should validate unit with adequate heat dissipation', () => {
      const config = createTestConfig({ 
        engineRating: 250,
        heatSinkType: 'Double'
      })
      const equipment = createTestEquipment([
        { heat: 4, type: 'weapon', name: 'Medium Laser' },
        { heat: 3, type: 'weapon', name: 'Small Laser' }
      ])

      const result = HeatRulesValidator.validateHeatManagement(config, equipment)

      expect(result.isValid).toBe(true)
      expect(result.heatGeneration).toBe(7)
      expect(result.heatDissipation).toBeGreaterThanOrEqual(result.heatGeneration)
      expect(result.heatDeficit).toBe(0)
      expect(result.violations).toHaveLength(0)
    })

    it('should detect insufficient heat sinks', () => {
      const config = createTestConfig({ 
        engineRating: 100, // Only 4 engine heat sinks
        heatSinkType: 'Single'
      })
      const equipment = createTestEquipment([]) // No external heat sinks

      const result = HeatRulesValidator.validateHeatManagement(config, equipment)

      expect(result.isValid).toBe(false)
      expect(result.actualHeatSinks).toBeLessThan(10)
      expect(result.violations.some(v => v === 'insufficient_heat_sinks')).toBe(true)
      expect(result.violations.some(v => v.severity === 'critical')).toBe(true)
    })

    it('should detect heat overflow conditions', () => {
      const config = createTestConfig({ 
        engineRating: 200,
        heatSinkType: 'Single'
      })
      const equipment = createTestEquipment([
        { heat: 10, type: 'weapon', name: 'PPC' },
        { heat: 8, type: 'weapon', name: 'Large Laser' },
        { heat: 6, type: 'weapon', name: 'Medium Laser' }
      ])

      const result = HeatRulesValidator.validateHeatManagement(config, equipment)

      expect(result.isValid).toBe(false)
      expect(result.heatDeficit).toBeGreaterThan(0)
      expect(result.violations.some(v => v === 'heat_overflow')).toBe(true)
      expect(result.recommendations.some(r => r.includes('heat sinks'))).toBe(true)
    })

    it('should validate minimum heat sink requirement', () => {
      const config = createTestConfig({ 
        engineRating: 100,
        heatSinkType: 'Single'
      })
      const equipment = createTestEquipment([
        { type: 'heat_sink', name: 'Heat Sink' },
        { type: 'heat_sink', name: 'Heat Sink' },
        { type: 'heat_sink', name: 'Heat Sink' },
        { type: 'heat_sink', name: 'Heat Sink' },
        { type: 'heat_sink', name: 'Heat Sink' },
        { type: 'heat_sink', name: 'Heat Sink' }
      ])

      const result = HeatRulesValidator.validateHeatManagement(config, equipment)

      expect(result.actualHeatSinks).toBe(10) // 4 engine + 6 external
      expect(result.isValid).toBe(true)
      expect(result.violations.filter(v => v === 'insufficient_heat_sinks')).toHaveLength(0)
    })

    it('should handle XL engine heat sink limitations', () => {
      const config = createTestConfig({ 
        engineRating: 300,
        engineType: 'XL',
        heatSinkType: 'Double'
      })

      const engineHeatSinks = HeatRulesValidator.getEngineHeatSinks(config)

      // XL engines follow same rule as standard engines - only rating matters
      expect(engineHeatSinks).toBe(12) // 300/25 = 12 (official BattleTech rule)
      expect(engineHeatSinks).toBeGreaterThan(0)
    })

    it('should handle heat sink tech base compatibility', () => {
      const config = createTestConfig({ 
        techBase: 'Inner Sphere',
        heatSinkType: 'Double (Clan)'
      })
      const equipment = createTestEquipment([])

      const result = HeatRulesValidator.validateHeatManagement(config, equipment, {
        validateHeatSinkTypes: true
      })

      expect(result.violations.some(v => v === 'heat_sink_compatibility')).toBe(true)
      expect(result.violations.some(v => v.severity === 'major')).toBe(true)
    })
  })

  describe('calculateHeatGeneration', () => {
    it('should calculate total heat from all weapons', () => {
      const equipment = createTestEquipment([
        { heat: 4, type: 'weapon', name: 'Medium Laser' },
        { heat: 10, type: 'weapon', name: 'PPC' },
        { heat: 3, type: 'weapon', name: 'Small Laser' }
      ])

      const heatGeneration = HeatRulesValidator.calculateHeatGeneration(equipment)

      expect(heatGeneration).toBe(17)
    })

    it('should handle equipment with no heat generation', () => {
      const equipment = createTestEquipment([
        { heat: 0, type: 'equipment', name: 'CASE' },
        { type: 'ammunition', name: 'AC/10 Ammo' }
      ])

      const heatGeneration = HeatRulesValidator.calculateHeatGeneration(equipment)

      expect(heatGeneration).toBe(0)
    })

    it('should consider firing rates if specified', () => {
      const equipment = [{
        id: 'weapon-1',
        equipmentData: {
          heat: 5,
          firingRate: 2,
          type: 'weapon',
          name: 'Ultra AC/5'
        }
      }]

      const heatGeneration = HeatRulesValidator.calculateHeatGeneration(equipment)

      expect(heatGeneration).toBe(10) // 5 heat × 2 firing rate
    })
  })

  describe('getEngineHeatSinks', () => {
    it('should calculate engine heat sinks based on rating', () => {
      const config = createTestConfig({ engineRating: 250 })

      const engineHeatSinks = HeatRulesValidator.getEngineHeatSinks(config)

      expect(engineHeatSinks).toBe(10) // 250/25 = 10, capped at 10
    })

    it('should calculate engine heat sinks using official formula', () => {
      const config = createTestConfig({ engineRating: 400 })

      const engineHeatSinks = HeatRulesValidator.getEngineHeatSinks(config)

      expect(engineHeatSinks).toBe(16) // 400/25 = 16 (official BattleTech rule)
    })

    it('should handle XL engine limitations', () => {
      const config = createTestConfig({ 
        engineRating: 300,
        engineType: 'XL' 
      })

      const engineHeatSinks = HeatRulesValidator.getEngineHeatSinks(config)

      // XL engines follow same rule as standard engines - only rating matters
      expect(engineHeatSinks).toBe(12) // 300/25 = 12 (official BattleTech rule)
    })

    it('should handle Light engine limitations', () => {
      const config = createTestConfig({ 
        engineRating: 300,
        engineType: 'Light' 
      })

      const engineHeatSinks = HeatRulesValidator.getEngineHeatSinks(config)

      // Light engines follow same rule as standard engines - only rating matters
      expect(engineHeatSinks).toBe(12) // 300/25 = 12 (official BattleTech rule)
    })

    it('should handle Compact engine (no heat sinks)', () => {
      const config = createTestConfig({ 
        engineRating: 200,
        engineType: 'Compact' 
      })

      const engineHeatSinks = HeatRulesValidator.getEngineHeatSinks(config)

      expect(engineHeatSinks).toBe(0)
    })
  })

  describe('getExternalHeatSinks', () => {
    it('should count external heat sinks', () => {
      const equipment = createTestEquipment([
        { type: 'heat_sink', name: 'Heat Sink' },
        { type: 'heat_sink', name: 'Double Heat Sink' },
        { type: 'weapon', name: 'Medium Laser' }
      ])

      const externalHeatSinks = HeatRulesValidator.getExternalHeatSinks(equipment)

      expect(externalHeatSinks).toBe(2)
    })

    it('should identify heat sinks by name pattern', () => {
      const equipment = [{
        id: 'hs-1',
        equipmentData: {
          type: 'equipment',
          name: 'Double Heat Sink'
        }
      }]

      const externalHeatSinks = HeatRulesValidator.getExternalHeatSinks(equipment)

      expect(externalHeatSinks).toBe(1)
    })
  })

  describe('calculateHeatSinkBreakdown', () => {
    it('should provide detailed heat sink analysis', () => {
      const config = createTestConfig({ 
        engineRating: 200,
        heatSinkType: 'Double'
      })
      const equipment = createTestEquipment([
        { type: 'heat_sink', name: 'Double Heat Sink' },
        { type: 'heat_sink', name: 'Double Heat Sink' }
      ])

      const breakdown = HeatRulesValidator.calculateHeatSinkBreakdown(config, equipment)

      expect(breakdown.engineInternal).toBe(8) // 200/25 = 8
      expect(breakdown.externalDouble).toBe(2)
      expect(breakdown.totalCount).toBe(10)
      expect(breakdown.totalDissipation).toBeGreaterThan(10) // Double heat sinks
      expect(breakdown.avgDissipationRate).toBeGreaterThan(1)
    })

    it('should categorize different heat sink types', () => {
      const config = createTestConfig({ engineRating: 200 })
      const equipment = [
        { id: 'hs-1', equipmentData: { type: 'heat_sink', name: 'Heat Sink' } },
        { id: 'hs-2', equipmentData: { type: 'heat_sink', name: 'Double Heat Sink' } },
        { id: 'hs-3', equipmentData: { type: 'heat_sink', name: 'Compact Heat Sink' } }
      ]

      const breakdown = HeatRulesValidator.calculateHeatSinkBreakdown(config, equipment)

      expect(breakdown.externalSingle).toBe(1)
      expect(breakdown.externalDouble).toBe(1)
      expect(breakdown.externalCompact).toBe(1)
    })
  })

  describe('calculateThermalProfile', () => {
    it('should generate comprehensive thermal analysis', () => {
      const config = createTestConfig({ tonnage: 50, engineRating: 200 })
      const equipment = createTestEquipment([
        { heat: 8, type: 'weapon', name: 'Large Laser' },
        { type: 'jump_jet', name: 'Jump Jet' },
        { type: 'jump_jet', name: 'Jump Jet' }
      ])

      const profile = HeatRulesValidator.calculateThermalProfile(config, equipment, 2)

      expect(profile.walkingHeat).toBe(1)
      expect(profile.runningHeat).toBe(2)
      expect(profile.jumpingHeat).toBe(2) // 2 jump jets
      expect(profile.weaponHeat).toBe(8)
      expect(profile.environmentalHeat).toBe(2)
      expect(profile.totalOperationalHeat).toBe(11) // 1 + 8 + 2
      expect(profile.sustainableFirepower).toBeGreaterThanOrEqual(0)
    })

    it('should calculate sustainable firepower', () => {
      const config = createTestConfig({ 
        engineRating: 250,
        heatSinkType: 'Double'
      })
      const equipment = createTestEquipment([
        { heat: 4, type: 'weapon', name: 'Medium Laser' }
      ])

      const profile = HeatRulesValidator.calculateThermalProfile(config, equipment, 0)

      expect(profile.sustainableFirepower).toBeGreaterThan(0)
      expect(profile.sustainableFirepower).toBeLessThanOrEqual(20) // Reasonable upper bound
    })
  })

  describe('generateHeatOptimizations', () => {
    it('should suggest heat sinks for heat deficit', () => {
      const config = createTestConfig({ 
        engineRating: 100,
        heatSinkType: 'Single'
      })
      const equipment = createTestEquipment([
        { heat: 15, type: 'weapon', name: 'High Heat Weapon' }
      ])

      const optimizations = HeatRulesValidator.generateHeatOptimizations(config, equipment)

      expect(optimizations.recommendations.length).toBeGreaterThan(0)
      expect(optimizations.recommendations.some(r => r === 'add_heat_sinks')).toBe(true)
      expect(optimizations.recommendations.some(r => r.priority === 'high')).toBe(true)
    })

    it('should suggest heat sink upgrades', () => {
      const config = createTestConfig({ 
        heatSinkType: 'Single'
      })
      const equipment = createTestEquipment([])

      const optimizations = HeatRulesValidator.generateHeatOptimizations(config, equipment)

      expect(optimizations.recommendations.some(r => r === 'upgrade_heat_sinks')).toBe(true)
      expect(optimizations.potentialImprovements.length).toBeGreaterThan(0)
    })

    it('should suggest weapon heat reduction for hot builds', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([
        { heat: 10, type: 'weapon', name: 'PPC' },
        { heat: 8, type: 'weapon', name: 'Large Laser' },
        { heat: 8, type: 'weapon', name: 'Large Laser' }
      ])

      const optimizations = HeatRulesValidator.generateHeatOptimizations(config, equipment)

      expect(optimizations.recommendations.some(r => r === 'reduce_heat_generation')).toBe(true)
    })
  })

  describe('calculateHeatSinkEfficiency', () => {
    it('should give high score for balanced heat management', () => {
      const config = createTestConfig({ 
        engineRating: 250,
        heatSinkType: 'Double'
      })
      const equipment = createTestEquipment([
        { heat: 6, type: 'weapon', name: 'Medium Laser' }
      ])

      const efficiency = HeatRulesValidator.calculateHeatSinkEfficiency(config, equipment)

      expect(efficiency).toBeGreaterThan(80)
    })

    it('should penalize heat deficits', () => {
      const config = createTestConfig({ 
        engineRating: 100,
        heatSinkType: 'Single'
      })
      const equipment = createTestEquipment([
        { heat: 20, type: 'weapon', name: 'Hot Weapon' }
      ])

      const efficiency = HeatRulesValidator.calculateHeatSinkEfficiency(config, equipment)

      expect(efficiency).toBeLessThan(50)
    })

    it('should penalize insufficient heat sinks', () => {
      const config = createTestConfig({ engineRating: 75 }) // Less than 10 heat sinks
      const equipment = createTestEquipment([])

      const efficiency = HeatRulesValidator.calculateHeatSinkEfficiency(config, equipment)

      expect(efficiency).toBeLessThan(100)
    })

    it('should provide bonus for optimal efficiency', () => {
      const config = createTestConfig({ 
        engineRating: 200,
        heatSinkType: 'Double'
      })
      const equipment = createTestEquipment([
        { heat: 12, type: 'weapon', name: 'Optimal Heat Weapon' }, // Creates good heat efficiency
        { type: 'heat_sink', name: 'Double Heat Sink' }
      ])

      const efficiency = HeatRulesValidator.calculateHeatSinkEfficiency(config, equipment)

      expect(efficiency).toBeGreaterThanOrEqual(90)
    })
  })

  describe('heat sink compatibility validation', () => {
    it('should detect mixed heat sink types', () => {
      const config = createTestConfig()
      const equipment = [
        { id: 'hs-1', equipmentData: { type: 'heat_sink', name: 'Heat Sink' } },
        { id: 'hs-2', equipmentData: { type: 'heat_sink', name: 'Double Heat Sink' } }
      ]

      const result = HeatRulesValidator.validateHeatManagement(config, equipment, {
        validateHeatSinkTypes: true
      })

      expect(result.violations.some(v => v === 'invalid_heat_sink_type')).toBe(true)
      expect(result.violations.some(v => v.severity === 'minor')).toBe(true)
    })

    it('should validate Clan heat sink compatibility', () => {
      const config = createTestConfig({ 
        techBase: 'Inner Sphere',
        heatSinkType: 'Double (Clan)'
      })

      const result = HeatRulesValidator.validateHeatManagement(config, [], {
        validateHeatSinkTypes: true
      })

      expect(result.violations.some(v => v === 'heat_sink_compatibility')).toBe(true)
    })
  })

  describe('thermal efficiency validation', () => {
    it('should recommend more heat sinks for poor efficiency', () => {
      const config = createTestConfig({ 
        engineRating: 100,
        heatSinkType: 'Single'
      })
      const equipment = createTestEquipment([
        { heat: 8, type: 'weapon', name: 'Medium Heat Weapon' }
      ])

      const result = HeatRulesValidator.validateHeatManagement(config, equipment, {
        checkThermalEfficiency: true
      })

      expect(result.recommendations.some(r => r.includes('Heat efficiency'))).toBe(true)
    })

    it('should warn about excessive heat capacity', () => {
      const config = createTestConfig({ 
        engineRating: 400,
        heatSinkType: 'Double'
      })
      const equipment = createTestEquipment([
        { heat: 2, type: 'weapon', name: 'Low Heat Weapon' },
        { type: 'heat_sink', name: 'Double Heat Sink' },
        { type: 'heat_sink', name: 'Double Heat Sink' },
        { type: 'heat_sink', name: 'Double Heat Sink' }
      ])

      const result = HeatRulesValidator.validateHeatManagement(config, equipment, {
        checkThermalEfficiency: true
      })

      expect(result.recommendations.some(r => r.includes('Excessive heat dissipation'))).toBe(true)
    })
  })

  describe('getValidationRules', () => {
    it('should return comprehensive heat validation rules', () => {
      const rules = HeatRulesValidator.getValidationRules()

      expect(rules.length).toBeGreaterThan(0)
      expect(rules.every(rule => rule.name && rule.description && rule.severity && rule.category)).toBe(true)
      expect(rules.some(rule => rule.name === 'Minimum Heat Sinks')).toBe(true)
      expect(rules.some(rule => rule.name === 'Heat Balance')).toBe(true)
      expect(rules.some(rule => rule.category === 'heat')).toBe(true)
      expect(rules.some(rule => rule.severity === 'critical')).toBe(true)
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle zero engine rating', () => {
      const config = createTestConfig({ engineRating: 0 })

      const engineHeatSinks = HeatRulesValidator.getEngineHeatSinks(config)

      expect(engineHeatSinks).toBe(0)
    })

    it('should handle equipment with no heat data', () => {
      const equipment = [{
        id: 'item-1',
        equipmentData: {
          type: 'equipment',
          name: 'CASE'
        }
      }]

      const heatGeneration = HeatRulesValidator.calculateHeatGeneration(equipment)

      expect(heatGeneration).toBe(0)
    })

    it('should handle empty equipment list', () => {
      const config = createTestConfig()

      const result = HeatRulesValidator.validateHeatManagement(config, [])

      expect(result.heatGeneration).toBe(0)
      expect(result.violations.filter(v => v === 'heat_overflow')).toHaveLength(0)
    })

    it('should handle undefined heat sink type', () => {
      const config = createTestConfig({ heatSinkType: undefined as any })

      const breakdown = HeatRulesValidator.calculateHeatSinkBreakdown(config, [])

      expect(breakdown.totalDissipation).toBeGreaterThanOrEqual(0)
    })

    it('should handle environmental heat conditions', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([])

      const profile = HeatRulesValidator.calculateThermalProfile(config, equipment, 5)

      expect(profile.environmentalHeat).toBe(5)
      expect(profile.totalOperationalHeat).toBe(6) // 1 walking + 5 environmental
    })
  })
})
