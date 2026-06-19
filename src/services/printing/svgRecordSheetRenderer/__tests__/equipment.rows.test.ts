import type { IRecordSheetEquipment } from '@/types/printing';

import { ELEMENT_IDS, SVG_NS } from '../constants';
import { renderEquipmentTable } from '../equipment';
import {
  createEquipment,
  createMockSvgDocument,
} from './equipment.test-helpers';

describe('equipment (non-weapon) rendering', () => {
  it('should render equipment with isEquipment flag', () => {
    const doc = createMockSvgDocument();
    const equipment = createEquipment({
      name: 'Heat Sink',
      isWeapon: false,
      isEquipment: true,
      isAmmo: false,
    });

    renderEquipmentTable(doc, [equipment]);

    const equipmentRows = doc.getElementById('equipment-rows');
    const textElements = equipmentRows?.getElementsByTagNameNS(SVG_NS, 'text');

    const textContents: string[] = [];
    if (textElements) {
      for (let i = 0; i < textElements.length; i++) {
        textContents.push(textElements[i].textContent || '');
      }
    }

    expect(textContents).toContain('Heat Sink');
  });
});

describe('ammo rendering', () => {
  it('should render ammo with ammo count in parentheses', () => {
    const doc = createMockSvgDocument();
    const ammo = createEquipment({
      name: 'Medium Laser Ammo',
      locationAbbr: 'CT',
      isWeapon: false,
      isAmmo: true,
      ammoCount: 24,
    });

    renderEquipmentTable(doc, [ammo]);

    const equipmentRows = doc.getElementById('equipment-rows');
    const textElements = equipmentRows?.getElementsByTagNameNS(SVG_NS, 'text');

    const textContents: string[] = [];
    if (textElements) {
      for (let i = 0; i < textElements.length; i++) {
        textContents.push(textElements[i].textContent || '');
      }
    }

    expect(textContents).toContain('(24)');
  });

  it('should render "-" for ammo without ammoCount', () => {
    const doc = createMockSvgDocument();
    const ammo = createEquipment({
      name: 'LRM Ammo',
      isWeapon: false,
      isAmmo: true,
      ammoCount: undefined,
    });

    renderEquipmentTable(doc, [ammo]);

    const equipmentRows = doc.getElementById('equipment-rows');
    const textElements = equipmentRows?.getElementsByTagNameNS(SVG_NS, 'text');

    const textContents: string[] = [];
    if (textElements) {
      for (let i = 0; i < textElements.length; i++) {
        textContents.push(textElements[i].textContent || '');
      }
    }

    // Should have '-' for ammo without count
    expect(textContents).toContain('-');
  });

  it('should not render range columns for ammo', () => {
    const doc = createMockSvgDocument();
    const ammo = createEquipment({
      name: 'SRM Ammo',
      isWeapon: false,
      isAmmo: true,
      ammoCount: 15,
      short: 3,
      medium: 6,
      long: 9,
    });

    renderEquipmentTable(doc, [ammo]);

    const equipmentRows = doc.getElementById('equipment-rows');
    const textElements = equipmentRows?.getElementsByTagNameNS(SVG_NS, 'text');

    // Count non-header text elements for this row
    const nonHeaderTexts: string[] = [];
    if (textElements) {
      for (let i = 0; i < textElements.length; i++) {
        if (textElements[i].getAttribute('font-weight') !== 'bold') {
          nonHeaderTexts.push(textElements[i].textContent || '');
        }
      }
    }

    // Ammo row should have qty, name, loc, and ammo count (4 elements)
    // NOT the range values from the equipment object
    expect(nonHeaderTexts).not.toContain('3'); // short
    expect(nonHeaderTexts).not.toContain('6'); // medium (unless in ammo count)
    expect(nonHeaderTexts).not.toContain('9'); // long
  });
});

