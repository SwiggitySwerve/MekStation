/**
 * BattleArmor Record Sheet SVG Renderer
 *
 * Generates an SVG string for a BattleArmor point (squad) record sheet.
 * Skeleton: title block + per-trooper armor pip columns + manipulator block
 * + movement block + equipment list.
 *
 * Dimensions: 612 × 792 pts (US Letter) to match the mech sheet canvas.
 */

import { IBattleArmorRecordSheetData } from '@/types/printing';

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

/**
 * Render a column of armor pips for one trooper.
 *
 * Each pip is a small circle: filled for remaining armor, open for damage.
 */
function trooperColumn(
  x: number,
  y: number,
  trooperIndex: number,
  armorPips: number,
  maximumPips: number,
  gunnery: number,
  antiMech: number,
  modularWeapon?: string,
  apWeapon?: string,
): string {
  const PIP_R = 4;
  const PIP_GAP = 11;
  const COLS_PER_ROW = 2;

  let out = `
  <!-- Trooper ${trooperIndex} -->
  <text x="${x + 11}" y="${y}" font-family="${FONT}" font-size="7" font-weight="bold" fill="#000" text-anchor="middle">#${trooperIndex}</text>
  <text x="${x}" y="${y + 10}" font-family="${FONT}" font-size="6" fill="#000">G:${gunnery} AM:${antiMech}</text>`;

  for (let p = 0; p < maximumPips; p++) {
    const col = p % COLS_PER_ROW;
    const row = Math.floor(p / COLS_PER_ROW);
    const cx = x + PIP_R + col * PIP_GAP;
    const cy = y + 18 + row * PIP_GAP;
    const filled = p < armorPips;
    out += `
  <circle cx="${cx}" cy="${cy}" r="${PIP_R}" fill="${filled ? '#333' : '#fff'}" stroke="#000" stroke-width="0.6"/>`;
  }

  const labY = y + 18 + Math.ceil(maximumPips / COLS_PER_ROW) * PIP_GAP + 8;
  if (modularWeapon) {
    out += `<text x="${x}" y="${labY}" font-family="${FONT}" font-size="5.5" fill="#333">${esc(modularWeapon)}</text>`;
  }
  if (apWeapon) {
    out += `<text x="${x}" y="${labY + 8}" font-family="${FONT}" font-size="5.5" fill="#333">AP: ${esc(apWeapon)}</text>`;
  }
  return out;
}

/**
 * Render a BattleArmor record sheet as an SVG string.
 */
export function renderBattleArmorSVG(
  data: IBattleArmorRecordSheetData,
): string {
  const {
    header,
    squadSize,
    troopers,
    manipulators,
    walkMP,
    jumpMP,
    umuMP,
    vtolMP,
  } = data;

  // ── Title block ──────────────────────────────────────────────────────────
  let body = `
  <!-- Title block -->
  <rect x="${MARGIN}" y="${MARGIN}" width="${SVG_W - MARGIN * 2}" height="36" fill="#2e1a1a" rx="3"/>
  <text x="${SVG_W / 2}" y="${MARGIN + 14}" font-family="${FONT}" font-size="13" font-weight="bold" fill="#fff" text-anchor="middle">${esc(header.chassis)} ${esc(header.model)}</text>
  <text x="${SVG_W / 2}" y="${MARGIN + 28}" font-family="${FONT}" font-size="8" fill="#ccc" text-anchor="middle">BattleArmor · Squad Size: ${esc(squadSize)} · ${esc(header.techBase)} · BV ${esc(header.battleValue.toLocaleString())}</text>`;

  // ── Movement block ───────────────────────────────────────────────────────
  const moveY = MARGIN + 46;
  body += `
  <!-- Movement -->
  <text x="${MARGIN}" y="${moveY}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">MOVEMENT</text>
  <text x="${MARGIN + 4}" y="${moveY + 12}" font-family="${FONT}" font-size="7" fill="#000">Walk: ${esc(walkMP)}  Jump: ${esc(jumpMP)}  UMU: ${esc(umuMP)}  VTOL: ${esc(vtolMP)}</text>`;

  // ── Manipulators block ───────────────────────────────────────────────────
  const manipY = moveY + 26;
  body += `
  <!-- Manipulators -->
  <text x="${MARGIN}" y="${manipY}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">MANIPULATORS</text>
  <text x="${MARGIN + 4}" y="${manipY + 12}" font-family="${FONT}" font-size="7" fill="#000">Left: ${esc(manipulators.left)}   Right: ${esc(manipulators.right)}</text>`;

  // ── Per-trooper columns ──────────────────────────────────────────────────
  const trooperStartY = manipY + 28;
  body += `
  <!-- Per-trooper armor pips -->
  <text x="${MARGIN}" y="${trooperStartY}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">ARMOR PIPS (per trooper)</text>`;

  const colW = Math.floor((SVG_W - MARGIN * 2) / Math.max(squadSize, 1));
  troopers.forEach((t, i) => {
    const tx = MARGIN + i * colW;
    body += trooperColumn(
      tx,
      trooperStartY + 12,
      t.index,
      t.armorPips,
      t.maximumArmorPips,
      t.gunnery,
      t.antiMech,
      t.modularWeapon,
      t.apWeapon,
    );
  });

  // Estimate where trooper columns end (max pips determines height)
  const maxPips = Math.max(...troopers.map((t) => t.maximumArmorPips), 1);
  const COLS_PER_ROW = 2;
  const trooperColH = 18 + Math.ceil(maxPips / COLS_PER_ROW) * 11 + 20;
  const afterTroopers = trooperStartY + 14 + trooperColH + 10;

  // ── Footer ───────────────────────────────────────────────────────────────
  body += `
  <text x="${SVG_W / 2}" y="${SVG_H - 6}" font-family="${FONT}" font-size="5.5" fill="#888" text-anchor="middle">MekStation · BattleArmor Record Sheet</text>`;

  // ── Suppress unused variable lint ────────────────────────────────────────
  void afterTroopers;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_W}" height="${SVG_H}" viewBox="0 0 ${SVG_W} ${SVG_H}">
  <rect width="${SVG_W}" height="${SVG_H}" fill="#fff"/>
  ${body}
</svg>`;
}
