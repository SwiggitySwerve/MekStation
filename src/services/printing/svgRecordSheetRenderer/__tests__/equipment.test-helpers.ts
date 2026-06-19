/**
 * Equipment Table Rendering Tests
 *
 * Tests for renderEquipmentTable function which renders the equipment/inventory
 * table on SVG record sheets.
 */

import { IRecordSheetEquipment } from '@/types/printing';

import { ELEMENT_IDS, SVG_NS } from '../constants';
import { renderEquipmentTable } from '../equipment';

// Helper to create a mock SVG document
export function createMockSvgDocument(): Document {
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
export function createEquipment(
  overrides: Partial<IRecordSheetEquipment> = {},
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
