/**
 * Tests for Critical Slots Rendering Utilities
 *
 * @spec openspec/specs/record-sheet-export/spec.md
 *
 * Tests the renderCriticalSlots function and internal helper functions
 * for rendering critical hit tables on record sheets.
 */

import { ILocationCriticals, IRecordSheetCriticalSlot } from '@/types/printing';
// Mock logger to capture warnings
import { logger } from '@/utils/logger';

import { SVG_NS } from '../constants';
import { renderCriticalSlots } from '../criticals';
jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));
const mockConsoleWarn = logger.warn as jest.Mock;

/**
 * Interface for tracking created SVG elements during tests
 */
interface CreatedElement {
  tagName: string;
  attributes: Record<string, string>;
  textContent?: string;
}

/**
 * Interface for our mock document with tracking capabilities
 */
interface MockSvgDocument extends Document {
  _createdElements: CreatedElement[];
}

/**
 * Helper to get created elements from mock document
 */
function getCreatedElements(doc: Document): CreatedElement[] {
  return (doc as MockSvgDocument)._createdElements;
}

/**
 * Creates a mock SVG Document with configurable elements
 */
function createMockSvgDoc(
  options: {
    critAreas?: Record<
      string,
      { x: number; y: number; width: number; height: number }
    >;
  } = {},
): MockSvgDocument {
  const { critAreas = {} } = options;

  // Store created elements by ID
  const elementsById: Record<string, Element> = {};
  const allElements: Element[] = [];

  // Mock parent element (for insertBefore)
  const mockParent = {
    insertBefore: jest.fn((newNode: Element, _refNode: Element | null) => {
      allElements.push(newNode);
      return newNode;
    }),
  };

  // Create mock elements for critical areas
  for (const [id, rect] of Object.entries(critAreas)) {
    const mockRect = {
      getAttribute: (attr: string) => {
        switch (attr) {
          case 'x':
            return String(rect.x);
          case 'y':
            return String(rect.y);
          case 'width':
            return String(rect.width);
          case 'height':
            return String(rect.height);
          default:
            return null;
        }
      },
      parentNode: mockParent,
      nextSibling: null,
    };
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment -- Mock object for testing
    elementsById[id] = mockRect as any;
  }

  // Track created elements for assertions
  const createdElements: CreatedElement[] = [];

  const mockDoc = {
    getElementById: (id: string) => elementsById[id] || null,
    createElementNS: (ns: string, tagName: string) => {
      const attributes: Record<string, string> = {};
      let textContent = '';

      const mockElement = {
        setAttribute: (name: string, value: string) => {
          attributes[name] = value;
        },
        getAttribute: (name: string) => attributes[name] || null,
        appendChild: jest.fn((child: Element) => {
          return child;
        }),
        set textContent(value: string) {
          textContent = value;
        },
        get textContent() {
          return textContent;
        },
        tagName,
        namespaceURI: ns,
      };

      // Track created elements - use getters to capture final state
      const trackedElement: CreatedElement = {
        tagName,
        get attributes() {
          return { ...attributes };
        },
        get textContent() {
          return textContent;
        },
      };
      createdElements.push(trackedElement);

      // oxlint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return -- Mock object for testing
      return mockElement as any;
    },
    // Expose created elements for test assertions
    _createdElements: createdElements,
  };

  return mockDoc as MockSvgDocument;
}

/**
 * Creates a mock critical slot
 */
function createMockSlot(
  overrides: Partial<IRecordSheetCriticalSlot> = {},
): IRecordSheetCriticalSlot {
  return {
    slotNumber: 1,
    content: '',
    isSystem: false,
    isHittable: false,
    isRollAgain: false,
    ...overrides,
  };
}

/**
 * Creates a mock location criticals
 */
function createMockLocationCriticals(
  overrides: Partial<ILocationCriticals> = {},
): ILocationCriticals {
  return {
    location: 'Head',
    abbreviation: 'HD',
    slots: [],
    ...overrides,
  };
}

