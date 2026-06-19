import type { ILocationCriticals } from '@/types/printing';

import {
  createMockLocationCriticals,
  createMockSlot,
  createMockSvgDoc,
  getCreatedElements,
  mockConsoleWarn,
} from './criticals.test-helpers';

const { renderCriticalSlots } =
  require('../criticals') as typeof import('../criticals');

beforeEach(() => {
  mockConsoleWarn.mockClear();
});

afterAll(() => {
  mockConsoleWarn.mockRestore();
});

describe('renderCriticalSlots', () => {
  it('should render critical slots for each location', () => {
    const mockDoc = createMockSvgDoc({
      critAreas: {
        crits_HD: { x: 10, y: 20, width: 94, height: 103 },
        crits_CT: { x: 110, y: 20, width: 94, height: 206 },
      },
    });

    const criticals: ILocationCriticals[] = [
      createMockLocationCriticals({
        location: 'Head',
        abbreviation: 'HD',
        slots: [
          createMockSlot({
            slotNumber: 1,
            content: 'Life Support',
            isSystem: true,
          }),
          createMockSlot({
            slotNumber: 2,
            content: 'Sensors',
            isSystem: true,
          }),
          createMockSlot({
            slotNumber: 3,
            content: 'Cockpit',
            isSystem: true,
          }),
          createMockSlot({ slotNumber: 4, content: '', isRollAgain: false }),
          createMockSlot({
            slotNumber: 5,
            content: 'Sensors',
            isSystem: true,
          }),
          createMockSlot({
            slotNumber: 6,
            content: 'Life Support',
            isSystem: true,
          }),
        ],
      }),
      createMockLocationCriticals({
        location: 'Center Torso',
        abbreviation: 'CT',
        slots: Array.from({ length: 12 }, (_, i) =>
          createMockSlot({
            slotNumber: i + 1,
            content: 'Fusion Engine',
            isSystem: true,
          }),
        ),
      }),
    ];

    renderCriticalSlots(mockDoc, criticals);

    // Should have created groups for each location
    const createdElements = getCreatedElements(mockDoc);
    const groups = createdElements.filter((el) => el.tagName === 'g');
    expect(groups.length).toBe(2);
  });

  it('should handle empty criticals array', () => {
    const mockDoc = createMockSvgDoc();

    renderCriticalSlots(mockDoc, []);

    // Should not throw and should not create any elements
    const createdElements = getCreatedElements(mockDoc);
    expect(createdElements.length).toBe(0);
  });

  it('should warn when critical area is not found', () => {
    const mockDoc = createMockSvgDoc({
      critAreas: {}, // No areas defined
    });

    const criticals: ILocationCriticals[] = [
      createMockLocationCriticals({
        location: 'Head',
        abbreviation: 'HD',
        slots: [
          createMockSlot({
            slotNumber: 1,
            content: 'Life Support',
            isSystem: true,
          }),
        ],
      }),
    ];

    renderCriticalSlots(mockDoc, criticals);

    expect(mockConsoleWarn).toHaveBeenCalledWith(
      'Critical area not found: crits_HD',
    );
  });

  it('should skip locations with missing critical areas without affecting other locations', () => {
    const mockDoc = createMockSvgDoc({
      critAreas: {
        crits_LA: { x: 10, y: 20, width: 94, height: 103 },
        // No crits_HD
      },
    });

    const criticals: ILocationCriticals[] = [
      createMockLocationCriticals({
        location: 'Head',
        abbreviation: 'HD',
        slots: [
          createMockSlot({
            slotNumber: 1,
            content: 'Life Support',
            isSystem: true,
          }),
        ],
      }),
      createMockLocationCriticals({
        location: 'Left Arm',
        abbreviation: 'LA',
        slots: [
          createMockSlot({
            slotNumber: 1,
            content: 'Shoulder',
            isSystem: true,
          }),
        ],
      }),
    ];

    renderCriticalSlots(mockDoc, criticals);

    // Should warn about HD but still process LA
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      'Critical area not found: crits_HD',
    );

    const createdElements = getCreatedElements(mockDoc);
    const groups = createdElements.filter((el) => el.tagName === 'g');
    expect(groups.length).toBe(1);
  });
});

