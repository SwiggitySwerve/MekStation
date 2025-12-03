/**
 * Location Restrictions Tests
 * 
 * Tests for equipment placement location restrictions.
 * Ensures equipment can only be placed in valid locations.
 * 
 * @spec openspec/specs/equipment-placement/spec.md
 * @spec openspec/specs/critical-slot-allocation/spec.md
 */

import { MechLocation } from '@/types/construction';
import { 
  LocationRestriction, 
  isValidLocationForEquipment,
  PLACEMENT_RULES 
} from '@/types/equipment/EquipmentPlacement';

describe('Location Restrictions', () => {
  // ===========================================================================
  // isValidLocationForEquipment
  // ===========================================================================
  describe('isValidLocationForEquipment', () => {
    describe('unrestricted equipment', () => {
      it('should allow placement in any location for unrestricted equipment', () => {
        const unrestricted = 'medium-laser'; // No specific placement rules
        
        const allLocations = [
          MechLocation.HEAD,
          MechLocation.CENTER_TORSO,
          MechLocation.LEFT_TORSO,
          MechLocation.RIGHT_TORSO,
          MechLocation.LEFT_ARM,
          MechLocation.RIGHT_ARM,
          MechLocation.LEFT_LEG,
          MechLocation.RIGHT_LEG,
        ];
        
        allLocations.forEach(location => {
          expect(isValidLocationForEquipment(unrestricted, location)).toBe(true);
        });
      });
    });

    describe('jump jet restrictions', () => {
      // These are the actual equipment IDs from PLACEMENT_RULES
      const jumpJetIds = [
        'jump-jet-light',
        'jump-jet-medium',
        'jump-jet-heavy',
        'improved-jump-jet-light',
        'improved-jump-jet-medium',
        'improved-jump-jet-heavy',
      ];

      it('should allow jump jets in torsos', () => {
        const torsoLocations = [
          MechLocation.CENTER_TORSO,
          MechLocation.LEFT_TORSO,
          MechLocation.RIGHT_TORSO,
        ];
        
        jumpJetIds.forEach(jetId => {
          torsoLocations.forEach(location => {
            expect(isValidLocationForEquipment(jetId, location)).toBe(true);
          });
        });
      });

      it('should allow jump jets in legs', () => {
        const legLocations = [
          MechLocation.LEFT_LEG,
          MechLocation.RIGHT_LEG,
        ];
        
        jumpJetIds.forEach(jetId => {
          legLocations.forEach(location => {
            expect(isValidLocationForEquipment(jetId, location)).toBe(true);
          });
        });
      });

      it('should NOT allow jump jets in arms', () => {
        const armLocations = [
          MechLocation.LEFT_ARM,
          MechLocation.RIGHT_ARM,
        ];
        
        jumpJetIds.forEach(jetId => {
          armLocations.forEach(location => {
            expect(isValidLocationForEquipment(jetId, location)).toBe(false);
          });
        });
      });

      it('should NOT allow jump jets in head', () => {
        jumpJetIds.forEach(jetId => {
          expect(isValidLocationForEquipment(jetId, MechLocation.HEAD)).toBe(false);
        });
      });
    });
  });

  // ===========================================================================
  // PLACEMENT_RULES
  // ===========================================================================
  describe('PLACEMENT_RULES', () => {
    it('should have rules defined for jump jets', () => {
      // PLACEMENT_RULES is an array, not an object
      const jumpJetRules = PLACEMENT_RULES.filter(rule => 
        rule.equipmentId.includes('jump-jet')
      );
      
      expect(jumpJetRules.length).toBeGreaterThan(0);
    });

    it('should have TORSO_OR_LEG restriction for jump jets', () => {
      const jumpJetRule = PLACEMENT_RULES.find(r => r.equipmentId === 'jump-jet-light');
      
      expect(jumpJetRule).toBeDefined();
      expect(jumpJetRule?.restriction).toBe(LocationRestriction.TORSO_OR_LEG);
    });
  });

  // ===========================================================================
  // LocationRestriction enum
  // ===========================================================================
  describe('LocationRestriction enum', () => {
    it('should have TORSO_OR_LEG restriction', () => {
      expect(LocationRestriction.TORSO_OR_LEG).toBeDefined();
    });

    it('should have NONE restriction for unrestricted equipment', () => {
      expect(LocationRestriction.NONE).toBeDefined();
    });

    it('should have NOT_HEAD restriction', () => {
      expect(LocationRestriction.NOT_HEAD).toBeDefined();
    });
  });

  // ===========================================================================
  // Integration with Slot Assignment
  // ===========================================================================
  describe('integration with slot assignment', () => {
    /**
     * Simulates the check in getAssignableSlots that verifies
     * location restrictions before calculating assignable slots
     */
    function getAssignableSlotsWithRestriction(
      equipmentId: string,
      location: MechLocation,
      emptySlotCount: number,
      slotsNeeded: number
    ): number[] {
      // First check location restriction
      if (!isValidLocationForEquipment(equipmentId, location)) {
        return [];
      }
      
      // Then return valid starting positions (simplified)
      if (emptySlotCount < slotsNeeded) {
        return [];
      }
      
      const assignable: number[] = [];
      for (let i = 0; i <= emptySlotCount - slotsNeeded; i++) {
        assignable.push(i);
      }
      return assignable;
    }

    it('should return empty array for jump jets in invalid locations', () => {
      const assignable = getAssignableSlotsWithRestriction(
        'jump-jet-light',
        MechLocation.LEFT_ARM,
        12, // All empty
        1   // Jump jet needs 1 slot
      );
      
      expect(assignable).toEqual([]);
    });

    it('should return valid slots for jump jets in valid locations', () => {
      const assignable = getAssignableSlotsWithRestriction(
        'jump-jet-light',
        MechLocation.LEFT_TORSO,
        12, // All empty
        1   // Jump jet needs 1 slot
      );
      
      expect(assignable.length).toBe(12); // Can start at any of the 12 positions
    });

    it('should filter locations for multi-slot equipment', () => {
      // Large equipment in a location with not enough slots
      const assignable = getAssignableSlotsWithRestriction(
        'unrestricted-equipment',
        MechLocation.HEAD,
        1, // Only 1 empty slot
        3  // Equipment needs 3 slots
      );
      
      expect(assignable).toEqual([]);
    });
  });

  // ===========================================================================
  // Regression Tests
  // ===========================================================================
  describe('regression: quick assign respects restrictions', () => {
    it('should prevent quick assign of jump jets to arms', () => {
      const targetLocations = [
        MechLocation.LEFT_ARM,
        MechLocation.RIGHT_ARM,
        MechLocation.HEAD,
      ];
      
      targetLocations.forEach(location => {
        const isValid = isValidLocationForEquipment('jump-jet-light', location);
        expect(isValid).toBe(false);
      });
    });

    it('should allow quick assign of jump jets to torsos and legs', () => {
      const targetLocations = [
        MechLocation.CENTER_TORSO,
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
        MechLocation.LEFT_LEG,
        MechLocation.RIGHT_LEG,
      ];
      
      targetLocations.forEach(location => {
        const isValid = isValidLocationForEquipment('jump-jet-light', location);
        expect(isValid).toBe(true);
      });
    });
  });
});

