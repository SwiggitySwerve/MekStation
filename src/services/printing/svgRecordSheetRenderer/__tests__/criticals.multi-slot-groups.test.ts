import type { ILocationCriticals } from '@/types/printing';

import { renderCriticalSlots } from '../criticals';
import {
  createMockLocationCriticals,
  createMockSlot,
  createMockSvgDoc,
  getCreatedElements,
  mockConsoleWarn,
} from './criticals.test-helpers';

beforeEach(() => {
  mockConsoleWarn.mockClear();
});

afterAll(() => {
  mockConsoleWarn.mockRestore();
});

describe('Multi-Slot Equipment Brackets', () => {
  it('should draw bracket for multi-slot user equipment', () => {
    const mockDoc = createMockSvgDoc({
      critAreas: {
        crits_LA: { x: 10, y: 20, width: 94, height: 103 },
      },
    });

    const criticals: ILocationCriticals[] = [
      createMockLocationCriticals({
        location: 'Left Arm',
        abbreviation: 'LA',
        slots: [
          createMockSlot({
            slotNumber: 1,
            content: 'Shoulder',
            isSystem: true,
          }),
          createMockSlot({
            slotNumber: 2,
            content: 'Upper Arm Actuator',
            isSystem: true,
          }),
          createMockSlot({
            slotNumber: 3,
            content: 'PPC',
            isHittable: true,
            equipmentId: 'ppc-1',
          }),
          createMockSlot({
            slotNumber: 4,
            content: 'PPC',
            isHittable: true,
            equipmentId: 'ppc-1',
          }),
          createMockSlot({
            slotNumber: 5,
            content: 'PPC',
            isHittable: true,
            equipmentId: 'ppc-1',
          }),
          createMockSlot({ slotNumber: 6, content: '', isRollAgain: false }),
        ],
      }),
    ];

    renderCriticalSlots(mockDoc, criticals);

    const createdElements = getCreatedElements(mockDoc);
    const pathElements = createdElements.filter((el) => el.tagName === 'path');

    // Should have one bracket for the 3-slot PPC
    expect(pathElements.length).toBe(1);
    expect(pathElements[0].attributes.stroke).toBe('#000000');
    expect(pathElements[0].attributes.fill).toBe('none');
  });

  it('should NOT draw brackets for system components', () => {
    const mockDoc = createMockSvgDoc({
      critAreas: {
        crits_CT: { x: 10, y: 20, width: 94, height: 206 },
      },
    });

    const criticals: ILocationCriticals[] = [
      createMockLocationCriticals({
        location: 'Center Torso',
        abbreviation: 'CT',
        slots: [
          createMockSlot({
            slotNumber: 1,
            content: 'Fusion Engine',
            isSystem: true,
          }),
          createMockSlot({
            slotNumber: 2,
            content: 'Fusion Engine',
            isSystem: true,
          }),
          createMockSlot({
            slotNumber: 3,
            content: 'Fusion Engine',
            isSystem: true,
          }),
          createMockSlot({ slotNumber: 4, content: 'Gyro', isSystem: true }),
          createMockSlot({ slotNumber: 5, content: 'Gyro', isSystem: true }),
          createMockSlot({ slotNumber: 6, content: 'Gyro', isSystem: true }),
          createMockSlot({ slotNumber: 7, content: 'Gyro', isSystem: true }),
          createMockSlot({
            slotNumber: 8,
            content: 'Fusion Engine',
            isSystem: true,
          }),
          createMockSlot({
            slotNumber: 9,
            content: 'Fusion Engine',
            isSystem: true,
          }),
          createMockSlot({
            slotNumber: 10,
            content: 'Fusion Engine',
            isSystem: true,
          }),
          createMockSlot({ slotNumber: 11, content: '', isRollAgain: false }),
          createMockSlot({ slotNumber: 12, content: '', isRollAgain: false }),
        ],
      }),
    ];

    renderCriticalSlots(mockDoc, criticals);

    const createdElements = getCreatedElements(mockDoc);
    const pathElements = createdElements.filter((el) => el.tagName === 'path');

    // Should NOT have brackets for system components
    expect(pathElements.length).toBe(0);
  });

  it('should NOT draw brackets for single-slot equipment', () => {
    const mockDoc = createMockSvgDoc({
      critAreas: {
        crits_LA: { x: 10, y: 20, width: 94, height: 103 },
      },
    });

    const criticals: ILocationCriticals[] = [
      createMockLocationCriticals({
        location: 'Left Arm',
        abbreviation: 'LA',
        slots: [
          createMockSlot({
            slotNumber: 1,
            content: 'Medium Laser',
            isHittable: true,
            equipmentId: 'ml-1',
          }),
          createMockSlot({
            slotNumber: 2,
            content: 'Medium Laser',
            isHittable: true,
            equipmentId: 'ml-2',
          }), // Different ID
          createMockSlot({ slotNumber: 3, content: '', isRollAgain: false }),
          createMockSlot({ slotNumber: 4, content: '', isRollAgain: false }),
          createMockSlot({ slotNumber: 5, content: '', isRollAgain: false }),
          createMockSlot({ slotNumber: 6, content: '', isRollAgain: false }),
        ],
      }),
    ];

    renderCriticalSlots(mockDoc, criticals);

    const createdElements = getCreatedElements(mockDoc);
    const pathElements = createdElements.filter((el) => el.tagName === 'path');

    // Single-slot equipment should not have brackets
    expect(pathElements.length).toBe(0);
  });

  it('should draw multiple brackets for multiple multi-slot equipment', () => {
    const mockDoc = createMockSvgDoc({
      critAreas: {
        crits_RA: { x: 10, y: 20, width: 94, height: 103 },
      },
    });

    const criticals: ILocationCriticals[] = [
      createMockLocationCriticals({
        location: 'Right Arm',
        abbreviation: 'RA',
        slots: [
          createMockSlot({
            slotNumber: 1,
            content: 'AC/5',
            isHittable: true,
            equipmentId: 'ac5-1',
          }),
          createMockSlot({
            slotNumber: 2,
            content: 'AC/5',
            isHittable: true,
            equipmentId: 'ac5-1',
          }),
          createMockSlot({
            slotNumber: 3,
            content: 'AC/5',
            isHittable: true,
            equipmentId: 'ac5-1',
          }),
          createMockSlot({
            slotNumber: 4,
            content: 'AC/5',
            isHittable: true,
            equipmentId: 'ac5-1',
          }),
          createMockSlot({
            slotNumber: 5,
            content: 'LRM 5',
            isHittable: true,
            equipmentId: 'lrm5-1',
          }),
          createMockSlot({
            slotNumber: 6,
            content: 'LRM 5',
            isHittable: true,
            equipmentId: 'lrm5-1',
          }),
        ],
      }),
    ];

    renderCriticalSlots(mockDoc, criticals);

    const createdElements = getCreatedElements(mockDoc);
    const pathElements = createdElements.filter((el) => el.tagName === 'path');

    // Should have brackets for both multi-slot equipment
    expect(pathElements.length).toBe(2);
  });

  it('should draw continuous bracket for equipment spanning slots 6-7 gap', () => {
    const mockDoc = createMockSvgDoc({
      critAreas: {
        crits_CT: { x: 10, y: 20, width: 94, height: 206 },
      },
    });

    const criticals: ILocationCriticals[] = [
      createMockLocationCriticals({
        location: 'Center Torso',
        abbreviation: 'CT',
        slots: [
          createMockSlot({ slotNumber: 1, content: '', isRollAgain: false }),
          createMockSlot({ slotNumber: 2, content: '', isRollAgain: false }),
          createMockSlot({ slotNumber: 3, content: '', isRollAgain: false }),
          createMockSlot({ slotNumber: 4, content: '', isRollAgain: false }),
          createMockSlot({
            slotNumber: 5,
            content: 'LRM 20',
            isHittable: true,
            equipmentId: 'lrm20-1',
          }),
          createMockSlot({
            slotNumber: 6,
            content: 'LRM 20',
            isHittable: true,
            equipmentId: 'lrm20-1',
          }),
          createMockSlot({
            slotNumber: 7,
            content: 'LRM 20',
            isHittable: true,
            equipmentId: 'lrm20-1',
          }),
          createMockSlot({
            slotNumber: 8,
            content: 'LRM 20',
            isHittable: true,
            equipmentId: 'lrm20-1',
          }),
          createMockSlot({
            slotNumber: 9,
            content: 'LRM 20',
            isHittable: true,
            equipmentId: 'lrm20-1',
          }),
          createMockSlot({ slotNumber: 10, content: '', isRollAgain: false }),
          createMockSlot({ slotNumber: 11, content: '', isRollAgain: false }),
          createMockSlot({ slotNumber: 12, content: '', isRollAgain: false }),
        ],
      }),
    ];

    renderCriticalSlots(mockDoc, criticals);

    const createdElements = getCreatedElements(mockDoc);
    const pathElements = createdElements.filter((el) => el.tagName === 'path');

    // Should have one continuous bracket
    expect(pathElements.length).toBe(1);

    // Verify the path has the d attribute
    expect(pathElements[0].attributes.d).toBeDefined();
  });

  it('should group equipment by equipmentId for bracketing', () => {
    const mockDoc = createMockSvgDoc({
      critAreas: {
        crits_LA: { x: 10, y: 20, width: 94, height: 103 },
      },
    });

    // Same content name but different equipmentId should create separate brackets
    const criticals: ILocationCriticals[] = [
      createMockLocationCriticals({
        location: 'Left Arm',
        abbreviation: 'LA',
        slots: [
          createMockSlot({
            slotNumber: 1,
            content: 'Medium Laser',
            isHittable: true,
            equipmentId: 'ml-1',
          }),
          createMockSlot({
            slotNumber: 2,
            content: 'Medium Laser',
            isHittable: true,
            equipmentId: 'ml-1',
          }),
          createMockSlot({
            slotNumber: 3,
            content: 'Medium Laser',
            isHittable: true,
            equipmentId: 'ml-2',
          }),
          createMockSlot({
            slotNumber: 4,
            content: 'Medium Laser',
            isHittable: true,
            equipmentId: 'ml-2',
          }),
          createMockSlot({ slotNumber: 5, content: '', isRollAgain: false }),
          createMockSlot({ slotNumber: 6, content: '', isRollAgain: false }),
        ],
      }),
    ];

    renderCriticalSlots(mockDoc, criticals);

    const createdElements = getCreatedElements(mockDoc);
    const pathElements = createdElements.filter((el) => el.tagName === 'path');

    // Should have two separate brackets for two different equipment instances
    expect(pathElements.length).toBe(2);
  });

  it('should fall back to content name when equipmentId is not provided', () => {
    const mockDoc = createMockSvgDoc({
      critAreas: {
        crits_LA: { x: 10, y: 20, width: 94, height: 103 },
      },
    });

    // Same content name without equipmentId should be grouped together
    const criticals: ILocationCriticals[] = [
      createMockLocationCriticals({
        location: 'Left Arm',
        abbreviation: 'LA',
        slots: [
          createMockSlot({ slotNumber: 1, content: 'PPC', isHittable: true }),
          createMockSlot({ slotNumber: 2, content: 'PPC', isHittable: true }),
          createMockSlot({ slotNumber: 3, content: 'PPC', isHittable: true }),
          createMockSlot({ slotNumber: 4, content: '', isRollAgain: false }),
          createMockSlot({ slotNumber: 5, content: '', isRollAgain: false }),
          createMockSlot({ slotNumber: 6, content: '', isRollAgain: false }),
        ],
      }),
    ];

    renderCriticalSlots(mockDoc, criticals);

    const createdElements = getCreatedElements(mockDoc);
    const pathElements = createdElements.filter((el) => el.tagName === 'path');

    // Should have one bracket for the 3-slot PPC
    expect(pathElements.length).toBe(1);
  });

  it('should NOT bracket Roll Again slots', () => {
    const mockDoc = createMockSvgDoc({
      critAreas: {
        crits_HD: { x: 10, y: 20, width: 94, height: 103 },
      },
    });

    const criticals: ILocationCriticals[] = [
      createMockLocationCriticals({
        location: 'Head',
        abbreviation: 'HD',
        slots: [
          createMockSlot({ slotNumber: 1, content: '', isRollAgain: true }),
          createMockSlot({ slotNumber: 2, content: '', isRollAgain: true }),
          createMockSlot({ slotNumber: 3, content: '', isRollAgain: true }),
          createMockSlot({ slotNumber: 4, content: '', isRollAgain: true }),
          createMockSlot({ slotNumber: 5, content: '', isRollAgain: true }),
          createMockSlot({ slotNumber: 6, content: '', isRollAgain: true }),
        ],
      }),
    ];

    renderCriticalSlots(mockDoc, criticals);

    const createdElements = getCreatedElements(mockDoc);
    const pathElements = createdElements.filter((el) => el.tagName === 'path');

    // Roll Again slots should not have brackets
    expect(pathElements.length).toBe(0);
  });
});
