/**
 * Infantry Record Sheet SVG Renderer
 *
 * Generates a deterministic SVG string for an infantry platoon record sheet.
 */

import { IInfantryRecordSheetData } from '@/types/printing';

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

function trooperPips(x: number, y: number, count: number): string {
  const pipRadius = 4;
  const pipGap = 10;
  const pipsPerRow = 10;
  let out = '';

  for (let i = 0; i < count; i += 1) {
    const col = i % pipsPerRow;
    const row = Math.floor(i / pipsPerRow);
    const cx = x + pipRadius + col * pipGap;
    const cy = y + pipRadius + row * pipGap;
    out += `<circle cx="${cx}" cy="${cy}" r="${pipRadius}" fill="#333" stroke="#000" stroke-width="0.6"/>`;
  }

  return out;
}

export function renderInfantrySVG(data: IInfantryRecordSheetData): string {
  const {
    header,
    platoonSize,
    platoonComposition,
    motiveType,
    armorKit,
    primaryWeapon,
    secondaryWeapons,
    fieldGun,
    specialization,
    antiMechTraining,
    gunnery,
    antiMech,
  } = data;

  let body = renderTitleBlock(
    '#1a3a1a',
    `${header.chassis} ${header.model}`,
    `Infantry - ${esc(header.techBase)} - ${esc(platoonComposition.squads)}x${esc(platoonComposition.troopersPerSquad)} - BV ${esc(header.battleValue.toLocaleString())}`,
  );

  const badgeY = MARGIN + 46;
  body += `
  <!-- Motive type + skills -->
  <rect x="${MARGIN}" y="${badgeY}" width="110" height="22" fill="#2d5a2d" rx="2"/>
  <text x="${MARGIN + 55}" y="${badgeY + 14}" font-family="${FONT}" font-size="9" font-weight="bold" fill="#fff" text-anchor="middle">${esc(motiveType)}</text>
  <text x="${MARGIN + 120}" y="${badgeY + 10}" font-family="${FONT}" font-size="7" fill="#000">Gunnery: ${esc(gunnery)}</text>
  <text x="${MARGIN + 120}" y="${badgeY + 20}" font-family="${FONT}" font-size="7" fill="#000">Anti-Mech: ${esc(antiMech)}${antiMechTraining ? ' trained' : ''}</text>
  <text x="${MARGIN + 220}" y="${badgeY + 15}" font-family="${FONT}" font-size="7" fill="#000">Armor Kit: ${esc(armorKit)}</text>`;

  if (specialization) {
    body += `
  <!-- Specialization -->
  <rect x="${SVG_W - MARGIN - 100}" y="${badgeY}" width="100" height="22" fill="#5a4a1a" rx="2"/>
  <text x="${SVG_W - MARGIN - 50}" y="${badgeY + 14}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#fff" text-anchor="middle">${esc(specialization.toUpperCase())}</text>`;
  }

  const pipsY = badgeY + 34;
  body += `
  <!-- Platoon size: ${platoonSize} troopers -->
  <text x="${MARGIN}" y="${pipsY}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">PLATOON (${esc(platoonSize)} troopers)</text>
  ${trooperPips(MARGIN + 4, pipsY + 6, platoonSize)}`;

  const pipRows = Math.ceil(platoonSize / 10);
  const afterPips = pipsY + 10 + pipRows * 10 + 14;

  body += `
  <!-- Primary weapon -->
  <text x="${MARGIN}" y="${afterPips}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">PRIMARY WEAPON</text>
  <text x="${MARGIN + 4}" y="${afterPips + 13}" font-family="${FONT}" font-size="8" fill="#000">${esc(primaryWeapon.name)}</text>
  <text x="${MARGIN + 4}" y="${afterPips + 25}" font-family="${FONT}" font-size="7" fill="#000">Dmg: ${esc(primaryWeapon.damage)}  Sht: ${esc(primaryWeapon.shortRange)}  Med: ${esc(primaryWeapon.mediumRange)}  Lng: ${esc(primaryWeapon.longRange)}${primaryWeapon.ammoType ? `  Ammo: ${esc(primaryWeapon.ammoType)}` : ''}</text>`;

  let secY = afterPips + 40;
  if (secondaryWeapons.length > 0) {
    body += `
  <!-- Secondary weapons -->
  <text x="${MARGIN}" y="${secY}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">SECONDARY WEAPONS</text>`;
    secondaryWeapons.forEach((sw, i) => {
      body += `
  <text x="${MARGIN + 4}" y="${secY + 13 + i * 12}" font-family="${FONT}" font-size="7" fill="#000">${esc(sw.name)}  Ratio 1/${esc(sw.perTrooperRatio)}${sw.count !== undefined ? `  Count: ${esc(sw.count)}` : ''}  Dmg: ${esc(sw.damage)}  Rng: ${esc(sw.shortRange)}/${esc(sw.mediumRange)}/${esc(sw.longRange)}</text>`;
    });
    secY += 14 + secondaryWeapons.length * 12;
  }

  if (fieldGun) {
    body += `
  <!-- Field gun -->
  <text x="${MARGIN}" y="${secY + 4}" font-family="${FONT}" font-size="8" font-weight="bold" fill="#000">FIELD GUN</text>
  <rect x="${MARGIN}" y="${secY + 8}" width="${SVG_W - MARGIN * 2}" height="30" fill="#f0f0f0" stroke="#000" stroke-width="0.5" rx="2"/>
  <text x="${MARGIN + 4}" y="${secY + 20}" font-family="${FONT}" font-size="7" fill="#000">${esc(fieldGun.name)} x ${esc(fieldGun.count)}</text>
  <text x="${MARGIN + 4}" y="${secY + 32}" font-family="${FONT}" font-size="7" fill="#000">Dmg: ${esc(fieldGun.damage)}  Min: ${esc(fieldGun.minimumRange)}  Sht: ${esc(fieldGun.shortRange)}  Med: ${esc(fieldGun.mediumRange)}  Lng: ${esc(fieldGun.longRange)}${fieldGun.ammoRounds !== undefined ? `  Ammo: ${esc(fieldGun.ammoRounds)}` : ''}</text>`;
  }

  // ── Special Abilities block ─────────────────────────────────────────────
  // Phase 5 Wave 3 — placed in the lower-left margin so it survives both the
  // small "foot rifle" platoon and the taller "marine jump + field gun" cases.
  if (data.specialAbilities && data.specialAbilities.length > 0) {
    body += buildSPASectionString(
      { entries: data.specialAbilities, hasContent: true },
      { x: MARGIN, y: SVG_H - 110, width: SVG_W - MARGIN * 2 },
    );
  }

  body += renderFooter('MekStation - Infantry Record Sheet');
  return renderSvgDocument(body);
}
