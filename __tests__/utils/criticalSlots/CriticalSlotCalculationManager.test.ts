/**
 * CriticalSlotCalculationManager Tests
 * Tests for critical slot calculations and analysis
 */

import { CriticalSlotCalculationManager } from '../../../utils/criticalSlots/CriticalSlotCalculationManager'
import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManagerTypes'

describe('CriticalSlotCalculationManager', () => {
  let mockConfiguration: UnitConfiguration

  beforeEach(() => {
    mockConfiguration = {
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
  })

  describe('getTotalCriticalSlots', () => {
    test('should return standard BattleMech total', () => {
      const total = CriticalSlotCalculationManager.getTotalCriticalSlots()
      expect(total).toBe(78) // Standard BattleMech total
    })
  })

  describe('getStructureCriticalSlots', () => {
    test('should return 0 for Standard structure', () => {
      const slots = CriticalSlotCalculationManager.getStructureCriticalSlots('Standard')
      expect(slots).toBe(0)
    })

    test('should return 14 for Endo Steel', () => {
      const slots = CriticalSlotCalculationManager.getStructureCriticalSlots('Endo Steel')
      expect(slots).toBe(14)
    })

    test('should return 7 for Endo Steel (Clan)', () => {
      const slots = CriticalSlotCalculationManager.getStructureCriticalSlots('Endo Steel (Clan)')
      expect(slots).toBe(7)
    })
  })

  describe('getArmorCriticalSlots', () => {
    test('should return 0 for Standard armor', () => {
      const slots = CriticalSlotCalculationManager.getArmorCriticalSlots('Standard', 'Inner Sphere')
      expect(slots).toBe(0)
    })

    test('should return 14 for Ferro-Fibrous', () => {
      const slots = CriticalSlotCalculationManager.getArmorCriticalSlots('Ferro-Fibrous', 'Inner Sphere')
      expect(slots).toBe(14)
    })

    test('should return 7 for Ferro-Fibrous (Clan)', () => {
      const slots = CriticalSlotCalculationManager.getArmorCriticalSlots('Ferro-Fibrous (Clan)', 'Clan')
      expect(slots).toBe(7)
    })
  })

  describe('getCriticalSlotBreakdown', () => {
    test('should calculate breakdown for standard configuration', () => {
      const breakdown = CriticalSlotCalculationManager.getCriticalSlotBreakdown(mockConfiguration)
      
      expect(breakdown.total).toBe(78)
      expect(breakdown.structure).toBe(0) // Standard structure
      expect(breakdown.used).toBeGreaterThan(0)
      expect(breakdown.free).toBeGreaterThan(0)
      expect(breakdown.utilizationPercentage).toBeGreaterThan(0)
    })

    test('should calculate breakdown with Endo Steel', () => {
      const configWithEndo = {
        ...mockConfiguration,
        structureType: { type: 'Endo Steel', techBase: 'Inner Sphere' as const }
      }
      
      const breakdown = CriticalSlotCalculationManager.getCriticalSlotBreakdown(configWithEndo)
      
      expect(breakdown.structure).toBe(14)
      expect(breakdown.used).toBeGreaterThan(14)
    })

    test('should calculate breakdown with Ferro-Fibrous armor', () => {
      const configWithFerro = {
        ...mockConfiguration,
        armorType: { type: 'Ferro-Fibrous', techBase: 'Inner Sphere' as const }
      }
      
      const breakdown = CriticalSlotCalculationManager.getCriticalSlotBreakdown(configWithFerro)
      
      expect(breakdown.used).toBeGreaterThan(0)
    })
  })

  describe('calculateSystemComponentSlots', () => {
    test('should calculate slots for standard engine and gyro', () => {
      const slots = CriticalSlotCalculationManager.calculateSystemComponentSlots(mockConfiguration)
      expect(slots).toBeGreaterThanOrEqual(0)
    })

    test('should calculate slots for XL engine', () => {
      const configWithXL = {
        ...mockConfiguration,
        engineType: 'XL' as const
      }
      
      const slots = CriticalSlotCalculationManager.calculateSystemComponentSlots(configWithXL)
      expect(slots).toBeGreaterThan(0)
    })

    test('should calculate slots for external heat sinks', () => {
      const configWithExternal = {
        ...mockConfiguration,
        externalHeatSinks: 5
      }
      
      const slots = CriticalSlotCalculationManager.calculateSystemComponentSlots(configWithExternal)
      expect(slots).toBeGreaterThan(0)
    })

    test('should calculate slots for jump jets', () => {
      const configWithJump = {
        ...mockConfiguration,
        jumpMP: 3
      }
      
      const slots = CriticalSlotCalculationManager.calculateSystemComponentSlots(configWithJump)
      expect(slots).toBeGreaterThan(0)
    })
  })

  describe('getTotalUsedCriticalSlots', () => {
    test('should calculate total used slots', () => {
      const used = CriticalSlotCalculationManager.getTotalUsedCriticalSlots(mockConfiguration)
      expect(used).toBeGreaterThan(0)
      expect(used).toBeLessThanOrEqual(78)
    })

    test('should include equipment slots', () => {
      const used = CriticalSlotCalculationManager.getTotalUsedCriticalSlots(mockConfiguration, 10)
      const usedWithoutEquipment = CriticalSlotCalculationManager.getTotalUsedCriticalSlots(mockConfiguration, 0)
      expect(used).toBe(usedWithoutEquipment + 10)
    })
  })

  describe('getRemainingCriticalSlots', () => {
    test('should calculate remaining slots', () => {
      const remaining = CriticalSlotCalculationManager.getRemainingCriticalSlots(mockConfiguration)
      expect(remaining).toBeGreaterThanOrEqual(0)
      expect(remaining).toBeLessThanOrEqual(78)
    })

    test('should return 0 when over capacity', () => {
      const remaining = CriticalSlotCalculationManager.getRemainingCriticalSlots(mockConfiguration, 100)
      expect(remaining).toBe(0)
    })
  })

  describe('getEquipmentBurden', () => {
    test('should calculate equipment burden percentage', () => {
      const burden = CriticalSlotCalculationManager.getEquipmentBurden(mockConfiguration)
      expect(burden).toBeGreaterThan(0)
      expect(burden).toBeLessThanOrEqual(100)
    })

    test('should handle over 100% burden', () => {
      const burden = CriticalSlotCalculationManager.getEquipmentBurden(mockConfiguration, 100)
      expect(burden).toBeGreaterThan(100)
    })
  })

  describe('getOverCapacitySlots', () => {
    test('should return 0 when under capacity', () => {
      const overCapacity = CriticalSlotCalculationManager.getOverCapacitySlots(mockConfiguration)
      expect(overCapacity).toBe(0)
    })

    test('should calculate over capacity slots', () => {
      const overCapacity = CriticalSlotCalculationManager.getOverCapacitySlots(mockConfiguration, 100)
      expect(overCapacity).toBeGreaterThan(0)
    })
  })

  describe('hasSufficientSlots', () => {
    test('should return true when sufficient slots available', () => {
      const hasSufficient = CriticalSlotCalculationManager.hasSufficientSlots(mockConfiguration)
      expect(hasSufficient).toBe(true)
    })

    test('should return false when insufficient slots', () => {
      const hasSufficient = CriticalSlotCalculationManager.hasSufficientSlots(mockConfiguration, 100)
      expect(hasSufficient).toBe(false)
    })
  })

  describe('getSlotEfficiency', () => {
    test('should calculate slot efficiency', () => {
      const efficiency = CriticalSlotCalculationManager.getSlotEfficiency(mockConfiguration)
      expect(efficiency).toBeGreaterThan(0)
      expect(efficiency).toBeLessThanOrEqual(100)
    })
  })
}) 