/**
 * Tests for TechLevelRulesValidator
 * 
 * Validates tech base compatibility, era restrictions, mixed tech validation, and availability ratings.
 */

import { TechLevelRulesValidator } from '../../../services/validation/TechLevelRulesValidator'
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
    techBase: 'Inner Sphere',
    ...overrides
  } as UnitConfiguration
}

// Helper function to create test equipment
function createTestEquipment(items: Array<{ 
  name?: string, 
  type?: string, 
  techBase?: string,
  tonnage?: number 
}> = []): any[] {
  return items.map((item, index) => ({
    id: `item-${index}`,
    equipmentData: {
      name: item.name || `Test Item ${index}`,
      type: item || 'weapon',
      techBase: item.techBase || 'Inner Sphere',
      tonnage: item.tonnage || 1
    }
  }))
}

describe('TechLevelRulesValidator', () => {
  describe('validateTechLevel', () => {
    it('should validate pure Inner Sphere unit', () => {
      const config = createTestConfig({ techBase: 'Inner Sphere' })
      const equipment = createTestEquipment([
        { name: 'Medium Laser', techBase: 'Inner Sphere' },
        { name: 'AC/10', techBase: 'Inner Sphere' }
      ])

      const result = TechLevelRulesValidator.validateTechLevel(config, equipment)

      expect(result.isValid).toBe(true)
      expect(result.unitTechBase).toBe('Inner Sphere')
      expect(result.unitTechLevel).toBe('Standard')
      expect(result.mixedTech.isMixed).toBe(false)
      expect(result.violations).toHaveLength(0)
    })

    it('should validate pure Clan unit', () => {
      const config = createTestConfig({ 
        techBase: 'Clan',
        structureType: 'Endo Steel',
        armorType: 'Ferro-Fibrous'
      })
      const equipment = createTestEquipment([
        { name: 'ER Medium Laser', techBase: 'Clan' },
        { name: 'Ultra AC/10', techBase: 'Clan' }
      ])

      const result = TechLevelRulesValidator.validateTechLevel(config, equipment)

      expect(result.isValid).toBe(true)
      expect(result.unitTechBase).toBe('Clan')
      expect(result.unitTechLevel).toBe('Advanced')
      expect(result.mixedTech.isMixed).toBe(false)
      expect(result.violations).toHaveLength(0)
    })

    it('should detect mixed tech violations', () => {
      const config = createTestConfig({ techBase: 'Inner Sphere' })
      const equipment = createTestEquipment([
        { name: 'Medium Laser', techBase: 'Inner Sphere' },
        { name: 'ER Large Laser', techBase: 'Clan' }
      ])

      const result = TechLevelRulesValidator.validateTechLevel(config, equipment)

      expect(result.isValid).toBe(false)
      expect(result.mixedTech.isMixed).toBe(true)
      expect(result.mixedTech.allowedMixed).toBe(false)
      expect(result.violations.some(v => v === 'mixed_tech_violation')).toBe(true)
      expect(result.violations.some(v => v === 'tech_base_mismatch')).toBe(true)
    })

    it('should allow mixed tech when enabled', () => {
      const config = createTestConfig({ techBase: 'Inner Sphere' as any }) // Allow mixed tech via context
      const equipment = createTestEquipment([
        { name: 'Medium Laser', techBase: 'Inner Sphere' },
        { name: 'ER Large Laser', techBase: 'Clan' }
      ])

      const result = TechLevelRulesValidator.validateTechLevel(config, equipment, {
        allowMixedTech: true
      })

      expect(result.isValid).toBe(true)
      expect(result.mixedTech.isMixed).toBe(true)
      expect(result.mixedTech.allowedMixed).toBe(true)
      expect(result.violations.filter(v => v === 'mixed_tech_violation')).toHaveLength(0)
    })

    it('should validate availability ratings', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([
        { name: 'Medium Laser' }, // Common
        { name: 'Double Heat Sink' }, // Rare
        { name: 'Endo Steel' } // Rare
      ])

      const result = TechLevelRulesValidator.validateTechLevel(config, equipment, {
        targetAvailabilityRating: 'C'
      })

      expect(result.availability.violations.length).toBeGreaterThan(0)
      expect(result.availability.overallRating).toBe('D') // Worst rating
      expect(result.availability.componentRatings.length).toBeGreaterThan(0)
    })
  })

  describe('validateMixedTech', () => {
    it('should detect mixed tech configuration', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([
        { name: 'AC/10', techBase: 'Inner Sphere' },
        { name: 'ER Large Laser', techBase: 'Clan' }
      ])

      const result = TechLevelRulesValidator.validateMixedTech(config, equipment, {
        strictEraCompliance: false,
        allowMixedTech: false,
        targetAvailabilityRating: 'D',
        validateTechProgression: true,
        enforceCanonicalRestrictions: false
      })

      expect(result.isMixed).toBe(true)
      expect(result.innerSphereComponents).toBeGreaterThan(0)
      expect(result.clanComponents).toBeGreaterThan(0)
      expect(result.allowedMixed).toBe(false)
      expect(result.violations.length).toBeGreaterThan(0)
    })

    it('should calculate mixed tech rules correctly', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([
        { name: 'Medium Laser', techBase: 'Inner Sphere' },
        { name: 'ER Large Laser', techBase: 'Clan' }
      ])

      const result = TechLevelRulesValidator.validateMixedTech(config, equipment, {
        strictEraCompliance: false,
        allowMixedTech: true,
        targetAvailabilityRating: 'D',
        validateTechProgression: true,
        enforceCanonicalRestrictions: false
      })

      expect(result.mixedTechRules.requiresSpecialPilot).toBe(true)
      expect(result.mixedTechRules.battleValueModifier).toBe(1.25)
      expect(result.mixedTechRules.allowMixedTech).toBe(true)
      expect(result.mixedTechRules.restrictedCombinations.length).toBeGreaterThan(0)
    })

    it('should detect restricted combinations', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([
        { name: 'Clan ER Large Laser', techBase: 'Clan', type: 'weapon' },
        { name: 'Targeting Computer', techBase: 'Inner Sphere', type: 'equipment' }
      ])

      const result = TechLevelRulesValidator.validateMixedTech(config, equipment, {
        strictEraCompliance: false,
        allowMixedTech: true,
        targetAvailabilityRating: 'D',
        validateTechProgression: true,
        enforceCanonicalRestrictions: true
      })

      expect(result.violations.some(v => v.includes('targeting computer'))).toBe(true)
    })
  })

  describe('validateEraRestrictions', () => {
    it('should allow era-appropriate components', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([
        { name: 'Medium Laser' },
        { name: 'AC/10' }
      ])

      const result = TechLevelRulesValidator.validateEraRestrictions(config, equipment, 'Succession Wars', {
        strictEraCompliance: true,
        allowMixedTech: false,
        targetAvailabilityRating: 'D',
        validateTechProgression: true,
        enforceCanonicalRestrictions: false
      })

      expect(result.isValid).toBe(true)
      expect(result.era).toBe('Succession Wars')
      expect(result.invalidComponents).toHaveLength(0)
    })

    it('should detect era violations', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([
        { name: 'Double Heat Sink' }, // Star League era
        { name: 'Endo Steel' } // Star League era
      ])

      const result = TechLevelRulesValidator.validateEraRestrictions(config, equipment, 'Succession Wars', {
        strictEraCompliance: true,
        allowMixedTech: false,
        targetAvailabilityRating: 'D',
        validateTechProgression: true,
        enforceCanonicalRestrictions: false
      })

      expect(result.isValid).toBe(false)
      expect(result.invalidComponents.length).toBeGreaterThan(0)
      expect(result.invalidComponents.some(c => c.component.includes('Double Heat Sink'))).toBe(true)
    })

    it('should provide era progression information', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([])

      const result = TechLevelRulesValidator.validateEraRestrictions(config, equipment, 'Clan Invasion', {
        strictEraCompliance: false,
        allowMixedTech: false,
        targetAvailabilityRating: 'D',
        validateTechProgression: true,
        enforceCanonicalRestrictions: false
      })

      expect(result.eraProgression.availableEras.length).toBeGreaterThan(0)
      expect(result.eraProgression.eraTimeline.length).toBeGreaterThan(0)
      expect(result.eraProgression.technologyIntroductions.length).toBeGreaterThan(0)
      expect(result.eraProgression.availableEras).toContain('Succession Wars')
      expect(result.eraProgression.availableEras).toContain('Clan Invasion')
    })

    it('should determine era violation severity', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([
        { name: 'ER Large Laser', techBase: 'Clan' } // Clan Invasion era
      ])

      const result = TechLevelRulesValidator.validateEraRestrictions(config, equipment, 'Succession Wars', {
        strictEraCompliance: true,
        allowMixedTech: false,
        targetAvailabilityRating: 'D',
        validateTechProgression: true,
        enforceCanonicalRestrictions: false
      })

      expect(result.invalidComponents.length).toBeGreaterThan(0)
      const violation = result.invalidComponents[0]
      expect(['critical', 'major', 'minor']).toContain(violation.severity)
    })
  })

  describe('validateAvailabilityRating', () => {
    it('should calculate component availability ratings', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([
        { name: 'Medium Laser' }, // Should be common
        { name: 'Double Heat Sink' }, // Should be rare
        { name: 'Standard Structure' } // Should be very common
      ])

      const result = TechLevelRulesValidator.validateAvailabilityRating(equipment, config, {
        strictEraCompliance: false,
        allowMixedTech: false,
        targetAvailabilityRating: 'C',
        validateTechProgression: true,
        enforceCanonicalRestrictions: false
      })

      expect(result.componentRatings.length).toBeGreaterThan(0)
      
      const doubleHeatSink = result.componentRatings.find(r => r.component.includes('Double Heat Sink'))
      expect(doubleHeatSink?.rating).toBe('D') // Should be rare
      
      const standardStructure = result.componentRatings.find(r => r.component.includes('Standard Structure'))
      expect(standardStructure?.rating).toBe('A') // Should be very common
    })

    it('should validate Clan component rarity', () => {
      const config = createTestConfig({ techBase: 'Clan' })
      const equipment = createTestEquipment([
        { name: 'ER Large Laser', techBase: 'Clan' }
      ])

      const result = TechLevelRulesValidator.validateAvailabilityRating(equipment, config, {
        strictEraCompliance: false,
        allowMixedTech: false,
        targetAvailabilityRating: 'D',
        validateTechProgression: true,
        enforceCanonicalRestrictions: false
      })

      const clanWeapon = result.componentRatings.find(r => r.component.includes('ER Large Laser'))
      expect(clanWeapon?.rating).toBe('E') // Clan components should be very rare
      expect(clanWeapon?.techBase).toBe('Clan')
    })

    it('should calculate availability breakdown', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([
        { name: 'Medium Laser' },
        { name: 'Double Heat Sink' },
        { name: 'Endo Steel' }
      ])

      const result = TechLevelRulesValidator.validateAvailabilityRating(equipment, config, {
        strictEraCompliance: false,
        allowMixedTech: false,
        targetAvailabilityRating: 'C',
        validateTechProgression: true,
        enforceCanonicalRestrictions: false
      })

      expect(result.ratingBreakdown.totalComponents).toBeGreaterThan(0)
      expect(result.ratingBreakdown.ratingDistribution).toBeDefined()
      expect(result.ratingBreakdown.averageRating).toBeGreaterThan(0)
      expect(result.ratingBreakdown.improvementSuggestions.length).toBeGreaterThan(0)
    })

    it('should detect availability violations', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([
        { name: 'Double Heat Sink' }, // Rare
        { name: 'Endo Steel' } // Rare
      ])

      const result = TechLevelRulesValidator.validateAvailabilityRating(equipment, config, {
        strictEraCompliance: false,
        allowMixedTech: false,
        targetAvailabilityRating: 'B', // Strict target
        validateTechProgression: true,
        enforceCanonicalRestrictions: false
      })

      expect(result.violations.length).toBeGreaterThan(0)
      expect(result.violations.every(v => v.severity === 'major' || v.severity === 'minor')).toBe(true)
    })
  })

  describe('validateTechBaseCompliance', () => {
    it('should validate compatible tech bases', () => {
      const config = createTestConfig({ techBase: 'Inner Sphere' })
      const equipment = createTestEquipment([
        { name: 'Medium Laser', techBase: 'Inner Sphere' },
        { name: 'AC/10', techBase: 'Inner Sphere' }
      ])

      const result = TechLevelRulesValidator.validateTechBaseCompliance(config, equipment, {
        strictEraCompliance: false,
        allowMixedTech: false,
        targetAvailabilityRating: 'D',
        validateTechProgression: true,
        enforceCanonicalRestrictions: false
      })

      expect(result.isValid).toBe(true)
      expect(result.unitTechBase).toBe('Inner Sphere')
      expect(result.conflicts).toHaveLength(0)
      expect(result.complianceScore).toBe(100)
    })

    it('should detect tech base conflicts', () => {
      const config = createTestConfig({ techBase: 'Inner Sphere' })
      const equipment = createTestEquipment([
        { name: 'ER Large Laser', techBase: 'Clan' }
      ])

      const result = TechLevelRulesValidator.validateTechBaseCompliance(config, equipment, {
        strictEraCompliance: false,
        allowMixedTech: false,
        targetAvailabilityRating: 'D',
        validateTechProgression: true,
        enforceCanonicalRestrictions: false
      })

      expect(result.isValid).toBe(false)
      expect(result.conflicts.length).toBeGreaterThan(0)
      expect(result.complianceScore).toBeLessThan(100)
      
      const conflict = result.conflicts[0]
      expect(conflict.unitTechBase).toBe('Inner Sphere')
      expect(conflict.componentTechBase).toBe('Clan')
      expect(['incompatible', 'restricted', 'requires_mixed']).toContain(conflict.conflictType)
    })

    it('should provide conflict resolutions', () => {
      const config = createTestConfig({ techBase: 'Inner Sphere' })
      const equipment = createTestEquipment([
        { name: 'ER Large Laser', techBase: 'Clan' }
      ])

      const result = TechLevelRulesValidator.validateTechBaseCompliance(config, equipment, {
        strictEraCompliance: false,
        allowMixedTech: false,
        targetAvailabilityRating: 'D',
        validateTechProgression: true,
        enforceCanonicalRestrictions: false
      })

      const conflict = result.conflicts[0]
      expect(conflict.resolution).toBeTruthy()
      expect(conflict.resolution).toContain('Inner Sphere equivalent')
      expect(['critical', 'major', 'minor']).toContain(conflict.severity)
    })
  })

  describe('generateTechOptimizations', () => {
    it('should generate tech base recommendations', () => {
      const config = createTestConfig({ techBase: 'Inner Sphere' })
      const equipment = createTestEquipment([
        { name: 'ER Large Laser', techBase: 'Clan' }
      ])

      const optimizations = TechLevelRulesValidator.generateTechOptimizations(config, equipment)

      expect(optimizations.recommendations.length).toBeGreaterThan(0)
      expect(optimizations.alternativeTechBases.length).toBeGreaterThan(0)
      expect(optimizations.upgradePaths.length).toBeGreaterThan(0)
      expect(optimizations.costAnalysis).toBeDefined()
    })

    it('should suggest mixed tech optimization', () => {
      const config = createTestConfig({ techBase: 'Inner Sphere' })
      const equipment = createTestEquipment([
        { name: 'Medium Laser', techBase: 'Inner Sphere' },
        { name: 'ER Large Laser', techBase: 'Clan' }
      ])

      const optimizations = TechLevelRulesValidator.generateTechOptimizations(config, equipment)

      const mixedTechRec = optimizations.recommendations.find(r => r === 'tech_base_change')
      expect(mixedTechRec).toBeDefined()
      expect(mixedTechRec?.priority).toBe('high')
      expect(mixedTechRec?.impact.ruleCompliance).toBeGreaterThan(0)
    })

    it('should generate alternative tech bases', () => {
      const config = createTestConfig({ techBase: 'Inner Sphere' })
      const equipment = createTestEquipment([
        { name: 'ER Large Laser', techBase: 'Clan' }
      ])

      const optimizations = TechLevelRulesValidator.generateTechOptimizations(config, equipment)

      const clanAlternative = optimizations.alternativeTechBases.find(alt => alt.techBase === 'Clan')
      expect(clanAlternative).toBeDefined()
      expect(clanAlternative?.advantages.length).toBeGreaterThan(0)
      expect(clanAlternative?.disadvantages.length).toBeGreaterThan(0)
      expect(clanAlternative?.overallRating).toBeGreaterThan(0)
    })

    it('should provide cost analysis', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([
        { name: 'Double Heat Sink' }
      ])

      const optimizations = TechLevelRulesValidator.generateTechOptimizations(config, equipment)

      expect(optimizations.costAnalysis.baselineCost).toBeGreaterThan(0)
      expect(optimizations.costAnalysis.optimizedCost).toBeGreaterThan(0)
      expect(optimizations.costAnalysis.savings).toBeGreaterThan(0)
      expect(optimizations.costAnalysis.costBreakdown).toBeDefined()
      expect(optimizations.costAnalysis.returnOnInvestment).toBeGreaterThan(0)
    })
  })

  describe('calculateTechEfficiency', () => {
    it('should calculate high efficiency for compatible tech', () => {
      const config = createTestConfig({ techBase: 'Inner Sphere' })
      const equipment = createTestEquipment([
        { name: 'Medium Laser', techBase: 'Inner Sphere' },
        { name: 'AC/10', techBase: 'Inner Sphere' }
      ])

      const efficiency = TechLevelRulesValidator.calculateTechEfficiency(config, equipment)

      expect(efficiency).toBeGreaterThan(80)
      expect(efficiency).toBeLessThanOrEqual(100)
    })

    it('should penalize tech base violations', () => {
      const config = createTestConfig({ techBase: 'Inner Sphere' })
      const equipment = createTestEquipment([
        { name: 'ER Large Laser', techBase: 'Clan' }
      ])

      const efficiency = TechLevelRulesValidator.calculateTechEfficiency(config, equipment)

      expect(efficiency).toBeLessThan(90) // Should be penalized for violations
    })

    it('should reward good availability', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([
        { name: 'Standard Structure' } // Very common
      ])

      const efficiency = TechLevelRulesValidator.calculateTechEfficiency(config, equipment)

      expect(efficiency).toBeGreaterThan(90) // Should get bonus for good availability
    })

    it('should bonus for tech base consistency', () => {
      const config = createTestConfig({ techBase: 'Inner Sphere' })
      const equipment = createTestEquipment([
        { name: 'Medium Laser', techBase: 'Inner Sphere' }
      ])

      const consistentEfficiency = TechLevelRulesValidator.calculateTechEfficiency(config, equipment)

      const mixedConfig = createTestConfig({ techBase: 'Inner Sphere' })
      const mixedEquipment = createTestEquipment([
        { name: 'Medium Laser', techBase: 'Inner Sphere' },
        { name: 'ER Large Laser', techBase: 'Clan' }
      ])

      const mixedEfficiency = TechLevelRulesValidator.calculateTechEfficiency(mixedConfig, mixedEquipment)

      expect(consistentEfficiency).toBeGreaterThan(mixedEfficiency)
    })
  })

  describe('helper methods', () => {
    it('should determine unit tech level correctly', () => {
      const basicConfig = createTestConfig()
      const basicEquipment = createTestEquipment([
        { name: 'Medium Laser' }
      ])

      const basicValidation = TechLevelRulesValidator.validateTechLevel(basicConfig, basicEquipment)
      expect(basicValidation.unitTechLevel).toBe('Standard')

      const advancedEquipment = createTestEquipment([
        { name: 'ER Large Laser', techBase: 'Clan' }
      ])

      const advancedValidation = TechLevelRulesValidator.validateTechLevel(basicConfig, advancedEquipment)
      expect(advancedValidation.unitTechLevel).toBe('Advanced')
    })

    it('should handle era timeline correctly', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([])

      const validation = TechLevelRulesValidator.validateTechLevel(config, equipment)

      expect(validation.eraRestrictions.eraProgression.eraTimeline.length).toBeGreaterThan(0)
      expect(validation.eraRestrictions.eraProgression.eraTimeline.some(e => e.era === 'Succession Wars')).toBe(true)
      expect(validation.eraRestrictions.eraProgression.eraTimeline.some(e => e.era === 'Clan Invasion')).toBe(true)
    })

    it('should provide comprehensive validation rules', () => {
      const rules = TechLevelRulesValidator.getValidationRules()

      expect(rules.length).toBeGreaterThan(0)
      expect(rules.every(rule => rule.name && rule.description && rule.severity && rule.category)).toBe(true)
      expect(rules.some(rule => rule.name === 'Tech Base Compatibility')).toBe(true)
      expect(rules.some(rule => rule.name === 'Era Restrictions')).toBe(true)
      expect(rules.some(rule => rule.name === 'Mixed Tech Rules')).toBe(true)
      expect(rules.some(rule => rule.name === 'Availability Rating')).toBe(true)
      expect(rules.some(rule => rule.category === 'tech_level')).toBe(true)
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle empty equipment list', () => {
      const config = createTestConfig()
      const equipment: any[] = []

      const result = TechLevelRulesValidator.validateTechLevel(config, equipment)

      expect(result.isValid).toBe(true)
      expect(result.mixedTech.isMixed).toBe(false)
      expect(result.availability.componentRatings.length).toBeGreaterThan(0) // System components
    })

    it('should handle undefined tech base', () => {
      const config = createTestConfig({ techBase: undefined as any })
      const equipment = createTestEquipment([
        { name: 'Medium Laser', techBase: undefined }
      ])

      const result = TechLevelRulesValidator.validateTechLevel(config, equipment)

      expect(result.unitTechBase).toBe('Inner Sphere') // Default fallback
      expect(result.isValid).toBe(true) // Should handle gracefully
    })

    it('should handle unknown era', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([])

      const result = TechLevelRulesValidator.validateEraRestrictions(config, equipment, 'Unknown Era', {
        strictEraCompliance: true,
        allowMixedTech: false,
        targetAvailabilityRating: 'D',
        validateTechProgression: true,
        enforceCanonicalRestrictions: false
      })

      expect(result.era).toBe('Unknown Era')
      expect(result.isValid).toBe(true) // Should default to valid for unknown eras
    })

    it('should handle invalid availability ratings', () => {
      const config = createTestConfig()
      const equipment = createTestEquipment([
        { name: 'Test Component' }
      ])

      const result = TechLevelRulesValidator.validateAvailabilityRating(equipment, config, {
        strictEraCompliance: false,
        allowMixedTech: false,
        targetAvailabilityRating: 'Z' as any, // Invalid rating
        validateTechProgression: true,
        enforceCanonicalRestrictions: false
      })

      expect(result.componentRatings.length).toBeGreaterThan(0)
      expect(result.violations.length).toBe(0) // Should handle invalid target gracefully
    })

    it('should handle conflicting context settings', () => {
      const config = createTestConfig({ techBase: 'Inner Sphere' })
      const equipment = createTestEquipment([
        { name: 'ER Large Laser', techBase: 'Clan' }
      ])

      const result = TechLevelRulesValidator.validateTechLevel(config, equipment, {
        allowMixedTech: true,
        enforceCanonicalRestrictions: true,
        strictEraCompliance: false,
        targetAvailabilityRating: 'A',
        validateTechProgression: false
      })

      // Should handle conflicting settings (allow mixed tech but enforce restrictions)
      expect(result.mixedTech.allowedMixed).toBe(true)
      expect(result.mixedTech.violations.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle components with no tech base', () => {
      const config = createTestConfig()
      const equipment = [
        {
          id: 'item-1',
          equipmentData: {
            name: 'Mystery Component',
            type: 'equipment'
            // No techBase specified
          }
        }
      ]

      const result = TechLevelRulesValidator.validateTechLevel(config, equipment)

      expect(result.isValid).toBe(true) // Should handle gracefully with defaults
      expect(result.techBaseCompliance.componentTechBases.length).toBeGreaterThan(0)
      expect(result.techBaseCompliance.componentTechBases.some(c => c.techBase === 'Inner Sphere')).toBe(true) // Should default to Inner Sphere
    })
  })
})
