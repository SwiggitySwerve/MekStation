/**
 * LocationMappings Tests
 *
 * Tests for location mapping and parsing functions.
 */

import {
  mapLocation,
  parseLocation,
  convertArmorLocations,
  calculateTotalArmor,
  parseCriticalSlots,
  getAllMechLocations,
  isValidMechLocation,
  LOCATION_SLOT_ORDER,
  BIPED_SLOT_COUNTS,
  SourceArmorLocation,
  SourceCriticalEntry,
} from '../LocationMappings';

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';

describe('LocationMappings', () => {
  describe('mapLocation', () => {
    it('should map head locations', () => {
      expect(mapLocation('Head')).toBe(MechLocation.HEAD);
      expect(mapLocation('HD')).toBe(MechLocation.HEAD);
      expect(mapLocation('H')).toBe(MechLocation.HEAD);
    });

    it('should map center torso locations', () => {
      expect(mapLocation('Center Torso')).toBe(MechLocation.CENTER_TORSO);
      expect(mapLocation('CT')).toBe(MechLocation.CENTER_TORSO);
      expect(mapLocation('CenterTorso')).toBe(MechLocation.CENTER_TORSO);
    });

    it('should map left torso locations', () => {
      expect(mapLocation('Left Torso')).toBe(MechLocation.LEFT_TORSO);
      expect(mapLocation('LT')).toBe(MechLocation.LEFT_TORSO);
      expect(mapLocation('LeftTorso')).toBe(MechLocation.LEFT_TORSO);
    });

    it('should map right torso locations', () => {
      expect(mapLocation('Right Torso')).toBe(MechLocation.RIGHT_TORSO);
      expect(mapLocation('RT')).toBe(MechLocation.RIGHT_TORSO);
      expect(mapLocation('RightTorso')).toBe(MechLocation.RIGHT_TORSO);
    });

    it('should map arm locations', () => {
      expect(mapLocation('Left Arm')).toBe(MechLocation.LEFT_ARM);
      expect(mapLocation('LA')).toBe(MechLocation.LEFT_ARM);
      expect(mapLocation('Right Arm')).toBe(MechLocation.RIGHT_ARM);
      expect(mapLocation('RA')).toBe(MechLocation.RIGHT_ARM);
    });

    it('should map leg locations', () => {
      expect(mapLocation('Left Leg')).toBe(MechLocation.LEFT_LEG);
      expect(mapLocation('LL')).toBe(MechLocation.LEFT_LEG);
      expect(mapLocation('Right Leg')).toBe(MechLocation.RIGHT_LEG);
      expect(mapLocation('RL')).toBe(MechLocation.RIGHT_LEG);
    });

    it('should return undefined for unknown locations', () => {
      expect(mapLocation('Unknown')).toBeUndefined();
      expect(mapLocation('')).toBeUndefined();
    });

    it('should handle whitespace', () => {
      expect(mapLocation('  Head  ')).toBe(MechLocation.HEAD);
    });
  });

  describe('parseLocation', () => {
    it('should parse standard locations', () => {
      const head = parseLocation('Head');
      expect(head?.location).toBe(MechLocation.HEAD);
      expect(head?.isRear).toBe(false);

      const ct = parseLocation('Center Torso');
      expect(ct?.location).toBe(MechLocation.CENTER_TORSO);
      expect(ct?.isRear).toBe(false);
    });

    it('should detect rear torso locations', () => {
      const ctRear = parseLocation('Center Torso (Rear)');
      expect(ctRear?.location).toBe(MechLocation.CENTER_TORSO);
      expect(ctRear?.isRear).toBe(true);

      const ltRear = parseLocation('Left Torso (Rear)');
      expect(ltRear?.location).toBe(MechLocation.LEFT_TORSO);
      expect(ltRear?.isRear).toBe(true);

      const rtRear = parseLocation('Right Torso (Rear)');
      expect(rtRear?.location).toBe(MechLocation.RIGHT_TORSO);
      expect(rtRear?.isRear).toBe(true);
    });

    it('should detect abbreviated rear locations', () => {
      const ctr = parseLocation('CTR');
      expect(ctr?.location).toBe(MechLocation.CENTER_TORSO);
      expect(ctr?.isRear).toBe(true);

      const ltr = parseLocation('LTR');
      expect(ltr?.location).toBe(MechLocation.LEFT_TORSO);
      expect(ltr?.isRear).toBe(true);

      const rtr = parseLocation('RTR');
      expect(rtr?.location).toBe(MechLocation.RIGHT_TORSO);
      expect(rtr?.isRear).toBe(true);
    });

    it('should use fuzzy matching', () => {
      expect(parseLocation('head section')?.location).toBe(MechLocation.HEAD);
      expect(parseLocation('left arm mount')?.location).toBe(MechLocation.LEFT_ARM);
      expect(parseLocation('right leg area')?.location).toBe(MechLocation.RIGHT_LEG);
    });

    it('should return undefined for invalid locations', () => {
      expect(parseLocation('Invalid')).toBeUndefined();
      expect(parseLocation('')).toBeUndefined();
    });
  });

  describe('convertArmorLocations', () => {
    it('should convert armor locations correctly', () => {
      const locations: SourceArmorLocation[] = [
        { location: 'Head', armor_points: 9 },
        { location: 'Center Torso', armor_points: 30, rear_armor_points: 10 },
        { location: 'Left Torso', armor_points: 20, rear_armor_points: 8 },
        { location: 'Right Torso', armor_points: 20, rear_armor_points: 8 },
        { location: 'Left Arm', armor_points: 16 },
        { location: 'Right Arm', armor_points: 16 },
        { location: 'Left Leg', armor_points: 20 },
        { location: 'Right Leg', armor_points: 20 },
      ];

      const result = convertArmorLocations(locations);

      expect(result.head).toBe(9);
      expect(result.centerTorso).toBe(30);
      expect(result.centerTorsoRear).toBe(10);
      expect(result.leftTorso).toBe(20);
      expect(result.leftTorsoRear).toBe(8);
      expect(result.rightTorso).toBe(20);
      expect(result.rightTorsoRear).toBe(8);
      expect(result.leftArm).toBe(16);
      expect(result.rightArm).toBe(16);
      expect(result.leftLeg).toBe(20);
      expect(result.rightLeg).toBe(20);
    });

    it('should handle separate rear armor entries', () => {
      const locations: SourceArmorLocation[] = [
        { location: 'Center Torso', armor_points: 30 },
        { location: 'Center Torso (Rear)', armor_points: 10 },
      ];

      const result = convertArmorLocations(locations);
      expect(result.centerTorso).toBe(30);
      expect(result.centerTorsoRear).toBe(10);
    });

    it('should default missing armor to zero', () => {
      const locations: SourceArmorLocation[] = [];
      const result = convertArmorLocations(locations);

      expect(result.head).toBe(0);
      expect(result.centerTorso).toBe(0);
      expect(result.leftArm).toBe(0);
    });

    it('should handle null rear_armor_points', () => {
      const locations: SourceArmorLocation[] = [
        { location: 'Center Torso', armor_points: 30, rear_armor_points: null },
      ];

      const result = convertArmorLocations(locations);
      expect(result.centerTorsoRear).toBe(0);
    });
  });

  describe('calculateTotalArmor', () => {
    it('should calculate total armor correctly', () => {
      const allocation = {
        head: 9,
        centerTorso: 30,
        centerTorsoRear: 10,
        leftTorso: 20,
        leftTorsoRear: 8,
        rightTorso: 20,
        rightTorsoRear: 8,
        leftArm: 16,
        rightArm: 16,
        leftLeg: 20,
        rightLeg: 20,
      };

      const total = calculateTotalArmor(allocation);
      expect(total).toBe(177);
    });

    it('should handle zero values', () => {
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

      const total = calculateTotalArmor(allocation);
      expect(total).toBe(0);
    });
  });

  describe('parseCriticalSlots', () => {
    it('should parse properly formatted entries (8 locations)', () => {
      const entries: SourceCriticalEntry[] = [
        { location: 'Head', slots: ['Life Support', 'Sensors', 'Cockpit', 'Sensors', 'Life Support', '-Empty-'] },
        { location: 'Left Leg', slots: ['Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator', '-Empty-', '-Empty-'] },
        { location: 'Right Leg', slots: ['Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator', '-Empty-', '-Empty-'] },
        { location: 'Left Arm', slots: ['Shoulder', 'Upper Arm Actuator', 'Lower Arm Actuator', 'Hand Actuator', 'Medium Laser', '-Empty-', '-Empty-', '-Empty-', '-Empty-', '-Empty-', '-Empty-', '-Empty-'] },
        { location: 'Right Arm', slots: ['Shoulder', 'Upper Arm Actuator', 'Lower Arm Actuator', 'Hand Actuator', 'Medium Laser', '-Empty-', '-Empty-', '-Empty-', '-Empty-', '-Empty-', '-Empty-', '-Empty-'] },
        { location: 'Left Torso', slots: Array(12).fill('-Empty-') },
        { location: 'Right Torso', slots: Array(12).fill('-Empty-') },
        { location: 'Center Torso', slots: Array(12).fill('-Empty-') },
      ];

      const result = parseCriticalSlots(entries);

      expect(result.length).toBe(8);

      const head = result.find(r => r.location === MechLocation.HEAD);
      expect(head).toBeDefined();
      expect(head?.slots.length).toBe(6);

      const leftArm = result.find(r => r.location === MechLocation.LEFT_ARM);
      expect(leftArm).toBeDefined();
      expect(leftArm?.slots.length).toBe(12);
    });

    it('should parse combined format (single entry with all slots)', () => {
      // Simulates MegaMekLab combined format: 96 slots (8 locations × 12 slots padded)
      const allSlots = [
        // Head (6 actual, padded to 12)
        'Life Support', 'Sensors', 'Cockpit', 'Sensors', 'Life Support', '-Empty-',
        ...Array(6).fill('-Empty-'),
        // Left Leg (6 actual, padded to 12)
        'Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator', '-Empty-', '-Empty-',
        ...Array(6).fill('-Empty-'),
        // Right Leg
        'Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator', '-Empty-', '-Empty-',
        ...Array(6).fill('-Empty-'),
        // Left Arm (12)
        'Shoulder', 'Upper Arm Actuator', 'Lower Arm Actuator', 'Hand Actuator',
        ...Array(8).fill('-Empty-'),
        // Right Arm (12)
        'Shoulder', 'Upper Arm Actuator', 'Lower Arm Actuator', 'Hand Actuator',
        ...Array(8).fill('-Empty-'),
        // Left Torso (12)
        ...Array(12).fill('-Empty-'),
        // Right Torso (12)
        ...Array(12).fill('-Empty-'),
        // Center Torso (12)
        ...Array(12).fill('-Empty-'),
      ];

      const entries: SourceCriticalEntry[] = [
        { location: 'Head', slots: allSlots },
      ];

      const result = parseCriticalSlots(entries);

      expect(result.length).toBe(8);

      const head = result.find(r => r.location === MechLocation.HEAD);
      expect(head?.slots.length).toBe(6);
      expect(head?.slots[0]).toBe('Life Support');
    });

    it('should handle empty entries', () => {
      const entries: SourceCriticalEntry[] = [];
      const result = parseCriticalSlots(entries);
      expect(result.length).toBe(0);
    });
  });

  describe('getAllMechLocations', () => {
    it('should return all mech locations', () => {
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

  describe('isValidMechLocation', () => {
    it('should return true for valid locations', () => {
      expect(isValidMechLocation('Head')).toBe(true);
      expect(isValidMechLocation('CT')).toBe(true);
      expect(isValidMechLocation('Left Arm')).toBe(true);
      expect(isValidMechLocation('Center Torso (Rear)')).toBe(true);
    });

    it('should return false for invalid locations', () => {
      expect(isValidMechLocation('Invalid')).toBe(false);
      expect(isValidMechLocation('')).toBe(false);
    });
  });

  describe('LOCATION_SLOT_ORDER', () => {
    it('should have correct order', () => {
      expect(LOCATION_SLOT_ORDER[0]).toBe(MechLocation.HEAD);
      expect(LOCATION_SLOT_ORDER[1]).toBe(MechLocation.LEFT_LEG);
      expect(LOCATION_SLOT_ORDER[2]).toBe(MechLocation.RIGHT_LEG);
      expect(LOCATION_SLOT_ORDER[3]).toBe(MechLocation.LEFT_ARM);
      expect(LOCATION_SLOT_ORDER[4]).toBe(MechLocation.RIGHT_ARM);
      expect(LOCATION_SLOT_ORDER[5]).toBe(MechLocation.LEFT_TORSO);
      expect(LOCATION_SLOT_ORDER[6]).toBe(MechLocation.RIGHT_TORSO);
      expect(LOCATION_SLOT_ORDER[7]).toBe(MechLocation.CENTER_TORSO);
    });
  });

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
  });
});
