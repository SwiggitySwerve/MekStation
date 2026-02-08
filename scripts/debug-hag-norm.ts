#!/usr/bin/env npx tsx
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

// Replicate resolveWeaponForUnit
function resolveWeaponForUnit(id: string, techBase: string, isClanEquip?: boolean): { battleValue: number; heat: number; resolved: boolean } {
  const lo = id.toLowerCase().replace(/^\d+-/, '');
  const isResult = resolveEquipmentBV(id);
  if (techBase === 'CLAN' || isClanEquip || (techBase === 'MIXED' && (lo.startsWith('clan-') || lo.startsWith('cl-') || lo.startsWith('cl ')))) {
    const normalizedIS = normalizeEquipmentId(lo);
    const candidates: string[] = [];
    if (!normalizedIS.startsWith('clan-')) candidates.push('clan-' + normalizedIS);
    if (!lo.startsWith('clan-') && lo !== normalizedIS) candidates.push('clan-' + lo);
    for (const cid of candidates) {
      const cr = resolveEquipmentBV(cid);
      if (cr.resolved && cr.battleValue > 0) {
        if (!isResult.resolved || cr.battleValue > isResult.battleValue) return cr;
        if (isResult.battleValue === cr.battleValue) return cr;
      }
    }
  }
  if (isResult.resolved && isResult.battleValue > 0) return isResult;
  const stripped = id.replace(/^\d+-/, '');
  if (stripped !== id) { const sr = resolveEquipmentBV(stripped); if (sr.resolved && sr.battleValue > 0) return sr; }
  return isResult;
}

// Test Clan resolution
const clanWeapons = [
  'er-large-pulse-laser',
  'er-medium-pulse-laser',
  'er-small-pulse-laser',
  'plasma-rifle',
  'bombast-laser',
  'tsemp-cannon',
];

console.log('=== CLAN resolution ===');
for (const w of clanWeapons) {
  const res = resolveWeaponForUnit(w, 'CLAN');
  const isRes = resolveEquipmentBV(w);
  console.log(`${w.padEnd(30)} CLAN: BV=${res.battleValue} (IS: ${isRes.battleValue})`);
}

console.log('\n=== IS resolution ===');
for (const w of clanWeapons) {
  const res = resolveWeaponForUnit(w, 'INNER_SPHERE');
  console.log(`${w.padEnd(30)} IS: BV=${res.battleValue}`);
}
