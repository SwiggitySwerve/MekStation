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