describe('criticals', () => {
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
      const textElements = createdElements.filter(
        (el) => el.tagName === 'text',
      );

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
      const textElements = createdElements.filter(
        (el) => el.tagName === 'text',
      );

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
      const textElements = createdElements.filter(
        (el) => el.tagName === 'text',
      );

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

  describe('Slot Content Rendering', () => {
    it('should render empty slots as "-Empty-" in gray', () => {
      const mockDoc = createMockSvgDoc({
        critAreas: {
          crits_HD: { x: 10, y: 20, width: 94, height: 103 },
        },
      });

      const criticals: ILocationCriticals[] = [
        createMockLocationCriticals({
          location: 'Head',
          abbreviation: 'HD',
          slots: [createMockSlot({ slotNumber: 1, content: '' })],
        }),
      ];

      renderCriticalSlots(mockDoc, criticals);

      const createdElements = getCreatedElements(mockDoc);
      const contentElements = createdElements.filter(
        (el) => el.tagName === 'text' && el.textContent === '-Empty-',
      );

      expect(contentElements.length).toBe(1);
      expect(contentElements[0].attributes.fill).toBe('#999999');
    });

    it('should render Roll Again slots with black text', () => {
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
          ],
        }),
      ];

      renderCriticalSlots(mockDoc, criticals);

      const createdElements = getCreatedElements(mockDoc);
      const rollAgainElements = createdElements.filter(
        (el) => el.tagName === 'text' && el.textContent === 'Roll Again',
      );

      expect(rollAgainElements.length).toBe(1);
      expect(rollAgainElements[0].attributes.fill).toBe('#000000');
      expect(rollAgainElements[0].attributes['font-weight']).toBe('normal');
    });

    it('should render hittable equipment in bold', () => {
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
            }),
          ],
        }),
      ];

      renderCriticalSlots(mockDoc, criticals);

      const createdElements = getCreatedElements(mockDoc);
      const laserElements = createdElements.filter(
        (el) => el.tagName === 'text' && el.textContent === 'Medium Laser',
      );

      expect(laserElements.length).toBe(1);
      expect(laserElements[0].attributes['font-weight']).toBe('bold');
    });

    it('should render non-hittable equipment (unhittables) in normal weight', () => {
      const mockDoc = createMockSvgDoc({
        critAreas: {
          crits_LT: { x: 10, y: 20, width: 94, height: 103 },
        },
      });

      const criticals: ILocationCriticals[] = [
        createMockLocationCriticals({
          location: 'Left Torso',
          abbreviation: 'LT',
          slots: [
            createMockSlot({
              slotNumber: 1,
              content: 'Endo Steel',
              isHittable: false,
            }),
          ],
        }),
      ];

      renderCriticalSlots(mockDoc, criticals);

      const createdElements = getCreatedElements(mockDoc);
      const endoElements = createdElements.filter(
        (el) => el.tagName === 'text' && el.textContent === 'Endo Steel',
      );

      expect(endoElements.length).toBe(1);
      expect(endoElements[0].attributes['font-weight']).toBe('normal');
    });

    it('should truncate long equipment names with ellipsis', () => {
      const mockDoc = createMockSvgDoc({
        critAreas: {
          crits_LA: { x: 10, y: 20, width: 94, height: 103 },
        },
      });

      // Very long equipment name that should be truncated
      const longName = 'Extended Range Particle Projection Cannon (ERPPC)';

      const criticals: ILocationCriticals[] = [
        createMockLocationCriticals({
          location: 'Left Arm',
          abbreviation: 'LA',
          slots: [
            createMockSlot({
              slotNumber: 1,
              content: longName,
              isHittable: true,
            }),
          ],
        }),
      ];

      renderCriticalSlots(mockDoc, criticals);

      const createdElements = getCreatedElements(mockDoc);
      const contentElements = createdElements.filter(
        (el) =>
          el.tagName === 'text' &&
          el.textContent &&
          el.textContent.endsWith('..'),
      );

      expect(contentElements.length).toBe(1);
      expect(contentElements[0].textContent!.length).toBeLessThan(
        longName.length,
      );
    });
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
      const pathElements = createdElements.filter(
        (el) => el.tagName === 'path',
      );

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
      const pathElements = createdElements.filter(
        (el) => el.tagName === 'path',
      );

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
      const pathElements = createdElements.filter(
        (el) => el.tagName === 'path',
      );

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
      const pathElements = createdElements.filter(
        (el) => el.tagName === 'path',
      );

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
      const pathElements = createdElements.filter(
        (el) => el.tagName === 'path',
      );

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
      const pathElements = createdElements.filter(
        (el) => el.tagName === 'path',
      );

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
      const pathElements = createdElements.filter(
        (el) => el.tagName === 'path',
      );

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
      const pathElements = createdElements.filter(
        (el) => el.tagName === 'path',
      );

      // Roll Again slots should not have brackets
      expect(pathElements.length).toBe(0);
    });
  });

  describe('SVG Element Creation', () => {
    it('should use correct SVG namespace for all elements', () => {
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

      // Spy on createElementNS
      const createElementNSSpy = jest.spyOn(mockDoc, 'createElementNS');

      renderCriticalSlots(mockDoc, criticals);

      // All calls should use SVG_NS
      expect(createElementNSSpy).toHaveBeenCalled();
      createElementNSSpy.mock.calls.forEach((call) => {
        expect(call[0]).toBe(SVG_NS);
      });

      createElementNSSpy.mockRestore();
    });

    it('should set correct font properties', () => {
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
      const textElements = createdElements.filter(
        (el) => el.tagName === 'text',
      );

      textElements.forEach((el) => {
        expect(el.attributes['font-family']).toBe(
          'Times New Roman, Times, serif',
        );
        // Font size should be 7px for content or 8.75px (7 * 1.25) for title
        expect(['7px', '8.75px']).toContain(el.attributes['font-size']);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace-only content as empty', () => {
      const mockDoc = createMockSvgDoc({
        critAreas: {
          crits_HD: { x: 10, y: 20, width: 94, height: 103 },
        },
      });

      const criticals: ILocationCriticals[] = [
        createMockLocationCriticals({
          location: 'Head',
          abbreviation: 'HD',
          slots: [createMockSlot({ slotNumber: 1, content: '   ' })], // Whitespace only
        }),
      ];

      renderCriticalSlots(mockDoc, criticals);

      const createdElements = getCreatedElements(mockDoc);
      const emptyElements = createdElements.filter(
        (el) => el.tagName === 'text' && el.textContent === '-Empty-',
      );

      expect(emptyElements.length).toBe(1);
    });

    it('should handle locations with varying slot counts', () => {
      const mockDoc = createMockSvgDoc({
        critAreas: {
          crits_HD: { x: 10, y: 20, width: 94, height: 60 }, // Smaller height for fewer slots
        },
      });

      // Head typically has 6 slots but we test with 4
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
            createMockSlot({
              slotNumber: 4,
              content: 'Sensors',
              isSystem: true,
            }),
          ],
        }),
      ];

      // Should not throw
      expect(() => renderCriticalSlots(mockDoc, criticals)).not.toThrow();
    });

    it('should handle readonly arrays correctly', () => {
      const mockDoc = createMockSvgDoc({
        critAreas: {
          crits_HD: { x: 10, y: 20, width: 94, height: 103 },
        },
      });

      // Create truly readonly arrays using Object.freeze
      const slots: readonly IRecordSheetCriticalSlot[] = Object.freeze([
        createMockSlot({
          slotNumber: 1,
          content: 'Life Support',
          isSystem: true,
        }),
      ]);

      const criticals: readonly ILocationCriticals[] = Object.freeze([
        Object.freeze({
          location: 'Head',
          abbreviation: 'HD',
          slots,
        }),
      ]);

      // Should not throw and should not modify the arrays
      expect(() => renderCriticalSlots(mockDoc, criticals)).not.toThrow();
    });
  });
});
