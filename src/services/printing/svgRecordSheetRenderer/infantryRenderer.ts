/**
 * Infantry Record Sheet SVG Renderer
 *
 * Generates an SVG string for an infantry platoon record sheet.
 * Skeleton: title block + platoon size counter + motive type badge
 * + primary/secondary weapons + field gun block + specialization badge.
 *
 * Dimensions: 612 × 792 pts (US Letter) to match the mech sheet canvas.
 */

import { IInfantryRecordSheetData } from '@/types/printing';

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

/** Draw a row of trooper pip circles (10 per row). */
function trooperPips(x: number, y: number, count: number): string {
  const PIP_R = 4;
  const PIP_GAP = 10;
  const PIPS_PER_ROW = 10;
  let out = '';
  for (let i = 0; i < count; i++) {
    const col = i % PIPS_PER_ROW;
    const row = Math.floor(i / PIPS_PER_ROW);
    const cx = x + PIP_R + col * PIP_GAP;
    const cy = y + PIP_R + row * PIP_GAP;
    out += `<circle cx="${cx}" cy="${cy}" r="${PIP_R}" fill="#333" stroke="#000" stroke-width="0.6"/>`;
  }
  return out;
}

/**
 * Render an infantry platoon record sheet as an SVG string.
 */
export function renderInfantrySVG(data: IInfantryRecordSheetData): string {
  const {
    header,
    platoonSize,
    motiveType,
    primaryWeapon,
    secondaryWeapons,
    fieldGun,
    specialization,
    gunnery,
    antiMech,
  } = data;

  // ── Title block ──────────────────────────────────────────────────────────
  let body = `
  <!-- Title block -->
  <rect x="${MARGIN}" y="${MARGIN}" width="${SVG_W - MARGIN * 2}" height="36" fill="#1a3a1a" rx="3"/>
  <text x="${SVG_W / 2}" y="${MARGIN + 14}" font-family="${FONT}" font-size="13" font-weight="bold" fill="#fff" text-anchor="middle">${esc(header.chassis)} ${esc(header.model)}</text>
  <text x="${SVG_W / 2}" y="${MARGIN + 28}" font-family="${FONT}" font-size="8" fill="#ccc" text-anchor="middle">Infantry · ${esc(header.techBase)} · BV ${esc(header.battleValue.toLocaleString())}</text>`;

  // ── Motive type badge + skills ───────────────────────────────────────────
  const badgeY = MARGIN + 46;
  body += `
  <!-- Motive type + skills -->
  <rect x="${MARGIN}" y="${badgeY}" width="110" height="22" fill="#2d5a2d" rx="2"/>
  <text x="${MARGIN + 55}" y="${badgeY + 14}" font-family="${FONT}" font-size="9" font-weight="bold" fill="#fff" text-anchor="middle">${esc(motiveType)}</text>
  <text x="${MARGIN + 120}" y="${badgeY + 10}" font-family="${FONT}" font-size="7" fill="#000">Gunnery: ${esc(gunnery)}</text>
  <text x="${MARGIN + 120}" y="${badgeY + 20}" font-family="${FONT}" font-size="7" fill="#000">Anti-Mech: ${esc(antiMech)}</text>`;

  // ── Specialization badge ─────────────────────────────────────────────────
  if (specialization) {
    body += `
  <!-- Specialization -->
  <rect x="${SVG_W - MARGIN - 100}" y="${badgeY}" width="100" height="22" fill="#5a4a1a" rx="2"/>
  <text x="${SVG_W - MARGIN - 50}" y="${badgeY + 14}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#fff" text-anchor="middle">${esc(specialization.toUpperCase())}</text>`;
  }

  // ── Platoon size counter (pip grid) ──────────────────────────────────────
  const pipsY = badgeY + 34;
  body += `
  <!-- Platoon size: ${platoonSize} troopers -->
  <text x="${MARGIN}" y="${pipsY}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">PLATOON (${esc(platoonSize)} troopers)</text>
  ${trooperPips(MARGIN + 4, pipsY + 6, platoonSize)}`;

  const pipRows = Math.ceil(platoonSize / 10);
  const afterPips = pipsY + 10 + pipRows * 10 + 14;

  // ── Primary weapon ───────────────────────────────────────────────────────
  body += `
  <!-- Primary weapon -->
  <text x="${MARGIN}" y="${afterPips}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">PRIMARY WEAPON</text>
  <text x="${MARGIN + 4}" y="${afterPips + 13}" font-family="${FONT}" font-size="8" fill="#000">${esc(primaryWeapon)}</text>`;

  // ── Secondary weapons ─────────────────────────────────────────────────────
  let secY = afterPips + 28;
  if (secondaryWeapons.length > 0) {
    body += `
  <!-- Secondary weapons -->
  <text x="${MARGIN}" y="${secY}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">SECONDARY WEAPONS</text>`;
    secondaryWeapons.forEach((sw, i) => {
      body += `
  <text x="${MARGIN + 4}" y="${secY + 13 + i * 12}" font-family="${FONT}" font-size="7" fill="#000">${esc(sw.name)}  (${esc(sw.perTrooperRatio)} per trooper)</text>`;
    });
    secY += 14 + secondaryWeapons.length * 12;
  }

  // ── Field gun block ───────────────────────────────────────────────────────
  if (fieldGun) {
    body += `
  <!-- Field gun -->
  <text x="${MARGIN}" y="${secY + 4}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">FIELD GUN</text>
  <rect x="${MARGIN}" y="${secY + 8}" width="${SVG_W - MARGIN * 2}" height="30" fill="#f0f0f0" stroke="#000" stroke-width="0.5" rx="2"/>
  <text x="${MARGIN + 4}" y="${secY + 20}" font-family="${FONT}" font-size="7" fill="#000">${esc(fieldGun.name)} × ${esc(fieldGun.count)}</text>
  <text x="${MARGIN + 4}" y="${secY + 32}" font-family="${FONT}" font-size="7" fill="#000">Dmg: ${esc(fieldGun.damage)}  Min: ${esc(fieldGun.minimumRange)}  Sht: ${esc(fieldGun.shortRange)}  Med: ${esc(fieldGun.mediumRange)}  Lng: ${esc(fieldGun.longRange)}</text>`;
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  body += `
  <text x="${SVG_W / 2}" y="${SVG_H - 6}" font-family="${FONT}" font-size="5.5" fill="#888" text-anchor="middle">MekStation · Infantry Record Sheet</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_W}" height="${SVG_H}" viewBox="0 0 ${SVG_W} ${SVG_H}">
  <rect width="${SVG_W}" height="${SVG_H}" fill="#fff"/>
  ${body}
</svg>`;
}
