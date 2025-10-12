/**
 * StructureValidationService Test Suite
 * 
 * Comprehensive test coverage for StructureValidationService extracted from UnitValidationService
 * Tests armor allocation, structure integrity, distribution optimization, and BattleTech construction rules
 * 
 * @see StructureValidationService for implementation details
 */

import { StructureValidationService } from '../../../utils/editor/StructureValidationService'
import { EditableUnit } from '../../../types/editor'

describe('StructureValidationService', () => {
  // Test data setup
  const createMockUnit = (overrides: any = {}): any => ({
    chassis: 'Test Mech',
    model: 'TST-1',
    mass: 50,
    tech_base: 'Inner Sphere',
    data: {
      chassis: 'Test Mech',
      model: 'TST-1',
      armor: {
        type: 'Standard',
        locations: [
          { location: 'Head', armor_points: 9, rear_armor_points: 0 },
          { location: 'Center Torso', armor_points: 30, rear_armor_points: 10 },
          { location: 'Left Torso', armor_points: 20, rear_armor_points: 8 },
          { location: 'Right Torso', armor_points: 20, rear_armor_points: 8 },
          { location: 'Left Arm', armor_points: 16, rear_armor_points: 0 },
          { location: 'Right Arm', armor_points: 16, rear_armor_points: 0 },
          { location: 'Left Leg', armor_points: 20, rear_armor_points: 0 },
          { location: 'Right Leg', armor_points: 20, rear_armor_points: 0 }
        ]
      }
    },
    systemComponents: {
      structure: {
        type: 'Standard'
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
  })

  describe('core functionality', () => {
    it('should validate a properly configured armor layout', () => {
      const unit = createMockUnit({
        data: {
          chassis: 'Test Mech',
          model: 'TST-1',
          armor: {
            type: 'Standard',
            locations: [
              { location: 'Head', armor_points: 9, rear_armor_points: 0 },
              { location: 'Center Torso', armor_points: 18, rear_armor_points: 4 },
              { location: 'Left Torso', armor_points: 12, rear_armor_points: 3 },
              { location: 'Right Torso', armor_points: 12, rear_armor_points: 3 },
              { location: 'Left Arm', armor_points: 8, rear_armor_points: 0 },
              { location: 'Right Arm', armor_points: 8, rear_armor_points: 0 },
              { location: 'Left Leg', armor_points: 7, rear_armor_points: 0 },
              { location: 'Right Leg', armor_points: 7, rear_armor_points: 0 }
            ]
          }
        }
      })
      const result = StructureValidationService.validateStructure(unit)

      expect(result.errors).toHaveLength(0)
      expect(result.armorStatus.totalArmor).toBe(91) // Sum: 9+22+15+15+8+8+7+7 = 91
      expect(result.armorStatus.maxArmor).toBe(100) // 50 tons * 2
      expect(result.isValid).toBe(true)
    })

    it('should handle units with no armor configuration', () => {
      const unit = createMockUnit({ data: { armor: undefined } })
      const result = StructureValidationService.validateStructure(unit)

      expect(result.isValid).toBe(true) // Missing armor is warning, not error
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].id).toBe('missing-armor-config')
      expect(result.armorStatus.totalArmor).toBe(0)
    })

    it('should detect negative armor values', () => {
      const unit = createMockUnit({
        data: {
          armor: {
            type: 'Standard',
            tonnage: 10,
            locations: [
              { location: 'Head', armor_points: -5, rear_armor_points: 0 },
              { location: 'Center Torso', armor_points: 30, rear_armor_points: -3 }
            ]
          }
        }
      })

      const result = StructureValidationService.validateStructure(unit)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(2)
      expect(result.errors.some(e => e.id.includes('negative-armor'))).toBe(true)
      expect(result.errors.some(e => e.id.includes('negative-rear-armor'))).toBe(true)
    })

    it('should calculate armor utilization correctly', () => {
      const unit = createMockUnit({ mass: 75 })
      const result = StructureValidationService.validateStructure(unit)

      expect(result.armorStatus.maxArmor).toBe(150) // 75 tons * 2
      expect(result.armorStatus.armorUtilization).toBeGreaterThan(100) // Over-armored for test
    })
  })

  describe('armor allocation validation', () => {
    it('should enforce head armor limit of 9 points', () => {
      const unit = createMockUnit({
        data: {
          armor: {
            type: 'Standard',
            tonnage: 10,
            locations: [
              { location: 'Head', armor_points: 12, rear_armor_points: 0 }
            ]
          }
        }
      })

      const result = StructureValidationService.validateStructure(unit)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.id.includes('head-armor-excess'))).toBe(true)
      expect(result.errors.some(e => e.message.includes('cannot exceed 9 points'))).toBe(true)
    })

    it('should prevent rear armor on invalid locations', () => {
      const unit = createMockUnit({
        data: {
          armor: {
            type: 'Standard',
            tonnage: 10,
            locations: [
              { location: 'Head', armor_points: 9, rear_armor_points: 5 },
              { location: 'Left Arm', armor_points: 16, rear_armor_points: 3 },
              { location: 'Right Leg', armor_points: 20, rear_armor_points: 2 }
            ]
          }
        }
      })

      const result = StructureValidationService.validateStructure(unit)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(3)
      expect(result.errors.every(e => e.id.includes('invalid-rear-armor'))).toBe(true)
    })

    it('should allow rear armor on torso locations', () => {
      const unit = createMockUnit({
        data: {
          armor: {
            type: 'Standard',
            tonnage: 10,
            locations: [
              { location: 'Center Torso', armor_points: 30, rear_armor_points: 10 },
              { location: 'Left Torso', armor_points: 20, rear_armor_points: 8 },
              { location: 'Right Torso', armor_points: 20, rear_armor_points: 8 }
            ]
          }
        }
      })

      const result = StructureValidationService.validateStructure(unit)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should warn about excessive total armor', () => {
      const unit = createMockUnit({
        mass: 20, // Small mech
        data: {
          armor: {
            type: 'Standard',
            tonnage: 15,
            locations: [
              { location: 'Head', armor_points: 9, rear_armor_points: 0 },
              { location: 'Center Torso', armor_points: 20, rear_armor_points: 10 },
              { location: 'Left Torso', armor_points: 15, rear_armor_points: 5 }
            ]
          }
        }
      })

      const result = StructureValidationService.validateStructure(unit)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.id === 'total-armor-excess')).toBe(true)
      expect(result.errors.some(e => e.message.includes('exceeds maximum'))).toBe(true)
    })

    it('should warn about low armor utilization', () => {
      const unit = createMockUnit({
        mass: 100, // Heavy mech
        data: {
          armor: {
            type: 'Standard',
            tonnage: 5,
            locations: [
              { location: 'Head', armor_points: 9, rear_armor_points: 0 },
              { location: 'Center Torso', armor_points: 15, rear_armor_points: 5 }
            ]
          }
        }
      })

      const result = StructureValidationService.validateStructure(unit)

      expect(result.armorStatus.armorUtilization).toBeLessThan(50)
      expect(result.armorStatus.recommendations.some(r => r.includes('Low armor utilization'))).toBe(true)
    })

    it('should provide armor distribution warnings', () => {
      const unit = createMockUnit({
        data: {
          armor: {
            type: 'Standard',
            tonnage: 10,
            locations: [
              { location: 'Head', armor_points: 9, rear_armor_points: 0 },
              { location: 'Center Torso', armor_points: 5, rear_armor_points: 0 }, // Very low
              { location: 'Left Arm', armor_points: 2, rear_armor_points: 0 } // Very low
            ]
          }
        }
      })

      const context = { validateArmorDistribution: true }
      const result = StructureValidationService.validateStructure(unit, context)

      expect(result.warnings.some(w => w.id.includes('armor-low'))).toBe(true)
      expect(result.warnings.some(w => w.message.includes('consider at least'))).toBe(true)
    })

    it('should handle armor limit enforcement in strict mode', () => {
      const unit = createMockUnit({
        data: {
          armor: {
            type: 'Standard',
            tonnage: 15,
            locations: [
              { location: 'Center Torso', armor_points: 80, rear_armor_points: 0 } // Excessive (over 47 * 1.5 = 70.5)
            ]
          }
        }
      })

      const strictContext = { strictMode: true, enforceArmorLimits: true }
      const result = StructureValidationService.validateStructure(unit, strictContext)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.id.includes('armor-excess'))).toBe(true)
    })

    it('should allow higher armor in non-strict mode', () => {
      const unit = createMockUnit({
        data: {
          armor: {
            type: 'Standard',
            tonnage: 15,
            locations: [
              { location: 'Center Torso', armor_points: 75, rear_armor_points: 0 } // Over 47 * 1.5 = 70.5
            ]
          }
        }
      })

      const lenientContext = { strictMode: false, enforceArmorLimits: true }
      const result = StructureValidationService.validateStructure(unit, lenientContext)

      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.id.includes('armor-high'))).toBe(true)
    })
  })

  describe('internal structure validation', () => {
    it('should validate standard structure types', () => {
      const unit = createMockUnit({
        systemComponents: {
          structure: {
            type: 'Standard',
            tonnage: 5
          }
        }
      })

      const result = StructureValidationService.validateStructure(unit)

      expect(result.structureStatus.structureType).toBe('Standard')
      expect(result.structureStatus.structureIntegrity).toBeGreaterThan(0)
      expect(result.structureStatus.weightCompliance).toBe(true)
    })

    it('should detect invalid structure types', () => {
      const unit = createMockUnit({
        systemComponents: {
          structure: {
            type: 'Invalid Structure',
            tonnage: 5
          }
        }
      })

      const result = StructureValidationService.validateStructure(unit)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.id === 'invalid-structure-type')).toBe(true)
      expect(result.errors.some(e => e.message.includes('Invalid structure type'))).toBe(true)
    })

    it('should provide structure recommendations for heavy units', () => {
      const unit = createMockUnit({
        mass: 80, // Heavy mech
        systemComponents: {
          structure: {
            type: 'Standard',
            tonnage: 8
          }
        }
      })

      const result = StructureValidationService.validateStructure(unit)

      expect(result.structureStatus.recommendations.some(r => 
        r.includes('Consider Endo Steel structure')
      )).toBe(true)
    })

    it('should warn against Endo Steel on light units', () => {
      const unit = createMockUnit({
        mass: 25, // Light mech
        systemComponents: {
          structure: {
            type: 'Endo Steel',
            tonnage: 1.25
          }
        }
      })

      const result = StructureValidationService.validateStructure(unit)

      expect(result.structureStatus.recommendations.some(r => 
        r.includes('may not provide significant benefits')
      )).toBe(true)
    })

    it('should calculate structure integrity based on tonnage', () => {
      const lightUnit = createMockUnit({ mass: 20 })
      const heavyUnit = createMockUnit({ mass: 100 })

      const lightResult = StructureValidationService.validateStructure(lightUnit)
      const heavyResult = StructureValidationService.validateStructure(heavyUnit)

      expect(heavyResult.structureStatus.structureIntegrity).toBeGreaterThan(
        lightResult.structureStatus.structureIntegrity
      )
    })

    it('should handle missing structure configuration', () => {
      const unit = createMockUnit({
        systemComponents: undefined
      })

      const result = StructureValidationService.validateStructure(unit)

      expect(result.structureStatus.structureType).toBe('Standard') // Default
      expect(result.structureStatus.structureIntegrity).toBeGreaterThan(0)
    })
  })

  describe('armor distribution analysis', () => {
    it('should analyze armor distribution patterns', () => {
      const unit = createMockUnit()
      const analysis = StructureValidationService.analyzeArmorDistribution(unit)

      expect(analysis.efficiency).toBeGreaterThan(0)
      expect(analysis.coverage.frontLoaded).toBeGreaterThan(0)
      expect(analysis.coverage.rearCoverage).toBeGreaterThan(0)
      expect(analysis.coverage.coreProtection).toBeGreaterThan(0)
      expect(analysis.coverage.extremityProtection).toBeGreaterThan(0)
    })

    it('should provide optimization suggestions for unbalanced armor', () => {
      const unit = createMockUnit({
        data: {
          armor: {
            type: 'Standard',
            tonnage: 10,
            locations: [
              { location: 'Center Torso', armor_points: 5, rear_armor_points: 0 }, // Low core
              { location: 'Left Arm', armor_points: 30, rear_armor_points: 0 }, // High extremity
              { location: 'Right Arm', armor_points: 30, rear_armor_points: 0 }
            ]
          }
        }
      })

      const analysis = StructureValidationService.analyzeArmorDistribution(unit)

      expect(analysis.suggestions.length).toBeGreaterThan(0)
      expect(analysis.suggestions.some(s => s === 'rebalance')).toBe(true)
      expect(analysis.suggestions.some(s => s.priority === 'high')).toBe(true)
    })

    it('should suggest front armor improvements', () => {
      const unit = createMockUnit({
        data: {
          armor: {
            type: 'Standard',
            tonnage: 10,
            locations: [
              { location: 'Center Torso', armor_points: 10, rear_armor_points: 20 }, // Rear-heavy
              { location: 'Left Torso', armor_points: 5, rear_armor_points: 15 }
            ]
          }
        }
      })

      const analysis = StructureValidationService.analyzeArmorDistribution(unit)

      expect(analysis.suggestions.some(s => 
        s === 'redistribute' && s.benefit.includes('frontal protection')
      )).toBe(true)
    })

    it('should handle empty armor configurations', () => {
      const unit = createMockUnit({ data: { armor: undefined } })
      const analysis = StructureValidationService.analyzeArmorDistribution(unit)

      expect(analysis.efficiency).toBe(0)
      expect(analysis.suggestions).toHaveLength(0)
      expect(analysis.coverage.balanceScore).toBe(0)
    })

    it('should calculate armor efficiency correctly', () => {
      const unit = createMockUnit({
        mass: 50,
        data: {
          armor: {
            type: 'Standard',
            tonnage: 10,
            locations: [
              { location: 'Head', armor_points: 9, rear_armor_points: 0 },
              { location: 'Center Torso', armor_points: 40, rear_armor_points: 10 }
            ]
          }
        }
      })

      const analysis = StructureValidationService.analyzeArmorDistribution(unit)
      
      expect(analysis.efficiency).toBe(59) // (49 + 10) / 100 * 100 = 59%
    })
  })

  describe('validation rules and metadata', () => {
    it('should provide validation rules for UI display', () => {
      const rules = StructureValidationService.getStructureValidationRules()

      expect(rules).toHaveLength(3) // Armor Configuration, Armor Distribution, Internal Structure
      expect(rules[0].category).toBe('Armor Configuration')
      expect(rules[1].category).toBe('Armor Distribution')
      expect(rules[2].category).toBe('Internal Structure')

      rules.forEach(category => {
        expect(category.rules.length).toBeGreaterThan(0)
        category.rules.forEach(rule => {
          expect(rule.name).toBeDefined()
          expect(rule.description).toBeDefined()
          expect(rule.severity).toMatch(/^(error|warning|info)$/)
        })
      })
    })

    it('should categorize validation errors by severity', () => {
      const unit = createMockUnit({
        data: {
          armor: {
            type: 'Standard',
            tonnage: 10,
            locations: [
              { location: 'Head', armor_points: -5, rear_armor_points: 0 }, // Error
              { location: 'Center Torso', armor_points: 5, rear_armor_points: 0 } // Warning (low)
            ]
          }
        }
      })

      const result = StructureValidationService.validateStructure(unit)

      expect(result.errors.length).toBeGreaterThan(0) // Critical errors
      expect(result.warnings.length).toBeGreaterThan(0) // Warnings
    })
  })

  describe('context-aware validation', () => {
    it('should respect validation context settings', () => {
      const unit = createMockUnit({
        data: {
          armor: {
            type: 'Standard',
            tonnage: 10,
            locations: [
              { location: 'Center Torso', armor_points: 55, rear_armor_points: 0 } // Slightly over
            ]
          }
        }
      })

      // Test with armor limits disabled
      const lenientContext = { enforceArmorLimits: false }
      const result1 = StructureValidationService.validateStructure(unit, lenientContext)
      expect(result1.errors).toHaveLength(0)

      // Test with armor distribution disabled
      const noDistributionContext = { validateArmorDistribution: false }
      const result2 = StructureValidationService.validateStructure(unit, noDistributionContext)
      expect(result2.warnings.filter(w => w.id.includes('armor-low'))).toHaveLength(0)
    })

    it('should handle different tonnage classes appropriately', () => {
      const lightMech = createMockUnit({ mass: 20 })
      const assaultMech = createMockUnit({ mass: 100 })

      const lightResult = StructureValidationService.validateStructure(lightMech)
      const assaultResult = StructureValidationService.validateStructure(assaultMech)

      expect(lightResult.armorStatus.maxArmor).toBe(40) // 20 * 2
      expect(assaultResult.armorStatus.maxArmor).toBe(200) // 100 * 2
      expect(assaultResult.structureStatus.structureIntegrity).toBeGreaterThan(
        lightResult.structureStatus.structureIntegrity
      )
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle malformed armor data gracefully', () => {
      const unit = createMockUnit({
        data: {
          armor: {
            type: 'Standard',
            tonnage: 10,
            locations: [
              { location: '', armor_points: undefined, rear_armor_points: null }, // Malformed
              { location: 'Head', armor_points: 9, rear_armor_points: 0 } // Valid
            ]
          }
        }
      })

      const result = StructureValidationService.validateStructure(unit)

      expect(result).toBeDefined()
      expect(result.isValid).toBeDefined()
      expect(result.armorStatus).toBeDefined()
    })

    it('should provide meaningful error messages', () => {
      const unit = createMockUnit({
        data: {
          armor: {
            type: 'Standard',
            tonnage: 10,
            locations: [
              { location: 'Head', armor_points: 15, rear_armor_points: 0 }, // Over limit
              { location: 'Left Arm', armor_points: 16, rear_armor_points: 5 } // Invalid rear
            ]
          }
        }
      })

      const result = StructureValidationService.validateStructure(unit)

      result.errors.forEach(error => {
        expect(error.message).toBeDefined()
        expect(error.message.length).toBeGreaterThan(10)
        expect(error.field).toBeDefined()
        expect(error.field!.length).toBeGreaterThan(0)
      })
    })

    it('should handle armor location variations', () => {
      const unit = createMockUnit({
        data: {
          armor: {
            type: 'Standard',
            tonnage: 10,
            locations: [
              { location: 'head', armor_points: 9, rear_armor_points: 0 }, // lowercase
              { location: 'Center-Torso', armor_points: 30, rear_armor_points: 10 }, // hyphenated
              { location: 'LEFT ARM', armor_points: 16, rear_armor_points: 0 } // uppercase
            ]
          }
        }
      })

      const result = StructureValidationService.validateStructure(unit)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should maintain performance with large armor configurations', () => {
      const largeArmorConfig = Array.from({ length: 20 }, (_, i) => ({
        location: `Location ${i}`,
        armor_points: 10,
        rear_armor_points: i % 2 === 0 ? 5 : 0
      }))

      const unit = createMockUnit({
        data: {
          armor: {
            type: 'Standard',
            tonnage: 20,
            locations: largeArmorConfig
          }
        }
      })

      const startTime = Date.now()
      const result = StructureValidationService.validateStructure(unit)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(100) // Should complete quickly
      expect(result).toBeDefined()
      expect(result.armorStatus.totalArmor).toBeGreaterThan(0)
    })
  })
})
