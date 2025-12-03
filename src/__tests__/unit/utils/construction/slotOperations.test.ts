/**
 * Slot Operations Tests
 * 
 * Tests for critical slot management operations:
 * - getFixedSlotIndices: Determine which slots are occupied by system components
 * - fillUnhittableSlots: Distribute unhittable equipment (Endo Steel, Ferro-Fibrous)
 * - compactEquipmentSlots: Move equipment to lowest available slots
 * - sortEquipmentBySize: Sort equipment by size (largest first)
 * 
 * @spec openspec/specs/critical-slot-allocation/spec.md
 * @spec openspec/specs/critical-slots-display/spec.md
 */

import {
  getFixedSlotIndices,
  getAvailableSlotIndices,
  fillUnhittableSlots,
  compactEquipmentSlots,
  sortEquipmentBySize,
  isUnhittableEquipment,
  getUnallocatedUnhittables,
  SlotAssignment,
  SlotOperationResult,
} from '@/utils/construction/slotOperations';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { IMountedEquipmentInstance } from '@/stores/unitState';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a mock equipment instance for testing
 */
function createMockEquipment(
  instanceId: string,
  location: MechLocation | undefined,
  slots: number[] | undefined,
  criticalSlots: number = 1,
  name: string = 'Test Equipment',
  equipmentId: string = `test-${instanceId}`
): IMountedEquipmentInstance {
  return {
    instanceId,
    equipmentId,
    name,
    category: EquipmentCategory.WEAPON,
    weight: 1,
    criticalSlots,
    heat: 0,
    techBase: TechBase.INNER_SPHERE,
    location,
    slots: slots ? [...slots] : undefined,
    isRearMounted: false,
    linkedAmmoId: undefined,
    isRemovable: true,
  };
}

/**
 * Create an Endo Steel slot equipment item
 */
function createEndoSteelSlot(
  instanceId: string,
  location: MechLocation | undefined = undefined,
  slots: number[] | undefined = undefined
): IMountedEquipmentInstance {
  return {
    instanceId,
    equipmentId: 'internal-structure-slot-Endo Steel (IS)',
    name: 'Endo Steel (IS)',
    category: EquipmentCategory.STRUCTURAL,
    weight: 0,
    criticalSlots: 1,
    heat: 0,
    techBase: TechBase.INNER_SPHERE,
    location,
    slots,
    isRearMounted: false,
    linkedAmmoId: undefined,
    isRemovable: false,
  };
}

/**
 * Create a Ferro-Fibrous slot equipment item
 */
function createFerroFibrousSlot(
  instanceId: string,
  location: MechLocation | undefined = undefined,
  slots: number[] | undefined = undefined
): IMountedEquipmentInstance {
  return {
    instanceId,
    equipmentId: 'armor-slot-Ferro-Fibrous (IS)',
    name: 'Ferro-Fibrous (IS)',
    category: EquipmentCategory.STRUCTURAL,
    weight: 0,
    criticalSlots: 1,
    heat: 0,
    techBase: TechBase.INNER_SPHERE,
    location,
    slots,
    isRearMounted: false,
    linkedAmmoId: undefined,
    isRemovable: false,
  };
}

// =============================================================================
// Tests: getFixedSlotIndices
// =============================================================================

