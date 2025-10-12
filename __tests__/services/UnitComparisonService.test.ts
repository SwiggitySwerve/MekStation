/**
 * UnitComparisonService Test Suite
 * 
 * Comprehensive tests for unit statistics analysis, comparison algorithms,
 * recommendation generation, and export functionality.
 * 
 * Phase 5: Validation & Testing - Day 21
 */

import { UnitComparisonService, UnitStatistics, ComparisonResult, ComparisonRecommendation } from '../../services/UnitComparisonService'
import { TabUnit } from '../../services/MultiUnitStateService'

// Mock TabUnit creation
const createMockTabUnit = (id: string, name: string, overrides: any = {}): TabUnit => {
  const defaultConfig = {
    chassis: 'Test Mech',
    model: 'Standard',
    tonnage: 50,
    unitType: 'BattleMech',
    techBase: 'Inner Sphere',
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
    engineRating: 200,
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
    heatSinkType: 'Single',
    totalHeatSinks: 10,
    ...overrides
  }

  return {
    id,
    name,
    unitManager: {
      getConfiguration: jest.fn().mockReturnValue(defaultConfig),
      getUnallocatedEquipment: jest.fn().mockReturnValue([
        { equipmentData: { name: 'AC/20', type: 'weapon' } },
        { equipmentData: { name: 'Medium Laser', type: 'weapon' } }
      ])
    } as any,
    stateManager: {
      getUnitSummary: jest.fn().mockReturnValue({
        validation: { isValid: true },
        summary: { tonnage: defaultConfig.tonnage }
      })
    } as any,
    created: new Date(),
    modified: new Date(),
    isModified: false
  }
}

