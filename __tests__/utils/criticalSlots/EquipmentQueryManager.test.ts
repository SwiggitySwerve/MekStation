/**
 * EquipmentQueryManager Tests
 * Tests for equipment lookup, group queries, and name search
 */

import { EquipmentQueryManager } from '../../../utils/criticalSlots/EquipmentQueryManager'
import { EquipmentObject, EquipmentAllocation } from '../../../utils/criticalSlots/CriticalSlot'
import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManagerTypes'

// Minimal mock for CriticalSection
class MockCriticalSection {
  private allocations: EquipmentAllocation[]
  constructor(allocations: EquipmentAllocation[]) {
    this.allocations = allocations
  }
  getAllEquipment() {
    return this.allocations
  }
}

describe('EquipmentQueryManager', () => {
  let equipmentManager: EquipmentQueryManager
  let mockSections: Map<string, any>
  let mockUnallocated: EquipmentAllocation[]
  let mockConfig: UnitConfiguration
  let eq1: EquipmentObject, eq2: EquipmentObject, eq3: EquipmentObject

  beforeEach(() => {
    eq1 = {
      id: 'eq1',
      name: 'Medium Laser',
      requiredSlots: 1,
      weight: 1.0,
      type: 'weapon',
      techBase: 'Inner Sphere',
      heat: 3
    }
    eq2 = {
      id: 'eq2',
      name: 'Small Laser',
      requiredSlots: 1,
      weight: 0.5,
      type: 'weapon',
      techBase: 'Inner Sphere',
      heat: 1
    }
    eq3 = {
      id: 'eq3',
      name: 'Double Heat Sink',
      requiredSlots: 2,
      weight: 1.0,
      type: 'heat_sink',
      techBase: 'Inner Sphere',
      heat: -6
    }
    const alloc1: EquipmentAllocation = { equipmentData: eq1, equipmentGroupId: 'g1', location: 'LA', startSlotIndex: 0, endSlotIndex: 0, occupiedSlots: [0] }
    const alloc2: EquipmentAllocation = { equipmentData: eq2, equipmentGroupId: 'g2', location: 'RA', startSlotIndex: 0, endSlotIndex: 0, occupiedSlots: [0] }
    const alloc3: EquipmentAllocation = { equipmentData: eq3, equipmentGroupId: 'g3', location: '', startSlotIndex: -1, endSlotIndex: -1, occupiedSlots: [] }
    mockSections = new Map([
      ['LA', new MockCriticalSection([alloc1])],
      ['RA', new MockCriticalSection([alloc2])]
    ])
    mockUnallocated = [alloc3]
    mockConfig = {
      chassis: 'Test',
      model: 'T-1',
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
    equipmentManager = new EquipmentQueryManager(mockSections, mockUnallocated, mockConfig)
  })

  describe('getAllEquipment', () => {
    test('should return all equipment allocations by id', () => {
      const all = equipmentManager.getAllEquipment()
      expect(all.get('eq1')![0].equipmentData.name).toBe('Medium Laser')
      expect(all.get('eq2')![0].equipmentData.name).toBe('Small Laser')
      expect(all.get('eq3')![0].equipmentData.name).toBe('Double Heat Sink')
    })
  })

  describe('getAllEquipmentGroups', () => {
    test('should return all equipment groups', () => {
      const groups = equipmentManager.getAllEquipmentGroups()
      expect(groups).toHaveLength(3)
      expect(groups.map(g => g.groupId)).toEqual(expect.arrayContaining(['g1', 'g2', 'g3']))
    })
  })

  describe('findEquipmentByName', () => {
    test('should find equipment allocations by name', () => {
      const found = equipmentManager.findEquipmentByName('Medium Laser')
      expect(found).toHaveLength(1)
      expect(found[0].equipmentData.name).toBe('Medium Laser')
    })
    test('should return empty array for unknown name', () => {
      const found = equipmentManager.findEquipmentByName('Unknown')
      expect(found).toHaveLength(0)
    })
  })
}) 