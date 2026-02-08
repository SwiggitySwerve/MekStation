#!/usr/bin/env npx tsx
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

// Replicate resolveWeaponForUnit from validate-bv.ts
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

// Test CLAN resolution
console.log('=== CLAN tech base weapon resolution ===');
const clanWeapons = [
  'lrt-5', 'er-medium-laser', 'er-ppc', 'hag-20',
  'medium-pulse-laser', 'heavy-medium-laser', 'lrm-5', 'lrm-10',
  'srm-6', 'streak-srm-4', 'ultra-ac-5', 'lb-10-x-ac',
  'large-pulse-laser', 'er-large-laser', 'er-small-laser',
  'improved-heavy-medium-laser',
];

for (const id of clanWeapons) {
  const res = resolveWeaponForUnit(id, 'CLAN');
  const isRes = resolveEquipmentBV(id);
  const diff = res.battleValue !== isRes.battleValue ? ` (IS=${isRes.battleValue})` : '';
  console.log(`  ${id.padEnd(30)} -> BV=${String(res.battleValue).padStart(4)} heat=${res.heat} resolved=${res.resolved}${diff}`);
}

// Also check what the Clan versions would be
console.log('\n=== Direct Clan-prefixed lookups ===');
const clanDirect = [
  'clan-lrm-5', 'clan-er-medium-laser', 'clan-er-ppc',
  'clan-medium-pulse-laser', 'clan-heavy-medium-laser',
  'clan-large-pulse-laser', 'clan-er-large-laser', 'clan-er-small-laser',
  'clan-srm-6', 'clan-streak-srm-4', 'clan-ultra-ac-5', 'clan-lb-10-x-ac',
  'clan-lrm-10', 'clan-lrm-15', 'clan-lrm-20',
];
for (const id of clanDirect) {
  const res = resolveEquipmentBV(id);
  console.log(`  ${id.padEnd(30)} -> BV=${String(res.battleValue).padStart(4)} heat=${res.heat} resolved=${res.resolved}`);
}
