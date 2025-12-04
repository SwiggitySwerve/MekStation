/**
 * Location Mappings Tests
 * 
 * Tests for location name normalization and armor/critical slot parsing.
 * 
 * @spec openspec/specs/critical-slot-allocation/spec.md
 */

import {
  mapLocation,
  parseLocation,
  convertArmorLocations,
  calculateTotalArmor,
  parseCriticalSlots,
  getAllMechLocations,
  isValidMechLocation,
  BIPED_SLOT_COUNTS,
  SourceArmorLocation,
  SourceCriticalEntry,
} from '@/services/conversion/LocationMappings';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';

describe('LocationMappings', () => {
  // ============================================================================
  // mapLocation()
  // ============================================================================
  describe('mapLocation()', () => {
    it('should map full location names', () => {
      expect(mapLocation('Head')).toBe(MechLocation.HEAD);
      expect(mapLocation('Center Torso')).toBe(MechLocation.CENTER_TORSO);
      expect(mapLocation('Left Torso')).toBe(MechLocation.LEFT_TORSO);
      expect(mapLocation('Right Torso')).toBe(MechLocation.RIGHT_TORSO);
      expect(mapLocation('Left Arm')).toBe(MechLocation.LEFT_ARM);
      expect(mapLocation('Right Arm')).toBe(MechLocation.RIGHT_ARM);
      expect(mapLocation('Left Leg')).toBe(MechLocation.LEFT_LEG);
      expect(mapLocation('Right Leg')).toBe(MechLocation.RIGHT_LEG);
    });

    it('should map abbreviated location names', () => {
      expect(mapLocation('HD')).toBe(MechLocation.HEAD);
      expect(mapLocation('CT')).toBe(MechLocation.CENTER_TORSO);
      expect(mapLocation('LT')).toBe(MechLocation.LEFT_TORSO);
      expect(mapLocation('RT')).toBe(MechLocation.RIGHT_TORSO);
      expect(mapLocation('LA')).toBe(MechLocation.LEFT_ARM);
      expect(mapLocation('RA')).toBe(MechLocation.RIGHT_ARM);
      expect(mapLocation('LL')).toBe(MechLocation.LEFT_LEG);
      expect(mapLocation('RL')).toBe(MechLocation.RIGHT_LEG);
    });

    it('should map single letter for head', () => {
      expect(mapLocation('H')).toBe(MechLocation.HEAD);
    });

    it('should return undefined for unknown locations', () => {
      expect(mapLocation('Unknown')).toBeUndefined();
      expect(mapLocation('')).toBeUndefined();
      expect(mapLocation('XYZ')).toBeUndefined();
    });

    it('should handle whitespace', () => {
      expect(mapLocation('  Head  ')).toBe(MechLocation.HEAD);
      expect(mapLocation('  CT  ')).toBe(MechLocation.CENTER_TORSO);
    });

    it('should map camelCase variations', () => {
      expect(mapLocation('CenterTorso')).toBe(MechLocation.CENTER_TORSO);
      expect(mapLocation('LeftTorso')).toBe(MechLocation.LEFT_TORSO);
      expect(mapLocation('RightTorso')).toBe(MechLocation.RIGHT_TORSO);
      expect(mapLocation('LeftArm')).toBe(MechLocation.LEFT_ARM);
      expect(mapLocation('RightArm')).toBe(MechLocation.RIGHT_ARM);
      expect(mapLocation('LeftLeg')).toBe(MechLocation.LEFT_LEG);
      expect(mapLocation('RightLeg')).toBe(MechLocation.RIGHT_LEG);
    });
  });

  // ============================================================================
  // parseLocation()
  // ============================================================================
  describe('parseLocation()', () => {
    it('should parse standard locations', () => {
      const head = parseLocation('Head');
      expect(head?.location).toBe(MechLocation.HEAD);
      expect(head?.isRear).toBe(false);
    });

    it('should detect rear locations', () => {
      expect(parseLocation('Center Torso (Rear)')?.isRear).toBe(true);
      expect(parseLocation('Left Torso (Rear)')?.isRear).toBe(true);
      expect(parseLocation('Right Torso (Rear)')?.isRear).toBe(true);
    });

    it('should parse abbreviated rear locations', () => {
      expect(parseLocation('CTR')?.isRear).toBe(true);
      expect(parseLocation('CTR')?.location).toBe(MechLocation.CENTER_TORSO);
      expect(parseLocation('LTR')?.isRear).toBe(true);
      expect(parseLocation('LTR')?.location).toBe(MechLocation.LEFT_TORSO);
      expect(parseLocation('RTR')?.isRear).toBe(true);
      expect(parseLocation('RTR')?.location).toBe(MechLocation.RIGHT_TORSO);
    });

    it('should parse CT (Rear) format', () => {
      expect(parseLocation('CT (Rear)')?.isRear).toBe(true);
      expect(parseLocation('LT (Rear)')?.isRear).toBe(true);
      expect(parseLocation('RT (Rear)')?.isRear).toBe(true);
    });

    it('should use fuzzy matching for partial names', () => {
      expect(parseLocation('head something')?.location).toBe(MechLocation.HEAD);
      expect(parseLocation('center torso area')?.location).toBe(MechLocation.CENTER_TORSO);
      expect(parseLocation('my left arm')?.location).toBe(MechLocation.LEFT_ARM);
    });

    it('should return undefined for invalid locations', () => {
      expect(parseLocation('')).toBeUndefined();
      expect(parseLocation('random text')).toBeUndefined();
    });
  });

  // ============================================================================
  // convertArmorLocations()
  // ============================================================================
  describe('convertArmorLocations()', () => {
    it('should convert armor allocation from source format', () => {
      const sourceArmor: SourceArmorLocation[] = [
        { location: 'Head', armor_points: 9 },
        { location: 'Center Torso', armor_points: 40, rear_armor_points: 15 },
        { location: 'Left Torso', armor_points: 28, rear_armor_points: 10 },
        { location: 'Right Torso', armor_points: 28, rear_armor_points: 10 },
        { location: 'Left Arm', armor_points: 24 },
        { location: 'Right Arm', armor_points: 24 },
        { location: 'Left Leg', armor_points: 30 },
        { location: 'Right Leg', armor_points: 30 },
      ];

      const allocation = convertArmorLocations(sourceArmor);

      expect(allocation.head).toBe(9);
      expect(allocation.centerTorso).toBe(40);
      expect(allocation.centerTorsoRear).toBe(15);
      expect(allocation.leftTorso).toBe(28);
      expect(allocation.leftTorsoRear).toBe(10);
      expect(allocation.rightTorso).toBe(28);
      expect(allocation.rightTorsoRear).toBe(10);
      expect(allocation.leftArm).toBe(24);
      expect(allocation.rightArm).toBe(24);
      expect(allocation.leftLeg).toBe(30);
      expect(allocation.rightLeg).toBe(30);
    });

    it('should handle separate rear armor entries', () => {
      const sourceArmor: SourceArmorLocation[] = [
        { location: 'Center Torso', armor_points: 40 },
        { location: 'Center Torso (Rear)', armor_points: 15 },
      ];

      const allocation = convertArmorLocations(sourceArmor);

      expect(allocation.centerTorso).toBe(40);
      expect(allocation.centerTorsoRear).toBe(15);
    });

    it('should handle null rear armor', () => {
      const sourceArmor: SourceArmorLocation[] = [
        { location: 'Left Arm', armor_points: 20, rear_armor_points: null },
      ];

      const allocation = convertArmorLocations(sourceArmor);

      expect(allocation.leftArm).toBe(20);
    });

    it('should default missing locations to 0', () => {
      const allocation = convertArmorLocations([]);

      expect(allocation.head).toBe(0);
      expect(allocation.centerTorso).toBe(0);
      expect(allocation.leftArm).toBe(0);
    });

    it('should handle abbreviated location names', () => {
      const sourceArmor: SourceArmorLocation[] = [
        { location: 'HD', armor_points: 9 },
        { location: 'CT', armor_points: 30 },
        { location: 'LA', armor_points: 20 },
      ];

      const allocation = convertArmorLocations(sourceArmor);

      expect(allocation.head).toBe(9);
      expect(allocation.centerTorso).toBe(30);
      expect(allocation.leftArm).toBe(20);
    });
  });

  // ============================================================================
  // calculateTotalArmor()
  // ============================================================================
  describe('calculateTotalArmor()', () => {
    it('should sum all armor points', () => {
      const allocation = {
        head: 9,
        centerTorso: 40,
        centerTorsoRear: 15,
        leftTorso: 28,
        leftTorsoRear: 10,
        rightTorso: 28,
        rightTorsoRear: 10,
        leftArm: 24,
        rightArm: 24,
        leftLeg: 30,
        rightLeg: 30,
      };

      const total = calculateTotalArmor(allocation);

      expect(total).toBe(9 + 40 + 15 + 28 + 10 + 28 + 10 + 24 + 24 + 30 + 30);
    });

    it('should handle zero armor', () => {
      const allocation = {
        head: 0,
        centerTorso: 0,
        centerTorsoRear: 0,
        leftTorso: 0,
        leftTorsoRear: 0,
        rightTorso: 0,
        rightTorsoRear: 0,
        leftArm: 0,
        rightArm: 0,
        leftLeg: 0,
        rightLeg: 0,
      };

      expect(calculateTotalArmor(allocation)).toBe(0);
    });
  });

  // ============================================================================
  // parseCriticalSlots()
  // ============================================================================
  describe('parseCriticalSlots()', () => {
    it('should parse properly separated location entries', () => {
      const entries: SourceCriticalEntry[] = [
        { location: 'Head', slots: ['Life Support', 'Sensors', 'Cockpit', 'null', 'Sensors', 'Life Support'] },
        { location: 'Left Arm', slots: Array<string>(12).fill('-Empty-') },
        { location: 'Right Arm', slots: Array<string>(12).fill('-Empty-') },
        { location: 'Left Torso', slots: Array<string>(12).fill('-Empty-') },
        { location: 'Right Torso', slots: Array<string>(12).fill('-Empty-') },
        { location: 'Center Torso', slots: Array<string>(12).fill('-Empty-') },
        { location: 'Left Leg', slots: Array<string>(6).fill('-Empty-') },
        { location: 'Right Leg', slots: Array<string>(6).fill('-Empty-') },
      ];

      const result = parseCriticalSlots(entries);

      expect(result.length).toBe(8);
      expect(result.find(r => r.location === MechLocation.HEAD)?.slots.length).toBe(6);
    });

    it('should handle combined format (all slots in one entry)', () => {
      // MegaMekLab converter sometimes outputs all slots in a single concatenated array
      // Order: Head(12), LeftLeg(12), RightLeg(12), LeftArm(12), RightArm(12), LeftTorso(12), RightTorso(12), CenterTorso(12)
      const combinedSlots = [
        // Head (6 real + 6 padding)
        ...Array(6).fill('Head Slot'),
        ...Array(6).fill('-Empty-'),
        // Left Leg (6 real + 6 padding)
        ...Array(6).fill('LL Slot'),
        ...Array(6).fill('-Empty-'),
        // Right Leg (6 real + 6 padding)
        ...Array(6).fill('RL Slot'),
        ...Array(6).fill('-Empty-'),
        // Left Arm (12)
        ...Array(12).fill('LA Slot'),
        // Right Arm (12)
        ...Array(12).fill('RA Slot'),
        // Left Torso (12)
        ...Array(12).fill('LT Slot'),
        // Right Torso (12)
        ...Array(12).fill('RT Slot'),
        // Center Torso (12)
        ...Array(12).fill('CT Slot'),
      ];

      const entries: SourceCriticalEntry[] = [
        { location: 'Head', slots: combinedSlots },
      ];

      const result = parseCriticalSlots(entries);

      expect(result.length).toBe(8);
      expect(result.find(r => r.location === MechLocation.HEAD)?.slots.length).toBe(6);
      expect(result.find(r => r.location === MechLocation.LEFT_ARM)?.slots.length).toBe(12);
    });

    it('should trim slots to actual capacity', () => {
      const entries: SourceCriticalEntry[] = [
        { location: 'Head', slots: Array(12).fill('Slot') }, // Head only has 6 slots
      ];

      const result = parseCriticalSlots(entries);

      expect(result.find(r => r.location === MechLocation.HEAD)?.slots.length).toBe(6);
    });

    it('should handle empty entries', () => {
      const result = parseCriticalSlots([]);
      expect(result).toHaveLength(0);
    });
  });

  // ============================================================================
  // BIPED_SLOT_COUNTS
  // ============================================================================
  describe('BIPED_SLOT_COUNTS', () => {
    it('should have correct slot counts', () => {
      expect(BIPED_SLOT_COUNTS[MechLocation.HEAD]).toBe(6);
      expect(BIPED_SLOT_COUNTS[MechLocation.CENTER_TORSO]).toBe(12);
      expect(BIPED_SLOT_COUNTS[MechLocation.LEFT_TORSO]).toBe(12);
      expect(BIPED_SLOT_COUNTS[MechLocation.RIGHT_TORSO]).toBe(12);
      expect(BIPED_SLOT_COUNTS[MechLocation.LEFT_ARM]).toBe(12);
      expect(BIPED_SLOT_COUNTS[MechLocation.RIGHT_ARM]).toBe(12);
      expect(BIPED_SLOT_COUNTS[MechLocation.LEFT_LEG]).toBe(6);
      expect(BIPED_SLOT_COUNTS[MechLocation.RIGHT_LEG]).toBe(6);
    });

    it('should sum to 78 total slots', () => {
      const total = Object.values(BIPED_SLOT_COUNTS).reduce((a, b) => a + b, 0);
      expect(total).toBe(78);
    });
  });

  // ============================================================================
  // getAllMechLocations()
  // ============================================================================
  describe('getAllMechLocations()', () => {
    it('should return all 8 locations', () => {
      const locations = getAllMechLocations();
      expect(locations).toContain(MechLocation.HEAD);
      expect(locations).toContain(MechLocation.CENTER_TORSO);
      expect(locations).toContain(MechLocation.LEFT_TORSO);
      expect(locations).toContain(MechLocation.RIGHT_TORSO);
      expect(locations).toContain(MechLocation.LEFT_ARM);
      expect(locations).toContain(MechLocation.RIGHT_ARM);
      expect(locations).toContain(MechLocation.LEFT_LEG);
      expect(locations).toContain(MechLocation.RIGHT_LEG);
    });
  });

  // ============================================================================
  // isValidMechLocation()
  // ============================================================================
  describe('isValidMechLocation()', () => {
    it('should return true for valid locations', () => {
      expect(isValidMechLocation('Head')).toBe(true);
      expect(isValidMechLocation('CT')).toBe(true);
      expect(isValidMechLocation('Left Arm')).toBe(true);
    });

    it('should return false for invalid locations', () => {
      expect(isValidMechLocation('')).toBe(false);
      expect(isValidMechLocation('Unknown')).toBe(false);
      expect(isValidMechLocation('XYZ')).toBe(false);
    });
  });
});

