import type {
  ILocationCriticals,
  IRecordSheetCriticalSlot,
} from '@/types/printing';

import { SVG_NS } from '../constants';
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
    const textElements = createdElements.filter((el) => el.tagName === 'text');

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
