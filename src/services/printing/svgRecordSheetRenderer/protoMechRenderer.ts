/**
 * ProtoMech Record Sheet SVG Renderer
 *
 * Generates an SVG string for a ProtoMech point (1–5 units) record sheet.
 * Skeleton: title block + per-proto 5-location armor pips + main gun block
 * + movement + equipment list.
 *
 * Dimensions: 612 × 792 pts (US Letter) to match the mech sheet canvas.
 */

import { IProtoMechRecordSheetData } from '@/types/printing';

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

/** Ordered list of proto armor locations to render. */
const PROTO_LOCATIONS = [
  'Head',
  'Torso',
  'Left Arm',
  'Right Arm',
  'Legs',
  'Main Gun',
] as const;

type ProtoLoc = (typeof PROTO_LOCATIONS)[number];

/** Armor bar for a single proto location. */
function locBar(
  x: number,
  y: number,
  w: number,
  label: string,
  current: number,
  maximum: number,
): string {
  const fillW = maximum > 0 ? Math.round((current / maximum) * w) : 0;
  return `
  <text x="${x}" y="${y - 1}" font-family="${FONT}" font-size="6" fill="#000">${esc(label)} ${esc(current)}/${esc(maximum)}</text>
  <rect x="${x}" y="${y}" width="${w}" height="6" fill="#e0e0e0" stroke="#000" stroke-width="0.5"/>
  <rect x="${x}" y="${y}" width="${fillW}" height="6" fill="#4a3070"/>`;
}

/**
 * Render a ProtoMech point record sheet as an SVG string.
 */
export function renderProtoMechSVG(data: IProtoMechRecordSheetData): string {
  const {
    header,
    pointSize,
    protos,
    mainGun,
    mainGunAmmo,
    hasUMU,
    isGlider,
    walkMP,
    jumpMP,
    equipment,
  } = data;

  // ── Title block ──────────────────────────────────────────────────────────
  let body = renderTitleBlock(
    '#2e1a3e',
    `${header.chassis} ${header.model}`,
    `ProtoMech · Point Size: ${esc(pointSize)} · ${esc(header.techBase)} · BV ${esc(header.battleValue.toLocaleString())}`,
  );

  // ── Movement + flags ─────────────────────────────────────────────────────
  const moveY = MARGIN + 46;
  const flags = [hasUMU && 'UMU', isGlider && 'Glider']
    .filter(Boolean)
    .join(', ');
  body += `
  <!-- Movement -->
  <text x="${MARGIN}" y="${moveY}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">MOVEMENT</text>
  <text x="${MARGIN + 4}" y="${moveY + 13}" font-family="${FONT}" font-size="7" fill="#000">Walk: ${esc(walkMP)}  Jump: ${esc(jumpMP)}${flags ? `  [${esc(flags)}]` : ''}</text>`;

  // ── Main gun block ───────────────────────────────────────────────────────
  const gunY = moveY + 28;
  if (mainGun) {
    body += `
  <!-- Main gun -->
  <text x="${MARGIN}" y="${gunY}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">MAIN GUN: ${esc(mainGun)}${mainGunAmmo !== undefined ? `  (${esc(mainGunAmmo)} shots)` : ''}</text>`;
  }

  // ── Per-proto armor columns ──────────────────────────────────────────────
  const armorStartY = mainGun ? gunY + 16 : gunY;
  body += `
  <!-- Per-proto armor (${esc(pointSize)} unit${pointSize !== 1 ? 's' : ''}) -->
  <text x="${MARGIN}" y="${armorStartY}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">ARMOR BY LOCATION</text>`;

  const colW = Math.floor((SVG_W - MARGIN * 2) / Math.max(pointSize, 1));
  const barW = colW - 8;
  const LOC_ROW_H = 16;

  protos.forEach((proto, pi) => {
    const colX = MARGIN + pi * colW;
    body += `
  <!-- Proto #${proto.index} -->
  <text x="${colX + colW / 2}" y="${armorStartY + 13}" font-family="${FONT}" font-size="7" font-weight="bold" fill="#000" text-anchor="middle">#${esc(proto.index)}</text>`;

    PROTO_LOCATIONS.forEach((loc, li) => {
      const locData = proto.armorByLocation[loc as ProtoLoc];
      if (!locData) return;
      const ly = armorStartY + 16 + li * LOC_ROW_H;
      body += locBar(
        colX + 2,
        ly + 8,
        barW,
        loc,
        locData.current,
        locData.maximum,
      );
    });
  });

  const afterArmor = armorStartY + 18 + PROTO_LOCATIONS.length * LOC_ROW_H + 14;

  // ── Equipment list ───────────────────────────────────────────────────────
  if (equipment.length > 0) {
    body += `
  <!-- Equipment -->
  <text x="${MARGIN}" y="${afterArmor}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">WEAPONS &amp; EQUIPMENT</text>
  <line x1="${MARGIN}" y1="${afterArmor + 2}" x2="${SVG_W - MARGIN}" y2="${afterArmor + 2}" stroke="#000" stroke-width="0.5"/>`;

    const cols: EquipmentColumns = {
      qty: MARGIN + 2,
      name: MARGIN + 18,
      loc: MARGIN + 160,
      dmg: MARGIN + 200,
      sht: MARGIN + 240,
      med: MARGIN + 270,
      lng: MARGIN + 300,
    };
    const hdrY = afterArmor + 12;
    body += renderEquipmentColumnHeaders(cols, hdrY);

    const maxEqRows = Math.floor((SVG_H - afterArmor - 40) / 9);
    body += renderEquipmentRows(equipment, cols, hdrY, maxEqRows);
  }

  // ── Pilot block ───────────────────────────────────────────────────────────
  if (data.pilot) {
    const pilotY = SVG_H - 40;
    body += `
  <!-- Pilot block -->
  <rect x="${MARGIN}" y="${pilotY}" width="200" height="28" fill="#f5f5f5" stroke="#000" stroke-width="0.5" rx="2"/>
  <text x="${MARGIN + 4}" y="${pilotY + 10}" font-family="${FONT}" font-size="7" font-weight="bold" fill="#000">POINT PILOT: ${esc(data.pilot.name)}</text>
  <text x="${MARGIN + 4}" y="${pilotY + 22}" font-family="${FONT}" font-size="7" fill="#000">Gunnery: ${esc(data.pilot.gunnery)}   Piloting: ${esc(data.pilot.piloting)}</text>`;
  }

  // ── Special Abilities block ─────────────────────────────────────────────
  // Phase 5 Wave 3 — placed in the right margin alongside the lower pilot
  // block so it stays out of the per-proto armor columns.
  if (data.specialAbilities && data.specialAbilities.length > 0) {
    body += buildSPASectionString(
      { entries: data.specialAbilities, hasContent: true },
      { x: MARGIN + 220, y: SVG_H - 50, width: SVG_W - MARGIN - 230 },
    );
  }

  body += renderFooter('MekStation · ProtoMech Record Sheet');
  return renderSvgDocument(body);
}
