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

import { buildSPASectionString } from './spaSection';
import {
  EquipmentColumns,
  FONT,
  MARGIN,
  SVG_H,
  SVG_W,
  esc,
  renderEquipmentColumnHeaders,
  renderEquipmentRows,
  renderFooter,
  renderSvgDocument,
  renderTitleBlock,
} from './stringRendererPrimitives';

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
    turretConfig,
    cruiseMP,
    flankMP,
    armorLocations,
    equipment,
    crew,
  } = data;

  // ── Title block ──────────────────────────────────────────────────────────
  let body = renderTitleBlock(
    '#1a1a2e',
    `${header.chassis} ${header.model}`,
    `${esc(header.tonnage)}t · ${esc(header.techBase)} · BV ${esc(header.battleValue.toLocaleString())}`,
  );

  // ── Motion type badge + MP ───────────────────────────────────────────────
  const motionY = MARGIN + 46;
  body += `
  <!-- Motion type -->
  <rect x="${MARGIN}" y="${motionY}" width="120" height="22" fill="#2d4a6e" rx="2"/>
  <text x="${MARGIN + 60}" y="${motionY + 14}" font-family="${FONT}" font-size="9" font-weight="bold" fill="#fff" text-anchor="middle">${esc(motionType)}</text>
  <text x="${MARGIN + 130}" y="${motionY + 8}" font-family="${FONT}" font-size="7" fill="#000">Cruise MP: ${esc(cruiseMP)}</text>
  <text x="${MARGIN + 130}" y="${motionY + 18}" font-family="${FONT}" font-size="7" fill="#000">Flank MP: ${esc(flankMP)}</text>
  <text x="${MARGIN + 220}" y="${motionY + 8}" font-family="${FONT}" font-size="7" fill="#000">Turret: ${esc(turretConfig)}</text>
  <text x="${MARGIN + 220}" y="${motionY + 18}" font-family="${FONT}" font-size="7" fill="#000">${data.barRating !== undefined ? `BAR: ${esc(data.barRating)}` : ''}</text>`;

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
  const turretWeapons = equipment.filter((eq) =>
    eq.location.toLowerCase().includes('turret'),
  );
  const hullWeapons = equipment.filter(
    (eq) => !eq.location.toLowerCase().includes('turret'),
  );
  body += `
  <!-- Equipment -->
  <text x="${MARGIN}" y="${equipStartY}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">WEAPONS &amp; EQUIPMENT</text>
  <line x1="${MARGIN}" y1="${equipStartY + 2}" x2="${SVG_W - MARGIN}" y2="${equipStartY + 2}" stroke="#000" stroke-width="0.5"/>
  <text x="${MARGIN + 4}" y="${equipStartY + 11}" font-family="${FONT}" font-size="6" fill="#000">Turret Weapons: ${esc(turretWeapons.map((eq) => eq.name).join(', ') || 'None')}</text>
  <text x="${MARGIN + 4}" y="${equipStartY + 20}" font-family="${FONT}" font-size="6" fill="#000">Hull Weapons: ${esc(hullWeapons.map((eq) => eq.name).join(', ') || 'None')}</text>`;

  // Column headers
  const cols: EquipmentColumns = {
    qty: MARGIN + 2,
    name: MARGIN + 18,
    loc: MARGIN + 160,
    dmg: MARGIN + 195,
    sht: MARGIN + 230,
    med: MARGIN + 260,
    lng: MARGIN + 290,
  };
  const hdrY = equipStartY + 30;
  body += renderEquipmentColumnHeaders(cols, hdrY);

  const maxEqRows = Math.floor((SVG_H - equipStartY - 30) / 9);
  body += renderEquipmentRows(equipment, cols, hdrY, maxEqRows);

  // ── Special Abilities block ─────────────────────────────────────────────
  // Phase 5 Wave 3 — render the printable SPA block when the vehicle has
  // any resolved abilities. Anchored to the lower-left so it sits below
  // the equipment table without colliding with the footer.
  if (data.specialAbilities && data.specialAbilities.length > 0) {
    body += buildSPASectionString(
      { entries: data.specialAbilities, hasContent: true },
      { x: MARGIN, y: SVG_H - 110, width: SVG_W - MARGIN * 2 },
    );
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  body += renderFooter('MekStation · Vehicle Record Sheet');
  return renderSvgDocument(body);
}
