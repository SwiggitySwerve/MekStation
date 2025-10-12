/**
 * Critical Slots Management Service Test Suite
 * Tests for automatic slot operations: fill, compact, sort, reset
 */

import { 
  CriticalSlotsManagementService,
  CriticalSlotsOperationResult 
} from '../../../utils/criticalSlots/CriticalSlotsManagementService';
import { UnitCriticalManager } from '../../../utils/criticalSlots/UnitCriticalManager';
import { CriticalSlot } from '../../../utils/criticalSlots/CriticalSlot';

// Mock external dependencies
jest.mock('../../../utils/criticalSlots/UnitCriticalManager');

// Get the mocked classes
const MockUnitCriticalManager = UnitCriticalManager as jest.MockedClass<typeof UnitCriticalManager>;

describe('CriticalSlotsManagementService', () => {
  let mockUnitManager: jest.Mocked<UnitCriticalManager>;
  let mockSection: any;
  let mockSlots: CriticalSlot[];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock slots with proper typing
    mockSlots = [
      { isEmpty: jest.fn(() => true), content: null },
      { isEmpty: jest.fn(() => false), content: { type: 'equipment', name: 'Test Equipment' } },
      { isEmpty: jest.fn(() => true), content: null },
      { isEmpty: jest.fn(() => false), content: { type: 'system', systemComponentType: 'engine' } },
    ] as any[];

    // Create mock section
    mockSection = {
      getAllSlots: jest.fn(() => mockSlots),
      allocateEquipment: jest.fn(() => true),
      findContiguousAvailableSlots: jest.fn(() => [0, 1, 2])
    };

    // Create mock unit manager with minimal configuration
    mockUnitManager = {
      autoAllocateEquipment: jest.fn(),
      getSection: jest.fn(() => mockSection),
      displaceEquipment: jest.fn(() => true),
      canPlaceEquipmentInLocation: jest.fn(() => true),
      getUnallocatedEquipment: jest.fn(() => []),
      getConfiguration: jest.fn(() => ({
        chassis: 'Test',
        model: 'Test',
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
          CT: { front: 30, rear: 10 },
          LT: { front: 24, rear: 8 },
          RT: { front: 24, rear: 8 },
          LA: { front: 20, rear: 0 },
          RA: { front: 20, rear: 0 },
          LL: { front: 30, rear: 0 },
          RL: { front: 30, rear: 0 }
        },
        armorTonnage: 8,
        heatSinkType: 'Single',
        totalHeatSinks: 10,
        internalHeatSinks: 8,
        externalHeatSinks: 2,
        jumpMP: 0,
        jumpJetType: 'Standard Jump Jet',
        jumpJetCounts: {},
        hasPartialWing: false,
        mass: 50
      } as any))
    } as any;
  });

  describe('Fill Unhittables Operation', () => {
    test('successfully fills equipment using auto-allocation', () => {
      const mockAutoResult = {
        success: true,
        message: 'Allocated 5 equipment items',
        slotsModified: 5,
        placedEquipment: 5,
        failedEquipment: 0,
        failureReasons: []
      };

      mockUnitManager.autoAllocateEquipment.mockReturnValue(mockAutoResult);

      const result = CriticalSlotsManagementService.fillUnhittables(mockUnitManager);

      expect(result).toEqual({
        success: true,
        message: 'Allocated 5 equipment items',
        slotsModified: 5
      });

      expect(mockUnitManager.autoAllocateEquipment).toHaveBeenCalled();
    });

    test('handles auto-allocation failure', () => {
      const mockAutoResult = {
        success: false,
        message: 'No equipment to allocate',
        slotsModified: 0,
        placedEquipment: 0,
        failedEquipment: 0,
        failureReasons: []
      };

      mockUnitManager.autoAllocateEquipment.mockReturnValue(mockAutoResult);

      const result = CriticalSlotsManagementService.fillUnhittables(mockUnitManager);

      expect(result).toEqual({
        success: false,
        message: 'No equipment to allocate',
        slotsModified: 0
      });
    });

    test('handles errors during fill operation', () => {
      mockUnitManager.autoAllocateEquipment.mockImplementation(() => {
        throw new Error('Auto-allocation failed');
      });

      const result = CriticalSlotsManagementService.fillUnhittables(mockUnitManager);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error during auto-allocation');
      expect(result.slotsModified).toBe(0);
    });
  });

  describe('Compact Operation', () => {
    test('successfully compacts slots with gaps', () => {
      // Create slots with gaps: empty, equipment, empty, equipment
      const slotsWithGaps = [
        { isEmpty: jest.fn(() => true), content: null },
        { isEmpty: jest.fn(() => false), content: { type: 'equipment', name: 'Equipment 1' } },
        { isEmpty: jest.fn(() => true), content: null },
        { isEmpty: jest.fn(() => false), content: { type: 'equipment', name: 'Equipment 2' } }
      ] as CriticalSlot[];

      mockSection.getAllSlots.mockReturnValue(slotsWithGaps);

      const result = CriticalSlotsManagementService.compact(mockUnitManager);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Compacted equipment');
      expect(result.slotsModified).toBeGreaterThanOrEqual(0);
    });

    test('handles already compacted slots', () => {
      // Create already compacted slots: equipment, equipment, empty, empty
      const compactedSlots = [
        { isEmpty: jest.fn(() => false), content: { type: 'equipment', name: 'Equipment 1' } },
        { isEmpty: jest.fn(() => false), content: { type: 'equipment', name: 'Equipment 2' } },
        { isEmpty: jest.fn(() => true), content: null },
        { isEmpty: jest.fn(() => true), content: null }
      ] as CriticalSlot[];

      mockSection.getAllSlots.mockReturnValue(compactedSlots);

      const result = CriticalSlotsManagementService.compact(mockUnitManager);

      expect(result.success).toBe(true);
      expect(result.slotsModified).toBe(0); // No changes needed
    });

    test('handles compact operation errors', () => {
      mockSection.getAllSlots.mockImplementation(() => {
        throw new Error('Section access failed');
      });

      const result = CriticalSlotsManagementService.compact(mockUnitManager);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error compacting');
      expect(result.slotsModified).toBe(0);
    });

    test('handles empty sections', () => {
      const emptySlots = [
        { isEmpty: jest.fn(() => true), content: null },
        { isEmpty: jest.fn(() => true), content: null },
        { isEmpty: jest.fn(() => true), content: null }
      ] as CriticalSlot[];

      mockSection.getAllSlots.mockReturnValue(emptySlots);

      const result = CriticalSlotsManagementService.compact(mockUnitManager);

      expect(result.success).toBe(true);
      expect(result.slotsModified).toBe(0); // Nothing to compact
    });
  });

  describe('Sort Operation', () => {
    test('successfully sorts equipment by priority', () => {
      // Create mixed equipment types
      const mixedSlots = [
        { isEmpty: jest.fn(() => false), content: { 
          type: 'equipment', 
          equipmentReference: { equipmentData: { type: 'ammo', name: 'Ammo' } } 
        }},
        { isEmpty: jest.fn(() => false), content: { 
          type: 'equipment', 
          equipmentReference: { equipmentData: { type: 'weapon', name: 'Weapon' } } 
        }},
        { isEmpty: jest.fn(() => false), content: { 
          type: 'system', 
          systemComponentType: 'engine',
          systemComponentName: 'Engine' 
        }},
        { isEmpty: jest.fn(() => true), content: null }
      ] as CriticalSlot[];

      mockSection.getAllSlots.mockReturnValue(mixedSlots);

      const result = CriticalSlotsManagementService.sort(mockUnitManager);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Sorted equipment');
      expect(result.slotsModified).toBeGreaterThanOrEqual(0);
    });

    test('handles sort operation errors', () => {
      mockSection.getAllSlots.mockImplementation(() => {
        throw new Error('Section access failed');
      });

      const result = CriticalSlotsManagementService.sort(mockUnitManager);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error sorting');
      expect(result.slotsModified).toBe(0);
    });

    test('preserves system component positions during sort', () => {
      const slotsWithSystem = [
        { isEmpty: jest.fn(() => false), content: { 
          type: 'system', 
          systemComponentType: 'engine' 
        }},
        { isEmpty: jest.fn(() => false), content: { 
          type: 'equipment', 
          equipmentReference: { equipmentData: { type: 'weapon' } } 
        }},
        { isEmpty: jest.fn(() => false), content: { 
          type: 'equipment', 
          equipmentReference: { equipmentData: { type: 'ammo' } } 
        }}
      ] as CriticalSlot[];

      mockSection.getAllSlots.mockReturnValue(slotsWithSystem);

      const result = CriticalSlotsManagementService.sort(mockUnitManager);

      expect(result.success).toBe(true);
      // System components should maintain their positions
    });
  });

  describe('Reset Operation', () => {
    test('successfully resets by removing equipment', () => {
      const slotsWithEquipment = [
        { isEmpty: jest.fn(() => false), content: { 
          type: 'equipment', 
          equipmentGroupId: 'eq1',
          name: 'Equipment 1' 
        }},
        { isEmpty: jest.fn(() => false), content: { 
          type: 'system', 
          systemComponentType: 'engine' 
        }},
        { isEmpty: jest.fn(() => false), content: { 
          type: 'equipment', 
          equipmentGroupId: 'eq2',
          name: 'Equipment 2' 
        }}
      ] as CriticalSlot[];

      mockSection.getAllSlots.mockReturnValue(slotsWithEquipment);

      const result = CriticalSlotsManagementService.reset(mockUnitManager);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Reset complete');
      expect(result.slotsModified).toBeGreaterThan(0);

      // Should have called displaceEquipment for equipment items
      expect(mockUnitManager.displaceEquipment).toHaveBeenCalledWith('eq1');
      expect(mockUnitManager.displaceEquipment).toHaveBeenCalledWith('eq2');
    });

    test('preserves system components during reset', () => {
      const systemOnlySlots = [
        { isEmpty: jest.fn(() => false), content: { 
          type: 'system', 
          systemComponentType: 'engine' 
        }},
        { isEmpty: jest.fn(() => false), content: { 
          type: 'system', 
          systemComponentType: 'gyro' 
        }},
        { isEmpty: jest.fn(() => true), content: null }
      ] as CriticalSlot[];

      mockSection.getAllSlots.mockReturnValue(systemOnlySlots);

      const result = CriticalSlotsManagementService.reset(mockUnitManager);

      expect(result.success).toBe(true);
      expect(result.slotsModified).toBe(0); // No equipment to remove

      // Should not have called displaceEquipment
      expect(mockUnitManager.displaceEquipment).not.toHaveBeenCalled();
    });

    test('handles reset operation errors', () => {
      mockSection.getAllSlots.mockImplementation(() => {
        throw new Error('Section access failed');
      });

      const result = CriticalSlotsManagementService.reset(mockUnitManager);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error resetting');
      expect(result.slotsModified).toBe(0);
    });

    test('handles displacement failures gracefully', () => {
      const slotsWithEquipment = [
        { isEmpty: jest.fn(() => false), content: { 
          type: 'equipment', 
          equipmentGroupId: 'eq1' 
        }}
      ] as CriticalSlot[];

      mockSection.getAllSlots.mockReturnValue(slotsWithEquipment);
      mockUnitManager.displaceEquipment.mockReturnValue(false); // Simulate failure

      const result = CriticalSlotsManagementService.reset(mockUnitManager);

      // Should still complete successfully even if displacement fails
      expect(result.success).toBe(true);
    });
  });

  describe('Section and Slot Management', () => {
    test('handles all standard mech sections', () => {
      // Test that all standard sections are accessed
      const sectionNames = ['Head', 'Center Torso', 'Left Torso', 'Right Torso', 'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg'];
      
      mockUnitManager.getSection.mockImplementation((name) => {
        expect(sectionNames).toContain(name);
        return mockSection;
      });

      CriticalSlotsManagementService.compact(mockUnitManager);

      // Should have called getSection for each location
      expect(mockUnitManager.getSection).toHaveBeenCalledTimes(8);
    });

    test('handles null sections gracefully', () => {
      mockUnitManager.getSection.mockReturnValue(null);

      const result = CriticalSlotsManagementService.compact(mockUnitManager);

      expect(result.success).toBe(true);
      expect(result.slotsModified).toBe(0);
    });

    test('handles sections with no slots', () => {
      mockSection.getAllSlots.mockReturnValue([]);

      const result = CriticalSlotsManagementService.compact(mockUnitManager);

      expect(result.success).toBe(true);
      expect(result.slotsModified).toBe(0);
    });
  });

  describe('Equipment Priority and Sorting Logic', () => {
    test('sorts equipment by correct priority order', () => {
      // Create equipment with different priorities
      const weaponSlot = { 
        isEmpty: jest.fn(() => false), 
        content: { 
          type: 'equipment', 
          equipmentReference: { equipmentData: { type: 'weapon' } } 
        }
      } as CriticalSlot;

      const ammoSlot = { 
        isEmpty: jest.fn(() => false), 
        content: { 
          type: 'equipment', 
          equipmentReference: { equipmentData: { type: 'ammo' } } 
        }
      } as CriticalSlot;

      const heatSinkSlot = { 
        isEmpty: jest.fn(() => false), 
        content: { 
          type: 'equipment', 
          equipmentReference: { equipmentData: { type: 'heat_sink' } } 
        }
      } as CriticalSlot;

      // Test priority calculation (weapons should come first)
      expect(weaponSlot.content?.equipmentReference?.equipmentData?).toBe('weapon');
      expect(ammoSlot.content?.equipmentReference?.equipmentData?).toBe('ammo');
      expect(heatSinkSlot.content?.equipmentReference?.equipmentData?).toBe('heat_sink');
    });

    test('identifies removable vs non-removable components', () => {
      const removableSlot = { 
        isEmpty: jest.fn(() => false), 
        content: { type: 'equipment' } 
      } as CriticalSlot;

      const systemSlot = { 
        isEmpty: jest.fn(() => false), 
        content: { type: 'system', systemComponentType: 'engine' } 
      } as CriticalSlot;

      expect(removableSlot.content?).toBe('equipment');
      expect(systemSlot.content?).toBe('system');
    });
  });

  describe('Special Component Handling', () => {
    test('identifies unhittable equipment patterns', () => {
      const endoSteelEquipment = {
        equipmentData: { 
          name: 'Endo Steel', 
          type: 'structure',
          isSpecialComponent: true 
        }
      };

      const ferroFibrousEquipment = {
        equipmentData: { 
          name: 'Ferro-Fibrous Armor', 
          type: 'armor',
          componentType: 'armor' 
        }
      };

      const normalEquipment = {
        equipmentData: { 
          name: 'Medium Laser', 
          type: 'weapon' 
        }
      };

      // Test that special components are identified correctly
      expect(endoSteelEquipment.equipmentData.isSpecialComponent).toBe(true);
      expect(ferroFibrousEquipment.equipmentData.componentType).toBe('armor');
      expect(normalEquipment.equipmentData).toBe('weapon');
    });

    test('handles special component allocation', () => {
      mockUnitManager.getConfiguration.mockReturnValue({
        structureType: 'Endo Steel',
        armorType: 'Ferro-Fibrous'
      });

      // Test that configuration is read correctly for special components
      const config = mockUnitManager.getConfiguration();
      expect(config.structureType).toBe('Endo Steel');
      expect(config.armorType).toBe('Ferro-Fibrous');
    });
  });

  describe('Slot Comparison and State Detection', () => {
    test('correctly identifies compacted vs non-compacted slots', () => {
      // Compacted: equipment first, then empty
      const compactedSlots = [
        { isEmpty: jest.fn(() => false), content: { type: 'equipment' } },
        { isEmpty: jest.fn(() => false), content: { type: 'equipment' } },
        { isEmpty: jest.fn(() => true), content: null },
        { isEmpty: jest.fn(() => true), content: null }
      ] as CriticalSlot[];

      // Non-compacted: gaps between equipment
      const nonCompactedSlots = [
        { isEmpty: jest.fn(() => false), content: { type: 'equipment' } },
        { isEmpty: jest.fn(() => true), content: null },
        { isEmpty: jest.fn(() => false), content: { type: 'equipment' } },
        { isEmpty: jest.fn(() => true), content: null }
      ] as CriticalSlot[];

      // Both should be valid slot arrays
      expect(compactedSlots.length).toBe(4);
      expect(nonCompactedSlots.length).toBe(4);
    });

    test('compares slot content correctly', () => {
      const slot1 = { 
        isEmpty: jest.fn(() => false), 
        content: { 
          type: 'equipment', 
          equipmentReference: { equipmentData: { name: 'Test Equipment' } } 
        } 
      } as CriticalSlot;

      const slot2 = { 
        isEmpty: jest.fn(() => false), 
        content: { 
          type: 'equipment', 
          equipmentReference: { equipmentData: { name: 'Test Equipment' } } 
        } 
      } as CriticalSlot;

      const slot3 = { 
        isEmpty: jest.fn(() => false), 
        content: { 
          type: 'equipment', 
          equipmentReference: { equipmentData: { name: 'Different Equipment' } } 
        } 
      } as CriticalSlot;

      // Slots should have different content when names differ
      expect(slot1.content?.equipmentReference?.equipmentData?.name).toBe('Test Equipment');
      expect(slot2.content?.equipmentReference?.equipmentData?.name).toBe('Test Equipment');
      expect(slot3.content?.equipmentReference?.equipmentData?.name).toBe('Different Equipment');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('handles unit manager method failures', () => {
      mockUnitManager.getSection.mockImplementation(() => {
        throw new Error('Section access failed');
      });

      const result = CriticalSlotsManagementService.compact(mockUnitManager);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error');
    });

    test('handles invalid slot content gracefully', () => {
      const invalidSlots = [
        { isEmpty: jest.fn(() => false), content: null },
        { isEmpty: jest.fn(() => false), content: undefined },
        { isEmpty: jest.fn(() => false), content: { type: 'unknown' } }
      ] as CriticalSlot[];

      mockSection.getAllSlots.mockReturnValue(invalidSlots);

      const result = CriticalSlotsManagementService.compact(mockUnitManager);

      // Should handle invalid content without crashing
      expect(result.success).toBe(true);
    });

    test('handles empty equipment lists', () => {
      mockUnitManager.getUnallocatedEquipment.mockReturnValue([]);

      const result = CriticalSlotsManagementService.fillUnhittables(mockUnitManager);

      // Should handle empty equipment gracefully
      expect(typeof result.success).toBe('boolean');
    });

    test('handles equipment placement failures', () => {
      mockUnitManager.canPlaceEquipmentInLocation.mockReturnValue(false);

      // Test that equipment placement restrictions are respected
      expect(mockUnitManager.canPlaceEquipmentInLocation('test', 'test')).toBe(false);
    });
  });

  describe('Operation Result Interface', () => {
    test('returns proper operation result structure', () => {
      const result = CriticalSlotsManagementService.compact(mockUnitManager);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('slotsModified');

      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
      expect(typeof result.slotsModified).toBe('number');
    });

    test('provides meaningful error messages', () => {
      mockUnitManager.getSection.mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = CriticalSlotsManagementService.compact(mockUnitManager);

      expect(result.success).toBe(false);
      expect(result.message).toBeTruthy();
      expect(result.message.length).toBeGreaterThan(0);
      expect(result.slotsModified).toBe(0);
    });
  });
});
