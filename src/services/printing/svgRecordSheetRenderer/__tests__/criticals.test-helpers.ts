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
jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));
export const mockConsoleWarn = logger.warn as jest.Mock;

/**
 * Interface for tracking created SVG elements during tests
 */
export interface CreatedElement {
  tagName: string;
  attributes: Record<string, string>;
  textContent?: string;
}

/**
 * Interface for our mock document with tracking capabilities
 */
export interface MockSvgDocument extends Document {
  _createdElements: CreatedElement[];
}

/**
 * Helper to get created elements from mock document
 */
export function getCreatedElements(doc: Document): CreatedElement[] {
  return (doc as MockSvgDocument)._createdElements;
}

/**
 * Creates a mock SVG Document with configurable elements
 */
export function createMockSvgDoc(
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
export function createMockSlot(
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
export function createMockLocationCriticals(
  overrides: Partial<ILocationCriticals> = {},
): ILocationCriticals {
  return {
    location: 'Head',
    abbreviation: 'HD',
    slots: [],
    ...overrides,
  };
}
