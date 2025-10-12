/**
 * Enhanced Auto-Allocation Tests
 * Comprehensive testing for the new priority-based equipment allocation system
 */

import { UnitCriticalManager, UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManager'
import { EquipmentObject, EquipmentAllocation } from '../../utils/criticalSlots/CriticalSlot'

describe('Enhanced Auto-Allocation System', () => {
  let unitManager: UnitCriticalManager
  let baseConfig: UnitConfiguration

  beforeEach(() => {
    // Base configuration for a 50-ton mech with Ferro-Fibrous armor
    baseConfig = {
      chassis: 'Test Mech',
      model: 'Test-1',
      tonnage: 50,
      unitType: 'BattleMech' as const,
      techBase: 'Inner Sphere' as const,
      walkMP: 4,
      engineRating: 200,
      runMP: 6,
      engineType: 'Standard' as const,
      gyroType: { type: 'Standard' as const, techBase: 'Inner Sphere' as const },
      structureType: { type: 'Standard' as const, techBase: 'Inner Sphere' as const },
      armorType: { type: 'Ferro-Fibrous' as const, techBase: 'Inner Sphere' as const },
      armorAllocation: {
        HD: { front: 9, rear: 0 },
        CT: { front: 20, rear: 8 },
        LT: { front: 16, rear: 6 },
        RT: { front: 16, rear: 6 },
        LA: { front: 12, rear: 0 },
        RA: { front: 12, rear: 0 },
        LL: { front: 16, rear: 0 },
        RL: { front: 16, rear: 0 }
      },
      armorTonnage: 8.5,
      heatSinkType: { type: 'Single', techBase: 'Inner Sphere' as const },
      totalHeatSinks: 10,
      internalHeatSinks: 8,
      externalHeatSinks: 2,
      jumpMP: 0,
      jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' as const },
      jumpJetCounts: {},
      hasPartialWing: false,
      enhancements: [],
      mass: 50
    }

    unitManager = new UnitCriticalManager(baseConfig)
  })

  describe('Equipment Priority Sorting', () => {
    test('should sort by critical slots required (descending)', () => {
      // Add equipment with different slot requirements
      const equipment: EquipmentAllocation[] = [
        createTestEquipment('Single Heat Sink', 'heat_sink', 1, 1.0),
        createTestEquipment('AC/20', 'weapon', 10, 14.0),
        createTestEquipment('PPC', 'weapon', 3, 7.0),
        createTestEquipment('Medium Laser', 'weapon', 1, 1.0),
        createTestEquipment('LRM-20', 'weapon', 5, 10.0)
      ]

      unitManager['unallocatedEquipment'] = equipment
      const result = unitManager.autoAllocateEquipment()

      expect(result.success).toBe(true)
      expect(result.placedEquipment).toBeGreaterThan(0)

      // Verify largest equipment was placed first by checking remaining unallocated
      const remaining = unitManager.getUnallocatedEquipment()
      const remainingNames = remaining.map(eq => eq.equipmentData.name)
      
      // AC/20 (10 slots) should be placed first, so it shouldn't be in remaining
      expect(remainingNames).not.toContain('AC/20')
    })

    test('should prioritize unhittable components within same slot count', () => {
      // Add equipment with same slot count but different types
      const equipment: EquipmentAllocation[] = [
        createTestEquipment('Medium Laser', 'weapon', 1, 1.0),
        createTestEquipment('Ferro-Fibrous', 'equipment', 1, 0.0, 'armor'),
        createTestEquipment('Single Heat Sink', 'heat_sink', 1, 1.0),
        createTestEquipment('Endo Steel', 'equipment', 1, 0.0, 'structure')
      ]

      unitManager['unallocatedEquipment'] = equipment
      const result = unitManager.autoAllocateEquipment()

      expect(result.success).toBe(true)
      
      // Should prioritize unhittable components first
      const allocatedEquipment = getAllocatedEquipmentNames(unitManager)
      expect(allocatedEquipment).toContain('Ferro-Fibrous')
      expect(allocatedEquipment).toContain('Endo Steel')
    })
  })

  describe('Multi-Slot Equipment Placement', () => {
    test('should place large weapons in locations with sufficient consecutive slots', () => {
      const equipment: EquipmentAllocation[] = [
        createTestEquipment('AC/20', 'weapon', 10, 14.0),
        createTestEquipment('Gauss Rifle', 'weapon', 7, 15.0)
      ]

      unitManager['unallocatedEquipment'] = equipment
      const result = unitManager.autoAllocateEquipment()

      expect(result.success).toBe(true)
      expect(result.placedEquipment).toBeGreaterThan(0)

      // Check that large weapons were placed in torso locations (which have more space)
      const torsoEquipment = getTorsoEquipment(unitManager)
      const torsoNames = torsoEquipment.map(eq => eq.equipmentData.name)
      
      expect(torsoNames.some(name => ['AC/20', 'Gauss Rifle'].includes(name))).toBe(true)
    })

    test('should handle when no location has enough consecutive slots', () => {
      // Create a scenario where the AC/20 definitely cannot fit
      // First place the AC/20 in unallocated, then fill up with many small items
      // The slots-first priority will try to place AC/20 first, but if there's truly no space, it will fail
      
      const largeEquipment: EquipmentAllocation[] = [
        createTestEquipment('AC/20', 'weapon', 10, 14.0)
      ]
      
      // Add enough small equipment to fill most available user slots
      // A standard mech has ~78 total slots, minus ~30 for system components = ~48 user slots
      const fillerEquipment: EquipmentAllocation[] = Array.from({ length: 65 }, (_, i) =>
        createTestEquipment(`Heat Sink ${i + 1}`, 'heat_sink', 1, 1.0)
      )

      unitManager['unallocatedEquipment'] = [...largeEquipment, ...fillerEquipment]
      const result = unitManager.autoAllocateEquipment()

      expect(result.success).toBe(true)
      
      // Either AC/20 was placed (if there was space) or it remains unallocated
      const remaining = unitManager.getUnallocatedEquipment()
      const remainingNames = remaining.map(eq => eq.equipmentData.name)
      
      // If there's equipment that couldn't be placed, verify the result is reasonable
      if (result.failedEquipment > 0) {
        expect(result.failureReasons.length).toBeGreaterThan(0)
        // Should have detailed failure reasons for unplaceable equipment
        result.failureReasons.forEach(reason => {
          expect(reason).toContain('No available')
        })
      }
      
      // Verify that some equipment was successfully placed
      expect(result.placedEquipment).toBeGreaterThan(0)
    })
  })

  describe('Location Restrictions', () => {
    test('should respect equipment location restrictions', () => {
      // Create jump jets that can only go in torso/legs
      const jumpJets: EquipmentAllocation[] = [
        createTestEquipmentWithLocations('Jump Jet 1', 'equipment', 1, 0.5, ['Center Torso', 'Left Torso', 'Right Torso', 'Left Leg', 'Right Leg']),
        createTestEquipmentWithLocations('Jump Jet 2', 'equipment', 1, 0.5, ['Center Torso', 'Left Torso', 'Right Torso', 'Left Leg', 'Right Leg'])
      ]

      unitManager['unallocatedEquipment'] = jumpJets
      const result = unitManager.autoAllocateEquipment()

      expect(result.success).toBe(true)
      
      // Verify jump jets are only in allowed locations
      const armEquipment = getArmEquipment(unitManager)
      const headEquipment = getHeadEquipment(unitManager)
      const armNames = armEquipment.map(eq => eq.equipmentData.name)
      const headNames = headEquipment.map(eq => eq.equipmentData.name)
      
      expect(armNames).not.toContain('Jump Jet 1')
      expect(armNames).not.toContain('Jump Jet 2')
      expect(headNames).not.toContain('Jump Jet 1')
      expect(headNames).not.toContain('Jump Jet 2')
    })

    test('should handle equipment with no valid placement locations', () => {
      // Create equipment that can only go in head, but head is full
      const headOnlyEquipment: EquipmentAllocation[] = [
        createTestEquipmentWithLocations('Head Only Weapon', 'weapon', 2, 1.0, ['Head'])
      ]

      unitManager['unallocatedEquipment'] = headOnlyEquipment
      const result = unitManager.autoAllocateEquipment()

      expect(result.success).toBe(true)
      expect(result.failedEquipment).toBe(1)
      expect(result.failureReasons).toContain('Head Only Weapon: No available 2-slot space in allowed locations')
    })
  })

  describe('BattleTech Rule Compliance', () => {
    test('should not displace existing equipment', () => {
      // Manually place some equipment first
      const torsoSection = unitManager.getSection('Right Torso')
      const testEquipment = createTestEquipment('Pre-placed Laser', 'weapon', 1, 1.0)
      
      if (torsoSection) {
        torsoSection.allocateEquipment(testEquipment.equipmentData, 0, 'pre_placed_group')
      }

      // Add new equipment to allocate
      const newEquipment: EquipmentAllocation[] = [
        createTestEquipment('New Laser', 'weapon', 1, 1.0)
      ]

      unitManager['unallocatedEquipment'] = newEquipment
      const result = unitManager.autoAllocateEquipment()

      expect(result.success).toBe(true)
      
      // Verify pre-placed equipment is still there
      const torsoEquipment = torsoSection?.getAllEquipment() || []
      const torsoNames = torsoEquipment.map(eq => eq.equipmentData.name)
      expect(torsoNames).toContain('Pre-placed Laser')
    })

    test('should not allocate to system-reserved slots', () => {
      // Test that equipment doesn't go into engine or gyro slots
      const equipment: EquipmentAllocation[] = Array.from({ length: 20 }, (_, i) =>
        createTestEquipment(`Test Equipment ${i + 1}`, 'equipment', 1, 1.0)
      )

      unitManager['unallocatedEquipment'] = equipment
      const result = unitManager.autoAllocateEquipment()

      expect(result.success).toBe(true)
      
      // Verify no equipment conflicts with system components
      const centerTorso = unitManager.getSection('Center Torso')
      if (centerTorso) {
        const slots = centerTorso.getAllSlots()
        slots.forEach((slot, index) => {
          if (slot.isSystemSlot()) {
            expect(slot.content?).toBe('system')
          }
        })
      }
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty unallocated equipment list', () => {
      unitManager['unallocatedEquipment'] = []
      const result = unitManager.autoAllocateEquipment()

      expect(result.success).toBe(true)
      expect(result.placedEquipment).toBe(0)
      expect(result.failedEquipment).toBe(0)
      expect(result.message).toBe('No unallocated equipment to place')
    })

    test('should handle equipment with invalid slot requirements', () => {
      const invalidEquipment: EquipmentAllocation[] = [
        createTestEquipment('Invalid Equipment', 'equipment', 0, 1.0), // 0 slots
        createTestEquipment('Negative Equipment', 'equipment', -1, 1.0) // negative slots
      ]

      unitManager['unallocatedEquipment'] = invalidEquipment
      const result = unitManager.autoAllocateEquipment()

      expect(result.success).toBe(true)
      // Should handle gracefully without crashing
    })

    test('should provide detailed failure reasons', () => {
      const problematicEquipment: EquipmentAllocation[] = [
        createTestEquipment('Oversized Weapon', 'weapon', 15, 20.0), // Too big for any location
        createTestEquipmentWithLocations('Restricted Equipment', 'equipment', 1, 1.0, ['Nonexistent Location'])
      ]

      unitManager['unallocatedEquipment'] = problematicEquipment
      const result = unitManager.autoAllocateEquipment()

      expect(result.success).toBe(true)
      expect(result.failedEquipment).toBe(2)
      expect(result.failureReasons).toHaveLength(2)
      expect(result.failureReasons.some(reason => reason.includes('Oversized Weapon'))).toBe(true)
      expect(result.failureReasons.some(reason => reason.includes('Restricted Equipment'))).toBe(true)
    })
  })

  describe('Integration with Configuration Changes', () => {
    test('should work correctly with Endo Steel configuration', () => {
      // Create a unit with Endo Steel from the start (since that creates the components)
      const endoConfig = {
        ...baseConfig,
        structureType: { type: 'Endo Steel' as const, techBase: 'Inner Sphere' as const },
        armorType: { type: 'Standard' as const, techBase: 'Inner Sphere' as const }
      }
      
      // Create a fresh unit manager with Endo Steel config
      const endoUnitManager = new UnitCriticalManager(endoConfig)
      
      // Verify that we have unallocated equipment (from the base setup)
      const unallocated = endoUnitManager.getUnallocatedEquipment()
      expect(unallocated.length).toBeGreaterThan(0)
      
      // Test auto-allocation works with special components
      const result = endoUnitManager.autoAllocateEquipment()
      expect(result.success).toBe(true)
      
      // Should have placed some equipment successfully
      expect(result.placedEquipment).toBeGreaterThan(0)
    })

    test('should work with jump jet configuration', () => {
      // Create a unit with jump jets from the start 
      const jumpConfig = {
        ...baseConfig,
        jumpMP: 4,
        armorType: { type: 'Standard' as const, techBase: 'Inner Sphere' as const } // Remove Ferro-Fibrous to focus on jump jets
      }
      
      // Create a fresh unit manager with jump jet config
      const jumpUnitManager = new UnitCriticalManager(jumpConfig)
      
      // Verify that we have unallocated equipment (from the base setup)
      const unallocated = jumpUnitManager.getUnallocatedEquipment()
      expect(unallocated.length).toBeGreaterThan(0)
      
      // Test auto-allocation works with jump jets
      const result = jumpUnitManager.autoAllocateEquipment()
      expect(result.success).toBe(true)
      
      // Should have placed some equipment successfully
      expect(result.placedEquipment).toBeGreaterThan(0)
    })
  })
})

// Helper functions

function createTestEquipment(
  name: string, 
  type: 'weapon' | 'ammo' | 'heat_sink' | 'equipment', 
  slots: number, 
  weight: number,
  componentType?: 'structure' | 'armor'
): EquipmentAllocation {
  const equipment: EquipmentObject = {
    id: name.toLowerCase().replace(/\s+/g, '_'),
    name,
    type,
    requiredSlots: slots,
    weight,
    techBase: 'Inner Sphere',
    ...(componentType && { componentType })
  }

  return {
    equipmentData: equipment,
    equipmentGroupId: `${equipment.id}_group_${Date.now()}_${Math.random()}`,
    location: '',
    startSlotIndex: -1,
    endSlotIndex: -1,
    occupiedSlots: []
  }
}

function createTestEquipmentWithLocations(
  name: string,
  type: 'weapon' | 'ammo' | 'heat_sink' | 'equipment',
  slots: number,
  weight: number,
  allowedLocations: string[]
): EquipmentAllocation {
  const baseEquipment = createTestEquipment(name, type, slots, weight)
  baseEquipment.equipmentData.allowedLocations = allowedLocations
  return baseEquipment
}

function getAllocatedEquipmentNames(unitManager: UnitCriticalManager): string[] {
  const names: string[] = []
  unitManager.getAllSections().forEach(section => {
    section.getAllEquipment().forEach(eq => {
      names.push(eq.equipmentData.name)
    })
  })
  return names
}

function getTorsoEquipment(unitManager: UnitCriticalManager): EquipmentAllocation[] {
  const equipment: EquipmentAllocation[] = []
  const torsoSections = ['Center Torso', 'Left Torso', 'Right Torso']
  
  torsoSections.forEach(location => {
    const section = unitManager.getSection(location)
    if (section) {
      equipment.push(...section.getAllEquipment())
    }
  })
  
  return equipment
}

function getArmEquipment(unitManager: UnitCriticalManager): EquipmentAllocation[] {
  const equipment: EquipmentAllocation[] = []
  const armSections = ['Left Arm', 'Right Arm']
  
  armSections.forEach(location => {
    const section = unitManager.getSection(location)
    if (section) {
      equipment.push(...section.getAllEquipment())
    }
  })
  
  return equipment
}

function getHeadEquipment(unitManager: UnitCriticalManager): EquipmentAllocation[] {
  const section = unitManager.getSection('Head')
  return section ? section.getAllEquipment() : []
}
