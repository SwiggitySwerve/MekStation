/**
 * Aerospace Record Sheet SVG Renderer
 *
 * Generates an SVG string for an aerospace fighter or conventional fighter
 * record sheet. Skeleton: title block + thrust table + SI bar + 4-arc armor
 * bars + fuel track + equipment list.
 *
 * Dimensions: 612 × 792 pts (US Letter) to match the mech sheet canvas.
 */

import { IAerospaceRecordSheetData } from "@/types/printing";

const SVG_W = 612;
const SVG_H = 792;
const MARGIN = 18;
const FONT = "Eurostile, Arial, sans-serif";

/** Escape text for safe SVG embedding. */
function esc(s: string | number): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
  let body = `
  <!-- Title block -->
  <rect x="${MARGIN}" y="${MARGIN}" width="${SVG_W - MARGIN * 2}" height="36" fill="#1a2e3a" rx="3"/>
  <text x="${SVG_W / 2}" y="${MARGIN + 14}" font-family="${FONT}" font-size="13" font-weight="bold" fill="#fff" text-anchor="middle">${esc(header.chassis)} ${esc(header.model)}</text>
  <text x="${SVG_W / 2}" y="${MARGIN + 28}" font-family="${FONT}" font-size="8" fill="#ccc" text-anchor="middle">${esc(header.tonnage)}t · ${esc(header.techBase)} · BV ${esc(header.battleValue.toLocaleString())}</text>`;

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
  <text x="${MARGIN}" y="${hsY}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">HEAT SINKS: ${esc(heatSinks.count)} (${esc(heatSinks.type)})  Capacity: ${esc(heatSinks.capacity)}</text>`;

  // ── Structural Integrity bar ─────────────────────────────────────────────
  const siY = hsY + 14;
  const barW = SVG_W - MARGIN * 2 - 10;
  body += pipBar(
    MARGIN + 5,
    siY,
    barW,
    structuralIntegrity,
    structuralIntegrity,
    "Structural Integrity",
  );

  // ── Fuel track ───────────────────────────────────────────────────────────
  const fuelY = siY + 22;
  body += pipBar(MARGIN + 5, fuelY, barW, fuelPoints, fuelPoints, "Fuel");

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
      eq.name.length > 22 ? eq.name.substring(0, 20) + ".." : eq.name;
    body += `
  <text x="${cols.qty}" y="${ry}" font-family="${FONT}" font-size="6" fill="#000">${esc(eq.quantity)}</text>
  <text x="${cols.name}" y="${ry}" font-family="${FONT}" font-size="6" fill="#000">${esc(name)}</text>
  <text x="${cols.loc}" y="${ry}" font-family="${FONT}" font-size="6" fill="#000">${esc(eq.locationAbbr)}</text>`;
    if (eq.isWeapon) {
      body += `
  <text x="${cols.dmg}" y="${ry}" font-family="${FONT}" font-size="6" fill="#000">${esc(eq.damage ?? "-")}</text>
  <text x="${cols.sht}" y="${ry}" font-family="${FONT}" font-size="6" fill="#000">${esc(eq.short || "-")}</text>
  <text x="${cols.med}" y="${ry}" font-family="${FONT}" font-size="6" fill="#000">${esc(eq.medium || "-")}</text>
  <text x="${cols.lng}" y="${ry}" font-family="${FONT}" font-size="6" fill="#000">${esc(eq.long || "-")}</text>`;
    } else if (eq.isAmmo) {
      body += `<text x="${cols.dmg}" y="${ry}" font-family="${FONT}" font-size="6" fill="#555">(${esc(eq.ammoCount ?? 0)} shots)</text>`;
    }
  });

  // ── Pilot block ───────────────────────────────────────────────────────────
  if (data.pilot) {
    const pilotY = SVG_H - 40;
    body += `
  <!-- Pilot block -->
  <rect x="${MARGIN}" y="${pilotY}" width="200" height="28" fill="#f5f5f5" stroke="#000" stroke-width="0.5" rx="2"/>
  <text x="${MARGIN + 4}" y="${pilotY + 10}" font-family="${FONT}" font-size="7" font-weight="bold" fill="#000">PILOT: ${esc(data.pilot.name)}</text>
  <text x="${MARGIN + 4}" y="${pilotY + 22}" font-family="${FONT}" font-size="7" fill="#000">Gunnery: ${esc(data.pilot.gunnery)}   Piloting: ${esc(data.pilot.piloting)}</text>`;
  }

  body += `
  <text x="${SVG_W / 2}" y="${SVG_H - 6}" font-family="${FONT}" font-size="5.5" fill="#888" text-anchor="middle">MekStation · Aerospace Record Sheet</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_W}" height="${SVG_H}" viewBox="0 0 ${SVG_W} ${SVG_H}">
  <rect width="${SVG_W}" height="${SVG_H}" fill="#fff"/>
  ${body}
</svg>`;
}
