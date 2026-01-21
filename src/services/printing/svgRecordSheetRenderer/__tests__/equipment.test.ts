/**
 * Equipment Table Rendering Tests
 *
 * Tests for renderEquipmentTable function which renders the equipment/inventory
 * table on SVG record sheets.
 */

import { renderEquipmentTable } from '../equipment';
import { IRecordSheetEquipment } from '@/types/printing';
import { ELEMENT_IDS, SVG_NS } from '../constants';

// Helper to create a mock SVG document
function createMockSvgDocument(): Document {
  const doc = document.implementation.createDocument(SVG_NS, 'svg', null);

  // Create inventory area element
  const inventoryArea = doc.createElementNS(SVG_NS, 'rect');
  inventoryArea.setAttribute('id', ELEMENT_IDS.INVENTORY);
  inventoryArea.setAttribute('x', '3');
  inventoryArea.setAttribute('y', '87.5');
  inventoryArea.setAttribute('width', '216');
  inventoryArea.setAttribute('height', '185');

  // Create a parent group to hold the inventory area
  const parentGroup = doc.createElementNS(SVG_NS, 'g');
  parentGroup.appendChild(inventoryArea);
  doc.documentElement?.appendChild(parentGroup);

  return doc;
}

// Helper to create equipment item
function createEquipment(
  overrides: Partial<IRecordSheetEquipment> = {}
): IRecordSheetEquipment {
  return {
    id: 'medium-laser',
    name: 'Medium Laser',
    location: 'Right Arm',
    locationAbbr: 'RA',
    heat: 3,
    damage: 5,
    minimum: 0,
    short: 3,
    medium: 6,
    long: 9,
    quantity: 1,
    isWeapon: true,
    isAmmo: false,
    ...overrides,
  };
}

describe('renderEquipmentTable', () => {
  describe('basic rendering', () => {
    it('should do nothing when inventory area is not found', () => {
      const emptyDoc = document.implementation.createDocument(SVG_NS, 'svg', null);

      // Should not throw
      expect(() =>
        renderEquipmentTable(emptyDoc, [createEquipment()])
      ).not.toThrow();

      // Should not add any equipment rows
      expect(emptyDoc.getElementById('equipment-rows')).toBeNull();
    });

    it('should create equipment-rows group element', () => {
      const doc = createMockSvgDocument();
      renderEquipmentTable(doc, [createEquipment()]);

      const equipmentRows = doc.getElementById('equipment-rows');
      expect(equipmentRows).not.toBeNull();
      expect(equipmentRows?.tagName).toBe('g');
    });

    it('should set correct style on equipment-rows group', () => {
      const doc = createMockSvgDocument();
      renderEquipmentTable(doc, [createEquipment()]);

      const equipmentRows = doc.getElementById('equipment-rows');
      expect(equipmentRows?.getAttribute('style')).toBe(
        'font-family: Eurostile, Arial, sans-serif; font-size: 7px;'
      );
    });

    it('should insert equipment-rows after inventory area', () => {
      const doc = createMockSvgDocument();
      renderEquipmentTable(doc, [createEquipment()]);

      const inventoryArea = doc.getElementById(ELEMENT_IDS.INVENTORY);
      const equipmentRows = doc.getElementById('equipment-rows');

      expect(inventoryArea?.nextSibling).toBe(equipmentRows);
    });
  });

  describe('header rendering', () => {
    it('should render all column headers', () => {
      const doc = createMockSvgDocument();
      renderEquipmentTable(doc, []);

      const equipmentRows = doc.getElementById('equipment-rows');
      const textElements = equipmentRows?.getElementsByTagNameNS(SVG_NS, 'text');

      // Extract header text content
      const headers: string[] = [];
      if (textElements) {
        for (let i = 0; i < textElements.length; i++) {
          const text = textElements[i].textContent;
          if (textElements[i].getAttribute('font-weight') === 'bold' && text) {
            headers.push(text);
          }
        }
      }

      expect(headers).toContain('Qty');
      expect(headers).toContain('Type');
      expect(headers).toContain('Loc');
      expect(headers).toContain('Ht');
      expect(headers).toContain('Dmg');
      expect(headers).toContain('Min');
      expect(headers).toContain('Sht');
      expect(headers).toContain('Med');
      expect(headers).toContain('Lng');
    });

    it('should mark header text as bold', () => {
      const doc = createMockSvgDocument();
      renderEquipmentTable(doc, []);

      const equipmentRows = doc.getElementById('equipment-rows');
      const textElements = equipmentRows?.getElementsByTagNameNS(SVG_NS, 'text');

      // Count bold elements (headers)
      let boldCount = 0;
      if (textElements) {
        for (let i = 0; i < textElements.length; i++) {
          if (textElements[i].getAttribute('font-weight') === 'bold') {
            boldCount++;
          }
        }
      }

      expect(boldCount).toBe(9); // 9 column headers
    });
  });

  describe('weapon equipment rendering', () => {
    it('should render weapon with all fields', () => {
      const doc = createMockSvgDocument();
      const weapon = createEquipment({
        name: 'Large Laser',
        locationAbbr: 'RT',
        heat: 8,
        damage: 8,
        minimum: '-',
        short: 5,
        medium: 10,
        long: 15,
        quantity: 2,
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

      expect(textContents).toContain('2'); // quantity
      expect(textContents).toContain('Large Laser'); // name
      expect(textContents).toContain('RT'); // location
      expect(textContents).toContain('8'); // heat and damage (both are 8)
      expect(textContents).toContain('-'); // minimum
      expect(textContents).toContain('5'); // short
      expect(textContents).toContain('10'); // medium
      expect(textContents).toContain('15'); // long
    });

    it('should display "-" for zero heat', () => {
      const doc = createMockSvgDocument();
      const weapon = createEquipment({
        heat: 0,
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

      // Heat should be '-' for 0
      expect(textContents.filter((t) => t === '-').length).toBeGreaterThanOrEqual(1);
    });

    it('should display "-" for heat when value is "-"', () => {
      const doc = createMockSvgDocument();
      const weapon = createEquipment({
        heat: '-',
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

      expect(textContents.filter((t) => t === '-').length).toBeGreaterThanOrEqual(1);
    });

    it('should display "-" for zero minimum range', () => {
      const doc = createMockSvgDocument();
      const weapon = createEquipment({
        minimum: 0,
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

      expect(textContents.filter((t) => t === '-').length).toBeGreaterThanOrEqual(1);
    });

    it('should include damage code when present', () => {
      const doc = createMockSvgDocument();
      const weapon = createEquipment({
        damage: 5,
        damageCode: '[DE]',
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

      expect(textContents).toContain('5 [DE]');
    });

    it('should display damage without code when damageCode is not present', () => {
      const doc = createMockSvgDocument();
      const weapon = createEquipment({
        damage: 10,
        damageCode: undefined,
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

      expect(textContents).toContain('10');
    });

    it('should display "-" when damage is falsy and no damageCode', () => {
      const doc = createMockSvgDocument();
      const weapon = createEquipment({
        damage: 0,
        damageCode: undefined,
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

      expect(textContents).toContain('-');
    });
  });

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
          })
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
      expect(() =>
        renderEquipmentTable(doc, [createEquipment()])
      ).not.toThrow();

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
      expect(() =>
        renderEquipmentTable(doc, [createEquipment()])
      ).not.toThrow();
    });
  });
});
