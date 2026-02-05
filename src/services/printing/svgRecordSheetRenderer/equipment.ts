/**
 * Equipment table rendering utilities
 * Renders the equipment/inventory table on the record sheet
 */

import { IRecordSheetEquipment } from '@/types/printing';

import { SVG_NS, ELEMENT_IDS } from './constants';

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
  const cols = {
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

  headers.forEach((h) => {
    const text = createEquipmentText(svgDoc, h.x, headerY, h.text, true);
    group.appendChild(text);
  });

  const displayEquipment = equipment.slice(0, maxRows);
  displayEquipment.forEach((eq, index) => {
    const rowY = startY + index * rowHeight;

    const qty = createEquipmentText(
      svgDoc,
      cols.qty,
      rowY,
      String(eq.quantity || 1),
      false,
    );
    group.appendChild(qty);

    // Truncate long names to fit in narrower column
    const name =
      eq.name.length > 16 ? eq.name.substring(0, 14) + '..' : eq.name;
    const nameEl = createEquipmentText(svgDoc, cols.name, rowY, name, false);
    group.appendChild(nameEl);

    const loc = createEquipmentText(
      svgDoc,
      cols.loc,
      rowY,
      eq.locationAbbr,
      false,
    );
    group.appendChild(loc);

    if (eq.isWeapon || eq.isEquipment) {
      // Heat column
      const heatStr = eq.heat === 0 || eq.heat === '-' ? '-' : String(eq.heat);
      const heat = createEquipmentText(svgDoc, cols.heat, rowY, heatStr, false);
      group.appendChild(heat);

      // Damage column with type code: "5 [DE]" format
      const damageStr = eq.damageCode
        ? `${eq.damage} ${eq.damageCode}`
        : String(eq.damage || '-');
      const dmg = createEquipmentText(svgDoc, cols.dmg, rowY, damageStr, false);
      group.appendChild(dmg);

      // Range columns - show '-' for 0 minimum
      const minStr =
        eq.minimum === 0 || eq.minimum === '-' ? '-' : String(eq.minimum);
      const min = createEquipmentText(svgDoc, cols.min, rowY, minStr, false);
      group.appendChild(min);

      const sht = createEquipmentText(
        svgDoc,
        cols.sht,
        rowY,
        String(eq.short || '-'),
        false,
      );
      const med = createEquipmentText(
        svgDoc,
        cols.med,
        rowY,
        String(eq.medium || '-'),
        false,
      );
      const lng = createEquipmentText(
        svgDoc,
        cols.lng,
        rowY,
        String(eq.long || '-'),
        false,
      );
      group.appendChild(sht);
      group.appendChild(med);
      group.appendChild(lng);
    } else if (eq.isAmmo) {
      const ammoInfo = createEquipmentText(
        svgDoc,
        cols.dmg,
        rowY,
        eq.ammoCount ? `(${eq.ammoCount})` : '-',
        false,
      );
      group.appendChild(ammoInfo);
    }
  });

  const parent = inventoryArea.parentNode;
  if (parent) {
    parent.insertBefore(group, inventoryArea.nextSibling);
  }
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
