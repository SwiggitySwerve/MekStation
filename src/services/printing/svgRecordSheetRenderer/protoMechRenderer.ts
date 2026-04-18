/**
 * ProtoMech Record Sheet SVG Renderer
 *
 * Generates an SVG string for a ProtoMech point (1–5 units) record sheet.
 * Skeleton: title block + per-proto 5-location armor pips + main gun block
 * + movement + equipment list.
 *
 * Dimensions: 612 × 792 pts (US Letter) to match the mech sheet canvas.
 */

import { IProtoMechRecordSheetData } from "@/types/printing";

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

/** Ordered list of proto armor locations to render. */
const PROTO_LOCATIONS = [
  "Head",
  "Torso",
  "Left Arm",
  "Right Arm",
  "Legs",
  "Main Gun",
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
  let body = `
  <!-- Title block -->
  <rect x="${MARGIN}" y="${MARGIN}" width="${SVG_W - MARGIN * 2}" height="36" fill="#2e1a3e" rx="3"/>
  <text x="${SVG_W / 2}" y="${MARGIN + 14}" font-family="${FONT}" font-size="13" font-weight="bold" fill="#fff" text-anchor="middle">${esc(header.chassis)} ${esc(header.model)}</text>
  <text x="${SVG_W / 2}" y="${MARGIN + 28}" font-family="${FONT}" font-size="8" fill="#ccc" text-anchor="middle">ProtoMech · Point Size: ${esc(pointSize)} · ${esc(header.techBase)} · BV ${esc(header.battleValue.toLocaleString())}</text>`;

  // ── Movement + flags ─────────────────────────────────────────────────────
  const moveY = MARGIN + 46;
  const flags = [hasUMU && "UMU", isGlider && "Glider"]
    .filter(Boolean)
    .join(", ");
  body += `
  <!-- Movement -->
  <text x="${MARGIN}" y="${moveY}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">MOVEMENT</text>
  <text x="${MARGIN + 4}" y="${moveY + 13}" font-family="${FONT}" font-size="7" fill="#000">Walk: ${esc(walkMP)}  Jump: ${esc(jumpMP)}${flags ? `  [${esc(flags)}]` : ""}</text>`;

  // ── Main gun block ───────────────────────────────────────────────────────
  const gunY = moveY + 28;
  if (mainGun) {
    body += `
  <!-- Main gun -->
  <text x="${MARGIN}" y="${gunY}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">MAIN GUN: ${esc(mainGun)}${mainGunAmmo !== undefined ? `  (${esc(mainGunAmmo)} shots)` : ""}</text>`;
  }

  // ── Per-proto armor columns ──────────────────────────────────────────────
  const armorStartY = mainGun ? gunY + 16 : gunY;
  body += `
  <!-- Per-proto armor (${esc(pointSize)} unit${pointSize !== 1 ? "s" : ""}) -->
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

    const cols = {
      qty: MARGIN + 2,
      name: MARGIN + 18,
      loc: MARGIN + 160,
      dmg: MARGIN + 200,
      sht: MARGIN + 240,
      med: MARGIN + 270,
      lng: MARGIN + 300,
    };
    const hdrY = afterArmor + 12;
    body += `
  <text x="${cols.qty}" y="${hdrY}" font-family="${FONT}" font-size="6" font-weight="bold" fill="#000">Qty</text>
  <text x="${cols.name}" y="${hdrY}" font-family="${FONT}" font-size="6" font-weight="bold" fill="#000">Type</text>
  <text x="${cols.loc}" y="${hdrY}" font-family="${FONT}" font-size="6" font-weight="bold" fill="#000">Loc</text>
  <text x="${cols.dmg}" y="${hdrY}" font-family="${FONT}" font-size="6" font-weight="bold" fill="#000">Dmg</text>
  <text x="${cols.sht}" y="${hdrY}" font-family="${FONT}" font-size="6" font-weight="bold" fill="#000">Sht</text>
  <text x="${cols.med}" y="${hdrY}" font-family="${FONT}" font-size="6" font-weight="bold" fill="#000">Med</text>
  <text x="${cols.lng}" y="${hdrY}" font-family="${FONT}" font-size="6" font-weight="bold" fill="#000">Lng</text>`;

    const maxEqRows = Math.floor((SVG_H - afterArmor - 40) / 9);
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

  body += `
  <text x="${SVG_W / 2}" y="${SVG_H - 6}" font-family="${FONT}" font-size="5.5" fill="#888" text-anchor="middle">MekStation · ProtoMech Record Sheet</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_W}" height="${SVG_H}" viewBox="0 0 ${SVG_W} ${SVG_H}">
  <rect width="${SVG_W}" height="${SVG_H}" fill="#fff"/>
  ${body}
</svg>`;
}
