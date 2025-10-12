/**
 * WeaponValidationService Test Suite
 * 
 * Comprehensive test coverage for WeaponValidationService extracted from UnitValidationService
 * Tests weapon configuration, tech compatibility, ammunition balance, and loadout optimization
 * 
 * @see WeaponValidationService for implementation details
 */

import { WeaponValidationService } from '../../../utils/editor/WeaponValidationService'
import { EditableUnit } from '../../../types/editor'

describe('WeaponValidationService', () => {
  // Test data setup
  const createMockUnit = (overrides: Partial<EditableUnit> = {}): EditableUnit => ({
    chassis: 'Test Mech',
    model: 'TST-1',
    mass: 50,
    tech_base: 'Inner Sphere',
    data: {
      chassis: 'Test Mech',
      model: 'TST-1',
      weapons_and_equipment: [
        {
          item_name: 'Medium Laser',
          item_type: 'weapon',
          location: 'center_torso',
          tech_base: 'Inner Sphere',
          category: 'Energy Weapons',
          heat: 3,
          tonnage: 1,
          damage: 5,
          criticals: 1
        } as any,
        {
          item_name: 'AC/10',
          item_type: 'weapon',
          location: 'center_torso',
          tech_base: 'Inner Sphere',
          category: 'Ballistic Weapons',
          heat: 3,
          tonnage: 12,
          damage: 10,
          criticals: 7
        } as any
      ]
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
    it('should validate a properly configured weapon loadout', () => {
      const unit = createMockUnit()
      const result = WeaponValidationService.validateWeapons(unit)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.weaponCount).toBe(2)
      expect(result.totalHeatGeneration).toBe(6) // 3 + 3
      expect(result.techCompatibility.isCompatible).toBe(true)
    })

    it('should handle units with no weapons configured', () => {
      const unit = createMockUnit({ data: undefined })
      const result = WeaponValidationService.validateWeapons(unit)

      expect(result.isValid).toBe(true) // Empty is valid
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].id).toBe('no-weapons-configured')
      expect(result.weaponCount).toBe(0)
      expect(result.totalHeatGeneration).toBe(0)
    })

    it('should validate weapon data integrity', () => {
      const unit = createMockUnit({
        data: {
          chassis: 'Test Mech',
          model: 'TST-1',
          weapons_and_equipment: [
            {
              item_name: '', // Missing name
              item_type: 'weapon',
              location: 'center_torso',
              tech_base: 'Inner Sphere',
              tonnage: -1, // Negative tonnage
              heat: -5, // Negative heat
              criticals: 0 // Invalid criticals
            } as any
          ]
        }
      })

      const result = WeaponValidationService.validateWeapons(unit)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(4) // All validation errors
      expect(result.errors.some(e => e.id.includes('weapon-missing-name'))).toBe(true)
      expect(result.errors.some(e => e.id.includes('weapon-negative-tonnage'))).toBe(true)
      expect(result.errors.some(e => e.id.includes('weapon-negative-heat'))).toBe(true)
      expect(result.errors.some(e => e.id.includes('weapon-invalid-criticals'))).toBe(true)
    })

    it('should calculate weapon metrics correctly', () => {
      const unit = createMockUnit()
      const result = WeaponValidationService.validateWeapons(unit)

      expect(result.weaponCount).toBe(2)
      expect(result.totalHeatGeneration).toBe(6)
      expect(result.totalWeight).toBe(13) // 1 + 12
    })
  })

  describe('weapon configuration validation', () => {
    it('should validate weapon placement restrictions', () => {
      const unit = createMockUnit({
        data: {
          chassis: 'Test Mech',
          model: 'TST-1',
          weapons_and_equipment: [
            {
              item_name: 'AC/20',
              item_type: 'weapon',
              location: 'head',
              tech_base: 'Inner Sphere',
              category: 'Ballistic Weapons',
              heat: 7,
              tonnage: 14,
              damage: 20,
              criticals: 10 // Large weapon
            } as any
          ]
        }
      })

      const result = WeaponValidationService.validateWeapons(unit)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.id.includes('weapon-placement-invalid'))).toBe(true)
      expect(result.errors.some(e => e.message.includes('Large weapons cannot be mounted in head'))).toBe(true)
    })

    it('should warn about high heat weapons', () => {
      const unit = createMockUnit({
        data: {
          chassis: 'Test Mech',
          model: 'TST-1',
          weapons_and_equipment: [
            {
              item_name: 'PPC',
              item_type: 'weapon',
              location: 'center_torso',
              tech_base: 'Inner Sphere',
              category: 'Energy Weapons',
              heat: 25, // High heat weapon
              tonnage: 7,
              damage: 10,
              criticals: 3
            } as any
          ]
        }
      })

      const result = WeaponValidationService.validateWeapons(unit)

      expect(result.warnings.some(w => w.id.includes('weapon-high-heat'))).toBe(true)
      expect(result.warnings.some(w => w.message.includes('consider heat management'))).toBe(true)
    })

    it('should warn about heat imbalance', () => {
      const unit = createMockUnit({
        data: {
          chassis: 'Test Mech',
          model: 'TST-1',
          weapons_and_equipment: [
            { 
              item_name: 'PPC', 
              item_type: 'weapon',
              location: 'center_torso',
              tech_base: 'Inner Sphere',
              category: 'Energy Weapons',
              heat: 10,
              tonnage: 7,
              damage: 10,
              criticals: 3
            } as any,
            { 
              item_name: 'Large Laser', 
              item_type: 'weapon',
              location: 'center_torso',
              tech_base: 'Inner Sphere',
              category: 'Energy Weapons',
              heat: 8,
              tonnage: 5,
              damage: 8,
              criticals: 2
            } as any,
            { 
              item_name: 'Medium Laser', 
              item_type: 'weapon',
              location: 'center_torso',
              tech_base: 'Inner Sphere',
              category: 'Energy Weapons',
              heat: 3,
              tonnage: 1,
              damage: 5,
              criticals: 1
            } as any
          ]
        }
      })

      const result = WeaponValidationService.validateWeapons(unit)

      expect(result.warnings.some(w => w.id === 'weapon-heat-imbalance')).toBe(true)
      expect(result.warnings.some(w => w.message.includes('significantly exceeds heat capacity'))).toBe(true)
    })

    it('should warn when no weapons are equipped', () => {
      const unit = createMockUnit({
        data: {
          chassis: 'Test Mech',
          model: 'TST-1',
          weapons_and_equipment: [] // No weapons
        }
      })

      const result = WeaponValidationService.validateWeapons(unit)

      expect(result.warnings.some(w => w.id === 'no-weapons-equipped')).toBe(true)
      expect(result.warnings.some(w => w.message.includes('consider combat effectiveness'))).toBe(true)
    })
  })

  describe('tech compatibility validation', () => {
    it('should detect tech base mismatches in strict mode', () => {
      const unit = createMockUnit({
        tech_base: 'Inner Sphere',
        data: {
          chassis: 'Test Mech',
          model: 'TST-1',
          weapons_and_equipment: [
            {
              item_name: 'Clan ER PPC',
              item_type: 'weapon',
              location: 'center_torso',
              tech_base: 'Clan',
            } as any
          ]
        }
      })

      const context = { strictMode: true, checkTechCompatibility: true }
      const result = WeaponValidationService.validateWeapons(unit, context)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.id.includes('equipment-tech-mismatch'))).toBe(true)
      expect(result.errors.some(e => e.message.includes('Clan equipment incompatible with Inner Sphere'))).toBe(true)
    })

    it('should warn about tech base mismatches in normal mode', () => {
      const unit = createMockUnit({
        tech_base: 'Inner Sphere',
        data: {
          chassis: 'Test Mech',
          model: 'TST-1',
          weapons_and_equipment: [
            {
              item_name: 'Clan ER PPC',
              item_type: 'weapon',
              location: 'center_torso',
              tech_base: 'Clan',
            } as any
          ]
        }
      })

      const result = WeaponValidationService.validateWeapons(unit)

      expect(result.warnings.some(w => w.id.includes('equipment-tech-mismatch'))).toBe(true)
      expect(result.warnings.some(w => w.message.includes('Mixed tech detected'))).toBe(true)
      expect(result.techCompatibility.mixedTechDetected).toBe(true)
    })

    it('should suggest Clan equivalents for Clan chassis', () => {
      const unit = createMockUnit({
        tech_base: 'Clan',
        data: {
          chassis: 'Test Mech',
          model: 'TST-1',
          weapons_and_equipment: [
            {
              item_name: 'Medium Laser',
              item_type: 'weapon',
              location: 'center_torso',
              tech_base: 'IS',
            } as any
          ]
        }
      })

      const result = WeaponValidationService.validateWeapons(unit)

      expect(result.warnings.some(w => w.id.includes('equipment-suboptimal'))).toBe(true)
      expect(result.warnings.some(w => w.message.includes('Consider Clan equivalent'))).toBe(true)
    })

    it('should handle missing unit tech base', () => {
      const unit = createMockUnit({ tech_base: undefined })
      const result = WeaponValidationService.validateWeapons(unit)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.id === 'missing-unit-tech-base')).toBe(true)
    })

    it('should provide optimization suggestions for mixed tech', () => {
      const unit = createMockUnit({
        tech_base: 'Inner Sphere',
        data: {
          chassis: 'Test Mech',
          model: 'TST-1',
          weapons_and_equipment: [
            { 
              item_name: 'Medium Laser', 
              item_type: 'weapon',
              location: 'center_torso',
              tech_base: 'IS',
            } as any,
            { 
              item_name: 'Clan ER PPC', 
              item_type: 'weapon',
              location: 'center_torso',
              tech_base: 'Clan',
            } as any,
            { 
              item_name: 'Clan Large Laser', 
              item_type: 'weapon',
              location: 'center_torso',
              tech_base: 'Clan',
            } as any
          ]
        }
      })

      const result = WeaponValidationService.validateWeapons(unit)

      expect(result.techCompatibility.mixedTechDetected).toBe(true)
      expect(result.techCompatibility.suggestions).toContain('Consider changing unit tech base to Mixed (Clan Chassis) for better optimization')
    })

    it('should normalize tech base formats correctly', () => {
      const unit = createMockUnit({
        tech_base: 'Inner Sphere',
        data: {
          chassis: 'Test Mech',
          model: 'TST-1',
          weapons_and_equipment: [
            { 
              item_name: 'IS Medium Laser', 
              item_type: 'weapon',
              location: 'center_torso',
              tech_base: 'IS',
            } as any,
            { 
              item_name: 'IS PPC', 
              item_type: 'weapon',
              location: 'center_torso',
              tech_base: 'Inner Sphere',
            } as any
          ]
        }
      })

      const result = WeaponValidationService.validateWeapons(unit)

      expect(result.techCompatibility.isCompatible).toBe(true)
      expect(result.techCompatibility.mixedTechDetected).toBe(false)
    })
  })

  describe('ammunition balance validation', () => {
    it('should detect missing ammunition for ballistic weapons', () => {
      const unit = createMockUnit({
        data: {
          chassis: 'Test Mech',
          model: 'TST-1',
          weapons_and_equipment: [
            {
              item_name: 'AC/10',
              item_type: 'weapon',
              location: 'center_torso',
              tech_base: 'Inner Sphere',
            } as any
            // No ammunition
          ]
        }
      })

      const result = WeaponValidationService.validateWeapons(unit)

      expect(result.warnings.some(w => w.id.includes('missing-ammo'))).toBe(true)
      expect(result.warnings.some(w => w.message.includes('No ammunition found'))).toBe(true)
      expect(result.ammoBalance.weaponsNeedingAmmo).toBe(1)
      expect(result.ammoBalance.missingAmmo).toContain('AC')
    })

    it('should validate ammunition quantities', () => {
      const unit = createMockUnit({
        data: {
          chassis: 'Test Mech',
          model: 'TST-1',
          weapons_and_equipment: [
            {
              item_name: 'AC/10',
              item_type: 'weapon',
              location: 'center_torso',
              tech_base: 'Inner Sphere',
            } as any,
            {
              item_name: 'AC/10 Ammo',
              item_type: 'ammunition',
              location: 'center_torso',
              tech_base: 'Inner Sphere',
            } as any
          ]
        }
      })

      const result = WeaponValidationService.validateWeapons(unit)

      expect(result.warnings.some(w => w.id.includes('insufficient-ammo'))).toBe(true)
      expect(result.warnings.some(w => w.message.includes('Low ammunition'))).toBe(true)
    })

    it('should detect excessive ammunition', () => {
      const unit = createMockUnit({
        data: {
          chassis: 'Test Mech',
          model: 'TST-1',
          weapons_and_equipment: [
            {
              item_name: 'AC/10',
              item_type: 'weapon',
              location: 'center_torso',
              tech_base: 'Inner Sphere',
            } as any,
            {
              item_name: 'AC/10 Ammo',
              item_type: 'ammunition',
              location: 'center_torso',
              tech_base: 'Inner Sphere',
            } as any
          ]
        }
      })

      const result = WeaponValidationService.validateWeapons(unit)

      expect(result.warnings.some(w => w.id.includes('excess-ammo'))).toBe(true)
      expect(result.warnings.some(w => w.message.includes('Excessive ammunition'))).toBe(true)
    })

    it('should detect orphaned ammunition', () => {
      const unit = createMockUnit({
        data: {
          chassis: 'Test Mech',
          model: 'TST-1',
          weapons_and_equipment: [
            {
              item_name: 'AC/20 Ammo',
              item_type: 'ammunition',
              location: 'center_torso',
              tech_base: 'Inner Sphere',
            } as any
            // No AC/20 weapon
          ]
        }
      })

      const result = WeaponValidationService.validateWeapons(unit)

      expect(result.warnings.some(w => w.id.includes('orphaned-ammo'))).toBe(true)
      expect(result.warnings.some(w => w.message.includes('No compatible weapons found'))).toBe(true)
      expect(result.ammoBalance.excessAmmo).toContain('AC/20 Ammo')
    })

    it('should handle ammunition balance validation when disabled', () => {
      const unit = createMockUnit()
      const context = { validateAmmoBalance: false }
      const result = WeaponValidationService.validateWeapons(unit, context)

      expect(result.ammoBalance.weaponsWithAmmo).toBe(0)
      expect(result.ammoBalance.weaponsNeedingAmmo).toBe(0)
    })

    it('should provide CASE protection recommendations', () => {
      const unit = createMockUnit({
        data: {
          chassis: 'Test Mech',
          model: 'TST-1',
          weapons_and_equipment: [
            { 
              item_name: 'AC/10', 
              item_type: 'weapon',
              location: 'center_torso',
              tech_base: 'Inner Sphere',
            } as any,
            { 
              item_name: 'AC/10 Ammo', 
              item_type: 'ammunition',
              location: 'center_torso',
              tech_base: 'Inner Sphere',
            } as any
          ]
        }
      })

      const result = WeaponValidationService.validateWeapons(unit)

      expect(result.ammoBalance.recommendations).toContain('Ensure CASE protection for explosive ammunition')
    })
  })

  describe('weapon loadout analysis', () => {
    it('should analyze weapon range distribution', () => {
      const weapons = [
        { item_name: 'Small Laser', damage: 3, heat: 1 },
        { item_name: 'Medium Laser', damage: 5, heat: 3 },
        { item_name: 'Large Laser', damage: 8, heat: 8 },
        { item_name: 'PPC', damage: 10, heat: 10 }
      ]

      const analysis = WeaponValidationService.analyzeWeaponLoadout(weapons)

      expect(analysis.shortRange).toBe(8) // Small + Medium
      expect(analysis.mediumRange).toBe(8) // Large Laser
      expect(analysis.longRange).toBe(10) // PPC
      expect(analysis.alphaStrike).toBe(26) // Total damage
      expect(analysis.heatBalance).toBe(22) // Total heat
      expect(analysis.sustainedDamage).toBeLessThan(analysis.alphaStrike)
    })

    it('should calculate heat efficiency correctly', () => {
      const lowHeatWeapons = [
        { item_name: 'Small Laser', damage: 3, heat: 1 },
        { item_name: 'Medium Laser', damage: 5, heat: 3 }
      ]

      const analysis = WeaponValidationService.analyzeWeaponLoadout(lowHeatWeapons)

      expect(analysis.heatBalance).toBe(4)
      expect(analysis.sustainedDamage).toBeCloseTo(analysis.alphaStrike, 1) // Minimal heat penalty
      expect(analysis.efficiency).toBeGreaterThan(0.5)
    })

    it('should handle empty weapon loadout', () => {
      const analysis = WeaponValidationService.analyzeWeaponLoadout([])

      expect(analysis.shortRange).toBe(0)
      expect(analysis.mediumRange).toBe(0)
      expect(analysis.longRange).toBe(0)
      expect(analysis.alphaStrike).toBe(0)
      expect(analysis.heatBalance).toBe(0)
      expect(analysis.sustainedDamage).toBe(0)
      expect(analysis.efficiency).toBe(0)
    })
  })

  describe('weapon optimization suggestions', () => {
    it('should suggest heat optimization for high-heat loadouts', () => {
      const weapons = [
        { item_name: 'PPC', heat: 15 },
        { item_name: 'Large Laser', heat: 10 },
        { item_name: 'Medium Laser', heat: 8 }
      ]

      const unit = createMockUnit()
      const optimization = WeaponValidationService.suggestWeaponOptimizations(weapons, unit)

      expect(optimization.heatOptimization).toHaveLength(2)
      expect(optimization.heatOptimization[0]).toBe('add')
      expect(optimization.heatOptimization[0].weapon).toBe('Heat Sinks')
      expect(optimization.heatOptimization[1]).toBe('replace')
    })

    it('should suggest range optimization for unbalanced loadouts', () => {
      const shortRangeWeapons = [
        { item_name: 'Small Laser', damage: 3, tonnage: 0.5 },
        { item_name: 'Medium Laser', damage: 5, tonnage: 1 },
        { item_name: 'SRM-4', damage: 8, tonnage: 2 }
      ]

      const unit = createMockUnit()
      const optimization = WeaponValidationService.suggestWeaponOptimizations(shortRangeWeapons, unit)

      expect(optimization.rangeOptimization).toHaveLength(1)
      expect(optimization.rangeOptimization[0]).toBe('add')
      expect(optimization.rangeOptimization[0].weapon).toBe('Long Range Weapons')
    })

    it('should suggest weight optimization for heavy loadouts', () => {
      const heavyWeapons = [
        { item_name: 'AC/20', tonnage: 14 },
        { item_name: 'Gauss Rifle', tonnage: 15 },
        { item_name: 'Large Laser', tonnage: 5 }
      ]

      const unit = createMockUnit()
      const optimization = WeaponValidationService.suggestWeaponOptimizations(heavyWeapons, unit)

      expect(optimization.weightOptimization).toHaveLength(1)
      expect(optimization.weightOptimization[0]).toBe('replace')
      expect(optimization.weightOptimization[0].weapon).toBe('Heavy Weapons')
    })

    it('should handle optimization for balanced loadouts', () => {
      const balancedWeapons = [
        { item_name: 'Medium Laser', damage: 5, heat: 3, tonnage: 1 },
        { item_name: 'AC/5', damage: 5, heat: 1, tonnage: 8 }
      ]

      const unit = createMockUnit()
      const optimization = WeaponValidationService.suggestWeaponOptimizations(balancedWeapons, unit)

      // Balanced loadouts should have fewer optimization suggestions
      expect(optimization.heatOptimization).toHaveLength(0)
      expect(optimization.rangeOptimization).toHaveLength(0)
      expect(optimization.weightOptimization).toHaveLength(0)
    })
  })

  describe('validation rules metadata', () => {
    it('should provide validation rules for UI display', () => {
      const rules = WeaponValidationService.getWeaponValidationRules()

      expect(rules).toHaveLength(3) // Weapon Configuration, Tech Compatibility, Ammunition Balance
      expect(rules[0].category).toBe('Weapon Configuration')
      expect(rules[1].category).toBe('Tech Compatibility')
      expect(rules[2].category).toBe('Ammunition Balance')

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

  describe('helper methods and edge cases', () => {
    it('should extract weapons correctly from equipment list', () => {
      const equipment = [
        { item_name: 'Medium Laser', category: 'Energy Weapons' },
        { item_name: 'Heat Sink', category: 'Heat Management' },
        { item_name: 'AC/10', type: 'ballistic_weapon' },
        { item_name: 'Jump Jet', category: 'Movement' },
        { item_name: 'PPC', category: 'Energy Weapons' }
      ]

      // Access private method through the class (for testing)
      const weapons = (WeaponValidationService as any).extractWeapons(equipment)

      expect(weapons).toHaveLength(3) // Should extract 3 weapons
      expect(weapons.some((w: any) => w.item_name === 'Medium Laser')).toBe(true)
      expect(weapons.some((w: any) => w.item_name === 'AC/10')).toBe(true)
      expect(weapons.some((w: any) => w.item_name === 'PPC')).toBe(true)
    })

    it('should extract ammunition correctly from equipment list', () => {
      const equipment = [
        { item_name: 'AC/10 Ammo', category: 'Ammo' },
        { item_name: 'LRM Ammunition', type: 'ammunition' },
        { item_name: 'Heat Sink', category: 'Heat Management' },
        { item_name: 'Gauss Ammo' }
      ]

      const ammunition = (WeaponValidationService as any).extractAmmunition(equipment)

      expect(ammunition).toHaveLength(3) // Should extract 3 ammo types
      expect(ammunition.some((a: any) => a.item_name === 'AC/10 Ammo')).toBe(true)
      expect(ammunition.some((a: any) => a.item_name === 'LRM Ammunition')).toBe(true)
      expect(ammunition.some((a: any) => a.item_name === 'Gauss Ammo')).toBe(true)
    })

    it('should calculate weapon range correctly', () => {
      const testCases = [
        { item_name: 'Small Laser', expected: 3 },
        { item_name: 'Medium Laser', expected: 9 },
        { item_name: 'Large Laser', expected: 15 },
        { item_name: 'PPC', expected: 21 },
        { item_name: 'LRM-20', expected: 21 },
        { item_name: 'AC/10', expected: 15 },
        { item_name: 'Gauss Rifle', expected: 22 },
        { item_name: 'SRM-6', expected: 6 },
        { item_name: 'Unknown Weapon', expected: 12 }
      ]

      testCases.forEach(testCase => {
        const range = (WeaponValidationService as any).getWeaponRange(testCase)
        expect(range).toBe(testCase.expected)
      })
    })

    it('should extract weapon types correctly', () => {
      const testCases = [
        { weaponName: 'Ultra AC/10', expected: 'AC/10' },
        { weaponName: 'LRM-20', expected: 'LRM' },
        { weaponName: 'Streak SRM-6', expected: 'SRM' },
        { weaponName: 'Gauss Rifle', expected: 'Gauss' },
        { weaponName: 'ER PPC', expected: 'PPC' },
        { weaponName: 'Medium Pulse Laser', expected: 'Laser' },
        { weaponName: 'Unknown', expected: 'Unknown' }
      ]

      testCases.forEach(testCase => {
        const type = (WeaponValidationService as any).extractWeaponType(testCase.weaponName)
        expect(type).toBe(testCase.expected)
      })
    })

    it('should calculate recommended ammunition correctly', () => {
      const testCases = [
        { item_name: 'AC/2', expected: 1 },
        { item_name: 'AC/10', expected: 1 },
        { item_name: 'AC/20', expected: 2 },
        { item_name: 'LRM-20', expected: 2 },
        { item_name: 'SRM-6', expected: 1 },
        { item_name: 'Gauss Rifle', expected: 2 },
        { item_name: 'Machine Gun', expected: 1 }
      ]

      testCases.forEach(testCase => {
        const recommended = (WeaponValidationService as any).calculateRecommendedAmmo(testCase)
        expect(recommended).toBe(testCase.expected)
      })
    })

    it('should check ammunition compatibility correctly', () => {
      const compatibilityTests = [
        { ammo: { item_name: 'AC/10 Ammo' }, weaponType: 'AC/10', expected: true },
        { ammo: { item_name: 'LRM Ammo' }, weaponType: 'LRM', expected: true },
        { ammo: { item_name: 'SRM Ammunition' }, weaponType: 'SRM', expected: true },
        { ammo: { item_name: 'AC/10 Ammo' }, weaponType: 'LRM', expected: false },
        { ammo: { item_name: 'Gauss Ammo' }, weaponType: 'Gauss', expected: true }
      ]

      compatibilityTests.forEach(test => {
        const compatible = (WeaponValidationService as any).isAmmoCompatible(test.ammo, test.weaponType)
        expect(compatible).toBe(test.expected)
      })
    })
  })

  describe('context validation and configuration', () => {
    it('should respect validation context settings', () => {
      const unit = createMockUnit({
        tech_base: 'Inner Sphere',
        data: {
          chassis: 'Test Mech',
          model: 'TST-1',
          weapons_and_equipment: [
            { 
              item_name: 'Clan ER PPC', 
              item_type: 'weapon',
              location: 'center_torso',
              tech_base: 'Clan',
            } as any
          ]
        }
      })

      // Test with tech compatibility disabled
      const noTechContext = { checkTechCompatibility: false }
      const result1 = WeaponValidationService.validateWeapons(unit, noTechContext)
      expect(result1.warnings).toHaveLength(0) // Should not warn about tech mismatch

      // Test with ammunition balance disabled
      const noAmmoContext = { validateAmmoBalance: false }
      const result2 = WeaponValidationService.validateWeapons(unit, noAmmoContext)
      expect(result2.ammoBalance.recommendations).toHaveLength(0)
    })

    it('should handle invalid weapon data gracefully', () => {
      const unit = createMockUnit({
        data: {
          chassis: 'Test Mech',
          model: 'TST-1',
          weapons_and_equipment: [
            null as any, // Null weapon
            undefined as any, // Undefined weapon
            {} as any, // Empty weapon object
            { 
              item_name: 'Valid Weapon',
              item_type: 'weapon',
              location: 'center_torso',
              tech_base: 'Inner Sphere',
            } as any // Valid weapon
          ]
        }
      })

      const result = WeaponValidationService.validateWeapons(unit)

      // Should handle invalid data without crashing
      expect(result).toBeDefined()
      expect(result.weaponCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('performance and efficiency', () => {
    it('should complete validation within reasonable time', () => {
      const unit = createMockUnit()
      const startTime = Date.now()

      // Run validation multiple times
      for (let i = 0; i < 100; i++) {
        WeaponValidationService.validateWeapons(unit)
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(1000) // Should complete 100 validations in under 1 second
    })

    it('should handle large weapon loadouts efficiently', () => {
      const largeLoadout = Array.from({ length: 50 }, (_, i) => ({
        item_name: `Weapon ${i}`,
        item_type: 'weapon',
        location: 'center_torso',
        tech_base: 'Inner Sphere',
      } as any))

      const unit = createMockUnit({
        data: { 
          chassis: 'Test Mech',
          model: 'TST-1',
          weapons_and_equipment: largeLoadout 
        }
      })

      const startTime = Date.now()
      const result = WeaponValidationService.validateWeapons(unit)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(100) // Should handle large loadouts quickly
      expect(result.weaponCount).toBe(50)
    })

    it('should not create memory leaks', () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Run many validations
      for (let i = 0; i < 1000; i++) {
        const unit = createMockUnit({
          data: {
            chassis: 'Test Mech',
            model: 'TST-1',
            weapons_and_equipment: [
              { 
                item_name: `Weapon ${i}`, 
                item_type: 'weapon',
                location: 'center_torso',
                tech_base: 'Inner Sphere',
              } as any
            ]
          }
        })
        WeaponValidationService.validateWeapons(unit)
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed

      // Memory should not grow significantly (allow some variance for test execution)
      const memoryGrowth = finalMemory - initialMemory
      expect(memoryGrowth).toBeLessThan(initialMemory * 0.5) // Should not more than double memory usage
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle malformed weapon data', () => {
      const unit = createMockUnit({
        data: {
          chassis: 'Test Mech',
          model: 'TST-1',
          weapons_and_equipment: [
            {
              item_name: 'Test Weapon',
              item_type: 'weapon',
              location: 'center_torso',
              tech_base: 'Inner Sphere',
              // Missing other properties
            } as any
          ]
        }
      })

      const result = WeaponValidationService.validateWeapons(unit)

      expect(result).toBeDefined()
      expect(result.isValid).toBeDefined()
    })

    it('should handle empty strings and null values gracefully', () => {
      const unit = createMockUnit({
        data: {
          chassis: 'Test Mech',
          model: 'TST-1',
          weapons_and_equipment: [
            {
              item_name: '',
              item_type: 'weapon',
              location: '',
              tech_base: 'Inner Sphere',
            } as any
          ]
        }
      })

      const result = WeaponValidationService.validateWeapons(unit)

      expect(result.errors.some(e => e.id.includes('weapon-missing-name'))).toBe(true)
    })

    it('should provide meaningful error messages', () => {
      const unit = createMockUnit({
        data: {
          chassis: 'Test Mech',
          model: 'TST-1',
          weapons_and_equipment: [
            {
              item_name: 'Test Weapon',
              item_type: 'weapon',
              location: 'center_torso',
              tech_base: 'Inner Sphere',
            } as any
          ]
        }
      })

      const result = WeaponValidationService.validateWeapons(unit)

      result.errors.forEach(error => {
        expect(error.message).toBeDefined()
        expect(error.message.length).toBeGreaterThan(10)
        expect(error.field).toBeDefined()
      })
    })
  })
})