describe('getFixedSlotIndices', () => {
  describe('Head location', () => {
    it('should return fixed slots 0, 1, 2, 4, 5 (Life Support, Sensors, Cockpit)', () => {
      const fixed = getFixedSlotIndices(
        MechLocation.HEAD,
        EngineType.STANDARD,
        GyroType.STANDARD
      );
      
      expect(fixed.has(0)).toBe(true);  // Life Support
      expect(fixed.has(1)).toBe(true);  // Sensors
      expect(fixed.has(2)).toBe(true);  // Cockpit
      expect(fixed.has(3)).toBe(false); // Assignable
      expect(fixed.has(4)).toBe(true);  // Sensors
      expect(fixed.has(5)).toBe(true);  // Life Support
    });

    it('should have exactly 5 fixed slots', () => {
      const fixed = getFixedSlotIndices(
        MechLocation.HEAD,
        EngineType.STANDARD,
        GyroType.STANDARD
      );
      expect(fixed.size).toBe(5);
    });

    it('should be independent of engine type', () => {
      const standardEngine = getFixedSlotIndices(MechLocation.HEAD, EngineType.STANDARD, GyroType.STANDARD);
      const xlEngine = getFixedSlotIndices(MechLocation.HEAD, EngineType.XL_IS, GyroType.STANDARD);
      const compactEngine = getFixedSlotIndices(MechLocation.HEAD, EngineType.COMPACT, GyroType.STANDARD);
      
      expect([...standardEngine]).toEqual([...xlEngine]);
      expect([...standardEngine]).toEqual([...compactEngine]);
    });
  });

  describe('Center Torso location', () => {
    it('should calculate correct slots for Standard Engine + Standard Gyro', () => {
      const fixed = getFixedSlotIndices(
        MechLocation.CENTER_TORSO,
        EngineType.STANDARD,
        GyroType.STANDARD
      );
      
      // Standard engine: 6 CT slots (0-2, then 7-9 after gyro)
      // Standard gyro: 4 slots (3-6)
      // Total: 10 fixed slots (0-9)
      expect(fixed.has(0)).toBe(true);  // Engine
      expect(fixed.has(1)).toBe(true);  // Engine
      expect(fixed.has(2)).toBe(true);  // Engine
      expect(fixed.has(3)).toBe(true);  // Gyro
      expect(fixed.has(4)).toBe(true);  // Gyro
      expect(fixed.has(5)).toBe(true);  // Gyro
      expect(fixed.has(6)).toBe(true);  // Gyro
      expect(fixed.has(7)).toBe(true);  // Engine
      expect(fixed.has(8)).toBe(true);  // Engine
      expect(fixed.has(9)).toBe(true);  // Engine
      expect(fixed.has(10)).toBe(false); // Available
      expect(fixed.has(11)).toBe(false); // Available
    });

    it('should calculate correct slots for Compact Engine + Standard Gyro', () => {
      const fixed = getFixedSlotIndices(
        MechLocation.CENTER_TORSO,
        EngineType.COMPACT,
        GyroType.STANDARD
      );
      
      // Compact engine: 3 CT slots (0-2)
      // Standard gyro: 4 slots (3-6)
      // Total: 7 fixed slots
      expect(fixed.size).toBe(7);
      expect(fixed.has(0)).toBe(true);
      expect(fixed.has(1)).toBe(true);
      expect(fixed.has(2)).toBe(true);
      expect(fixed.has(3)).toBe(true);
      expect(fixed.has(4)).toBe(true);
      expect(fixed.has(5)).toBe(true);
      expect(fixed.has(6)).toBe(true);
      expect(fixed.has(7)).toBe(false);
    });

    it('should calculate correct slots for Standard Engine + XL Gyro', () => {
      const fixed = getFixedSlotIndices(
        MechLocation.CENTER_TORSO,
        EngineType.STANDARD,
        GyroType.XL
      );
      
      // Standard engine: 6 CT slots
      // XL gyro: 6 slots (3-8)
      // Layout: Engine 0-2, Gyro 3-8, Engine 9-11
      expect(fixed.has(3)).toBe(true);  // Gyro
      expect(fixed.has(4)).toBe(true);  // Gyro
      expect(fixed.has(5)).toBe(true);  // Gyro
      expect(fixed.has(6)).toBe(true);  // Gyro
      expect(fixed.has(7)).toBe(true);  // Gyro
      expect(fixed.has(8)).toBe(true);  // Gyro
    });

    it('should calculate correct slots for Standard Engine + Compact Gyro', () => {
      const fixed = getFixedSlotIndices(
        MechLocation.CENTER_TORSO,
        EngineType.STANDARD,
        GyroType.COMPACT
      );
      
      // Standard engine: 6 CT slots
      // Compact gyro: 2 slots (3-4)
      // Layout: Engine 0-2, Gyro 3-4, Engine 5-7
      expect(fixed.has(3)).toBe(true);  // Gyro
      expect(fixed.has(4)).toBe(true);  // Gyro
      expect(fixed.has(5)).toBe(true);  // Engine (after gyro)
    });
  });

  describe('Arm locations', () => {
    it('should return fixed actuator slots 0-3 for Left Arm', () => {
      const fixed = getFixedSlotIndices(
        MechLocation.LEFT_ARM,
        EngineType.STANDARD,
        GyroType.STANDARD
      );
      
      expect(fixed.has(0)).toBe(true);  // Shoulder
      expect(fixed.has(1)).toBe(true);  // Upper Arm
      expect(fixed.has(2)).toBe(true);  // Lower Arm
      expect(fixed.has(3)).toBe(true);  // Hand
      expect(fixed.has(4)).toBe(false); // Available
      expect(fixed.size).toBe(4);
    });

    it('should return fixed actuator slots 0-3 for Right Arm', () => {
      const fixed = getFixedSlotIndices(
        MechLocation.RIGHT_ARM,
        EngineType.STANDARD,
        GyroType.STANDARD
      );
      
      expect(fixed.has(0)).toBe(true);
      expect(fixed.has(1)).toBe(true);
      expect(fixed.has(2)).toBe(true);
      expect(fixed.has(3)).toBe(true);
      expect(fixed.size).toBe(4);
    });

    it('should be independent of engine/gyro type', () => {
      const withStandard = getFixedSlotIndices(MechLocation.LEFT_ARM, EngineType.STANDARD, GyroType.STANDARD);
      const withXL = getFixedSlotIndices(MechLocation.LEFT_ARM, EngineType.XL_IS, GyroType.XL);
      
      expect([...withStandard]).toEqual([...withXL]);
    });
  });

  describe('Leg locations', () => {
    it('should return fixed actuator slots 0-3 for Left Leg', () => {
      const fixed = getFixedSlotIndices(
        MechLocation.LEFT_LEG,
        EngineType.STANDARD,
        GyroType.STANDARD
      );
      
      expect(fixed.has(0)).toBe(true);  // Hip
      expect(fixed.has(1)).toBe(true);  // Upper Leg
      expect(fixed.has(2)).toBe(true);  // Lower Leg
      expect(fixed.has(3)).toBe(true);  // Foot
      expect(fixed.has(4)).toBe(false); // Available
      expect(fixed.has(5)).toBe(false); // Available
      expect(fixed.size).toBe(4);
    });

    it('should return fixed actuator slots 0-3 for Right Leg', () => {
      const fixed = getFixedSlotIndices(
        MechLocation.RIGHT_LEG,
        EngineType.STANDARD,
        GyroType.STANDARD
      );
      
      expect(fixed.size).toBe(4);
    });
  });

  describe('Side Torso locations with Standard Engine', () => {
    it('should return no fixed slots for Left Torso with Standard Engine', () => {
      const fixed = getFixedSlotIndices(
        MechLocation.LEFT_TORSO,
        EngineType.STANDARD,
        GyroType.STANDARD
      );
      
      expect(fixed.size).toBe(0);
    });

    it('should return no fixed slots for Right Torso with Standard Engine', () => {
      const fixed = getFixedSlotIndices(
        MechLocation.RIGHT_TORSO,
        EngineType.STANDARD,
        GyroType.STANDARD
      );
      
      expect(fixed.size).toBe(0);
    });
  });

  describe('Side Torso locations with XL Engine (IS)', () => {
    it('should return 3 fixed engine slots for Left Torso', () => {
      const fixed = getFixedSlotIndices(
        MechLocation.LEFT_TORSO,
        EngineType.XL_IS,
        GyroType.STANDARD
      );
      
      expect(fixed.has(0)).toBe(true);  // Engine
      expect(fixed.has(1)).toBe(true);  // Engine
      expect(fixed.has(2)).toBe(true);  // Engine
      expect(fixed.has(3)).toBe(false); // Available
      expect(fixed.size).toBe(3);
    });

    it('should return 3 fixed engine slots for Right Torso', () => {
      const fixed = getFixedSlotIndices(
        MechLocation.RIGHT_TORSO,
        EngineType.XL_IS,
        GyroType.STANDARD
      );
      
      expect(fixed.size).toBe(3);
      expect(fixed.has(0)).toBe(true);
      expect(fixed.has(1)).toBe(true);
      expect(fixed.has(2)).toBe(true);
    });
  });

  describe('Side Torso locations with XL Engine (Clan)', () => {
    it('should return 2 fixed engine slots for Left Torso', () => {
      const fixed = getFixedSlotIndices(
        MechLocation.LEFT_TORSO,
        EngineType.XL_CLAN,
        GyroType.STANDARD
      );
      
      expect(fixed.has(0)).toBe(true);  // Engine
      expect(fixed.has(1)).toBe(true);  // Engine
      expect(fixed.has(2)).toBe(false); // Available
      expect(fixed.size).toBe(2);
    });
  });

  describe('Side Torso locations with Light Engine', () => {
    it('should return 2 fixed engine slots for each side torso', () => {
      const leftFixed = getFixedSlotIndices(
        MechLocation.LEFT_TORSO,
        EngineType.LIGHT,
        GyroType.STANDARD
      );
      
      const rightFixed = getFixedSlotIndices(
        MechLocation.RIGHT_TORSO,
        EngineType.LIGHT,
        GyroType.STANDARD
      );
      
      expect(leftFixed.size).toBe(2);
      expect(rightFixed.size).toBe(2);
    });
  });

  describe('Side Torso locations with XXL Engine', () => {
    it('should return 3 fixed engine slots for each side torso', () => {
      const fixed = getFixedSlotIndices(
        MechLocation.LEFT_TORSO,
        EngineType.XXL,
        GyroType.STANDARD
      );
      
      expect(fixed.size).toBe(3);
      expect(fixed.has(0)).toBe(true);
      expect(fixed.has(1)).toBe(true);
      expect(fixed.has(2)).toBe(true);
    });
  });

  describe('Side Torso locations with Compact Engine', () => {
    it('should return no fixed slots for side torsos', () => {
      const leftFixed = getFixedSlotIndices(
        MechLocation.LEFT_TORSO,
        EngineType.COMPACT,
        GyroType.STANDARD
      );
      
      const rightFixed = getFixedSlotIndices(
        MechLocation.RIGHT_TORSO,
        EngineType.COMPACT,
        GyroType.STANDARD
      );
      
      expect(leftFixed.size).toBe(0);
      expect(rightFixed.size).toBe(0);
    });
  });
});

