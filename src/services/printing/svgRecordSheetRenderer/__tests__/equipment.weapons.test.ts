import { ELEMENT_IDS, SVG_NS } from '../constants';
import { renderEquipmentTable } from '../equipment';
import {
  createEquipment,
  createMockSvgDocument,
} from './equipment.test-helpers';

describe('basic rendering', () => {
  it('should do nothing when inventory area is not found', () => {
    const emptyDoc = document.implementation.createDocument(
      SVG_NS,
      'svg',
      null,
    );

    // Should not throw
    expect(() =>
      renderEquipmentTable(emptyDoc, [createEquipment()]),
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
      'font-family: Eurostile, Arial, sans-serif; font-size: 7px;',
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
  expect(textContents.filter((t) => t === '-').length).toBeGreaterThanOrEqual(
    1,
  );
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

  expect(textContents.filter((t) => t === '-').length).toBeGreaterThanOrEqual(
    1,
  );
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

  expect(textContents.filter((t) => t === '-').length).toBeGreaterThanOrEqual(
    1,
  );
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
