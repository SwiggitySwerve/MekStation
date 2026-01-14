/**
 * Tests for CriticalSlotAllocation - Slot Counts and Location Definitions
 * 
 * @spec openspec/changes/integrate-mm-data-assets/specs/record-sheet-export/spec.md
 * 
 * Verifies that all mech locations have correct slot counts per BattleTech rules.
 */

import { 
  MechLocation, 
  LOCATION_SLOT_COUNTS,
} from '@/types/construction/CriticalSlotAllocation';

describe('CriticalSlotAllocation', () => {
  describe('MechLocation Enum', () => {
    describe('Biped Locations', () => {
      it('should have HEAD location', () => {
        expect(MechLocation.HEAD).toBe('Head');
      });

      it('should have CENTER_TORSO location', () => {
        expect(MechLocation.CENTER_TORSO).toBe('Center Torso');
      });

      it('should have LEFT_TORSO location', () => {
        expect(MechLocation.LEFT_TORSO).toBe('Left Torso');
      });

      it('should have RIGHT_TORSO location', () => {
        expect(MechLocation.RIGHT_TORSO).toBe('Right Torso');
      });

      it('should have LEFT_ARM location', () => {
        expect(MechLocation.LEFT_ARM).toBe('Left Arm');
      });

      it('should have RIGHT_ARM location', () => {
        expect(MechLocation.RIGHT_ARM).toBe('Right Arm');
      });

      it('should have LEFT_LEG location', () => {
        expect(MechLocation.LEFT_LEG).toBe('Left Leg');
      });

      it('should have RIGHT_LEG location', () => {
        expect(MechLocation.RIGHT_LEG).toBe('Right Leg');
      });
    });

    describe('Quad Locations', () => {
      it('should have FRONT_LEFT_LEG location', () => {
        expect(MechLocation.FRONT_LEFT_LEG).toBe('Front Left Leg');
      });

      it('should have FRONT_RIGHT_LEG location', () => {
        expect(MechLocation.FRONT_RIGHT_LEG).toBe('Front Right Leg');
      });

      it('should have REAR_LEFT_LEG location', () => {
        expect(MechLocation.REAR_LEFT_LEG).toBe('Rear Left Leg');
      });

      it('should have REAR_RIGHT_LEG location', () => {
        expect(MechLocation.REAR_RIGHT_LEG).toBe('Rear Right Leg');
      });
    });

    describe('Tripod Location', () => {
      it('should have CENTER_LEG location', () => {
        expect(MechLocation.CENTER_LEG).toBe('Center Leg');
      });
    });
  });

  describe('LOCATION_SLOT_COUNTS', () => {
    describe('Head Slot Count', () => {
      it('should have 6 slots in HEAD', () => {
        expect(LOCATION_SLOT_COUNTS[MechLocation.HEAD]).toBe(6);
      });
    });

    describe('Torso Slot Counts', () => {
      it('should have 12 slots in CENTER_TORSO', () => {
        expect(LOCATION_SLOT_COUNTS[MechLocation.CENTER_TORSO]).toBe(12);
      });

      it('should have 12 slots in LEFT_TORSO', () => {
        expect(LOCATION_SLOT_COUNTS[MechLocation.LEFT_TORSO]).toBe(12);
      });

      it('should have 12 slots in RIGHT_TORSO', () => {
        expect(LOCATION_SLOT_COUNTS[MechLocation.RIGHT_TORSO]).toBe(12);
      });
    });

    describe('Arm Slot Counts', () => {
      it('should have 12 slots in LEFT_ARM', () => {
        expect(LOCATION_SLOT_COUNTS[MechLocation.LEFT_ARM]).toBe(12);
      });

      it('should have 12 slots in RIGHT_ARM', () => {
        expect(LOCATION_SLOT_COUNTS[MechLocation.RIGHT_ARM]).toBe(12);
      });
    });

    describe('Biped Leg Slot Counts', () => {
      it('should have 6 slots in LEFT_LEG', () => {
        expect(LOCATION_SLOT_COUNTS[MechLocation.LEFT_LEG]).toBe(6);
      });

      it('should have 6 slots in RIGHT_LEG', () => {
        expect(LOCATION_SLOT_COUNTS[MechLocation.RIGHT_LEG]).toBe(6);
      });
    });

    describe('Quad Leg Slot Counts', () => {
      it('should have 6 slots in FRONT_LEFT_LEG', () => {
        expect(LOCATION_SLOT_COUNTS[MechLocation.FRONT_LEFT_LEG]).toBe(6);
      });

      it('should have 6 slots in FRONT_RIGHT_LEG', () => {
        expect(LOCATION_SLOT_COUNTS[MechLocation.FRONT_RIGHT_LEG]).toBe(6);
      });

      it('should have 6 slots in REAR_LEFT_LEG', () => {
        expect(LOCATION_SLOT_COUNTS[MechLocation.REAR_LEFT_LEG]).toBe(6);
      });

      it('should have 6 slots in REAR_RIGHT_LEG', () => {
        expect(LOCATION_SLOT_COUNTS[MechLocation.REAR_RIGHT_LEG]).toBe(6);
      });
    });

    describe('Tripod Leg Slot Count', () => {
      it('should have 6 slots in CENTER_LEG', () => {
        expect(LOCATION_SLOT_COUNTS[MechLocation.CENTER_LEG]).toBe(6);
      });
    });

    describe('Total Slot Counts by Configuration', () => {
      it('should total 78 slots for biped (6 + 12*3 + 12*2 + 6*2)', () => {
        const bipedTotal = 
          LOCATION_SLOT_COUNTS[MechLocation.HEAD] +
          LOCATION_SLOT_COUNTS[MechLocation.CENTER_TORSO] +
          LOCATION_SLOT_COUNTS[MechLocation.LEFT_TORSO] +
          LOCATION_SLOT_COUNTS[MechLocation.RIGHT_TORSO] +
          LOCATION_SLOT_COUNTS[MechLocation.LEFT_ARM] +
          LOCATION_SLOT_COUNTS[MechLocation.RIGHT_ARM] +
          LOCATION_SLOT_COUNTS[MechLocation.LEFT_LEG] +
          LOCATION_SLOT_COUNTS[MechLocation.RIGHT_LEG];
        
        expect(bipedTotal).toBe(78);
      });

      it('should total 66 slots for quad (6 + 12*3 + 6*4)', () => {
        const quadTotal = 
          LOCATION_SLOT_COUNTS[MechLocation.HEAD] +
          LOCATION_SLOT_COUNTS[MechLocation.CENTER_TORSO] +
          LOCATION_SLOT_COUNTS[MechLocation.LEFT_TORSO] +
          LOCATION_SLOT_COUNTS[MechLocation.RIGHT_TORSO] +
          LOCATION_SLOT_COUNTS[MechLocation.FRONT_LEFT_LEG] +
          LOCATION_SLOT_COUNTS[MechLocation.FRONT_RIGHT_LEG] +
          LOCATION_SLOT_COUNTS[MechLocation.REAR_LEFT_LEG] +
          LOCATION_SLOT_COUNTS[MechLocation.REAR_RIGHT_LEG];
        
        expect(quadTotal).toBe(66);
      });

      it('should total 84 slots for tripod (6 + 12*3 + 12*2 + 6*3)', () => {
        const tripodTotal = 
          LOCATION_SLOT_COUNTS[MechLocation.HEAD] +
          LOCATION_SLOT_COUNTS[MechLocation.CENTER_TORSO] +
          LOCATION_SLOT_COUNTS[MechLocation.LEFT_TORSO] +
          LOCATION_SLOT_COUNTS[MechLocation.RIGHT_TORSO] +
          LOCATION_SLOT_COUNTS[MechLocation.LEFT_ARM] +
          LOCATION_SLOT_COUNTS[MechLocation.RIGHT_ARM] +
          LOCATION_SLOT_COUNTS[MechLocation.LEFT_LEG] +
          LOCATION_SLOT_COUNTS[MechLocation.RIGHT_LEG] +
          LOCATION_SLOT_COUNTS[MechLocation.CENTER_LEG];
        
        expect(tripodTotal).toBe(84);
      });
    });

    describe('Completeness', () => {
      it('should have slot counts for all MechLocation values', () => {
        const allLocations = Object.values(MechLocation);
        
        allLocations.forEach(location => {
          expect(LOCATION_SLOT_COUNTS[location]).toBeDefined();
          expect(typeof LOCATION_SLOT_COUNTS[location]).toBe('number');
        });
      });

      it('should have positive slot counts for mech locations', () => {
        const mechLocations = [
          MechLocation.HEAD,
          MechLocation.CENTER_TORSO,
          MechLocation.LEFT_TORSO,
          MechLocation.RIGHT_TORSO,
          MechLocation.LEFT_ARM,
          MechLocation.RIGHT_ARM,
          MechLocation.LEFT_LEG,
          MechLocation.RIGHT_LEG,
          MechLocation.CENTER_LEG,
          MechLocation.FRONT_LEFT_LEG,
          MechLocation.FRONT_RIGHT_LEG,
          MechLocation.REAR_LEFT_LEG,
          MechLocation.REAR_RIGHT_LEG,
        ];
        
        mechLocations.forEach(location => {
          expect(LOCATION_SLOT_COUNTS[location]).toBeGreaterThan(0);
        });
      });

      it('should have 0 slots for aerospace locations (placeholder values)', () => {
        // Aerospace locations don't use the same slot system
        const aeroLocations = [
          MechLocation.NOSE,
          MechLocation.LEFT_WING,
          MechLocation.RIGHT_WING,
          MechLocation.AFT,
          MechLocation.FUSELAGE,
        ];
        
        aeroLocations.forEach(location => {
          expect(LOCATION_SLOT_COUNTS[location]).toBe(0);
        });
      });
    });
  });
});
