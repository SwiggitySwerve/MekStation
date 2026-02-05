/**
 * Tests for Slot Validation Utilities
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import {
  MechLocation,
  LOCATION_SLOT_COUNTS,
} from '@/types/construction/CriticalSlotAllocation';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';
import {
  buildSlotsByLocation,
  getLocationsForConfiguration,
  getLocationDisplayName,
  createSlotLocationEntry,
  getTotalSlotsUsed,
  getTotalSlotsAvailable,
  getOverflowLocations,
  LOCATION_DISPLAY_NAMES,
  IEquipmentSlotInfo,
} from '@/utils/validation/slotValidationUtils';

// Helper to create mock equipment (minimal interface for slot calculation)
function createMockEquipment(
  location: MechLocation | undefined,
  slots: number[] | undefined,
): IEquipmentSlotInfo {
  return {
    location,
    slots,
  };
}

describe('Slot Validation Utilities', () => {
  describe('LOCATION_DISPLAY_NAMES', () => {
    it('should have display names for all MechLocation values', () => {
      const mechLocations = Object.values(MechLocation);

      mechLocations.forEach((location) => {
        expect(LOCATION_DISPLAY_NAMES[location]).toBeDefined();
        expect(typeof LOCATION_DISPLAY_NAMES[location]).toBe('string');
        expect(LOCATION_DISPLAY_NAMES[location].length).toBeGreaterThan(0);
      });
    });

    it('should have human-readable names', () => {
      expect(LOCATION_DISPLAY_NAMES[MechLocation.HEAD]).toBe('Head');
      expect(LOCATION_DISPLAY_NAMES[MechLocation.CENTER_TORSO]).toBe(
        'Center Torso',
      );
      expect(LOCATION_DISPLAY_NAMES[MechLocation.LEFT_ARM]).toBe('Left Arm');
      expect(LOCATION_DISPLAY_NAMES[MechLocation.FRONT_LEFT_LEG]).toBe(
        'Front Left Leg',
      );
    });
  });

  describe('getLocationsForConfiguration', () => {
    it('should return biped locations for BIPED config', () => {
      const locations = getLocationsForConfiguration(MechConfiguration.BIPED);

      expect(locations).toContain(MechLocation.HEAD);
      expect(locations).toContain(MechLocation.CENTER_TORSO);
      expect(locations).toContain(MechLocation.LEFT_TORSO);
      expect(locations).toContain(MechLocation.RIGHT_TORSO);
      expect(locations).toContain(MechLocation.LEFT_ARM);
      expect(locations).toContain(MechLocation.RIGHT_ARM);
      expect(locations).toContain(MechLocation.LEFT_LEG);
      expect(locations).toContain(MechLocation.RIGHT_LEG);

      // Should NOT have quad/tripod locations
      expect(locations).not.toContain(MechLocation.FRONT_LEFT_LEG);
      expect(locations).not.toContain(MechLocation.CENTER_LEG);
    });

    it('should return quad locations for QUAD config', () => {
      const locations = getLocationsForConfiguration(MechConfiguration.QUAD);

      expect(locations).toContain(MechLocation.HEAD);
      expect(locations).toContain(MechLocation.CENTER_TORSO);
      expect(locations).toContain(MechLocation.FRONT_LEFT_LEG);
      expect(locations).toContain(MechLocation.FRONT_RIGHT_LEG);
      expect(locations).toContain(MechLocation.REAR_LEFT_LEG);
      expect(locations).toContain(MechLocation.REAR_RIGHT_LEG);

      // Should NOT have biped arm locations
      expect(locations).not.toContain(MechLocation.LEFT_ARM);
      expect(locations).not.toContain(MechLocation.RIGHT_ARM);
    });

    it('should return same locations for QUAD and QUADVEE', () => {
      const quadLocations = getLocationsForConfiguration(
        MechConfiguration.QUAD,
      );
      const quadveeLocations = getLocationsForConfiguration(
        MechConfiguration.QUADVEE,
      );

      expect(quadLocations.sort()).toEqual(quadveeLocations.sort());
    });

    it('should return tripod locations for TRIPOD config', () => {
      const locations = getLocationsForConfiguration(MechConfiguration.TRIPOD);

      expect(locations).toContain(MechLocation.CENTER_LEG);
      expect(locations).toContain(MechLocation.LEFT_ARM);
      expect(locations).toContain(MechLocation.RIGHT_ARM);
      expect(locations).toContain(MechLocation.LEFT_LEG);
      expect(locations).toContain(MechLocation.RIGHT_LEG);
      expect(locations).toHaveLength(9); // 4 torso + 2 arms + 3 legs
    });

    it('should return biped locations when undefined', () => {
      const locations = getLocationsForConfiguration(undefined);
      const bipedLocations = getLocationsForConfiguration(
        MechConfiguration.BIPED,
      );

      expect(locations.sort()).toEqual(bipedLocations.sort());
    });
  });

  describe('buildSlotsByLocation', () => {
    it('should initialize all locations with 0 used slots', () => {
      const result = buildSlotsByLocation([], MechConfiguration.BIPED);

      Object.values(result).forEach((entry) => {
        expect(entry.used).toBe(0);
        expect(entry.max).toBeGreaterThan(0);
      });
    });

    it('should use correct max slots from LOCATION_SLOT_COUNTS', () => {
      const result = buildSlotsByLocation([], MechConfiguration.BIPED);

      expect(result[MechLocation.HEAD]?.max).toBe(
        LOCATION_SLOT_COUNTS[MechLocation.HEAD],
      );
      expect(result[MechLocation.CENTER_TORSO]?.max).toBe(
        LOCATION_SLOT_COUNTS[MechLocation.CENTER_TORSO],
      );
      expect(result[MechLocation.LEFT_ARM]?.max).toBe(
        LOCATION_SLOT_COUNTS[MechLocation.LEFT_ARM],
      );
      expect(result[MechLocation.LEFT_LEG]?.max).toBe(
        LOCATION_SLOT_COUNTS[MechLocation.LEFT_LEG],
      );
    });

    it('should count equipment slots correctly', () => {
      const equipment: IEquipmentSlotInfo[] = [
        createMockEquipment(MechLocation.LEFT_ARM, [0, 1, 2]),
        createMockEquipment(MechLocation.LEFT_ARM, [3, 4]),
        createMockEquipment(MechLocation.RIGHT_ARM, [0]),
      ];

      const result = buildSlotsByLocation(equipment, MechConfiguration.BIPED);

      expect(result[MechLocation.LEFT_ARM]?.used).toBe(5);
      expect(result[MechLocation.RIGHT_ARM]?.used).toBe(1);
      expect(result[MechLocation.CENTER_TORSO]?.used).toBe(0);
    });

    it('should ignore equipment with undefined location', () => {
      const equipment: IEquipmentSlotInfo[] = [
        createMockEquipment(undefined, [0, 1, 2]),
        createMockEquipment(MechLocation.LEFT_ARM, [0]),
      ];

      const result = buildSlotsByLocation(equipment, MechConfiguration.BIPED);

      expect(result[MechLocation.LEFT_ARM]?.used).toBe(1);
    });

    it('should ignore equipment with undefined slots', () => {
      const equipment: IEquipmentSlotInfo[] = [
        createMockEquipment(MechLocation.LEFT_ARM, undefined),
        createMockEquipment(MechLocation.LEFT_ARM, [0]),
      ];

      const result = buildSlotsByLocation(equipment, MechConfiguration.BIPED);

      expect(result[MechLocation.LEFT_ARM]?.used).toBe(1);
    });

    it('should ignore equipment with empty slots array', () => {
      const equipment: IEquipmentSlotInfo[] = [
        createMockEquipment(MechLocation.LEFT_ARM, []),
        createMockEquipment(MechLocation.LEFT_ARM, [0, 1]),
      ];

      const result = buildSlotsByLocation(equipment, MechConfiguration.BIPED);

      expect(result[MechLocation.LEFT_ARM]?.used).toBe(2);
    });

    it('should include display names', () => {
      const result = buildSlotsByLocation([], MechConfiguration.BIPED);

      expect(result[MechLocation.HEAD]?.displayName).toBe('Head');
      expect(result[MechLocation.LEFT_ARM]?.displayName).toBe('Left Arm');
    });

    it('should only include locations valid for configuration', () => {
      const bipedResult = buildSlotsByLocation([], MechConfiguration.BIPED);
      const quadResult = buildSlotsByLocation([], MechConfiguration.QUAD);

      expect(bipedResult[MechLocation.LEFT_ARM]).toBeDefined();
      expect(bipedResult[MechLocation.FRONT_LEFT_LEG]).toBeUndefined();

      expect(quadResult[MechLocation.LEFT_ARM]).toBeUndefined();
      expect(quadResult[MechLocation.FRONT_LEFT_LEG]).toBeDefined();
    });
  });

  describe('getLocationDisplayName', () => {
    it('should return correct display names', () => {
      expect(getLocationDisplayName(MechLocation.HEAD)).toBe('Head');
      expect(getLocationDisplayName(MechLocation.CENTER_TORSO)).toBe(
        'Center Torso',
      );
      expect(getLocationDisplayName(MechLocation.LEFT_ARM)).toBe('Left Arm');
      expect(getLocationDisplayName(MechLocation.FRONT_LEFT_LEG)).toBe(
        'Front Left Leg',
      );
    });
  });

  describe('createSlotLocationEntry', () => {
    it('should create valid slot location entry', () => {
      const entry = createSlotLocationEntry(5, 12, 'Left Arm');

      expect(entry.used).toBe(5);
      expect(entry.max).toBe(12);
      expect(entry.displayName).toBe('Left Arm');
    });
  });

  describe('getTotalSlotsUsed', () => {
    it('should sum all used slots', () => {
      const equipment: IEquipmentSlotInfo[] = [
        createMockEquipment(MechLocation.LEFT_ARM, [0, 1, 2]),
        createMockEquipment(MechLocation.RIGHT_ARM, [0, 1]),
        createMockEquipment(MechLocation.CENTER_TORSO, [0]),
      ];

      const slotsByLocation = buildSlotsByLocation(
        equipment,
        MechConfiguration.BIPED,
      );
      const total = getTotalSlotsUsed(slotsByLocation);

      expect(total).toBe(6);
    });

    it('should return 0 for empty equipment', () => {
      const slotsByLocation = buildSlotsByLocation([], MechConfiguration.BIPED);
      const total = getTotalSlotsUsed(slotsByLocation);

      expect(total).toBe(0);
    });
  });

  describe('getTotalSlotsAvailable', () => {
    it('should sum all max slots', () => {
      const slotsByLocation = buildSlotsByLocation([], MechConfiguration.BIPED);
      const total = getTotalSlotsAvailable(slotsByLocation);

      // Biped: Head(6) + CT(12) + LT(12) + RT(12) + LA(12) + RA(12) + LL(6) + RL(6) = 78
      expect(total).toBe(78);
    });
  });

  describe('getOverflowLocations', () => {
    it('should return empty array when no overflow', () => {
      const slotsByLocation = buildSlotsByLocation([], MechConfiguration.BIPED);
      const overflow = getOverflowLocations(slotsByLocation);

      expect(overflow).toEqual([]);
    });

    it('should detect overflow locations', () => {
      // Create equipment that exceeds capacity
      const equipment: IEquipmentSlotInfo[] = [];
      // Fill head with more than 6 slots worth
      for (let i = 0; i < 8; i++) {
        equipment.push(createMockEquipment(MechLocation.HEAD, [i]));
      }

      const slotsByLocation = buildSlotsByLocation(
        equipment,
        MechConfiguration.BIPED,
      );
      const overflow = getOverflowLocations(slotsByLocation);

      expect(overflow).toContain('Head');
    });

    it('should return display names for overflow locations', () => {
      const equipment: IEquipmentSlotInfo[] = [];
      for (let i = 0; i < 15; i++) {
        equipment.push(createMockEquipment(MechLocation.LEFT_ARM, [i]));
      }

      const slotsByLocation = buildSlotsByLocation(
        equipment,
        MechConfiguration.BIPED,
      );
      const overflow = getOverflowLocations(slotsByLocation);

      expect(overflow).toContain('Left Arm');
    });
  });
});