describe('UnitComparisonService', () => {
  let service: UnitComparisonService
  
  beforeEach(() => {
    service = new UnitComparisonService()
  })

  describe('compareUnits', () => {
    it('should analyze a single unit', () => {
      const tabs = [createMockTabUnit('tab-1', 'Atlas')]
      
      const result = service.compareUnits(tabs)
      
      expect(result.tabs).toHaveLength(1)
      expect(result.statistics['tab-1']).toBeDefined()
      expect(result.statistics['tab-1'].tonnage).toBe(50)
      expect(result.analysis.bestOverall).toBe('tab-1')
      expect(result.recommendations).toBeInstanceOf(Array)
    })

    it('should compare multiple units', () => {
      const tabs = [
        createMockTabUnit('tab-1', 'Atlas', { tonnage: 100, engineRating: 300 }),
        createMockTabUnit('tab-2', 'Locust', { tonnage: 20, engineRating: 160 })
      ]
      
      const result = service.compareUnits(tabs)
      
      expect(result.tabs).toHaveLength(2)
      expect(result.statistics['tab-1'].tonnage).toBe(100)
      expect(result.statistics['tab-2'].tonnage).toBe(20)
      expect(result.analysis.bestOverall).toBeDefined()
    })

    it('should handle empty tabs array', () => {
      const result = service.compareUnits([])
      
      expect(result.tabs).toHaveLength(0)
      expect(Object.keys(result.statistics)).toHaveLength(0)
      expect(result.analysis.bestOverall).toBeNull()
      expect(result.analysis.mostEfficient).toBeNull()
    })

    it('should handle analysis errors gracefully', () => {
      const badTab = createMockTabUnit('bad-tab', 'Broken')
      badTab.unitManager.getConfiguration = jest.fn().mockImplementation(() => {
        throw new Error('Configuration error')
      })
      
      const result = service.compareUnits([badTab])
      
      expect(result.statistics['bad-tab']).toBeDefined()
      expect(result.statistics['bad-tab'].tonnage).toBe(0) // Fallback values
    })
  })

  describe('unit statistics calculation', () => {
    it('should calculate armor statistics correctly', () => {
      const tab = createMockTabUnit('tab-1', 'Test Mech', {
        tonnage: 50,
        armorAllocation: {
          HD: { front: 9, rear: 0 },
          CT: { front: 20, rear: 6 },
          LT: { front: 16, rear: 5 },
          RT: { front: 16, rear: 5 },
          LA: { front: 16, rear: 0 },
          RA: { front: 16, rear: 0 },
          LL: { front: 20, rear: 0 },
          RL: { front: 20, rear: 0 }
        }
      })
      
      const result = service.compareUnits([tab])
      const stats = result.statistics['tab-1']
      
      expect(stats.armorPoints).toBe(149) // Sum of all armor points: 9+26+21+21+16+16+20+20 = 149
      expect(stats.survivability.armorPerTon).toBeCloseTo(2.98) // 149/50
      expect(stats.survivability.totalArmor).toBe(149)
    })

    it('should calculate mobility metrics', () => {
      const tab = createMockTabUnit('tab-1', 'Fast Mech', {
        walkMP: 6,
        runMP: 9,
        jumpMP: 6
      })
      
      const result = service.compareUnits([tab])
      const stats = result.statistics['tab-1']
      
      expect(stats.mobility.walkMP).toBe(6)
      expect(stats.mobility.runMP).toBe(9)
      expect(stats.mobility.jumpMP).toBe(6)
    })

    it('should calculate heat efficiency', () => {
      const tab = createMockTabUnit('tab-1', 'Cool Mech', {
        totalHeatSinks: 20,
        heatSinkType: 'Double'
      })
      
      const result = service.compareUnits([tab])
      const stats = result.statistics['tab-1']
      
      // With 2 weapons generating ~6 heat and 20 double heat sinks (40 dissipation)
      expect(stats.heatEfficiency).toBeGreaterThan(90)
    })

    it('should estimate battle value based on tonnage', () => {
      const tabs = [
        createMockTabUnit('light', 'Locust', { tonnage: 20 }),
        createMockTabUnit('heavy', 'Atlas', { tonnage: 100 })
      ]
      
      const result = service.compareUnits(tabs)
      
      expect(result.statistics['light'].battleValue).toBe(400) // 20 * 20
      expect(result.statistics['heavy'].battleValue).toBe(2000) // 100 * 20
    })

    it('should calculate cost with engine multipliers', () => {
      const tabs = [
        createMockTabUnit('standard', 'Standard Mech', { 
          tonnage: 50, 
          engineType: 'Standard' 
        }),
        createMockTabUnit('xl', 'XL Mech', { 
          tonnage: 50, 
          engineType: 'XL' 
        })
      ]
      
      const result = service.compareUnits(tabs)
      
      const standardCost = result.statistics['standard'].cost
      const xlCost = result.statistics['xl'].cost
      
      expect(xlCost).toBe(standardCost * 2) // XL engines cost 2x
    })
  })

  describe('recommendation generation', () => {
    it('should recommend armor improvements for low armor', () => {
      const tab = createMockTabUnit('low-armor', 'Weak Mech', {
        tonnage: 100,
        armorAllocation: {
          HD: { front: 3, rear: 0 },
          CT: { front: 5, rear: 1 },
          LT: { front: 3, rear: 1 },
          RT: { front: 3, rear: 1 },
          LA: { front: 3, rear: 0 },
          RA: { front: 3, rear: 0 },
          LL: { front: 3, rear: 0 },
          RL: { front: 3, rear: 0 }
        }
      })
      
      const result = service.compareUnits([tab])
      
      const armorRec = result.recommendations.find(r => r === 'armor')
      expect(armorRec).toBeDefined()
      expect(armorRec?.severity).toBe('warning')
      expect(armorRec?.message).toContain('Low armor protection')
    })

    it('should recommend heat management improvements', () => {
      const tab = createMockTabUnit('hot-mech', 'Hot Mech', {
        totalHeatSinks: 10,
        heatSinkType: 'Single'
      })
      
      // Mock high heat generation weapons
      tab.unitManager.getUnallocatedEquipment = jest.fn().mockReturnValue([
        { equipmentData: { name: 'PPC', type: 'weapon' } },
        { equipmentData: { name: 'Large Laser', type: 'weapon' } },
        { equipmentData: { name: 'AC/20', type: 'weapon' } },
        { equipmentData: { name: 'SRM-6', type: 'weapon' } }
      ])
      
      const result = service.compareUnits([tab])
      
      const heatRec = result.recommendations.find(r => r === 'heat')
      expect(heatRec).toBeDefined()
      expect(heatRec?.severity).toBe('warning')
      expect(heatRec?.message).toContain('Poor heat management')
    })

    it('should recommend mobility improvements for slow mechs', () => {
      const tab = createMockTabUnit('slow-mech', 'Slow Mech', {
        tonnage: 50, // Medium mech
        walkMP: 2   // Very slow
      })
      
      const result = service.compareUnits([tab])
      
      const mobilityRec = result.recommendations.find(r => r === 'engine')
      expect(mobilityRec).toBeDefined()
      expect(mobilityRec?.severity).toBe('info')
      expect(mobilityRec?.message).toContain('Low mobility')
    })

    it('should recommend weapons for unarmed mechs', () => {
      const tab = createMockTabUnit('unarmed', 'Unarmed Mech')
      tab.unitManager.getUnallocatedEquipment = jest.fn().mockReturnValue([])
      
      const result = service.compareUnits([tab])
      
      const weaponRec = result.recommendations.find(r => r === 'weapons')
      expect(weaponRec).toBeDefined()
      expect(weaponRec?.severity).toBe('error')
      expect(weaponRec?.message).toContain('No weapons detected')
    })
  })

  describe('comparative analysis', () => {
    it('should identify best overall unit by battle value', () => {
      const tabs = [
        createMockTabUnit('weak', 'Weak Mech', { tonnage: 20 }),
        createMockTabUnit('strong', 'Strong Mech', { tonnage: 100 })
      ]
      
      const result = service.compareUnits(tabs)
      
      expect(result.analysis.bestOverall).toBe('strong')
    })

    it('should identify most efficient unit by heat management', () => {
      const tabs = [
        createMockTabUnit('hot', 'Hot Mech', { 
          totalHeatSinks: 10, 
          heatSinkType: 'Single' 
        }),
        createMockTabUnit('cool', 'Cool Mech', { 
          totalHeatSinks: 20, 
          heatSinkType: 'Double' 
        })
      ]
      
      // Mock different weapon loadouts
      tabs[0].unitManager.getUnallocatedEquipment = jest.fn().mockReturnValue([
        { equipmentData: { name: 'PPC', type: 'weapon' } },
        { equipmentData: { name: 'Large Laser', type: 'weapon' } }
      ])
      tabs[1].unitManager.getUnallocatedEquipment = jest.fn().mockReturnValue([
        { equipmentData: { name: 'Medium Laser', type: 'weapon' } }
      ])
      
      const result = service.compareUnits(tabs)
      
      expect(result.analysis.mostEfficient).toBe('cool')
    })

    it('should identify highest firepower unit', () => {
      const tabs = [
        createMockTabUnit('light-weapons', 'Light Armed', { tonnage: 30 }),
        createMockTabUnit('heavy-weapons', 'Heavy Armed', { tonnage: 80 })
      ]
      
      const result = service.compareUnits(tabs)
      
      // Heavy mech should have higher estimated damage
      expect(result.analysis.highestFirepower).toBe('heavy-weapons')
    })

    it('should identify best survivability unit', () => {
      const tabs = [
        createMockTabUnit('glass-cannon', 'Glass Cannon', {
          tonnage: 50,
          armorAllocation: {
            HD: { front: 3, rear: 0 },
            CT: { front: 5, rear: 1 },
            LT: { front: 3, rear: 1 },
            RT: { front: 3, rear: 1 },
            LA: { front: 3, rear: 0 },
            RA: { front: 3, rear: 0 },
            LL: { front: 3, rear: 0 },
            RL: { front: 3, rear: 0 }
          }
        }),
        createMockTabUnit('tank', 'Tank', {
          tonnage: 50,
          armorAllocation: {
            HD: { front: 9, rear: 0 },
            CT: { front: 20, rear: 10 },
            LT: { front: 20, rear: 8 },
            RT: { front: 20, rear: 8 },
            LA: { front: 20, rear: 0 },
            RA: { front: 20, rear: 0 },
            LL: { front: 20, rear: 0 },
            RL: { front: 20, rear: 0 }
          }
        })
      ]
      
      const result = service.compareUnits(tabs)
      
      expect(result.analysis.bestSurvivability).toBe('tank')
    })
  })

  describe('export functionality', () => {
    let sampleComparison: ComparisonResult

    beforeEach(() => {
      const tabs = [
        createMockTabUnit('mech1', 'Atlas', { tonnage: 100 }),
        createMockTabUnit('mech2', 'Locust', { tonnage: 20 })
      ]
      sampleComparison = service.compareUnits(tabs)
    })

    it('should export to CSV format', () => {
      const csv = service.exportComparison(sampleComparison, 'csv')
      
      expect(csv).toContain('Unit Name,Tonnage,Battle Value')
      expect(csv).toContain('Atlas,100')
      expect(csv).toContain('Locust,20')
      
      const lines = csv.split('\n')
      expect(lines.length).toBeGreaterThan(2) // Header + data rows
    })

    it('should export to JSON format', () => {
      const json = service.exportComparison(sampleComparison, 'json')
      
      const parsed = JSON.parse(json)
      expect(parsed.tabs).toHaveLength(2)
      expect(parsed.statistics).toBeDefined()
      expect(parsed.analysis).toBeDefined()
    })

    it('should export to text format', () => {
      const text = service.exportComparison(sampleComparison, 'text')
      
      expect(text).toContain('BattleTech Unit Comparison Report')
      expect(text).toContain('Best Overall Unit:')
      expect(text).toContain('Detailed Statistics:')
      expect(text).toContain('Atlas:')
      expect(text).toContain('Locust:')
      
      if (sampleComparison.recommendations.length > 0) {
        expect(text).toContain('Recommendations:')
      }
    })

    it('should throw error for unsupported format', () => {
      expect(() => {
        service.exportComparison(sampleComparison, 'xml' as any)
      }).toThrow('Unsupported export format: xml')
    })
  })

  describe('comparison metrics', () => {
    it('should calculate dashboard metrics', () => {
      const tabs = [
        createMockTabUnit('mech1', 'Atlas', { tonnage: 100 }),
        createMockTabUnit('mech2', 'Centurion', { tonnage: 50 }),
        createMockTabUnit('mech3', 'Locust', { tonnage: 20 })
      ]
      
      const comparison = service.compareUnits(tabs)
      const metrics = service.getComparisonMetrics(comparison)
      
      expect(metrics.totalUnits).toBe(3)
      expect(metrics.averageBV).toBe(1133.33) // (2000 + 1000 + 400) / 3
      expect(metrics.averageTonnage).toBe(56.67) // (100 + 50 + 20) / 3
      expect(metrics.totalRecommendations).toBeGreaterThanOrEqual(0)
      expect(metrics.criticalIssues).toBeGreaterThanOrEqual(0)
    })

    it('should handle single unit metrics', () => {
      const tabs = [createMockTabUnit('solo', 'Solo Mech', { tonnage: 75 })]
      
      const comparison = service.compareUnits(tabs)
      const metrics = service.getComparisonMetrics(comparison)
      
      expect(metrics.totalUnits).toBe(1)
      expect(metrics.averageBV).toBe(1500) // 75 * 20
      expect(metrics.averageTonnage).toBe(75)
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle units with missing armor allocation', () => {
      const tab = createMockTabUnit('no-armor', 'No Armor Mech')
      tab.unitManager.getConfiguration = jest.fn().mockReturnValue({
        ...tab.unitManager.getConfiguration(),
        armorAllocation: undefined
      })
      
      const result = service.compareUnits([tab])
      
      expect(result.statistics['no-armor'].armorPoints).toBe(0)
      expect(result.statistics['no-armor'].survivability.armorPerTon).toBe(0)
    })

    it('should handle units with zero tonnage', () => {
      const tab = createMockTabUnit('zero-ton', 'Zero Tonnage Mech', { tonnage: 0 })
      
      const result = service.compareUnits([tab])
      
      expect(result.statistics['zero-ton'].tonnage).toBe(0)
      expect(result.statistics['zero-ton'].survivability.armorPerTon).toBe(Infinity)
    })

    it('should handle units with no heat sinks', () => {
      const tab = createMockTabUnit('no-heatsinks', 'No Heat Sinks', { 
        totalHeatSinks: 0 
      })
      
      const result = service.compareUnits([tab])
      
      expect(result.statistics['no-heatsinks'].heatEfficiency).toBe(0)
    })

    it('should handle units with no weapons', () => {
      const tab = createMockTabUnit('unarmed', 'Unarmed Mech')
      tab.unitManager.getUnallocatedEquipment = jest.fn().mockReturnValue([])
      
      const result = service.compareUnits([tab])
      
      expect(result.statistics['unarmed'].weaponCount).toBe(0)
      expect(result.statistics['unarmed'].firepower.heatGeneration).toBe(0)
    })

    it('should handle null/undefined configurations gracefully', () => {
      const tab = createMockTabUnit('broken', 'Broken Mech')
      tab.unitManager.getConfiguration = jest.fn().mockReturnValue(null)
      
      const result = service.compareUnits([tab])
      
      // Should use fallback statistics
      expect(result.statistics['broken']).toBeDefined()
      expect(result.statistics['broken'].tonnage).toBe(0)
    })
  })

  describe('weapon analysis', () => {
    it('should count weapons correctly', () => {
      const tab = createMockTabUnit('armed', 'Armed Mech')
      tab.unitManager.getUnallocatedEquipment = jest.fn().mockReturnValue([
        { equipmentData: { name: 'AC/20', type: 'weapon' } },
        { equipmentData: { name: 'Medium Laser', type: 'weapon' } },
        { equipmentData: { name: 'Heat Sink', type: 'heatsink' } }, // Not a weapon
        { equipmentData: { name: 'PPC', type: 'weapon' } }
      ])
      
      const result = service.compareUnits([tab])
      
      expect(result.statistics['armed'].weaponCount).toBe(3) // Should only count weapons
    })

    it('should estimate damage based on tonnage and weapon count', () => {
      const lightArmed = createMockTabUnit('light', 'Light Armed', { tonnage: 25 })
      lightArmed.unitManager.getUnallocatedEquipment = jest.fn().mockReturnValue([
        { equipmentData: { name: 'Medium Laser', type: 'weapon' } }
      ])
      
      const heavyArmed = createMockTabUnit('heavy', 'Heavy Armed', { tonnage: 75 })
      heavyArmed.unitManager.getUnallocatedEquipment = jest.fn().mockReturnValue([
        { equipmentData: { name: 'AC/20', type: 'weapon' } },
        { equipmentData: { name: 'PPC', type: 'weapon' } }
      ])
      
      const result = service.compareUnits([lightArmed, heavyArmed])
      
      expect(result.statistics['heavy'].firepower.totalDamage)
        .toBeGreaterThan(result.statistics['light'].firepower.totalDamage)
    })
  })
})
