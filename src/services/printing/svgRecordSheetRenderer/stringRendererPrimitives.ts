import { IRecordSheetEquipment } from '@/types/printing';

export const SVG_W = 612;
export const SVG_H = 792;
export const MARGIN = 18;
export const FONT = 'Eurostile, Arial, sans-serif';

export function esc(s: string | number): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderTitleBlock(
  fill: string,
  title: string,
  subtitle: string,
): string {
  return `
  <!-- Title block -->
  <rect x="${MARGIN}" y="${MARGIN}" width="${SVG_W - MARGIN * 2}" height="36" fill="${fill}" rx="3"/>
  <text x="${SVG_W / 2}" y="${MARGIN + 14}" font-family="${FONT}" font-size="13" font-weight="bold" fill="#fff" text-anchor="middle">${esc(title)}</text>
  <text x="${SVG_W / 2}" y="${MARGIN + 28}" font-family="${FONT}" font-size="8" fill="#ccc" text-anchor="middle">${subtitle}</text>`;
}

export function renderFooter(label: string): string {
  return `
  <text x="${SVG_W / 2}" y="${SVG_H - 6}" font-family="${FONT}" font-size="5.5" fill="#888" text-anchor="middle">${esc(label)}</text>`;
}

export function renderSvgDocument(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_W}" height="${SVG_H}" viewBox="0 0 ${SVG_W} ${SVG_H}">
  <rect width="${SVG_W}" height="${SVG_H}" fill="#fff"/>
  ${body}
</svg>`;
}

export type EquipmentColumns = {
  qty: number;
  name: number;
  loc: number;
  dmg: number;
  sht: number;
  med: number;
  lng: number;
};

export function renderEquipmentColumnHeaders(
  cols: EquipmentColumns,
  hdrY: number,
): string {
  return `
  <text x="${cols.qty}" y="${hdrY}" font-family="${FONT}" font-size="6" font-weight="bold" fill="#000">Qty</text>
  <text x="${cols.name}" y="${hdrY}" font-family="${FONT}" font-size="6" font-weight="bold" fill="#000">Type</text>
  <text x="${cols.loc}" y="${hdrY}" font-family="${FONT}" font-size="6" font-weight="bold" fill="#000">Loc</text>
  <text x="${cols.dmg}" y="${hdrY}" font-family="${FONT}" font-size="6" font-weight="bold" fill="#000">Dmg</text>
  <text x="${cols.sht}" y="${hdrY}" font-family="${FONT}" font-size="6" font-weight="bold" fill="#000">Sht</text>
  <text x="${cols.med}" y="${hdrY}" font-family="${FONT}" font-size="6" font-weight="bold" fill="#000">Med</text>
  <text x="${cols.lng}" y="${hdrY}" font-family="${FONT}" font-size="6" font-weight="bold" fill="#000">Lng</text>`;
}

export function renderEquipmentRows(
  equipment: readonly IRecordSheetEquipment[],
  cols: EquipmentColumns,
  hdrY: number,
  maxRows: number,
): string {
  return equipment
    .slice(0, maxRows)
    .map((eq, i) => renderEquipmentRow(eq, cols, hdrY + 10 + i * 9))
    .join('');
}

function renderEquipmentRow(
  eq: IRecordSheetEquipment,
  cols: EquipmentColumns,
  rowY: number,
): string {
  const name = eq.name.length > 22 ? eq.name.substring(0, 20) + '..' : eq.name;
  let out = `
  <text x="${cols.qty}" y="${rowY}" font-family="${FONT}" font-size="6" fill="#000">${esc(eq.quantity)}</text>
  <text x="${cols.name}" y="${rowY}" font-family="${FONT}" font-size="6" fill="#000">${esc(name)}</text>
  <text x="${cols.loc}" y="${rowY}" font-family="${FONT}" font-size="6" fill="#000">${esc(eq.locationAbbr)}</text>`;

  if (eq.isWeapon) {
    out += `
  <text x="${cols.dmg}" y="${rowY}" font-family="${FONT}" font-size="6" fill="#000">${esc(eq.damage ?? '-')}</text>
  <text x="${cols.sht}" y="${rowY}" font-family="${FONT}" font-size="6" fill="#000">${esc(eq.short || '-')}</text>
  <text x="${cols.med}" y="${rowY}" font-family="${FONT}" font-size="6" fill="#000">${esc(eq.medium || '-')}</text>
  <text x="${cols.lng}" y="${rowY}" font-family="${FONT}" font-size="6" fill="#000">${esc(eq.long || '-')}</text>`;
  } else if (eq.isAmmo) {
    out += `<text x="${cols.dmg}" y="${rowY}" font-family="${FONT}" font-size="6" fill="#555">(${esc(eq.ammoCount ?? 0)} shots)</text>`;
  }

  return out;
}