describe('name truncation', () => {
  it('should truncate long equipment names', () => {
    const doc = createMockSvgDocument();
    const weapon = createEquipment({
      name: 'Extended Range Large Pulse Laser', // > 16 chars
      isWeapon: true,
    });

    renderEquipmentTable(doc, [weapon]);

    const equipmentRows = doc.getElementById('equipment-rows');
    const textElements = equipmentRows?.getElementsByTagNameNS(SVG_NS, 'text');

    const textContents: string[] = [];
    if (textElements) {
      for (let i = 0; i < textElements.length; i++) {
        textContents.push(textElements[i].textContent || '');
      }
    }

    // Should be truncated to 14 chars + '..'
    const truncatedName = textContents.find((t) => t.endsWith('..'));
    expect(truncatedName).toBeDefined();
    expect(truncatedName?.length).toBe(16); // 14 + 2
  });

  it('should not truncate short equipment names', () => {
    const doc = createMockSvgDocument();
    const weapon = createEquipment({
      name: 'PPC', // < 16 chars
      isWeapon: true,
    });

    renderEquipmentTable(doc, [weapon]);

    const equipmentRows = doc.getElementById('equipment-rows');
    const textElements = equipmentRows?.getElementsByTagNameNS(SVG_NS, 'text');

    const textContents: string[] = [];
    if (textElements) {
      for (let i = 0; i < textElements.length; i++) {
        textContents.push(textElements[i].textContent || '');
      }
    }

    expect(textContents).toContain('PPC');
  });

  it('should not truncate exactly 16 char names', () => {
    const doc = createMockSvgDocument();
    const weapon = createEquipment({
      name: '1234567890123456', // exactly 16 chars
      isWeapon: true,
    });

    renderEquipmentTable(doc, [weapon]);

    const equipmentRows = doc.getElementById('equipment-rows');
    const textElements = equipmentRows?.getElementsByTagNameNS(SVG_NS, 'text');

    const textContents: string[] = [];
    if (textElements) {
      for (let i = 0; i < textElements.length; i++) {
        textContents.push(textElements[i].textContent || '');
      }
    }

    expect(textContents).toContain('1234567890123456');
  });
});

describe('quantity handling', () => {
  it('should display quantity from equipment', () => {
    const doc = createMockSvgDocument();
    const weapon = createEquipment({
      quantity: 4,
      isWeapon: true,
    });

    renderEquipmentTable(doc, [weapon]);

    const equipmentRows = doc.getElementById('equipment-rows');
    const textElements = equipmentRows?.getElementsByTagNameNS(SVG_NS, 'text');

    const textContents: string[] = [];
    if (textElements) {
      for (let i = 0; i < textElements.length; i++) {
        textContents.push(textElements[i].textContent || '');
      }
    }

    expect(textContents).toContain('4');
  });

  it('should default to 1 when quantity is falsy', () => {
    const doc = createMockSvgDocument();
    const weapon = createEquipment({
      quantity: 0,
      isWeapon: true,
    });

    renderEquipmentTable(doc, [weapon]);

    const equipmentRows = doc.getElementById('equipment-rows');
    const textElements = equipmentRows?.getElementsByTagNameNS(SVG_NS, 'text');

    const textContents: string[] = [];
    if (textElements) {
      for (let i = 0; i < textElements.length; i++) {
        if (textElements[i].getAttribute('font-weight') !== 'bold') {
          textContents.push(textElements[i].textContent || '');
        }
      }
    }

    // First non-header text should be the quantity (1)
    expect(textContents[0]).toBe('1');
  });
});

describe('row limiting', () => {
  it('should limit equipment to maxRows based on available height', () => {
    const doc = createMockSvgDocument();

    // Create many equipment items
    const equipment: IRecordSheetEquipment[] = [];
    for (let i = 0; i < 50; i++) {
      equipment.push(
        createEquipment({
          id: `weapon-${i}`,
          name: `Weapon ${i}`,
          isWeapon: true,
        }),
      );
    }

    renderEquipmentTable(doc, equipment);

    const equipmentRows = doc.getElementById('equipment-rows');
    const textElements = equipmentRows?.getElementsByTagNameNS(SVG_NS, 'text');

    // Count non-header rows (each row has multiple text elements)
    // Headers = 9, each weapon row has 9 elements
    // maxRows = Math.floor((185 - 30) / 9) = 17
    const totalTexts = textElements?.length || 0;
    const headerCount = 9;
    const expectedMaxRows = 17;

    // Should have headers + (maxRows * 9 columns per row)
    expect(totalTexts).toBeLessThanOrEqual(headerCount + expectedMaxRows * 9);
  });
});

describe('multiple equipment types', () => {
  it('should render mixed weapons, ammo, and equipment', () => {
    const doc = createMockSvgDocument();
    const equipment: IRecordSheetEquipment[] = [
      createEquipment({
        name: 'Medium Laser',
        isWeapon: true,
        isAmmo: false,
      }),
      createEquipment({
        name: 'SRM 6',
        isWeapon: true,
        isAmmo: false,
      }),
      createEquipment({
        name: 'SRM Ammo',
        isWeapon: false,
        isAmmo: true,
        ammoCount: 15,
      }),
      createEquipment({
        name: 'Heat Sink',
        isWeapon: false,
        isAmmo: false,
        isEquipment: true,
      }),
    ];

    renderEquipmentTable(doc, equipment);

    const equipmentRows = doc.getElementById('equipment-rows');
    const textElements = equipmentRows?.getElementsByTagNameNS(SVG_NS, 'text');

    const textContents: string[] = [];
    if (textElements) {
      for (let i = 0; i < textElements.length; i++) {
        textContents.push(textElements[i].textContent || '');
      }
    }

    expect(textContents).toContain('Medium Laser');
    expect(textContents).toContain('SRM 6');
    expect(textContents).toContain('SRM Ammo');
    expect(textContents).toContain('Heat Sink');
    expect(textContents).toContain('(15)');
  });
});

