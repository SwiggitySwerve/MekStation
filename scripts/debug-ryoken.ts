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

// Ryoken III Prime weapons
const weapons = [
  'large-pulse-laser', 'medium-pulse-laser', 'srm-6',
  'er-medium-laser', 'improved-heavy-medium-laser',
  'ultra-ac-10', 'lb-20-x-ac', 'rotary-ac-5',
  'er-large-pulse-laser', 'er-medium-pulse-laser',
];

console.log('=== IS Resolution ===');
for (const w of weapons) {
  const isRes = resolveEquipmentBV(w);
  console.log(`  ${w.padEnd(30)} IS: BV=${isRes.battleValue} heat=${isRes.heat}`);
}

console.log('\n=== CLAN Resolution (techBase=CLAN) ===');
for (const w of weapons) {
  const res = resolveWeaponForUnit(w, 'CLAN');
  const isRes = resolveEquipmentBV(w);
  const diff = res.battleValue !== isRes.battleValue ? ` (IS was ${isRes.battleValue}, diff=${res.battleValue - isRes.battleValue})` : ' (SAME as IS)';
  console.log(`  ${w.padEnd(30)} Clan: BV=${res.battleValue} heat=${res.heat}${diff}`);
}

// Check specific Clan lookups
console.log('\n=== Direct Clan catalog checks ===');
const clanChecks = [
  'clan-large-pulse-laser', 'clan-medium-pulse-laser', 'clan-srm-6',
  'clan-er-medium-laser', 'clan-improved-heavy-medium-laser',
  'clan-ultra-ac-10', 'clan-lb-20-x-ac', 'clan-rotary-ac-5',
  'clan-er-large-pulse-laser', 'clan-er-medium-pulse-laser',
  'clan-medium-heavy-laser',
];
for (const id of clanChecks) {
  const res = resolveEquipmentBV(id);
  console.log(`  ${id.padEnd(35)} BV=${res.battleValue} resolved=${res.resolved}`);
}
