/**
 * EngineValidationService Test Suite
 * 
 * Comprehensive test coverage for EngineValidationService extracted from UnitValidationService
 * Tests engine rating, movement, tech compatibility, and performance validation
 * 
 * @see EngineValidationService for implementation details
 */

import { EngineValidationService } from '../../../utils/editor/EngineValidationService'
import { EditableUnit } from '../../../types/editor'

describe('EngineValidationService', () => {
  // Test data setup
  const createMockUnit = (overrides: Partial<EditableUnit> = {}): EditableUnit => ({
    chassis: 'Test Mech',
    model: 'TST-1',
    mass: 50,
    tech_base: 'Inner Sphere',
    systemComponents: {
      engine: {
        type: 'Standard',
        rating: 200
      },
      gyro: { type: 'Standard' },
      cockpit: { type: 'Standard' },
      structure: { type: 'Standard' },
      armor: { type: 'Standard' },
      heatSinks: {
        type: 'Single',
        total: 10,
        engineIntegrated: 8,
        externalRequired: 2
      }
    },
    armorAllocation: {},
    equipmentPlacements: [],
    criticalSlots: [],
    fluffData: {},
    selectedQuirks: [],
    validationState: { isValid: true, errors: [], warnings: [] },
    editorMetadata: {
      lastModified: new Date(),
      isDirty: false,
      version: '1.0.0'
    },
    ...overrides
  } as EditableUnit)

  describe('core functionality', () => {
    it('should validate a properly configured engine', () => {
      const unit = createMockUnit()
      const result = EngineValidationService.validateEngine(unit)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.engineRating).toBe(200)
      expect(result.walkMP).toBe(4) // 200 / 50 = 4
      expect(result.runMP).toBe(6) // 4 * 1.5 = 6
    })

    it('should return default values when engine is missing', () => {
      const unit = createMockUnit({ systemComponents: undefined })
      const result = EngineValidationService.validateEngine(unit)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].id).toBe('missing-engine')
      expect(result.engineRating).toBe(0)
      expect(result.walkMP).toBe(0)
      expect(result.runMP).toBe(0)
    })

    it('should calculate movement points correctly for various configurations', () => {
      // Light mech with high rating
      const lightUnit = createMockUnit({
        mass: 25,
        systemComponents: {
          ...createMockUnit().systemComponents!,
          engine: { type: 'Standard', rating: 175 }
        }
      })
      const lightResult = EngineValidationService.validateEngine(lightUnit)
      expect(lightResult.walkMP).toBe(7) // 175 / 25 = 7

      // Heavy mech with standard rating
      const heavyUnit = createMockUnit({
        mass: 75,
        systemComponents: {
          ...createMockUnit().systemComponents!,
          engine: { type: 'Standard', rating: 225 }
        }
      })
      const heavyResult = EngineValidationService.validateEngine(heavyUnit)
      expect(heavyResult.walkMP).toBe(3) // 225 / 75 = 3
    })

    it('should validate engine rating bounds correctly', () => {
      const context = { strictMode: false, checkTechCompatibility: true, validateMovementRanges: true }

      // Test minimum rating
      const minResult = EngineValidationService.validateEngineRating(5, context)
      expect(minResult.warnings).toContainEqual(
        expect.objectContaining({
          id: 'engine-rating-very-low',
          category: 'warning'
        })
      )

      // Test maximum rating
      const maxResult = EngineValidationService.validateEngineRating(450, context)
      expect(maxResult.errors).toContainEqual(
        expect.objectContaining({
          id: 'excessive-engine-rating',
          category: 'error'
        })
      )

      // Test valid rating
      const validResult = EngineValidationService.validateEngineRating(200, context)
      expect(validResult.errors).toHaveLength(0)
    })

    it('should validate movement capability correctly', () => {
      const context = { strictMode: false, checkTechCompatibility: true, validateMovementRanges: true }

      // Test insufficient movement
      const lowResult = EngineValidationService.validateMovementCapability(40, 50, context)
      expect(lowResult.errors).toContainEqual(
        expect.objectContaining({
          id: 'insufficient-engine-rating',
          category: 'error'
        })
      )

      // Test excessive movement
      const highResult = EngineValidationService.validateMovementCapability(450, 50, context)
      expect(highResult.warnings).toContainEqual(
        expect.objectContaining({
          id: 'very-high-movement',
          category: 'warning'
        })
      )

      // Test valid movement
      const validResult = EngineValidationService.validateMovementCapability(200, 50, context)
      expect(validResult.errors).toHaveLength(0)
    })
  })

  describe('engine type validation', () => {
    const context = { strictMode: false, checkTechCompatibility: true, validateMovementRanges: true }

    it('should accept valid engine types', () => {
      const validTypes = ['Standard', 'XL Engine', 'Light Engine', 'Compact Engine']
      
      validTypes.forEach(type => {
        const result = EngineValidationService.validateEngineType(type, 'Inner Sphere', context)
        expect(result.errors).toHaveLength(0)
      })
    })

    it('should reject invalid engine types', () => {
      const result = EngineValidationService.validateEngineType('Invalid Engine', 'Inner Sphere', context)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          id: 'invalid-engine-type',
          category: 'error'
        })
      )
    })

    it('should handle missing engine type', () => {
      const result = EngineValidationService.validateEngineType('', 'Inner Sphere', context)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          id: 'missing-engine-type',
          category: 'error'
        })
      )
    })

    it('should provide engine type specific warnings', () => {
      // XXL Engine warning
      const xxlResult = EngineValidationService.validateEngineType('XXL Engine', 'Inner Sphere', context)
      expect(xxlResult.warnings).toContainEqual(
        expect.objectContaining({
          id: 'fragile-engine-type',
          category: 'warning'
        })
      )

      // Compact Engine warning
      const compactResult = EngineValidationService.validateEngineType('Compact Engine', 'Inner Sphere', context)
      expect(compactResult.warnings).toContainEqual(
        expect.objectContaining({
          id: 'inefficient-engine-type',
          category: 'warning'
        })
      )
    })
  })

  describe('tech compatibility validation', () => {
    const context = { strictMode: false, checkTechCompatibility: true, validateMovementRanges: true }

    it('should detect tech base mismatches', () => {
      // Clan engine on IS chassis
      const isResult = EngineValidationService.validateEngineType('Clan XL Engine', 'Inner Sphere', context)
      expect(isResult.warnings).toContainEqual(
        expect.objectContaining({
          id: 'engine-tech-mismatch',
          category: 'warning'
        })
      )

      // IS engine on Clan chassis should suggest optimization
      const clanResult = EngineValidationService.validateEngineType('Light Engine', 'Clan', context)
      expect(clanResult.warnings).toContainEqual(
        expect.objectContaining({
          id: 'suboptimal-engine-choice',
          category: 'warning'
        })
      )
    })

    it('should enforce strict mode tech compatibility', () => {
      const strictContext = { ...context, strictMode: true }
      
      const result = EngineValidationService.validateEngineType('Clan XL Engine', 'Inner Sphere', strictContext)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          id: 'engine-tech-mismatch',
          category: 'error'
        })
      )
    })

    it('should allow compatible tech combinations', () => {
      // Standard engine should work with any tech base
      const isResult = EngineValidationService.validateEngineType('Standard', 'Inner Sphere', context)
      const clanResult = EngineValidationService.validateEngineType('Standard', 'Clan', context)
      
      expect(isResult.errors).toHaveLength(0)
      expect(clanResult.errors).toHaveLength(0)

      // Clan engine on Clan chassis should be fine
      const clanEngineResult = EngineValidationService.validateEngineType('Clan XL Engine', 'Clan', context)
      expect(clanEngineResult.errors).toHaveLength(0)
    })
  })

  describe('performance analysis', () => {
    it('should calculate engine performance metrics correctly', () => {
      const metrics = EngineValidationService.analyzeEnginePerformance(200, 50, 'Standard')
      
      expect(metrics.walkSpeed).toBe(4)
      expect(metrics.runSpeed).toBe(6)
      expect(metrics.heatEfficiency).toBe(1.0) // Standard engine
      expect(metrics.powerToWeightRatio).toBe(4) // 200 / 50
      expect(metrics.weightEfficiency).toBeGreaterThan(0)
    })

    it('should apply engine type modifiers to performance', () => {
      // XL Engine should have reduced heat efficiency
      const xlMetrics = EngineValidationService.analyzeEnginePerformance(200, 50, 'XL Engine')
      expect(xlMetrics.heatEfficiency).toBe(0.9)

      // XXL Engine should have even lower heat efficiency
      const xxlMetrics = EngineValidationService.analyzeEnginePerformance(200, 50, 'XXL Engine')
      expect(xxlMetrics.heatEfficiency).toBe(0.8)

      // Compact Engine should run cooler
      const compactMetrics = EngineValidationService.analyzeEnginePerformance(200, 50, 'Compact Engine')
      expect(compactMetrics.heatEfficiency).toBe(1.1)
    })

    it('should validate performance metrics and provide warnings', () => {
      const context = { strictMode: false, checkTechCompatibility: true, validateMovementRanges: true }

      // Poor weight efficiency
      const poorPerformance = {
        walkSpeed: 4, runSpeed: 6, jumpCapability: 0,
        heatEfficiency: 1.0, weightEfficiency: 3, powerToWeightRatio: 4
      }
      const poorResult = EngineValidationService.validatePerformanceMetrics(poorPerformance, context)
      expect(poorResult.warnings).toContainEqual(
        expect.objectContaining({
          id: 'poor-engine-weight-efficiency',
          category: 'warning'
        })
      )

      // Excellent power-to-weight ratio
      const excellentPerformance = {
        walkSpeed: 8, runSpeed: 12, jumpCapability: 0,
        heatEfficiency: 1.0, weightEfficiency: 10, powerToWeightRatio: 7
      }
      const excellentResult = EngineValidationService.validatePerformanceMetrics(excellentPerformance, context)
      expect(excellentResult.warnings).toContainEqual(
        expect.objectContaining({
          id: 'excellent-power-to-weight',
          category: 'warning'
        })
      )
    })
  })

  describe('engine weight calculations', () => {
    it('should calculate standard engine weight correctly', () => {
      const weight = EngineValidationService.calculateEngineWeight(200, 'Standard')
      expect(weight).toBe(8) // Math.ceil(200 / 25) = 8
    })

    it('should apply type-specific weight modifiers', () => {
      const baseWeight = 8 // For rating 200

      // XL Engine should be half weight
      const xlWeight = EngineValidationService.calculateEngineWeight(200, 'XL Engine')
      expect(xlWeight).toBe(baseWeight * 0.5)

      // Light Engine should be 75% weight
      const lightWeight = EngineValidationService.calculateEngineWeight(200, 'Light Engine')
      expect(lightWeight).toBe(baseWeight * 0.75)

      // Compact Engine should be 150% weight
      const compactWeight = EngineValidationService.calculateEngineWeight(200, 'Compact Engine')
      expect(compactWeight).toBe(baseWeight * 1.5)

      // XXL Engine should be 33% weight
      const xxlWeight = EngineValidationService.calculateEngineWeight(200, 'XXL Engine')
      expect(xxlWeight).toBe(baseWeight * 0.33)
    })
  })

  describe('optimization suggestions', () => {
    it('should provide engine optimization suggestions', () => {
      const unit = createMockUnit({
        tech_base: 'Inner Sphere',
        mass: 50,
        systemComponents: {
          ...createMockUnit().systemComponents!,
          engine: { type: 'Standard', rating: 200 }
        }
      })

      const suggestions = EngineValidationService.suggestEngineOptimizations(unit, 4)
      
      expect(suggestions).toHaveLength(3) // Standard, XL, Light for IS
      expect(suggestions[0]).toBe('Standard')
      expect(suggestions[1]).toBe('XL Engine')
      expect(suggestions[2]).toBe('Light Engine')

      suggestions.forEach(suggestion => {
        expect(suggestion.rating).toBe(200) // 50 tons * 4 MP
        expect(suggestion.benefits).toBeDefined()
        expect(suggestion.tradeoffs).toBeDefined()
      })
    })

    it('should provide appropriate suggestions for Clan tech', () => {
      const clanUnit = createMockUnit({
        tech_base: 'Clan',
        mass: 50,
        systemComponents: {
          ...createMockUnit().systemComponents!,
          engine: { type: 'Standard', rating: 200 }
        }
      })

      const suggestions = EngineValidationService.suggestEngineOptimizations(clanUnit, 4)
      
      expect(suggestions).toHaveLength(2) // Standard, Clan XL (no Light for Clan)
      expect(suggestions[1]).toBe('Clan XL Engine')
    })

    it('should return empty array for invalid unit configurations', () => {
      const invalidUnit = createMockUnit({ systemComponents: undefined })
      const suggestions = EngineValidationService.suggestEngineOptimizations(invalidUnit)
      
      expect(suggestions).toHaveLength(0)
    })
  })

  describe('optimal rating calculations', () => {
    it('should calculate optimal engine rating ranges', () => {
      const range = EngineValidationService.getOptimalEngineRatingRange(50)
      
      expect(range.min).toBe(50) // 50 tons * 1 MP minimum
      expect(range.recommended).toBe(200) // 50 tons * 4 MP recommended
      expect(range.max).toBe(300) // 50 tons * 6 MP practical maximum
    })

    it('should respect engine rating bounds', () => {
      // Very light unit
      const lightRange = EngineValidationService.getOptimalEngineRatingRange(20)
      expect(lightRange.min).toBe(20) // Should be above minimum engine rating (10)
      
      // Very heavy unit
      const heavyRange = EngineValidationService.getOptimalEngineRatingRange(100)
      expect(heavyRange.max).toBe(400) // Should not exceed maximum (400)
      expect(heavyRange.recommended).toBe(400) // Capped at maximum
    })
  })

  describe('integration validation', () => {
    it('should validate engine integration with unit configuration', () => {
      const unit = createMockUnit()
      const result = EngineValidationService.validateEngineIntegration(unit)
      
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should handle missing engine in integration', () => {
      const unit = createMockUnit({ systemComponents: undefined })
      const result = EngineValidationService.validateEngineIntegration(unit)
      
      expect(result.errors).toHaveLength(0) // Should gracefully handle missing engine
      expect(result.warnings).toHaveLength(0)
    })

    it('should delegate to engine validation correctly', () => {
      const unit = createMockUnit({
        systemComponents: {
          ...createMockUnit().systemComponents!,
          engine: { type: 'Standard', rating: 450 } // Over maximum
        }
      })
      
      const result = EngineValidationService.validateEngineIntegration(unit)
      expect(result.errors.length).toBeGreaterThan(0) // Should include engine validation errors
    })
  })

  describe('validation rules metadata', () => {
    it('should provide validation rules for UI display', () => {
      const rules = EngineValidationService.getEngineValidationRules()
      
      expect(rules).toHaveLength(3) // Engine Rating, Movement Capability, Tech Compatibility
      expect(rules[0].category).toBe('Engine Rating')
      expect(rules[1].category).toBe('Movement Capability')
      expect(rules[2].category).toBe('Tech Compatibility')

      rules.forEach(category => {
        expect(category.rules.length).toBeGreaterThan(0)
        category.rules.forEach(rule => {
          expect(rule.name).toBeDefined()
          expect(rule.description).toBeDefined()
          expect(rule.severity).toMatch(/^(error|warning|info)$/)
        })
      })
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle zero and negative engine ratings', () => {
      const context = { strictMode: false, checkTechCompatibility: true, validateMovementRanges: true }
      
      const zeroResult = EngineValidationService.validateEngineRating(0, context)
      expect(zeroResult.errors).toContainEqual(
        expect.objectContaining({
          id: 'invalid-engine-rating',
          category: 'error'
        })
      )

      const negativeResult = EngineValidationService.validateEngineRating(-50, context)
      expect(negativeResult.errors).toContainEqual(
        expect.objectContaining({
          id: 'invalid-engine-rating',
          category: 'error'
        })
      )
    })

    it('should handle zero and negative unit mass', () => {
      const context = { strictMode: false, checkTechCompatibility: true, validateMovementRanges: true }
      
      const zeroResult = EngineValidationService.validateMovementCapability(200, 0, context)
      expect(zeroResult.errors).toContainEqual(
        expect.objectContaining({
          id: 'invalid-unit-mass-for-movement',
          category: 'error'
        })
      )

      const negativeResult = EngineValidationService.validateMovementCapability(200, -25, context)
      expect(negativeResult.errors).toContainEqual(
        expect.objectContaining({
          id: 'invalid-unit-mass-for-movement',
          category: 'error'
        })
      )
    })

    it('should handle standard rating increments validation', () => {
      const context = { strictMode: false, checkTechCompatibility: true, validateMovementRanges: true }

      // Non-standard low rating
      const lowResult = EngineValidationService.validateEngineRating(73, context)
      expect(lowResult.warnings).toContainEqual(
        expect.objectContaining({
          id: 'non-standard-engine-rating',
          category: 'warning'
        })
      )

      // Non-standard high rating
      const highResult = EngineValidationService.validateEngineRating(137, context)
      expect(highResult.warnings).toContainEqual(
        expect.objectContaining({
          id: 'non-standard-high-engine-rating',
          category: 'warning'
        })
      )
    })

    it('should handle context variations correctly', () => {
      // Test with disabled movement range validation
      const noMovementContext = { strictMode: false, checkTechCompatibility: true, validateMovementRanges: false }
      const result = EngineValidationService.validateMovementCapability(450, 50, noMovementContext)
      expect(result.warnings).toHaveLength(0) // Should not warn about excessive movement

      // Test with disabled tech compatibility
      const noTechContext = { strictMode: false, checkTechCompatibility: false, validateMovementRanges: true }
      const techResult = EngineValidationService.validateEngineType('Clan XL Engine', 'Inner Sphere', noTechContext)
      expect(techResult.warnings).toHaveLength(0) // Should not warn about tech mismatch
    })
  })

  describe('BattleTech rule compliance', () => {
    it('should enforce minimum walk MP requirement', () => {
      const unit = createMockUnit({
        mass: 100,
        systemComponents: {
          ...createMockUnit().systemComponents!,
          engine: { type: 'Standard', rating: 50 } // Only 0.5 walk MP
        }
      })
      
      const result = EngineValidationService.validateEngine(unit)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          id: 'insufficient-engine-rating',
          category: 'error'
        })
      )
    })

    it('should enforce maximum engine rating of 400', () => {
      const unit = createMockUnit({
        systemComponents: {
          ...createMockUnit().systemComponents!,
          engine: { type: 'Standard', rating: 450 }
        }
      })
      
      const result = EngineValidationService.validateEngine(unit)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          id: 'excessive-engine-rating',
          category: 'error'
        })
      )
    })

    it('should warn about impractical movement values', () => {
      const unit = createMockUnit({
        mass: 20,
        systemComponents: {
          ...createMockUnit().systemComponents!,
          engine: { type: 'Standard', rating: 200 } // 10 walk MP
        }
      })
      
      const result = EngineValidationService.validateEngine(unit)
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          id: 'very-high-movement',
          category: 'warning'
        })
      )
    })

    it('should provide mobility feedback', () => {
      // Minimal movement
      const slowUnit = createMockUnit({
        mass: 100,
        systemComponents: {
          ...createMockUnit().systemComponents!,
          engine: { type: 'Standard', rating: 100 } // 1 walk MP
        }
      })
      
      const slowResult = EngineValidationService.validateEngine(slowUnit)
      expect(slowResult.warnings).toContainEqual(
        expect.objectContaining({
          id: 'minimal-movement',
          category: 'warning'
        })
      )

      // High movement
      const fastUnit = createMockUnit({
        mass: 25,
        systemComponents: {
          ...createMockUnit().systemComponents!,
          engine: { type: 'Standard', rating: 150 } // 6 walk MP
        }
      })
      
      const fastResult = EngineValidationService.validateEngine(fastUnit)
      expect(fastResult.warnings).toContainEqual(
        expect.objectContaining({
          id: 'high-movement-capability',
          category: 'warning'
        })
      )
    })
  })

  describe('performance and efficiency', () => {
    it('should complete validation within reasonable time', () => {
      const unit = createMockUnit()
      const startTime = Date.now()
      
      // Run validation multiple times
      for (let i = 0; i < 100; i++) {
        EngineValidationService.validateEngine(unit)
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(1000) // Should complete 100 validations in under 1 second
    })

    it('should handle large datasets efficiently', () => {
      const units = Array.from({ length: 50 }, (_, i) => 
        createMockUnit({
          mass: 25 + i,
          systemComponents: {
            ...createMockUnit().systemComponents!,
            engine: { type: 'Standard', rating: 100 + i * 5 }
          }
        })
      )
      
      const startTime = Date.now()
      
      units.forEach(unit => {
        EngineValidationService.validateEngine(unit)
      })
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(500) // Should handle 50 units quickly
    })

    it('should not create memory leaks', () => {
      const initialMemory = process.memoryUsage().heapUsed
      
      // Run many validations
      for (let i = 0; i < 1000; i++) {
        const unit = createMockUnit({
          systemComponents: {
            ...createMockUnit().systemComponents!,
            engine: { type: 'Standard', rating: 100 + (i % 300) }
          }
        })
        EngineValidationService.validateEngine(unit)
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory
      
      // Memory should not increase significantly (allowing for some variance)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024) // Less than 10MB increase
    })
  })
})