describe('text element attributes', () => {
  it('should set correct attributes on text elements', () => {
    const doc = createMockSvgDocument();
    renderEquipmentTable(doc, [createEquipment()]);

    const equipmentRows = doc.getElementById('equipment-rows');
    const textElements = equipmentRows?.getElementsByTagNameNS(SVG_NS, 'text');

    if (textElements && textElements.length > 0) {
      const textEl = textElements[0];
      expect(textEl.getAttribute('fill')).toBe('#000000');
      expect(textEl.getAttribute('font-size')).toBe('6px');
      expect(textEl.getAttribute('x')).toBeDefined();
      expect(textEl.getAttribute('y')).toBeDefined();
    }
  });
});

describe('inventory area attribute parsing', () => {
  it('should use default values when attributes are missing', () => {
    const doc = document.implementation.createDocument(SVG_NS, 'svg', null);

    // Create inventory area without attributes
    const inventoryArea = doc.createElementNS(SVG_NS, 'rect');
    inventoryArea.setAttribute('id', ELEMENT_IDS.INVENTORY);
    // No x, y, width, height attributes

    const parentGroup = doc.createElementNS(SVG_NS, 'g');
    parentGroup.appendChild(inventoryArea);
    doc.documentElement?.appendChild(parentGroup);

    // Should not throw and should use defaults
    expect(() => renderEquipmentTable(doc, [createEquipment()])).not.toThrow();

    const equipmentRows = doc.getElementById('equipment-rows');
    expect(equipmentRows).not.toBeNull();
  });
});

describe('edge cases', () => {
  it('should handle empty equipment array', () => {
    const doc = createMockSvgDocument();
    renderEquipmentTable(doc, []);

    const equipmentRows = doc.getElementById('equipment-rows');
    expect(equipmentRows).not.toBeNull();

    // Should still have headers
    const textElements = equipmentRows?.getElementsByTagNameNS(SVG_NS, 'text');
    expect(textElements?.length).toBe(9); // Just headers
  });

  it('should handle equipment with string range values', () => {
    const doc = createMockSvgDocument();
    const weapon = createEquipment({
      short: '-',
      medium: '-',
      long: '-',
      isWeapon: true,
    });

    renderEquipmentTable(doc, [weapon]);

    const equipmentRows = doc.getElementById('equipment-rows');
    const textElements = equipmentRows?.getElementsByTagNameNS(SVG_NS, 'text');

    const textContents: string[] = [];
    if (textElements) {
      for (let i = 0; i < textElements.length; i++) {
        textContents.push(textElements[i].textContent || '');
      }
    }

    // Should contain multiple '-' for range values
    const dashCount = textContents.filter((t) => t === '-').length;
    expect(dashCount).toBeGreaterThanOrEqual(3);
  });

  it('should handle non-weapon, non-ammo, non-equipment items', () => {
    const doc = createMockSvgDocument();
    const item = createEquipment({
      name: 'Mystery Item',
      isWeapon: false,
      isAmmo: false,
      isEquipment: false,
    });

    renderEquipmentTable(doc, [item]);

    const equipmentRows = doc.getElementById('equipment-rows');
    const textElements = equipmentRows?.getElementsByTagNameNS(SVG_NS, 'text');

    const textContents: string[] = [];
    if (textElements) {
      for (let i = 0; i < textElements.length; i++) {
        textContents.push(textElements[i].textContent || '');
      }
    }

    // Should still render qty, name, and location
    expect(textContents).toContain('Mystery Item');
  });

  it('should handle inventory area without parent node', () => {
    const doc = document.implementation.createDocument(SVG_NS, 'svg', null);

    // Create inventory area directly on root without proper parent
    const inventoryArea = doc.createElementNS(SVG_NS, 'rect');
    inventoryArea.setAttribute('id', ELEMENT_IDS.INVENTORY);
    inventoryArea.setAttribute('x', '3');
    inventoryArea.setAttribute('y', '87.5');
    inventoryArea.setAttribute('width', '216');
    inventoryArea.setAttribute('height', '185');
    doc.documentElement?.appendChild(inventoryArea);

    // Should not throw even if structure is unusual
    expect(() => renderEquipmentTable(doc, [createEquipment()])).not.toThrow();
  });
});
