/**
 * Equipment table rendering utilities
 * Renders the equipment/inventory table on the record sheet
 */

import { IRecordSheetEquipment } from '@/types/printing';

import { SVG_NS, ELEMENT_IDS } from './constants';

type EquipmentColumns = {
  qty: number;
  name: number;
  loc: number;
  heat: number;
  dmg: number;
  min: number;
  sht: number;
  med: number;
  lng: number;
};

/**
 * Render the equipment/inventory table
 */
export function renderEquipmentTable(
  svgDoc: Document,
  equipment: readonly IRecordSheetEquipment[],
): void {
  const inventoryArea = svgDoc.getElementById(ELEMENT_IDS.INVENTORY);
  if (!inventoryArea) return;

  const x = parseFloat(inventoryArea.getAttribute('x') || '3');
  const y = parseFloat(inventoryArea.getAttribute('y') || '87.5');
  // width available: parseFloat(inventoryArea.getAttribute('width') || '216')
  const height = parseFloat(inventoryArea.getAttribute('height') || '185');

  const group = svgDoc.createElementNS(SVG_NS, 'g');
  group.setAttribute('id', 'equipment-rows');
  group.setAttribute(
    'style',
    'font-family: Eurostile, Arial, sans-serif; font-size: 7px;',
  );

  const rowHeight = 9;
  const headerY = y + 10;
  const startY = y + 22;
  const maxRows = Math.floor((height - 30) / rowHeight);

  // Column positions - adjusted for damage codes like "1/Msl [M,C,S]"
  const cols: EquipmentColumns = {
    qty: x + 2,
    name: x + 12,
    loc: x + 80, // Shortened name column
    heat: x + 95,
    dmg: x + 108, // More space for damage + code
    min: x + 158, // Pushed range columns right
    sht: x + 172,
    med: x + 186,
    lng: x + 200,
  };

  appendEquipmentHeaders(svgDoc, group, cols, headerY);

  const displayEquipment = equipment.slice(0, maxRows);
  displayEquipment.forEach((eq, index) => {
    appendEquipmentRow(svgDoc, group, cols, eq, startY + index * rowHeight);
  });

  const parent = inventoryArea.parentNode;
  if (parent) {
    parent.insertBefore(group, inventoryArea.nextSibling);
  }
}

function appendEquipmentHeaders(
  svgDoc: Document,
  group: Element,
  cols: EquipmentColumns,
  headerY: number,
): void {
  const headers = [
    { text: 'Qty', x: cols.qty },
    { text: 'Type', x: cols.name },
    { text: 'Loc', x: cols.loc },
    { text: 'Ht', x: cols.heat },
    { text: 'Dmg', x: cols.dmg },
    { text: 'Min', x: cols.min },
    { text: 'Sht', x: cols.sht },
    { text: 'Med', x: cols.med },
    { text: 'Lng', x: cols.lng },
  ];

  headers.forEach((header) => {
    group.appendChild(
      createEquipmentText(svgDoc, header.x, headerY, header.text, true),
    );
  });
}

function appendEquipmentRow(
  svgDoc: Document,
  group: Element,
  cols: EquipmentColumns,
  equipment: IRecordSheetEquipment,
  rowY: number,
): void {
  group.appendChild(
    createEquipmentText(
      svgDoc,
      cols.qty,
      rowY,
      String(equipment.quantity || 1),
      false,
    ),
  );

  const name =
    equipment.name.length > 16
      ? equipment.name.substring(0, 14) + '..'
      : equipment.name;
  group.appendChild(createEquipmentText(svgDoc, cols.name, rowY, name, false));
  group.appendChild(
    createEquipmentText(svgDoc, cols.loc, rowY, equipment.locationAbbr, false),
  );

  if (equipment.isWeapon || equipment.isEquipment) {
    appendWeaponOrEquipmentColumns(svgDoc, group, cols, equipment, rowY);
    return;
  }

  if (equipment.isAmmo) {
    group.appendChild(
      createEquipmentText(
        svgDoc,
        cols.dmg,
        rowY,
        equipment.ammoCount ? `(${equipment.ammoCount})` : '-',
        false,
      ),
    );
  }
}

function appendWeaponOrEquipmentColumns(
  svgDoc: Document,
  group: Element,
  cols: EquipmentColumns,
  equipment: IRecordSheetEquipment,
  rowY: number,
): void {
  const heatStr =
    equipment.heat === 0 || equipment.heat === '-'
      ? '-'
      : String(equipment.heat);
  group.appendChild(
    createEquipmentText(svgDoc, cols.heat, rowY, heatStr, false),
  );

  const damageStr = equipment.damageCode
    ? `${equipment.damage} ${equipment.damageCode}`
    : String(equipment.damage || '-');
  group.appendChild(
    createEquipmentText(svgDoc, cols.dmg, rowY, damageStr, false),
  );

  const minStr =
    equipment.minimum === 0 || equipment.minimum === '-'
      ? '-'
      : String(equipment.minimum);
  group.appendChild(createEquipmentText(svgDoc, cols.min, rowY, minStr, false));

  group.appendChild(
    createEquipmentText(
      svgDoc,
      cols.sht,
      rowY,
      String(equipment.short || '-'),
      false,
    ),
  );
  group.appendChild(
    createEquipmentText(
      svgDoc,
      cols.med,
      rowY,
      String(equipment.medium || '-'),
      false,
    ),
  );
  group.appendChild(
    createEquipmentText(
      svgDoc,
      cols.lng,
      rowY,
      String(equipment.long || '-'),
      false,
    ),
  );
}

/**
 * Create a text element for equipment table entries
 */
function createEquipmentText(
  svgDoc: Document,
  x: number,
  y: number,
  content: string,
  isHeader: boolean,
): SVGTextElement {
  const text = svgDoc.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', String(x));
  text.setAttribute('y', String(y));
  text.setAttribute('fill', '#000000');
  text.setAttribute('font-size', '6px');
  if (isHeader) {
    text.setAttribute('font-weight', 'bold');
  }
  text.textContent = content;
  return text;
}
