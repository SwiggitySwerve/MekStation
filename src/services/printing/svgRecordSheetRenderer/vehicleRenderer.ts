/**
 * Vehicle Record Sheet SVG Renderer
 *
 * Generates an SVG string for a vehicle (tracked/wheeled/hover/VTOL/WiGE/naval)
 * record sheet. Skeleton implementation: title block + motion badge + armor bars
 * + equipment list. Sufficient for screen preview and PDF export.
 *
 * Dimensions match the mech sheet canvas: 612 × 792 pts (US Letter).
 */

import { IVehicleRecordSheetData } from '@/types/printing';

const SVG_W = 612;
const SVG_H = 792;
const MARGIN = 18;
const FONT = 'Eurostile, Arial, sans-serif';

/** Escape text for safe SVG embedding. */
function esc(s: string | number): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Render a simple horizontal armor bar (filled rect + outline). */
function armorBar(
  x: number,
  y: number,
  w: number,
  current: number,
  maximum: number,
  label: string,
): string {
  const fillW = maximum > 0 ? Math.round((current / maximum) * w) : 0;
  return `
    <text x="${x}" y="${y - 2}" font-family="${FONT}" font-size="7" fill="#000">${esc(label)} ${esc(current)}/${esc(maximum)}</text>
    <rect x="${x}" y="${y}" width="${w}" height="8" fill="#e0e0e0" stroke="#000" stroke-width="0.5"/>
    <rect x="${x}" y="${y}" width="${fillW}" height="8" fill="#555"/>`;
}

/**
 * Render a vehicle record sheet as an SVG string.
 *
 * Returns a complete `<svg>` document at 612×792 pts.
 */
