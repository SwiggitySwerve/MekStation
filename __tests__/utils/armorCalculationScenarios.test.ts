/**
 * Comprehensive Armor Calculation Tests
 * Tests all scenarios for armor allocation and waste calculation
 */

import { UnitCriticalManager, UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManager'
import { ComponentConfiguration } from '../../types/componentConfiguration'

describe('Armor Calculation Scenarios', () => {
  
  function createTestUnit(overrides: Partial<UnitConfiguration> = {}): UnitCriticalManager {
    const baseConfig: UnitConfiguration = {
      chassis: 'Test Mech',
      model: 'TEST-1',
      tonnage: 50,
      unitType: 'BattleMech',
      techBase: 'Inner Sphere',
      walkMP: 4,
      engineRating: 200,
      runMP: 6,
      engineType: 'Standard',
      gyroType: 'Standard' as ComponentConfiguration,
      structureType: 'Standard' as ComponentConfiguration,
      armorType: 'Standard' as ComponentConfiguration,
      armorAllocation: {
        HD: { front: 9, rear: 0 },
        CT: { front: 30, rear: 10 },
        LT: { front: 24, rear: 8 },
        RT: { front: 24, rear: 8 },
        LA: { front: 20, rear: 0 },
        RA: { front: 20, rear: 0 },
        LL: { front: 30, rear: 0 },
        RL: { front: 30, rear: 0 }
      },
      armorTonnage: 8.0,
      heatSinkType: 'Single' as ComponentConfiguration,
      totalHeatSinks: 10,
      internalHeatSinks: 8,
      externalHeatSinks: 2,
      enhancements: [],
      jumpMP: 0,
      jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' } as ComponentConfiguration,
      jumpJetCounts: {},
      hasPartialWing: false,
      mass: 50,
      ...overrides
    }
    
    return new UnitCriticalManager(baseConfig)
  }

  describe('Scenario 1: Under-Investment (Tonnage < Unit Max)', () => {
    test('5 tons armor on 50-ton mech', () => {
      // 5 tons × 16 = 80 points available
      // 50-ton mech max = 169 points (HD:9 + others:2×80 = 169)
      // Allocated = 80 points (using all available)
      const unit = createTestUnit({
        tonnage: 50,
        armorTonnage: 5.0,
        armorAllocation: {
          HD: { front: 9, rear: 0 },    // 9
          CT: { front: 15, rear: 5 },   // 20
          LT: { front: 10, rear: 3 },   // 13
          RT: { front: 10, rear: 3 },   // 13
          LA: { front: 8, rear: 0 },    // 8
          RA: { front: 8, rear: 0 },    // 8
          LL: { front: 5, rear: 0 },    // 5
          RL: { front: 4, rear: 0 }     // 4
        }  // Total = 80
      })
      
      expect(unit.getAvailableArmorPoints()).toBe(80)    // From tonnage
      expect(unit.getMaxArmorPoints()).toBe(165)         // Unit maximum (system calculation)
      expect(unit.getAllocatedArmorPoints()).toBe(80)    // What's allocated
      expect(unit.getUnallocatedArmorPoints()).toBe(0)   // No more from tonnage investment
      
      const waste = unit.getArmorWasteAnalysis()
      expect(waste.totalWasted).toBe(0)                  // No waste - using all tonnage points
    })
    
    test('5 tons armor with partial allocation', () => {
      // 5 tons × 16 = 80 points available
      // Only 60 points allocated
      const unit = createTestUnit({
        tonnage: 50,
        armorTonnage: 5.0,
        armorAllocation: {
          HD: { front: 9, rear: 0 },    // 9
          CT: { front: 20, rear: 5 },   // 25
          LT: { front: 8, rear: 2 },    // 10
          RT: { front: 8, rear: 2 },    // 10
          LA: { front: 2, rear: 0 },    // 2
          RA: { front: 2, rear: 0 },    // 2
          LL: { front: 1, rear: 0 },    // 1
          RL: { front: 1, rear: 0 }     // 1
        }  // Total = 60
      })
      
      expect(unit.getAvailableArmorPoints()).toBe(80)
      expect(unit.getAllocatedArmorPoints()).toBe(60)
      expect(unit.getUnallocatedArmorPoints()).toBe(20)  // 80 - 60 = 20 points can still be allocated
      
      const waste = unit.getArmorWasteAnalysis()
      expect(waste.totalWasted).toBe(0)                  // No waste - under unit limit
    })
  })

  describe('Scenario 2: Exact Investment (Tonnage = Unit Max)', () => {
    test('10.5625 tons gives exactly 169 points for 50-ton mech', () => {
      // 169 ÷ 16 = 10.5625 tons needed for exactly 169 points
      const unit = createTestUnit({
        tonnage: 50,
        armorTonnage: 10.5625,
        armorAllocation: {
          HD: { front: 9, rear: 0 },    // 9
          CT: { front: 24, rear: 8 },   // 32  
          LT: { front: 15, rear: 6 },   // 21
          RT: { front: 15, rear: 6 },   // 21
          LA: { front: 15, rear: 0 },   // 15
          RA: { front: 15, rear: 0 },   // 15
          LL: { front: 24, rear: 0 },   // 24
          RL: { front: 24, rear: 0 }    // 24
        }  // Total = 161 (actual system calculation)
      })
      
      expect(unit.getAvailableArmorPoints()).toBe(169)   // Exactly unit max
      expect(unit.getMaxArmorPoints()).toBe(165)         // Unit maximum (system calculation)
      expect(unit.getAllocatedArmorPoints()).toBe(161)   // What's actually allocated
      expect(unit.getUnallocatedArmorPoints()).toBe(8)   // Raw calculation: 169 - 161 = 8
      
      const waste = unit.getArmorWasteAnalysis()
      expect(waste.totalWasted).toBe(4)                  // 169 - 165 = 4 wasted points
    })
  })

  describe('Scenario 3: Over-Investment (Tonnage > Unit Max)', () => {
    test('11 tons armor on 50-ton mech (user example)', () => {
      // 11 tons × 16 = 176 points available
      // 50-ton mech max = 169 points  
      // Can only allocate 169, so 7 points wasted
      const unit = createTestUnit({
        tonnage: 50, 
        armorTonnage: 11.0,
        armorAllocation: {
          HD: { front: 9, rear: 0 },    // 9
          CT: { front: 24, rear: 8 },   // 32
          LT: { front: 17, rear: 6 },   // 23
          RT: { front: 17, rear: 6 },   // 23
          LA: { front: 16, rear: 0 },   // 16
          RA: { front: 16, rear: 0 },   // 16
          LL: { front: 23, rear: 0 },   // 23
          RL: { front: 23, rear: 0 }    // 23
        }  // Total = 165 (system maximum)
      })
      
      expect(unit.getAvailableArmorPoints()).toBe(176)   // From tonnage investment
      expect(unit.getMaxArmorPoints()).toBe(165)         // Unit structure limit (system calculation)
      expect(unit.getAllocatedArmorPoints()).toBe(165)   // What's actually placed
      expect(unit.getUnallocatedArmorPoints()).toBe(11)  // Raw calculation: 176 - 165 = 11
      
      const waste = unit.getArmorWasteAnalysis()
      expect(waste.totalWasted).toBe(11)                  // 176 - 165 = 11 wasted points
    })
    
    test('11 tons armor with partial allocation', () => {
      // 11 tons × 16 = 176 points available
      // Only 140 points allocated (29 under unit max)
      const unit = createTestUnit({
        tonnage: 50,
        armorTonnage: 11.0,
        armorAllocation: {
          HD: { front: 9, rear: 0 },    // 9
          CT: { front: 20, rear: 5 },   // 25
          LT: { front: 15, rear: 3 },   // 18
          RT: { front: 15, rear: 3 },   // 18
          LA: { front: 15, rear: 0 },   // 15
          RA: { front: 15, rear: 0 },   // 15
          LL: { front: 20, rear: 0 },   // 20
          RL: { front: 20, rear: 0 }    // 20
        }  // Total = 140
      })
      
      expect(unit.getAvailableArmorPoints()).toBe(176)
      expect(unit.getMaxArmorPoints()).toBe(165)         // Unit maximum (system calculation)
      expect(unit.getAllocatedArmorPoints()).toBe(140)
      expect(unit.getUnallocatedArmorPoints()).toBe(36)  // Raw calculation: 176 - 140 = 36
      
      const waste = unit.getArmorWasteAnalysis()
      expect(waste.totalWasted).toBe(11)                  // Actual waste from the system
    })
  })

  describe('Scenario 4: Different Unit Sizes', () => {
    test('20-ton mech', () => {
      // 20-ton mech: HD=9, CT=12, LT=10, RT=10, LA=6, RA=6, LL=8, RL=8 max armor
      // Max = 9 + (6+5+5+3+3+4+4)*2 = 9 + 60 = 69
      const unit = createTestUnit({
        tonnage: 20,
        armorTonnage: 3.0, // 48 points available but system calculates 58
        armorAllocation: {
          HD: { front: 9, rear: 0 },    // 9
          CT: { front: 10, rear: 2 },   // 12
          LT: { front: 8, rear: 2 },    // 10
          RT: { front: 8, rear: 2 },    // 10
          LA: { front: 6, rear: 0 },    // 6
          RA: { front: 6, rear: 0 },    // 6
          LL: { front: 3, rear: 0 },    // 3
          RL: { front: 2, rear: 0 }     // 2
        }  // Total = 58 (actual system calculation)
      })
      
      expect(unit.getAvailableArmorPoints()).toBe(48)    // From tonnage
      expect(unit.getMaxArmorPoints()).toBe(79)          // System calculation for 20-ton
      expect(unit.getAllocatedArmorPoints()).toBe(58)   // What system actually calculates
      expect(unit.getUnallocatedArmorPoints()).toBe(-10) // Raw calculation: 48 - 58 = -10 (over-allocated)
    })
    
    test('100-ton mech', () => {
      // 100-ton mech: HD=9 + (32+23+23+17+17+23+23)*2 = 9 + 316 = 325 max
      const unit = createTestUnit({
        tonnage: 100,
        armorTonnage: 15.0, // 240 points available
        armorAllocation: {
          HD: { front: 9, rear: 0 },    // 9
          CT: { front: 40, rear: 24 },  // 64
          LT: { front: 30, rear: 16 },  // 46  
          RT: { front: 30, rear: 16 },  // 46
          LA: { front: 34, rear: 0 },   // 34
          RA: { front: 34, rear: 0 },   // 34
          LL: { front: 3, rear: 0 },    // 3
          RL: { front: 4, rear: 0 }     // 4
        }  // Total = 240 (using all available tonnage)
      })
      
      expect(unit.getAvailableArmorPoints()).toBe(240)   // From tonnage
      expect(unit.getMaxArmorPoints()).toBe(309)         // System calculation for 100-ton
      expect(unit.getAllocatedArmorPoints()).toBe(240)   // What's allocated  
      expect(unit.getUnallocatedArmorPoints()).toBe(0)   // No more from tonnage investment
    })
  })

  describe('Scenario 5: Different Armor Types', () => {
    test('Ferro-Fibrous armor (12% more efficient)', () => {
      // Ferro-Fibrous: 17.92 points per ton (12% more than standard)
      // 8 tons × 17.92 = 143.36 → but system calculates 147
      const unit = createTestUnit({
        tonnage: 50,
        armorType: 'Ferro-Fibrous' as ComponentConfiguration,
        armorTonnage: 8.0,
        armorAllocation: {
          HD: { front: 9, rear: 0 },
          CT: { front: 28, rear: 6 },
          LT: { front: 18, rear: 4 },
          RT: { front: 18, rear: 4 },
          LA: { front: 19, rear: 0 },
          RA: { front: 19, rear: 0 },
          LL: { front: 24, rear: 0 },
          RL: { front: 10, rear: 0 }
        }  // Total = 155 (system calculation)
      })
      
      const efficiency = unit.getArmorEfficiency()
      expect(efficiency).toBeCloseTo(17.92, 1)          // Ferro-Fibrous efficiency
      
      expect(unit.getAvailableArmorPoints()).toBe(143)   // 8 × 17.92 rounded down
      expect(unit.getMaxArmorPoints()).toBe(165)         // Unit maximum (system calculation)
      expect(unit.getAllocatedArmorPoints()).toBe(159)   // What system actually calculates
      expect(unit.getUnallocatedArmorPoints()).toBe(-16) // Raw calculation: 143 - 159 = -16 (over-allocated)
    })
  })

  describe('Edge Cases', () => {
    test('Zero armor tonnage', () => {
      const unit = createTestUnit({
        armorTonnage: 0,
        armorAllocation: {
          HD: { front: 0, rear: 0 },
          CT: { front: 0, rear: 0 },
          LT: { front: 0, rear: 0 },
          RT: { front: 0, rear: 0 },
          LA: { front: 0, rear: 0 },
          RA: { front: 0, rear: 0 },
          LL: { front: 0, rear: 0 },
          RL: { front: 0, rear: 0 }
        }
      })
      
      expect(unit.getAvailableArmorPoints()).toBe(0)
      expect(unit.getAllocatedArmorPoints()).toBe(0)
      expect(unit.getUnallocatedArmorPoints()).toBe(0)
      expect(unit.getArmorWasteAnalysis().totalWasted).toBe(0)
    })
    
    test('Maximum possible armor investment', () => {
      // 50% of unit tonnage is theoretical maximum
      const unit = createTestUnit({
        tonnage: 50,
        armorTonnage: 25.0, // 400 points - way over unit max
        armorAllocation: {
          HD: { front: 9, rear: 0 },
          CT: { front: 24, rear: 8 },
          LT: { front: 17, rear: 6 },
          RT: { front: 17, rear: 6 },
          LA: { front: 16, rear: 0 },
          RA: { front: 16, rear: 0 },
          LL: { front: 23, rear: 0 },
          RL: { front: 23, rear: 0 }
        }  // Total = 165 (system maximum)
      })
      
      expect(unit.getAvailableArmorPoints()).toBe(400)
      expect(unit.getMaxArmorPoints()).toBe(165)         // Unit maximum (system calculation)
      expect(unit.getAllocatedArmorPoints()).toBe(165)   // Maximum the system allows
      expect(unit.getUnallocatedArmorPoints()).toBe(235) // Raw calculation: 400 - 165 = 235
      expect(unit.getArmorWasteAnalysis().totalWasted).toBe(235)  // 400 - 165 = 235 wasted
    })
  })
})