// =============================================================================
// Tests: getAvailableSlotIndices
// =============================================================================

describe('getAvailableSlotIndices', () => {
  it('should return only available slots after fixed and equipment', () => {
    const equipment = [
      createMockEquipment('eq1', MechLocation.LEFT_TORSO, [3, 4, 5], 3),
    ];
    
    const available = getAvailableSlotIndices(
      MechLocation.LEFT_TORSO,
      EngineType.STANDARD,
      GyroType.STANDARD,
      equipment
    );
    
    // Standard engine: 0 fixed slots in LT
    // Equipment in 3-5
    // Available: 0, 1, 2, 6, 7, 8, 9, 10, 11
    expect(available).toEqual([0, 1, 2, 6, 7, 8, 9, 10, 11]);
  });

  it('should exclude fixed slots when using XL engine', () => {
    const equipment: IMountedEquipmentInstance[] = [];
    
    const available = getAvailableSlotIndices(
      MechLocation.LEFT_TORSO,
      EngineType.XL_IS,
      GyroType.STANDARD,
      equipment
    );
    
    // XL engine: 0-2 are fixed
    expect(available).not.toContain(0);
    expect(available).not.toContain(1);
    expect(available).not.toContain(2);
    expect(available).toContain(3);
    expect(available.length).toBe(9);
  });

  it('should handle overlapping fixed and equipment slots', () => {
    const equipment = [
      createMockEquipment('eq1', MechLocation.LEFT_ARM, [4, 5], 2),
    ];
    
    const available = getAvailableSlotIndices(
      MechLocation.LEFT_ARM,
      EngineType.STANDARD,
      GyroType.STANDARD,
      equipment
    );
    
    // Arm has fixed 0-3, equipment in 4-5
    expect(available).toEqual([6, 7, 8, 9, 10, 11]);
  });

  it('should return all slots for empty side torso with standard engine', () => {
    const available = getAvailableSlotIndices(
      MechLocation.RIGHT_TORSO,
      EngineType.STANDARD,
      GyroType.STANDARD,
      []
    );
    
    expect(available.length).toBe(12);
    expect(available).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
});

// =============================================================================
// Tests: isUnhittableEquipment
// =============================================================================

describe('isUnhittableEquipment', () => {
  it('should identify Endo Steel equipment', () => {
    const equipment = createEndoSteelSlot('endo1');
    expect(isUnhittableEquipment(equipment)).toBe(true);
  });

  it('should identify Ferro-Fibrous equipment', () => {
    const equipment = createFerroFibrousSlot('ferro1');
    expect(isUnhittableEquipment(equipment)).toBe(true);
  });

  it('should identify equipment by equipmentId containing "endo"', () => {
    const equipment = createMockEquipment('eq1', undefined, undefined, 1, 'Custom', 'custom-endo-slot');
    expect(isUnhittableEquipment(equipment)).toBe(true);
  });

  it('should identify equipment by equipmentId containing "ferro"', () => {
    const equipment = createMockEquipment('eq1', undefined, undefined, 1, 'Custom', 'custom-ferro-slot');
    expect(isUnhittableEquipment(equipment)).toBe(true);
  });

  it('should NOT identify regular weapons as unhittable', () => {
    const equipment = createMockEquipment('eq1', undefined, undefined, 2, 'Medium Laser', 'medium-laser');
    expect(isUnhittableEquipment(equipment)).toBe(false);
  });

  it('should NOT identify ammunition as unhittable', () => {
    const equipment = createMockEquipment('eq1', undefined, undefined, 1, 'AC/10 Ammo', 'ac10-ammo');
    expect(isUnhittableEquipment(equipment)).toBe(false);
  });
});

// =============================================================================
// Tests: getUnallocatedUnhittables
// =============================================================================

describe('getUnallocatedUnhittables', () => {
  it('should return only unallocated unhittable equipment', () => {
    const equipment = [
      createEndoSteelSlot('endo1', undefined, undefined),
      createEndoSteelSlot('endo2', MechLocation.LEFT_TORSO, [0]),
      createFerroFibrousSlot('ferro1', undefined, undefined),
      createMockEquipment('weapon', undefined, undefined, 2, 'PPC'),
    ];
    
    const unallocated = getUnallocatedUnhittables(equipment);
    
    expect(unallocated).toHaveLength(2);
    expect(unallocated.find(e => e.instanceId === 'endo1')).toBeDefined();
    expect(unallocated.find(e => e.instanceId === 'ferro1')).toBeDefined();
    expect(unallocated.find(e => e.instanceId === 'endo2')).toBeUndefined(); // Allocated
    expect(unallocated.find(e => e.instanceId === 'weapon')).toBeUndefined(); // Not unhittable
  });

  it('should return empty array when all unhittables are allocated', () => {
    const equipment = [
      createEndoSteelSlot('endo1', MechLocation.LEFT_TORSO, [0]),
      createEndoSteelSlot('endo2', MechLocation.RIGHT_TORSO, [0]),
    ];
    
    const unallocated = getUnallocatedUnhittables(equipment);
    expect(unallocated).toHaveLength(0);
  });

  it('should return empty array when no unhittables exist', () => {
    const equipment = [
      createMockEquipment('weapon1', undefined, undefined, 2, 'AC/10'),
      createMockEquipment('weapon2', MechLocation.LEFT_ARM, [4, 5], 2, 'PPC'),
    ];
    
    const unallocated = getUnallocatedUnhittables(equipment);
    expect(unallocated).toHaveLength(0);
  });
});

// =============================================================================
// Tests: fillUnhittableSlots
// =============================================================================

describe('fillUnhittableSlots', () => {
  it('should distribute unhittable slots evenly starting with side torsos', () => {
    const equipment = [
      createEndoSteelSlot('endo1'),
      createEndoSteelSlot('endo2'),
      createEndoSteelSlot('endo3'),
      createEndoSteelSlot('endo4'),
    ];
    
    const result = fillUnhittableSlots(equipment, EngineType.STANDARD, GyroType.STANDARD);
    
    // Should alternate between LT and RT
    expect(result.assignments).toHaveLength(4);
    
    const ltAssignments = result.assignments.filter(a => a.location === MechLocation.LEFT_TORSO);
    const rtAssignments = result.assignments.filter(a => a.location === MechLocation.RIGHT_TORSO);
    
    expect(ltAssignments.length).toBe(2);
    expect(rtAssignments.length).toBe(2);
  });

  it('should skip already-placed unhittable equipment', () => {
    const equipment = [
      createEndoSteelSlot('endo1', MechLocation.LEFT_TORSO, [0]),
      createEndoSteelSlot('endo2'),
    ];
    
    const result = fillUnhittableSlots(equipment, EngineType.STANDARD, GyroType.STANDARD);
    
    // Only endo2 should be assigned
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0].instanceId).toBe('endo2');
  });

  it('should use arms when torsos are full', () => {
    // Create enough equipment to fill side torsos (24 slots each)
    const equipment: IMountedEquipmentInstance[] = [];
    for (let i = 0; i < 30; i++) {
      equipment.push(createEndoSteelSlot(`endo${i}`));
    }
    
    const result = fillUnhittableSlots(equipment, EngineType.STANDARD, GyroType.STANDARD);
    
    const armAssignments = result.assignments.filter(
      a => a.location === MechLocation.LEFT_ARM || a.location === MechLocation.RIGHT_ARM
    );
    
    expect(armAssignments.length).toBeGreaterThan(0);
  });

  it('should account for XL engine slots in side torsos', () => {
    const equipment = [
      createEndoSteelSlot('endo1'),
      createEndoSteelSlot('endo2'),
    ];
    
    const result = fillUnhittableSlots(equipment, EngineType.XL_IS, GyroType.STANDARD);
    
    // XL engine takes slots 0-2 in side torsos, so first available is 3
    const ltAssignment = result.assignments.find(a => a.location === MechLocation.LEFT_TORSO);
    if (ltAssignment) {
      expect(ltAssignment.slots[0]).toBeGreaterThanOrEqual(3);
    }
  });

  it('should return unassigned list when all locations are full', () => {
    // This is a theoretical test - in practice, 78 slots can't be filled
    const equipment: IMountedEquipmentInstance[] = [];
    for (let i = 0; i < 100; i++) {
      equipment.push(createEndoSteelSlot(`endo${i}`));
    }
    
    const result = fillUnhittableSlots(equipment, EngineType.STANDARD, GyroType.STANDARD);
    
    // Some should be unassigned since we have more than available slots
    expect(result.assignments.length + result.unassigned.length).toBe(100);
  });

  it('should return empty result when no unhittable equipment exists', () => {
    const equipment = [
      createMockEquipment('weapon1', undefined, undefined, 2, 'AC/10'),
    ];
    
    const result = fillUnhittableSlots(equipment, EngineType.STANDARD, GyroType.STANDARD);
    
    expect(result.assignments).toHaveLength(0);
    expect(result.unassigned).toHaveLength(0);
  });
});