export function renderVehicleSVG(data: IVehicleRecordSheetData): string {
  const {
    header,
    motionType,
    cruiseMP,
    flankMP,
    armorLocations,
    equipment,
    crew,
  } = data;

  // ── Title block ──────────────────────────────────────────────────────────
  let body = `
  <!-- Title block -->
  <rect x="${MARGIN}" y="${MARGIN}" width="${SVG_W - MARGIN * 2}" height="36" fill="#1a1a2e" rx="3"/>
  <text x="${SVG_W / 2}" y="${MARGIN + 14}" font-family="${FONT}" font-size="13" font-weight="bold" fill="#fff" text-anchor="middle">${esc(header.chassis)} ${esc(header.model)}</text>
  <text x="${SVG_W / 2}" y="${MARGIN + 28}" font-family="${FONT}" font-size="8" fill="#ccc" text-anchor="middle">${esc(header.tonnage)}t · ${esc(header.techBase)} · BV ${esc(header.battleValue.toLocaleString())}</text>`;

  // ── Motion type badge + MP ───────────────────────────────────────────────
  const motionY = MARGIN + 46;
  body += `
  <!-- Motion type -->
  <rect x="${MARGIN}" y="${motionY}" width="120" height="22" fill="#2d4a6e" rx="2"/>
  <text x="${MARGIN + 60}" y="${motionY + 14}" font-family="${FONT}" font-size="9" font-weight="bold" fill="#fff" text-anchor="middle">${esc(motionType)}</text>
  <text x="${MARGIN + 130}" y="${motionY + 8}" font-family="${FONT}" font-size="7" fill="#000">Cruise MP: ${esc(cruiseMP)}</text>
  <text x="${MARGIN + 130}" y="${motionY + 18}" font-family="${FONT}" font-size="7" fill="#000">Flank MP: ${esc(flankMP)}</text>`;

  // ── Crew block ───────────────────────────────────────────────────────────
  const crewY = motionY + 32;
  body += `
  <!-- Crew -->
  <text x="${MARGIN}" y="${crewY}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">CREW</text>`;
  crew.forEach((member, i) => {
    const ly = crewY + 12 + i * 12;
    body += `
  <text x="${MARGIN + 4}" y="${ly}" font-family="${FONT}" font-size="7" fill="#000">${esc(member.role.charAt(0).toUpperCase() + member.role.slice(1))}  Gun:${esc(member.gunnery)}  Pil:${esc(member.piloting)}</text>`;
  });

  // ── Armor locations ──────────────────────────────────────────────────────
  const armorStartY = crewY + 16 + crew.length * 12 + 10;
  body += `
  <!-- Armor locations -->
  <text x="${MARGIN}" y="${armorStartY}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">ARMOR (${esc(data.armorType)})</text>`;
  const barW = SVG_W - MARGIN * 2 - 10;
  armorLocations.forEach((loc, i) => {
    const ly = armorStartY + 10 + i * 20;
    body += armorBar(
      MARGIN + 5,
      ly,
      barW,
      loc.current,
      loc.maximum,
      loc.location,
    );
    if (loc.bar !== undefined) {
      body += `<text x="${MARGIN + barW + 6}" y="${ly + 7}" font-family="${FONT}" font-size="6" fill="#000">BAR ${esc(loc.bar)}</text>`;
    }
  });

  // ── Equipment list ───────────────────────────────────────────────────────
  const equipStartY = armorStartY + 14 + armorLocations.length * 20 + 14;
  body += `
  <!-- Equipment -->
  <text x="${MARGIN}" y="${equipStartY}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">WEAPONS &amp; EQUIPMENT</text>
  <line x1="${MARGIN}" y1="${equipStartY + 2}" x2="${SVG_W - MARGIN}" y2="${equipStartY + 2}" stroke="#000" stroke-width="0.5"/>`;

  // Column headers
  const cols = {
    qty: MARGIN + 2,
    name: MARGIN + 18,
    loc: MARGIN + 160,
    dmg: MARGIN + 195,
    sht: MARGIN + 230,
    med: MARGIN + 260,
    lng: MARGIN + 290,
  };
  const hdrY = equipStartY + 12;
  body += `
  <text x="${cols.qty}" y="${hdrY}" font-family="${FONT}" font-size="6" font-weight="bold" fill="#000">Qty</text>
  <text x="${cols.name}" y="${hdrY}" font-family="${FONT}" font-size="6" font-weight="bold" fill="#000">Type</text>
  <text x="${cols.loc}" y="${hdrY}" font-family="${FONT}" font-size="6" font-weight="bold" fill="#000">Loc</text>
  <text x="${cols.dmg}" y="${hdrY}" font-family="${FONT}" font-size="6" font-weight="bold" fill="#000">Dmg</text>
  <text x="${cols.sht}" y="${hdrY}" font-family="${FONT}" font-size="6" font-weight="bold" fill="#000">Sht</text>
  <text x="${cols.med}" y="${hdrY}" font-family="${FONT}" font-size="6" font-weight="bold" fill="#000">Med</text>
  <text x="${cols.lng}" y="${hdrY}" font-family="${FONT}" font-size="6" font-weight="bold" fill="#000">Lng</text>`;

  const maxEqRows = Math.floor((SVG_H - equipStartY - 30) / 9);
  equipment.slice(0, maxEqRows).forEach((eq, i) => {
    const ry = hdrY + 10 + i * 9;
    const name =
      eq.name.length > 22 ? eq.name.substring(0, 20) + '..' : eq.name;
    body += `
  <text x="${cols.qty}" y="${ry}" font-family="${FONT}" font-size="6" fill="#000">${esc(eq.quantity)}</text>
  <text x="${cols.name}" y="${ry}" font-family="${FONT}" font-size="6" fill="#000">${esc(name)}</text>
  <text x="${cols.loc}" y="${ry}" font-family="${FONT}" font-size="6" fill="#000">${esc(eq.locationAbbr)}</text>`;
    if (eq.isWeapon) {
      body += `
  <text x="${cols.dmg}" y="${ry}" font-family="${FONT}" font-size="6" fill="#000">${esc(eq.damage ?? '-')}</text>
  <text x="${cols.sht}" y="${ry}" font-family="${FONT}" font-size="6" fill="#000">${esc(eq.short || '-')}</text>
  <text x="${cols.med}" y="${ry}" font-family="${FONT}" font-size="6" fill="#000">${esc(eq.medium || '-')}</text>
  <text x="${cols.lng}" y="${ry}" font-family="${FONT}" font-size="6" fill="#000">${esc(eq.long || '-')}</text>`;
    } else if (eq.isAmmo) {
      body += `<text x="${cols.dmg}" y="${ry}" font-family="${FONT}" font-size="6" fill="#555">(${esc(eq.ammoCount ?? 0)} shots)</text>`;
    }
  });

  // ── Footer ───────────────────────────────────────────────────────────────
  body += `
  <text x="${SVG_W / 2}" y="${SVG_H - 6}" font-family="${FONT}" font-size="5.5" fill="#888" text-anchor="middle">MekStation · Vehicle Record Sheet</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_W}" height="${SVG_H}" viewBox="0 0 ${SVG_W} ${SVG_H}">
  <rect width="${SVG_W}" height="${SVG_H}" fill="#fff"/>
  ${body}
</svg>`;
}