describe('renderLocationCriticals (via renderCriticalSlots)', () => {
  it('should create a group with correct ID and class', () => {
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
          createMockSlot({
            slotNumber: 1,
            content: 'Life Support',
            isSystem: true,
          }),
        ],
      }),
    ];

    renderCriticalSlots(mockDoc, criticals);

    const createdElements = getCreatedElements(mockDoc);
    const group = createdElements.find((el) => el.tagName === 'g');

    expect(group).toBeDefined();
    expect(group!.attributes.id).toBe('critSlots_HD');
    expect(group!.attributes.class).toBe('crit-slots');
  });

  it('should render location label above the crit rect', () => {
    const mockDoc = createMockSvgDoc({
      critAreas: {
        crits_HD: { x: 10, y: 50, width: 94, height: 103 },
      },
    });

    const criticals: ILocationCriticals[] = [
      createMockLocationCriticals({
        location: 'Head',
        abbreviation: 'HD',
        slots: [
          createMockSlot({
            slotNumber: 1,
            content: 'Life Support',
            isSystem: true,
          }),
        ],
      }),
    ];

    renderCriticalSlots(mockDoc, criticals);

    const createdElements = getCreatedElements(mockDoc);
    const textElements = createdElements.filter((el) => el.tagName === 'text');

    // First text element should be the label
    const labelElement = textElements[0];
    expect(labelElement).toBeDefined();
    expect(labelElement.textContent).toBe('Head');
    expect(labelElement.attributes['font-weight']).toBe('bold');
    expect(parseFloat(labelElement.attributes.y)).toBeLessThan(50); // Above the rect
  });

  it('should render slot numbers 1-6 for standard locations', () => {
    const mockDoc = createMockSvgDoc({
      critAreas: {
        crits_HD: { x: 10, y: 20, width: 94, height: 103 },
      },
    });

    const criticals: ILocationCriticals[] = [
      createMockLocationCriticals({
        location: 'Head',
        abbreviation: 'HD',
        slots: Array.from({ length: 6 }, (_, i) =>
          createMockSlot({
            slotNumber: i + 1,
            content: `Slot ${i + 1}`,
            isHittable: true,
          }),
        ),
      }),
    ];

    renderCriticalSlots(mockDoc, criticals);

    const createdElements = getCreatedElements(mockDoc);
    const textElements = createdElements.filter((el) => el.tagName === 'text');

    // Should have label + (6 slot numbers + 6 slot contents) = 13 text elements
    const slotNumbers = textElements.filter((el) =>
      /^[1-6]\.$/.test(el.textContent || ''),
    );
    expect(slotNumbers.length).toBe(6);
  });

  it('should render slot numbers 1-6 twice for 12-slot locations', () => {
    const mockDoc = createMockSvgDoc({
      critAreas: {
        crits_CT: { x: 10, y: 20, width: 94, height: 206 },
      },
    });

    const criticals: ILocationCriticals[] = [
      createMockLocationCriticals({
        location: 'Center Torso',
        abbreviation: 'CT',
        slots: Array.from({ length: 12 }, (_, i) =>
          createMockSlot({
            slotNumber: i + 1,
            content: 'Fusion Engine',
            isSystem: true,
          }),
        ),
      }),
    ];

    renderCriticalSlots(mockDoc, criticals);

    const createdElements = getCreatedElements(mockDoc);
    const textElements = createdElements.filter((el) => el.tagName === 'text');

    // Count slot numbers - should have 12 (1-6 twice)
    const slotNumbers = textElements.filter((el) =>
      /^[1-6]\.$/.test(el.textContent || ''),
    );
    expect(slotNumbers.length).toBe(12);
  });

  it('should use default dimensions when attributes are missing', () => {
    const mockDoc = createMockSvgDoc({
      critAreas: {
        crits_HD: { x: 0, y: 0, width: 94, height: 103 }, // Default values
      },
    });

    // Override getElementById to return element with null attributes
    const originalGetElementById = mockDoc.getElementById.bind(mockDoc);
    mockDoc.getElementById = (id: string) => {
      const element = originalGetElementById(id);
      if (element && id === 'crits_HD') {
        const originalGetAttribute = element.getAttribute.bind(element);
        element.getAttribute = (attr: string) => {
          if (attr === 'x' || attr === 'y') return null;
          return originalGetAttribute(attr);
        };
      }
      return element;
    };

    const criticals: ILocationCriticals[] = [
      createMockLocationCriticals({
        location: 'Head',
        abbreviation: 'HD',
        slots: [
          createMockSlot({
            slotNumber: 1,
            content: 'Life Support',
            isSystem: true,
          }),
        ],
      }),
    ];

    // Should not throw
    expect(() => renderCriticalSlots(mockDoc, criticals)).not.toThrow();
  });
});