// =============================================================================
// Tests: compactEquipmentSlots
// =============================================================================

describe('compactEquipmentSlots', () => {
  it('should move equipment to lowest available slots', () => {
    const equipment = [
      createMockEquipment('eq1', MechLocation.LEFT_TORSO, [5, 6, 7], 3),
      createMockEquipment('eq2', MechLocation.LEFT_TORSO, [10, 11], 2),
    ];
    
    const result = compactEquipmentSlots(equipment, EngineType.STANDARD, GyroType.STANDARD);
    
    // With standard engine, LT has no fixed slots
    // eq1 should move to 0-2, eq2 to 3-4
    const eq1Assignment = result.assignments.find(a => a.instanceId === 'eq1');
    const eq2Assignment = result.assignments.find(a => a.instanceId === 'eq2');
    
    expect(eq1Assignment?.slots).toEqual([0, 1, 2]);
    expect(eq2Assignment?.slots).toEqual([3, 4]);
  });

  it('should preserve equipment order when compacting', () => {
    const equipment = [
      createMockEquipment('first', MechLocation.LEFT_ARM, [8, 9], 2),
      createMockEquipment('second', MechLocation.LEFT_ARM, [4, 5], 2),
    ];
    
    const result = compactEquipmentSlots(equipment, EngineType.STANDARD, GyroType.STANDARD);
    
    // "second" is at lower index, so it should remain first after compacting
    const secondAssignment = result.assignments.find(a => a.instanceId === 'second');
    const firstAssignment = result.assignments.find(a => a.instanceId === 'first');
    
    // Arm has fixed slots 0-3, so first available is 4
    expect(secondAssignment?.slots).toEqual([4, 5]);
    expect(firstAssignment?.slots).toEqual([6, 7]);
  });

  it('should skip fixed slots when compacting', () => {
    const equipment = [
      createMockEquipment('eq1', MechLocation.LEFT_TORSO, [5, 6], 2),
    ];
    
    const result = compactEquipmentSlots(equipment, EngineType.XL_IS, GyroType.STANDARD);
    
    // XL engine takes slots 0-2, so first available is 3
    const eq1Assignment = result.assignments.find(a => a.instanceId === 'eq1');
    expect(eq1Assignment?.slots).toEqual([3, 4]);
  });

  it('should process each location independently', () => {
    const equipment = [
      createMockEquipment('lt1', MechLocation.LEFT_TORSO, [8, 9], 2),
      createMockEquipment('rt1', MechLocation.RIGHT_TORSO, [10, 11], 2),
    ];
    
    const result = compactEquipmentSlots(equipment, EngineType.STANDARD, GyroType.STANDARD);
    
    const ltAssignment = result.assignments.find(a => a.instanceId === 'lt1');
    const rtAssignment = result.assignments.find(a => a.instanceId === 'rt1');
    
    // Each should be compacted to slot 0 in their respective location
    expect(ltAssignment?.slots).toEqual([0, 1]);
    expect(rtAssignment?.slots).toEqual([0, 1]);
  });

  it('should handle equipment without slots', () => {
    const equipment = [
      createMockEquipment('eq1', MechLocation.LEFT_TORSO, undefined, 2),
      createMockEquipment('eq2', MechLocation.LEFT_TORSO, [5, 6], 2),
    ];
    
    const result = compactEquipmentSlots(equipment, EngineType.STANDARD, GyroType.STANDARD);
    
    // Only eq2 has slots and should be compacted
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0].instanceId).toBe('eq2');
  });

  it('should return empty result when no equipment is allocated', () => {
    const equipment = [
      createMockEquipment('eq1', undefined, undefined, 2),
    ];
    
    const result = compactEquipmentSlots(equipment, EngineType.STANDARD, GyroType.STANDARD);
    expect(result.assignments).toHaveLength(0);
  });
});

