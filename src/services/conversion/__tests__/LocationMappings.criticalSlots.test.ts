/**
 * LocationMappings critical slot parsing tests.
 */

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';

import { parseCriticalSlots, SourceCriticalEntry } from '../LocationMappings';

describe('LocationMappings critical slots', () => {
  describe('parseCriticalSlots', () => {
    it('should parse properly formatted entries (8 locations)', () => {
      const entries: SourceCriticalEntry[] = [
        {
          location: 'Head',
          slots: [
            'Life Support',
            'Sensors',
            'Cockpit',
            'Sensors',
            'Life Support',
            '-Empty-',
          ],
        },
        {
          location: 'Left Leg',
          slots: [
            'Hip',
            'Upper Leg Actuator',
            'Lower Leg Actuator',
            'Foot Actuator',
            '-Empty-',
            '-Empty-',
          ],
        },
        {
          location: 'Right Leg',
          slots: [
            'Hip',
            'Upper Leg Actuator',
            'Lower Leg Actuator',
            'Foot Actuator',
            '-Empty-',
            '-Empty-',
          ],
        },
        {
          location: 'Left Arm',
          slots: [
            'Shoulder',
            'Upper Arm Actuator',
            'Lower Arm Actuator',
            'Hand Actuator',
            'Medium Laser',
            '-Empty-',
            '-Empty-',
            '-Empty-',
            '-Empty-',
            '-Empty-',
            '-Empty-',
            '-Empty-',
          ],
        },
        {
          location: 'Right Arm',
          slots: [
            'Shoulder',
            'Upper Arm Actuator',
            'Lower Arm Actuator',
            'Hand Actuator',
            'Medium Laser',
            '-Empty-',
            '-Empty-',
            '-Empty-',
            '-Empty-',
            '-Empty-',
            '-Empty-',
            '-Empty-',
          ],
        },
        { location: 'Left Torso', slots: Array<string>(12).fill('-Empty-') },
        { location: 'Right Torso', slots: Array<string>(12).fill('-Empty-') },
        { location: 'Center Torso', slots: Array<string>(12).fill('-Empty-') },
      ];

      const result = parseCriticalSlots(entries);

      expect(result.length).toBe(8);

      const head = result.find((r) => r.location === MechLocation.HEAD);
      expect(head).toBeDefined();
      expect(head?.slots.length).toBe(6);

      const leftArm = result.find((r) => r.location === MechLocation.LEFT_ARM);
      expect(leftArm).toBeDefined();
      expect(leftArm?.slots.length).toBe(12);
    });

    it('should parse combined format (single entry with all slots)', () => {
      // Simulates MegaMekLab combined format: 96 slots (8 locations × 12 slots padded)
      const allSlots: string[] = [
        // Head (6 actual, padded to 12)
        'Life Support',
        'Sensors',
        'Cockpit',
        'Sensors',
        'Life Support',
        '-Empty-',
        ...Array<string>(6).fill('-Empty-'),
        // Left Leg (6 actual, padded to 12)
        'Hip',
        'Upper Leg Actuator',
        'Lower Leg Actuator',
        'Foot Actuator',
        '-Empty-',
        '-Empty-',
        ...Array<string>(6).fill('-Empty-'),
        // Right Leg
        'Hip',
        'Upper Leg Actuator',
        'Lower Leg Actuator',
        'Foot Actuator',
        '-Empty-',
        '-Empty-',
        ...Array<string>(6).fill('-Empty-'),
        // Left Arm (12)
        'Shoulder',
        'Upper Arm Actuator',
        'Lower Arm Actuator',
        'Hand Actuator',
        ...Array<string>(8).fill('-Empty-'),
        // Right Arm (12)
        'Shoulder',
        'Upper Arm Actuator',
        'Lower Arm Actuator',
        'Hand Actuator',
        ...Array<string>(8).fill('-Empty-'),
        // Left Torso (12)
        ...Array<string>(12).fill('-Empty-'),
        // Right Torso (12)
        ...Array<string>(12).fill('-Empty-'),
        // Center Torso (12)
        ...Array<string>(12).fill('-Empty-'),
      ];

      const entries: SourceCriticalEntry[] = [
        { location: 'Head', slots: allSlots },
      ];

      const result = parseCriticalSlots(entries);

      expect(result.length).toBe(8);

      const head = result.find((r) => r.location === MechLocation.HEAD);
      expect(head?.slots.length).toBe(6);
      expect(head?.slots[0]).toBe('Life Support');
    });

    it('should handle empty entries', () => {
      const entries: SourceCriticalEntry[] = [];
      const result = parseCriticalSlots(entries);
      expect(result.length).toBe(0);
    });

    it('should handle partial format (some locations separate)', () => {
      // Less than 8 entries but multiple locations
      const entries: SourceCriticalEntry[] = [
        {
          location: 'Head',
          slots: [
            'Life Support',
            'Sensors',
            'Cockpit',
            'Sensors',
            'Life Support',
            '-Empty-',
          ],
        },
        {
          location: 'Left Arm',
          slots: [
            'Shoulder',
            'Upper Arm Actuator',
            'Lower Arm Actuator',
            'Hand Actuator',
            '-Empty-',
            '-Empty-',
            '-Empty-',
            '-Empty-',
            '-Empty-',
            '-Empty-',
            '-Empty-',
            '-Empty-',
          ],
        },
        {
          location: 'Right Arm',
          slots: [
            'Shoulder',
            'Upper Arm Actuator',
            'Lower Arm Actuator',
            'Hand Actuator',
            '-Empty-',
            '-Empty-',
            '-Empty-',
            '-Empty-',
            '-Empty-',
            '-Empty-',
            '-Empty-',
            '-Empty-',
          ],
        },
      ];

      const result = parseCriticalSlots(entries);

      expect(result.length).toBe(3);
      expect(
        result.find((r) => r.location === MechLocation.HEAD),
      ).toBeDefined();
      expect(
        result.find((r) => r.location === MechLocation.LEFT_ARM),
      ).toBeDefined();
      expect(
        result.find((r) => r.location === MechLocation.RIGHT_ARM),
      ).toBeDefined();
    });

    it('should skip duplicate locations in partial format', () => {
      const entries: SourceCriticalEntry[] = [
        {
          location: 'Head',
          slots: [
            'Life Support',
            'Sensors',
            'Cockpit',
            'Sensors',
            'Life Support',
            '-Empty-',
          ],
        },
        { location: 'Head', slots: ['Different', 'Slots', 'Here'] }, // Duplicate should be skipped
      ];

      const result = parseCriticalSlots(entries);

      // Should only have one Head entry
      const headEntries = result.filter(
        (r) => r.location === MechLocation.HEAD,
      );
      expect(headEntries.length).toBe(1);
      expect(headEntries[0].slots[0]).toBe('Life Support');
    });

    it('should skip entries with invalid locations in partial format', () => {
      const entries: SourceCriticalEntry[] = [
        {
          location: 'Head',
          slots: [
            'Life Support',
            'Sensors',
            'Cockpit',
            'Sensors',
            'Life Support',
            '-Empty-',
          ],
        },
        { location: 'InvalidLocation', slots: ['Should', 'Be', 'Skipped'] },
      ];

      const result = parseCriticalSlots(entries);

      expect(result.length).toBe(1);
      expect(result[0].location).toBe(MechLocation.HEAD);
    });
  });
});
