/**
 * Displacement Utilities Tests
 * 
 * Tests for equipment displacement detection when system configuration changes.
 * 
 * @spec openspec/specs/critical-slot-allocation/spec.md
 */

import {
  getDisplacedEquipment,
  getEquipmentDisplacedByEngineChange,
  getEquipmentDisplacedByGyroChange,
  applyDisplacement,
  DisplacementResult,
} from '@/utils/construction/displacementUtils';
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
  name: string = 'Test Equipment'
): IMountedEquipmentInstance {
  return {
    instanceId,
    equipmentId: `test-${instanceId}`,
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

// =============================================================================
// Engine Side Torso Slot Requirements
// =============================================================================
// Standard: 0 side torso slots
// XL (IS): 3 side torso slots per side
// XL (Clan): 2 side torso slots per side
// Light: 2 side torso slots per side
// XXL: 3 side torso slots per side
// Compact: 0 side torso slots

// =============================================================================
// Gyro Slot Requirements
// =============================================================================
// Standard: 4 slots (CT slots 3-6)
// XL Gyro: 6 slots (CT slots 3-8)
// Compact: 2 slots (CT slots 3-4)
// Heavy-Duty: 4 slots (CT slots 3-6)

// =============================================================================
// Tests
// =============================================================================

describe('Displacement Utilities', () => {
  // ===========================================================================
  // getDisplacedEquipment
  // ===========================================================================
  describe('getDisplacedEquipment', () => {
    describe('when no configuration change requires new slots', () => {
      it('should return empty result when staying with same engine type', () => {
        const equipment = [
          createMockEquipment('eq1', MechLocation.LEFT_TORSO, [0, 1, 2], 3),
        ];
        
        const result = getDisplacedEquipment(
          equipment,
          EngineType.STANDARD,
          EngineType.STANDARD,
          GyroType.STANDARD,
          GyroType.STANDARD
        );
        
        expect(result.displacedEquipmentIds).toHaveLength(0);
        expect(result.affectedLocations).toHaveLength(0);
      });

      it('should return empty result when staying with same gyro type', () => {
        const equipment = [
          createMockEquipment('eq1', MechLocation.CENTER_TORSO, [10, 11], 2),
        ];
        
        const result = getDisplacedEquipment(
          equipment,
          EngineType.XL_IS,
          EngineType.XL_IS,
          GyroType.XL,
          GyroType.XL
        );
        
        expect(result.displacedEquipmentIds).toHaveLength(0);
        expect(result.affectedLocations).toHaveLength(0);
      });

      it('should return empty result when equipment is not in affected slots', () => {
        const equipment = [
          createMockEquipment('eq1', MechLocation.LEFT_TORSO, [5, 6, 7], 3),
          createMockEquipment('eq2', MechLocation.RIGHT_TORSO, [8, 9], 2),
        ];
        
        const result = getDisplacedEquipment(
          equipment,
          EngineType.STANDARD,
          EngineType.XL_IS,
          GyroType.STANDARD,
          GyroType.STANDARD
        );
        
        // Equipment is in slots 5-9, XL engine takes 0-2
        expect(result.displacedEquipmentIds).toHaveLength(0);
      });
    });

    describe('when engine type change requires side torso slots', () => {
      it('should detect displacement when switching Standard to XL (IS)', () => {
        const equipment = [
          createMockEquipment('eq1', MechLocation.LEFT_TORSO, [0, 1], 2),
          createMockEquipment('eq2', MechLocation.LEFT_TORSO, [5, 6], 2),
        ];
        
        const result = getDisplacedEquipment(
          equipment,
          EngineType.STANDARD,
          EngineType.XL_IS,
          GyroType.STANDARD,
          GyroType.STANDARD
        );
        
        // XL (IS) requires slots 0-2, so eq1 (in slots 0-1) should be displaced
        expect(result.displacedEquipmentIds).toContain('eq1');
        expect(result.displacedEquipmentIds).not.toContain('eq2');
        expect(result.affectedLocations).toContain(MechLocation.LEFT_TORSO);
      });

      it('should detect displacement in both side torsos', () => {
        const equipment = [
          createMockEquipment('eq1', MechLocation.LEFT_TORSO, [0], 1),
          createMockEquipment('eq2', MechLocation.RIGHT_TORSO, [1], 1),
        ];
        
        const result = getDisplacedEquipment(
          equipment,
          EngineType.STANDARD,
          EngineType.XL_IS,
          GyroType.STANDARD,
          GyroType.STANDARD
        );
        
        expect(result.displacedEquipmentIds).toContain('eq1');
        expect(result.displacedEquipmentIds).toContain('eq2');
        expect(result.affectedLocations).toContain(MechLocation.LEFT_TORSO);
        expect(result.affectedLocations).toContain(MechLocation.RIGHT_TORSO);
      });

      it('should detect displacement when switching Standard to Light Engine', () => {
        const equipment = [
          createMockEquipment('eq1', MechLocation.LEFT_TORSO, [0, 1], 2),
        ];
        
        const result = getDisplacedEquipment(
          equipment,
          EngineType.STANDARD,
          EngineType.LIGHT,
          GyroType.STANDARD,
          GyroType.STANDARD
        );
        
        // Light engine requires slots 0-1 per side
        expect(result.displacedEquipmentIds).toContain('eq1');
      });

      it('should detect displacement for XL (Clan) with 2 slots per side', () => {
        const equipment = [
          createMockEquipment('eq1', MechLocation.LEFT_TORSO, [1], 1),
          createMockEquipment('eq2', MechLocation.LEFT_TORSO, [2], 1),
        ];
        
        const result = getDisplacedEquipment(
          equipment,
          EngineType.STANDARD,
          EngineType.XL_CLAN,
          GyroType.STANDARD,
          GyroType.STANDARD
        );
        
        // XL (Clan) requires slots 0-1, so eq1 (slot 1) displaced, eq2 (slot 2) not
        expect(result.displacedEquipmentIds).toContain('eq1');
        expect(result.displacedEquipmentIds).not.toContain('eq2');
      });
    });

    describe('when engine type change frees up slots', () => {
      it('should not displace when switching XL to Standard', () => {
        const equipment = [
          createMockEquipment('eq1', MechLocation.LEFT_TORSO, [3, 4], 2),
        ];
        
        const result = getDisplacedEquipment(
          equipment,
          EngineType.XL_IS,
          EngineType.STANDARD,
          GyroType.STANDARD,
          GyroType.STANDARD
        );
        
        expect(result.displacedEquipmentIds).toHaveLength(0);
      });

      it('should not displace when switching from larger to smaller engine', () => {
        const equipment = [
          createMockEquipment('eq1', MechLocation.LEFT_TORSO, [2], 1),
        ];
        
        const result = getDisplacedEquipment(
          equipment,
          EngineType.XL_IS,   // 3 side torso slots
          EngineType.LIGHT,   // 2 side torso slots
          GyroType.STANDARD,
          GyroType.STANDARD
        );
        
        // Slot 2 was already occupied by XL, freeing it doesn't displace
        expect(result.displacedEquipmentIds).toHaveLength(0);
      });
    });

    describe('when gyro type change requires more slots', () => {
      it('should detect displacement when switching Standard to XL Gyro', () => {
        // Standard engine (6 CT): slots 0-2, then 7-9 (gyro in 3-6)
        // With XL gyro (6 slots): gyro in 3-8, engine remaining at 9-11
        // OLD fixed: 0-9, available: 10, 11
        // NEW fixed: 0-11, available: none
        // Equipment in slots 10, 11 would be displaced
        const equipment = [
          createMockEquipment('eq1', MechLocation.CENTER_TORSO, [10], 1), // Will be displaced
          createMockEquipment('eq2', MechLocation.LEFT_TORSO, [5, 6], 2), // Not affected
        ];
        
        const result = getDisplacedEquipment(
          equipment,
          EngineType.STANDARD,
          EngineType.STANDARD,
          GyroType.STANDARD,
          GyroType.XL
        );
        
        // With XL gyro, slot 10 becomes occupied by engine (remaining 3 slots)
        expect(result.displacedEquipmentIds).toContain('eq1');
        expect(result.displacedEquipmentIds).not.toContain('eq2');
        expect(result.affectedLocations).toContain(MechLocation.CENTER_TORSO);
      });

      it('should not displace when switching XL Gyro to Compact', () => {
        const equipment = [
          createMockEquipment('eq1', MechLocation.CENTER_TORSO, [5, 6], 2),
        ];
        
        const result = getDisplacedEquipment(
          equipment,
          EngineType.STANDARD,
          EngineType.STANDARD,
          GyroType.XL,
          GyroType.COMPACT
        );
        
        // Going from 6 slots to 2 slots - no displacement
        expect(result.displacedEquipmentIds).toHaveLength(0);
      });
    });

    describe('when both engine and gyro change', () => {
      it('should detect displacement from both changes', () => {
        // Standard engine: CT 0-2, 7-9, gyro 3-6; no side torso slots
        // XL IS engine: CT 0-2, 7-9, gyro; side torso 0-2
        // With XL gyro: gyro takes 3-8, engine remaining 9-11
        const equipment = [
          createMockEquipment('eq1', MechLocation.LEFT_TORSO, [0], 1), // Displaced by XL engine
          createMockEquipment('eq2', MechLocation.CENTER_TORSO, [10], 1), // Displaced by XL gyro
        ];
        
        const result = getDisplacedEquipment(
          equipment,
          EngineType.STANDARD,
          EngineType.XL_IS,
          GyroType.STANDARD,
          GyroType.XL
        );
        
        // Both should be displaced
        expect(result.displacedEquipmentIds).toContain('eq1');
        expect(result.displacedEquipmentIds).toContain('eq2');
        expect(result.affectedLocations).toContain(MechLocation.LEFT_TORSO);
        expect(result.affectedLocations).toContain(MechLocation.CENTER_TORSO);
      });
    });

    describe('edge cases', () => {
      it('should handle empty equipment list', () => {
        const result = getDisplacedEquipment(
          [],
          EngineType.STANDARD,
          EngineType.XL_IS,
          GyroType.STANDARD,
          GyroType.STANDARD
        );
        
        expect(result.displacedEquipmentIds).toHaveLength(0);
        expect(result.affectedLocations).toHaveLength(0);
      });

      it('should handle equipment with undefined location', () => {
        const equipment = [
          createMockEquipment('eq1', undefined, undefined, 2),
        ];
        
        const result = getDisplacedEquipment(
          equipment,
          EngineType.STANDARD,
          EngineType.XL_IS,
          GyroType.STANDARD,
          GyroType.STANDARD
        );
        
        expect(result.displacedEquipmentIds).toHaveLength(0);
      });

      it('should handle equipment with undefined slots', () => {
        const equipment = [
          createMockEquipment('eq1', MechLocation.LEFT_TORSO, undefined, 2),
        ];
        
        const result = getDisplacedEquipment(
          equipment,
          EngineType.STANDARD,
          EngineType.XL_IS,
          GyroType.STANDARD,
          GyroType.STANDARD
        );
        
        expect(result.displacedEquipmentIds).toHaveLength(0);
      });

      it('should not displace equipment in arms', () => {
        const equipment = [
          createMockEquipment('eq1', MechLocation.LEFT_ARM, [0, 1, 2], 3),
          createMockEquipment('eq2', MechLocation.RIGHT_ARM, [0], 1),
        ];
        
        const result = getDisplacedEquipment(
          equipment,
          EngineType.STANDARD,
          EngineType.XL_IS,
          GyroType.STANDARD,
          GyroType.XL
        );
        
        expect(result.displacedEquipmentIds).toHaveLength(0);
      });

      it('should not displace equipment in legs', () => {
        const equipment = [
          createMockEquipment('eq1', MechLocation.LEFT_LEG, [0, 1], 2),
          createMockEquipment('eq2', MechLocation.RIGHT_LEG, [0], 1),
        ];
        
        const result = getDisplacedEquipment(
          equipment,
          EngineType.STANDARD,
          EngineType.XL_IS,
          GyroType.STANDARD,
          GyroType.XL
        );
        
        expect(result.displacedEquipmentIds).toHaveLength(0);
      });

      it('should not displace equipment in head', () => {
        const equipment = [
          createMockEquipment('eq1', MechLocation.HEAD, [3], 1),
        ];
        
        const result = getDisplacedEquipment(
          equipment,
          EngineType.STANDARD,
          EngineType.XL_IS,
          GyroType.STANDARD,
          GyroType.XL
        );
        
        expect(result.displacedEquipmentIds).toHaveLength(0);
      });

      it('should handle multi-slot equipment partially in displaced area', () => {
        const equipment = [
          // Equipment spans slots 2-4, XL engine needs 0-2
          createMockEquipment('eq1', MechLocation.LEFT_TORSO, [2, 3, 4], 3),
        ];
        
        const result = getDisplacedEquipment(
          equipment,
          EngineType.STANDARD,
          EngineType.XL_IS,
          GyroType.STANDARD,
          GyroType.STANDARD
        );
        
        // Slot 2 overlaps with engine requirement, so equipment is displaced
        expect(result.displacedEquipmentIds).toContain('eq1');
      });
    });
  });

  // ===========================================================================
  // getEquipmentDisplacedByEngineChange
  // ===========================================================================
  describe('getEquipmentDisplacedByEngineChange', () => {
    it('should call getDisplacedEquipment with same gyro types', () => {
      const equipment = [
        createMockEquipment('eq1', MechLocation.LEFT_TORSO, [0, 1], 2),
      ];
      
      const result = getEquipmentDisplacedByEngineChange(
        equipment,
        EngineType.STANDARD,
        EngineType.XL_IS,
        GyroType.XL
      );
      
      expect(result.displacedEquipmentIds).toContain('eq1');
    });

    it('should not displace equipment when engine stays the same', () => {
      const equipment = [
        createMockEquipment('eq1', MechLocation.LEFT_TORSO, [0, 1], 2),
      ];
      
      const result = getEquipmentDisplacedByEngineChange(
        equipment,
        EngineType.XL_IS,
        EngineType.XL_IS,
        GyroType.STANDARD
      );
      
      expect(result.displacedEquipmentIds).toHaveLength(0);
    });
  });

  // ===========================================================================
  // getEquipmentDisplacedByGyroChange
  // ===========================================================================
  describe('getEquipmentDisplacedByGyroChange', () => {
    it('should call getDisplacedEquipment with same engine types', () => {
      // Standard gyro: 4 slots (3-6), engine remaining at 7-9, available: 10, 11
      // XL gyro: 6 slots (3-8), engine remaining at 9-11, available: none
      // Equipment in slot 10 or 11 would be displaced
      const equipment = [
        createMockEquipment('eq1', MechLocation.CENTER_TORSO, [10], 1),
      ];
      
      const result = getEquipmentDisplacedByGyroChange(
        equipment,
        EngineType.STANDARD,
        GyroType.STANDARD,
        GyroType.XL
      );
      
      expect(result.displacedEquipmentIds).toContain('eq1');
    });

    it('should not displace equipment when gyro stays the same', () => {
      const equipment = [
        createMockEquipment('eq1', MechLocation.CENTER_TORSO, [10], 1),
      ];
      
      const result = getEquipmentDisplacedByGyroChange(
        equipment,
        EngineType.STANDARD,
        GyroType.XL,
        GyroType.XL
      );
      
      expect(result.displacedEquipmentIds).toHaveLength(0);
    });
  });

  // ===========================================================================
  // applyDisplacement
  // ===========================================================================
  describe('applyDisplacement', () => {
    it('should unallocate displaced equipment', () => {
      const equipment = [
        createMockEquipment('eq1', MechLocation.LEFT_TORSO, [0, 1], 2),
        createMockEquipment('eq2', MechLocation.LEFT_TORSO, [5, 6], 2),
      ];
      
      const result = applyDisplacement(equipment, ['eq1']);
      
      // eq1 should be unallocated
      const eq1 = result.find(e => e.instanceId === 'eq1');
      expect(eq1?.location).toBeUndefined();
      expect(eq1?.slots).toBeUndefined();
      
      // eq2 should remain allocated
      const eq2 = result.find(e => e.instanceId === 'eq2');
      expect(eq2?.location).toBe(MechLocation.LEFT_TORSO);
      expect(eq2?.slots).toEqual([5, 6]);
    });

    it('should unallocate multiple displaced equipment', () => {
      const equipment = [
        createMockEquipment('eq1', MechLocation.LEFT_TORSO, [0], 1),
        createMockEquipment('eq2', MechLocation.RIGHT_TORSO, [1], 1),
        createMockEquipment('eq3', MechLocation.CENTER_TORSO, [10], 1),
      ];
      
      const result = applyDisplacement(equipment, ['eq1', 'eq2']);
      
      const eq1 = result.find(e => e.instanceId === 'eq1');
      expect(eq1?.location).toBeUndefined();
      
      const eq2 = result.find(e => e.instanceId === 'eq2');
      expect(eq2?.location).toBeUndefined();
      
      const eq3 = result.find(e => e.instanceId === 'eq3');
      expect(eq3?.location).toBe(MechLocation.CENTER_TORSO);
    });

    it('should return same array if no displacement needed', () => {
      const equipment = [
        createMockEquipment('eq1', MechLocation.LEFT_TORSO, [5, 6], 2),
      ];
      
      const result = applyDisplacement(equipment, []);
      
      expect(result).toBe(equipment);
    });

    it('should handle empty equipment list', () => {
      const result = applyDisplacement([], ['eq1']);
      expect(result).toEqual([]);
    });

    it('should preserve other equipment properties', () => {
      const equipment: IMountedEquipmentInstance[] = [{
        instanceId: 'eq1',
        equipmentId: 'test-weapon',
        name: 'Test Weapon',
        category: EquipmentCategory.WEAPON,
        weight: 5,
        criticalSlots: 2,
        heat: 3,
        techBase: TechBase.CLAN,
        location: MechLocation.LEFT_TORSO,
        slots: [0, 1],
        isRearMounted: true,
        linkedAmmoId: 'ammo-1',
        isRemovable: false,
      }];
      
      const result = applyDisplacement(equipment, ['eq1']);
      const eq1 = result[0];
      
      expect(eq1.instanceId).toBe('eq1');
      expect(eq1.equipmentId).toBe('test-weapon');
      expect(eq1.name).toBe('Test Weapon');
      expect(eq1.category).toBe(EquipmentCategory.WEAPON);
      expect(eq1.weight).toBe(5);
      expect(eq1.criticalSlots).toBe(2);
      expect(eq1.heat).toBe(3);
      expect(eq1.techBase).toBe(TechBase.CLAN);
      expect(eq1.isRearMounted).toBe(true);
      expect(eq1.linkedAmmoId).toBe('ammo-1');
      expect(eq1.isRemovable).toBe(false);
      // Only location and slots should be undefined
      expect(eq1.location).toBeUndefined();
      expect(eq1.slots).toBeUndefined();
    });
  });

  // ===========================================================================
  // Integration Tests
  // ===========================================================================
  describe('integration: complete displacement workflow', () => {
    it('should correctly detect and apply displacement for engine change', () => {
      const equipment = [
        createMockEquipment('weapon1', MechLocation.LEFT_TORSO, [0, 1, 2], 3, 'AC/10'),
        createMockEquipment('weapon2', MechLocation.LEFT_TORSO, [5, 6], 2, 'Medium Laser'),
        createMockEquipment('weapon3', MechLocation.RIGHT_TORSO, [0], 1, 'SRM 2'),
        createMockEquipment('weapon4', MechLocation.RIGHT_TORSO, [5, 6, 7], 3, 'LRM 10'),
        createMockEquipment('weapon5', MechLocation.LEFT_ARM, [4, 5], 2, 'PPC'),
      ];
      
      // Step 1: Detect displacement
      const displaced = getEquipmentDisplacedByEngineChange(
        equipment,
        EngineType.STANDARD,
        EngineType.XL_IS,
        GyroType.STANDARD
      );
      
      // XL (IS) requires slots 0-2 in side torsos
      expect(displaced.displacedEquipmentIds).toContain('weapon1'); // LT 0-2
      expect(displaced.displacedEquipmentIds).toContain('weapon3'); // RT 0
      expect(displaced.displacedEquipmentIds).not.toContain('weapon2'); // LT 5-6
      expect(displaced.displacedEquipmentIds).not.toContain('weapon4'); // RT 5-7
      expect(displaced.displacedEquipmentIds).not.toContain('weapon5'); // LA 4-5
      
      // Step 2: Apply displacement
      const result = applyDisplacement(equipment, displaced.displacedEquipmentIds);
      
      // Verify displaced items are unallocated
      const weapon1 = result.find(e => e.instanceId === 'weapon1');
      expect(weapon1?.location).toBeUndefined();
      expect(weapon1?.slots).toBeUndefined();
      
      const weapon3 = result.find(e => e.instanceId === 'weapon3');
      expect(weapon3?.location).toBeUndefined();
      
      // Verify non-displaced items remain allocated
      const weapon2 = result.find(e => e.instanceId === 'weapon2');
      expect(weapon2?.location).toBe(MechLocation.LEFT_TORSO);
      expect(weapon2?.slots).toEqual([5, 6]);
      
      const weapon5 = result.find(e => e.instanceId === 'weapon5');
      expect(weapon5?.location).toBe(MechLocation.LEFT_ARM);
    });

    it('should correctly detect and apply displacement for gyro change', () => {
      // Standard engine + Standard gyro: slots 0-9 fixed, 10-11 available
      // Standard engine + XL gyro: slots 0-11 fixed, none available
      // So equipment in slots 10, 11 WILL be displaced
      const equipment = [
        createMockEquipment('weapon1', MechLocation.CENTER_TORSO, [10], 1), // Will be displaced
        createMockEquipment('weapon2', MechLocation.CENTER_TORSO, [11], 1), // Will be displaced
        createMockEquipment('weapon3', MechLocation.LEFT_TORSO, [0, 1], 2), // Not affected
      ];
      
      const displaced = getEquipmentDisplacedByGyroChange(
        equipment,
        EngineType.STANDARD,
        GyroType.STANDARD,
        GyroType.XL
      );
      
      // Slots 10 and 11 become engine slots with XL gyro
      expect(displaced.displacedEquipmentIds).toContain('weapon1');
      expect(displaced.displacedEquipmentIds).toContain('weapon2');
      expect(displaced.displacedEquipmentIds).not.toContain('weapon3');
      expect(displaced.affectedLocations).toContain(MechLocation.CENTER_TORSO);
      expect(displaced.affectedLocations).not.toContain(MechLocation.LEFT_TORSO);
    });
  });
});