// =============================================================================
// Tests: sortEquipmentBySize
// =============================================================================

describe('sortEquipmentBySize', () => {
  it('should sort equipment by slot count descending (largest first)', () => {
    const equipment = [
      createMockEquipment('small', MechLocation.LEFT_TORSO, [0], 1, 'Small'),
      createMockEquipment('large', MechLocation.LEFT_TORSO, [1, 2, 3, 4], 4, 'Large'),
      createMockEquipment('medium', MechLocation.LEFT_TORSO, [5, 6], 2, 'Medium'),
    ];
    
    const result = sortEquipmentBySize(equipment, EngineType.STANDARD, GyroType.STANDARD);
    
    // Large (4 slots) should be first, then Medium (2), then Small (1)
    expect(result.assignments[0].instanceId).toBe('large');
    expect(result.assignments[1].instanceId).toBe('medium');
    expect(result.assignments[2].instanceId).toBe('small');
    
    // Verify they're compacted to lowest slots
    expect(result.assignments[0].slots).toEqual([0, 1, 2, 3]);
    expect(result.assignments[1].slots).toEqual([4, 5]);
    expect(result.assignments[2].slots).toEqual([6]);
  });

  it('should sort alphabetically when slot counts are equal', () => {
    const equipment = [
      createMockEquipment('z', MechLocation.LEFT_TORSO, [0, 1], 2, 'Zebra'),
      createMockEquipment('a', MechLocation.LEFT_TORSO, [2, 3], 2, 'Alpha'),
      createMockEquipment('m', MechLocation.LEFT_TORSO, [4, 5], 2, 'Mike'),
    ];
    
    const result = sortEquipmentBySize(equipment, EngineType.STANDARD, GyroType.STANDARD);
    
    // All have 2 slots, so should be alphabetical
    expect(result.assignments[0].instanceId).toBe('a');  // Alpha
    expect(result.assignments[1].instanceId).toBe('m');  // Mike
    expect(result.assignments[2].instanceId).toBe('z');  // Zebra
  });

  it('should process each location independently', () => {
    const equipment = [
      createMockEquipment('lt-small', MechLocation.LEFT_TORSO, [0], 1, 'A'),
      createMockEquipment('lt-large', MechLocation.LEFT_TORSO, [1, 2], 2, 'B'),
      createMockEquipment('rt-small', MechLocation.RIGHT_TORSO, [0], 1, 'C'),
      createMockEquipment('rt-large', MechLocation.RIGHT_TORSO, [1, 2], 2, 'D'),
    ];
    
    const result = sortEquipmentBySize(equipment, EngineType.STANDARD, GyroType.STANDARD);
    
    // Each location should have large before small
    const ltAssignments = result.assignments.filter(a => a.location === MechLocation.LEFT_TORSO);
    const rtAssignments = result.assignments.filter(a => a.location === MechLocation.RIGHT_TORSO);
    
    expect(ltAssignments[0].instanceId).toBe('lt-large');
    expect(ltAssignments[1].instanceId).toBe('lt-small');
    expect(rtAssignments[0].instanceId).toBe('rt-large');
    expect(rtAssignments[1].instanceId).toBe('rt-small');
  });

  it('should skip fixed slots when sorting', () => {
    const equipment = [
      createMockEquipment('eq1', MechLocation.LEFT_TORSO, [5, 6, 7, 8], 4),
    ];
    
    const result = sortEquipmentBySize(equipment, EngineType.XL_IS, GyroType.STANDARD);
    
    // XL engine takes slots 0-2
    expect(result.assignments[0].slots).toEqual([3, 4, 5, 6]);
  });

  it('should handle empty equipment list', () => {
    const result = sortEquipmentBySize([], EngineType.STANDARD, GyroType.STANDARD);
    expect(result.assignments).toHaveLength(0);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('integration: slot operations workflow', () => {
  it('should correctly fill, then compact Endo Steel slots', () => {
    // Create 14 Endo Steel slots (IS requirement)
    const equipment: IMountedEquipmentInstance[] = [];
    for (let i = 0; i < 14; i++) {
      equipment.push(createEndoSteelSlot(`endo${i}`));
    }
    
    // Step 1: Fill
    const fillResult = fillUnhittableSlots(equipment, EngineType.STANDARD, GyroType.STANDARD);
    expect(fillResult.assignments.length).toBe(14);
    expect(fillResult.unassigned.length).toBe(0);
    
    // Apply fill assignments
    const filledEquipment = equipment.map(eq => {
      const assignment = fillResult.assignments.find(a => a.instanceId === eq.instanceId);
      if (assignment) {
        return { ...eq, location: assignment.location, slots: [...assignment.slots] };
      }
      return eq;
    });
    
    // Step 2: Compact (should be no-op since fill already compacts)
    const compactResult = compactEquipmentSlots(filledEquipment, EngineType.STANDARD, GyroType.STANDARD);
    
    // Verify all equipment is assigned
    expect(compactResult.assignments.length).toBe(14);
  });

  it('should handle complex slot operations with multiple equipment types', () => {
    const equipment = [
      // Unhittable
      createEndoSteelSlot('endo1'),
      createEndoSteelSlot('endo2'),
      // Regular equipment
      createMockEquipment('weapon1', MechLocation.LEFT_ARM, [4, 5, 6, 7, 8, 9, 10], 7, 'AC/10'),
      createMockEquipment('weapon2', MechLocation.RIGHT_ARM, [4, 5], 2, 'Medium Laser'),
    ];
    
    // Fill unhittables
    const fillResult = fillUnhittableSlots(equipment, EngineType.STANDARD, GyroType.STANDARD);
    expect(fillResult.assignments.length).toBe(2); // Only endo slots
    
    // Sort by size
    const sortResult = sortEquipmentBySize(
      equipment.filter(e => e.location !== undefined),
      EngineType.STANDARD,
      GyroType.STANDARD
    );
    
    // AC/10 (7 slots) should be before Medium Laser (2 slots) in left arm
    const leftArmAssignments = sortResult.assignments.filter(a => a.location === MechLocation.LEFT_ARM);
    if (leftArmAssignments.length > 0) {
      expect(leftArmAssignments[0].instanceId).toBe('weapon1');
    }
  });
});

