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

import { buildSPASectionString } from './spaSection';
import {
  FONT,
  MARGIN,
  SVG_H,
  SVG_W,
  esc,
  renderFooter,
  renderSvgDocument,
  renderTitleBlock,
} from './stringRendererPrimitives';

/**
 * Render a column of armor pips for one trooper.
 *
 * Each pip is a small circle: filled for remaining armor, open for damage.
 */
type TrooperColumnParams = {
  x: number;
  y: number;
  trooperIndex: number;
  armorPips: number;
  maximumPips: number;
  gunnery: number;
  antiMech: number;
  modularWeapon?: string;
  apWeapon?: string;
};

function trooperColumn(params: TrooperColumnParams): string {
  const {
    x,
    y,
    trooperIndex,
    armorPips,
    maximumPips,
    gunnery,
    antiMech,
    modularWeapon,
    apWeapon,
  } = params;
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
  let body = renderTitleBlock(
    '#2e1a1a',
    `${header.chassis} ${header.model}`,
    `BattleArmor · Squad Size: ${esc(squadSize)} · ${esc(header.techBase)} · BV ${esc(header.battleValue.toLocaleString())}`,
  );

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
    body += trooperColumn({
      x: tx,
      y: trooperStartY + 12,
      trooperIndex: t.index,
      armorPips: t.armorPips,
      maximumPips: t.maximumArmorPips,
      gunnery: t.gunnery,
      antiMech: t.antiMech,
      modularWeapon: t.modularWeapon,
      apWeapon: t.apWeapon,
    });
  });

  // Estimate where trooper columns end (max pips determines height)
  const maxPips = Math.max(...troopers.map((t) => t.maximumArmorPips), 1);
  const COLS_PER_ROW = 2;
  const trooperColH = 18 + Math.ceil(maxPips / COLS_PER_ROW) * 11 + 20;
  const afterTroopers = trooperStartY + 14 + trooperColH + 10;

  // ── Special Abilities block ─────────────────────────────────────────────
  // Phase 5 Wave 3 — anchored just below the trooper armor columns so it
  // flows with the squad readout instead of being orphaned at the footer.
  if (data.specialAbilities && data.specialAbilities.length > 0) {
    body += buildSPASectionString(
      { entries: data.specialAbilities, hasContent: true },
      { x: MARGIN, y: afterTroopers, width: SVG_W - MARGIN * 2 },
    );
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  body += renderFooter('MekStation · BattleArmor Record Sheet');
  return renderSvgDocument(body);
}
