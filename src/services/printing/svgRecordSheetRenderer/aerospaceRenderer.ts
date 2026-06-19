/**
 * Aerospace Record Sheet SVG Renderer
 *
 * Generates an SVG string for an aerospace fighter or conventional fighter
 * record sheet. Skeleton: title block + thrust table + SI bar + 4-arc armor
 * bars + fuel track + equipment list.
 *
 * Dimensions: 612 × 792 pts (US Letter) to match the mech sheet canvas.
 */

import { IAerospaceRecordSheetData } from '@/types/printing';

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

/** Horizontal pip bar for SI / fuel. */
function pipBar(
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
    <rect x="${x}" y="${y}" width="${fillW}" height="8" fill="#2d4a6e"/>`;
}

/**
 * Render an aerospace fighter record sheet as an SVG string.
 */
export function renderAerospaceSVG(data: IAerospaceRecordSheetData): string {
  const {
    header,
    structuralIntegrity,
    fuelPoints,
    safeThrust,
    maxThrust,
    heatSinks,
    armorType,
    armorArcs,
    equipment,
    bombBaySlots,
  } = data;

  // ── Title block ──────────────────────────────────────────────────────────
  let body = renderTitleBlock(
    '#1a2e3a',
    `${header.chassis} ${header.model}`,
    `${esc(header.tonnage)}t · ${esc(header.techBase)} · BV ${esc(header.battleValue.toLocaleString())}`,
  );

  // ── Thrust / velocity table ──────────────────────────────────────────────
  const thrustY = MARGIN + 46;
  body += `
  <!-- Thrust table -->
  <text x="${MARGIN}" y="${thrustY}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">THRUST</text>
  <text x="${MARGIN + 4}" y="${thrustY + 13}" font-family="${FONT}" font-size="7" fill="#000">Safe Thrust (Thrust Points): ${esc(safeThrust)}</text>
  <text x="${MARGIN + 4}" y="${thrustY + 24}" font-family="${FONT}" font-size="7" fill="#000">Maximum Thrust: ${esc(maxThrust)}</text>`;

  // ── Heat sinks ───────────────────────────────────────────────────────────
  const hsY = thrustY + 36;
  body += `
  <!-- Heat sinks -->
  <text x="${MARGIN}" y="${hsY}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">HEAT SINKS: ${esc(heatSinks.count)} (${esc(heatSinks.type)})  Capacity: ${esc(heatSinks.capacity)}</text>
  <text x="${MARGIN + 270}" y="${hsY}" font-family="${FONT}" font-size="7" fill="#000">Aero Heat: 0 5 10 15 20 25 30+</text>`;

  // ── Structural Integrity bar ─────────────────────────────────────────────
  const siY = hsY + 14;
  const barW = SVG_W - MARGIN * 2 - 10;
  body += pipBar(
    MARGIN + 5,
    siY,
    barW,
    structuralIntegrity,
    structuralIntegrity,
    'Structural Integrity',
  );

  // ── Fuel track ───────────────────────────────────────────────────────────
  const fuelY = siY + 22;
  body += pipBar(MARGIN + 5, fuelY, barW, fuelPoints, fuelPoints, 'Fuel');

  // ── Bomb bay slots ───────────────────────────────────────────────────────
  const bombY = fuelY + 22;
  if (bombBaySlots > 0) {
    body += `
  <!-- Bomb bays -->
  <text x="${MARGIN}" y="${bombY}" font-family="${FONT}" font-size="7" fill="#000">Bomb Bay Slots: ${esc(bombBaySlots)}</text>`;
  }

  // ── 4-arc armor bars ─────────────────────────────────────────────────────
  const armorStartY = bombBaySlots > 0 ? bombY + 14 : bombY;
  body += `
  <!-- Armor (${esc(armorType)}) -->
  <text x="${MARGIN}" y="${armorStartY}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">ARMOR (${esc(armorType)})</text>`;

  armorArcs.forEach((arc, i) => {
    const ly = armorStartY + 10 + i * 20;
    const fillW =
      arc.maximum > 0 ? Math.round((arc.current / arc.maximum) * barW) : 0;
    body += `
  <text x="${MARGIN + 5}" y="${ly - 2}" font-family="${FONT}" font-size="7" fill="#000">${esc(arc.arc)} ${esc(arc.current)}/${esc(arc.maximum)}</text>
  <rect x="${MARGIN + 5}" y="${ly}" width="${barW}" height="8" fill="#e0e0e0" stroke="#000" stroke-width="0.5"/>
  <rect x="${MARGIN + 5}" y="${ly}" width="${fillW}" height="8" fill="#2d4a6e"/>`;
  });

  // ── Equipment list ───────────────────────────────────────────────────────
  const equipStartY = armorStartY + 14 + armorArcs.length * 20 + 14;
  body += `
  <!-- Equipment -->
  <text x="${MARGIN}" y="${equipStartY}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">WEAPONS &amp; EQUIPMENT</text>
  <line x1="${MARGIN}" y1="${equipStartY + 2}" x2="${SVG_W - MARGIN}" y2="${equipStartY + 2}" stroke="#000" stroke-width="0.5"/>`;

  const cols: EquipmentColumns = {
    qty: MARGIN + 2,
    name: MARGIN + 18,
    loc: MARGIN + 160,
    dmg: MARGIN + 195,
    sht: MARGIN + 230,
    med: MARGIN + 260,
    lng: MARGIN + 290,
  };
  const hdrY = equipStartY + 12;
  body += renderEquipmentColumnHeaders(cols, hdrY);

  const maxEqRows = Math.floor((SVG_H - equipStartY - 30) / 9);
  body += renderEquipmentRows(equipment, cols, hdrY, maxEqRows);

  // ── Pilot block ───────────────────────────────────────────────────────────
  if (data.pilot) {
    const pilotY = SVG_H - 40;
    body += `
  <!-- Pilot block -->
  <rect x="${MARGIN}" y="${pilotY}" width="200" height="28" fill="#f5f5f5" stroke="#000" stroke-width="0.5" rx="2"/>
  <text x="${MARGIN + 4}" y="${pilotY + 10}" font-family="${FONT}" font-size="7" font-weight="bold" fill="#000">PILOT: ${esc(data.pilot.name)}</text>
  <text x="${MARGIN + 4}" y="${pilotY + 22}" font-family="${FONT}" font-size="7" fill="#000">Gunnery: ${esc(data.pilot.gunnery)}   Piloting: ${esc(data.pilot.piloting)}${data.pilot.edge !== undefined ? `   Edge: ${esc(data.pilot.edge)}` : ''}</text>`;
  }

  // ── Special Abilities block ─────────────────────────────────────────────
  // Phase 5 Wave 3 — SPA block sits to the right of the pilot panel so it
  // doesn't collide with the footer or pilot stat box.
  if (data.specialAbilities && data.specialAbilities.length > 0) {
    body += buildSPASectionString(
      { entries: data.specialAbilities, hasContent: true },
      { x: MARGIN + 220, y: SVG_H - 50, width: SVG_W - MARGIN - 230 },
    );
  }

  body += renderFooter('MekStation · Aerospace Record Sheet');
  return renderSvgDocument(body);
}
